param(
  [string]$ApiBaseUrl = "http://localhost:3001",
  [int]$PollAttempts = 12,
  [int]$PollDelayMs = 500,
  [switch]$SkipMediaUpload,
  [switch]$IncludeChargeback
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PATCH', 'DELETE')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null,
    [string]$Token = $null
  )

  $headers = @{
    'Content-Type' = 'application/json'
  }
  if ($Token) {
    $headers['Authorization'] = "Bearer $Token"
  }

  $uri = "$ApiBaseUrl$Path"
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 8
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
}

function Wait-OrderStatus {
  param(
    [Parameter(Mandatory = $true)][string]$OrderId,
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][string]$Expected
  )

  $current = $null
  for ($i = 0; $i -lt $PollAttempts; $i++) {
    Start-Sleep -Milliseconds $PollDelayMs
    $current = Invoke-Api -Method GET -Path "/orders/$OrderId" -Token $Token
    if ($current.status -eq $Expected) {
      return $current
    }
  }
  throw "Order $OrderId did not reach status $Expected. Current: $($current.status)"
}

function New-TempPng {
  param([string]$Prefix)
  $bytes = [Convert]::FromBase64String(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+Kxq1WQAAAABJRU5ErkJggg=='
  )
  $path = Join-Path -Path $env:TEMP -ChildPath "$Prefix-$([guid]::NewGuid().ToString('N')).png"
  [System.IO.File]::WriteAllBytes($path, $bytes)
  return $path
}

function Upload-ListingMedia {
  param(
    [Parameter(Mandatory = $true)][string]$ListingId,
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][string]$FilePath
  )

  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if (-not $curl) {
    Write-Warning "curl.exe not found. Skipping media upload."
    return $null
  }
  $url = "$ApiBaseUrl/listings/$ListingId/media/upload"
  $response = & $curl.Path -s -X POST -H "Authorization: Bearer $Token" `
    -F "file=@$FilePath;type=image/png" -F "position=0" $url
  if ($LASTEXITCODE -ne 0) {
    throw "Media upload failed with exit code $LASTEXITCODE."
  }
  if (-not $response) {
    throw "Media upload returned empty response."
  }
  return $response | ConvertFrom-Json
}

Write-Host "== Login seed users =="
$admin = Invoke-Api -Method POST -Path "/auth/login" -Body @{
  email = "admin@email.com"
  password = "12345678"
}
$seller = Invoke-Api -Method POST -Path "/auth/login" -Body @{
  email = "seller@email.com"
  password = "12345678"
}
$buyer = Invoke-Api -Method POST -Path "/auth/login" -Body @{
  email = "buyer@email.com"
  password = "12345678"
}

Write-Host "== Fetch seller listings (seed) =="
$seedListings = Invoke-Api -Method GET -Path "/listings?status=PUBLISHED" -Token $seller.accessToken
$seedListings = @($seedListings)
if ($seedListings.Count -eq 0) {
  throw "No published listings for seller."
}
$seedAuto = $seedListings | Where-Object { $_.deliveryType -eq "AUTO" } | Select-Object -First 1
if (-not $seedAuto) {
  throw "No AUTO listing found for seed."
}

Write-Host "== Create listing (AUTO) =="
$autoListing = Invoke-Api -Method POST -Path "/listings" -Token $seller.accessToken -Body @{
  categoryId = $seedAuto.categoryId
  title = "Full Flow Auto Listing"
  description = "Auto listing for full flow tests."
  priceCents = 12900
  currency = "BRL"
  deliveryType = "AUTO"
  deliverySlaHours = 12
  refundPolicy = "Refunds allowed within 7 days after delivery."
}

Write-Host "== Inventory add/import =="
$null = Invoke-Api -Method POST -Path "/listings/$($autoListing.id)/inventory/items" -Token $seller.accessToken -Body @{
  codes = @("FULL-KEY-001", "FULL-KEY-002")
}
$null = Invoke-Api -Method POST -Path "/listings/$($autoListing.id)/inventory/import" -Token $seller.accessToken -Body @{
  payload = "FULL-KEY-003`nFULL-KEY-004"
}

if (-not $SkipMediaUpload) {
  Write-Host "== Listing media upload/list/delete =="
  $filePath = New-TempPng -Prefix "g2g-media"
  try {
    $media = Upload-ListingMedia -ListingId $autoListing.id -Token $seller.accessToken -FilePath $filePath
    if ($media) {
      $mediaList = Invoke-Api -Method GET -Path "/listings/$($autoListing.id)/media" -Token $seller.accessToken
      $mediaList = @($mediaList)
      $toDelete = $mediaList | Where-Object { $_.id -eq $media.id } | Select-Object -First 1
      if ($toDelete) {
        $null = Invoke-Api -Method DELETE -Path "/listings/$($autoListing.id)/media/$($toDelete.id)" -Token $seller.accessToken
      }
    }
  } finally {
    if (Test-Path $filePath) {
      Remove-Item $filePath -Force
    }
  }
}

Write-Host "== Submit listing and admin approve =="
$null = Invoke-Api -Method POST -Path "/listings/$($autoListing.id)/submit" -Token $seller.accessToken
$null = Invoke-Api -Method POST -Path "/admin/listings/$($autoListing.id)/approve" -Token $admin.accessToken

Write-Host "== Order cancel flow =="
$orderCancel = Invoke-Api -Method POST -Path "/orders" -Token $buyer.accessToken -Body @{
  listingId = $autoListing.id
  quantity = 1
}
$null = Invoke-Api -Method POST -Path "/orders/$($orderCancel.id)/cancel" -Token $buyer.accessToken -Body @{
  reason = "cancel test"
}

Write-Host "== Order create -> payment -> webhook -> delivery -> release -> chargeback =="
$orderPaid = Invoke-Api -Method POST -Path "/orders" -Token $buyer.accessToken -Body @{
  listingId = $autoListing.id
  quantity = 1
}
$paymentPaid = Invoke-Api -Method POST -Path "/payments/pix/create" -Token $buyer.accessToken -Body @{
  orderId = $orderPaid.id
}
$null = Invoke-Api -Method POST -Path "/webhooks/efi/pix" -Body @{
  evento = "pix"
  pix = @(
    @{
      txid = $paymentPaid.txid
      endToEndId = "E2E-FULL-$($orderPaid.id)"
      horario = (Get-Date).ToString("o")
    }
  )
}
$orderDelivered = Wait-OrderStatus -OrderId $orderPaid.id -Token $buyer.accessToken -Expected "DELIVERED"
if ($orderDelivered.items.Count -gt 0 -and $orderDelivered.items[0].inventoryItems.Count -gt 0) {
  $invItem = $orderDelivered.items[0].inventoryItems[0]
  $null = Invoke-Api -Method DELETE -Path "/listings/$($autoListing.id)/inventory/items/$($invItem.id)" -Token $seller.accessToken
}
$null = Invoke-Api -Method POST -Path "/orders/$($orderPaid.id)/confirm-receipt" -Token $buyer.accessToken -Body @{
  note = "ok!"
}
$releaseSucceeded = $false
try {
  $null = Invoke-Api -Method POST -Path "/admin/orders/$($orderPaid.id)/release" -Token $admin.accessToken -Body @{
    reason = "release test"
  }
  $releaseSucceeded = $true
} catch {
  $rawMessage = $_.ErrorDetails.Message
  $apiMessage = $null
  if ($rawMessage) {
    try {
      $parsed = $rawMessage | ConvertFrom-Json
      if ($parsed -and $parsed.message) {
        $apiMessage = $parsed.message
      }
    } catch {
      $apiMessage = $rawMessage
    }
  }
  if ($apiMessage) {
    $message = $apiMessage
  } else {
    $message = $_.Exception.Message
  }
  if ($message -match "payout is blocked") {
    Write-Warning "Release skipped: seller payout blocked. Clear payoutBlockedAt or re-run seed to reset."
  } else {
    throw
  }
}

if ($IncludeChargeback -and $releaseSucceeded) {
  $null = Invoke-Api -Method POST -Path "/admin/orders/$($orderPaid.id)/refund" -Token $admin.accessToken -Body @{
    reason = "chargeback test"
  }
}

Write-Host "== Checkout -> dispute -> refund (held) =="
$checkout = Invoke-Api -Method POST -Path "/checkout" -Token $buyer.accessToken -Body @{
  listingId = $autoListing.id
  quantity = 1
}
$null = Invoke-Api -Method POST -Path "/webhooks/efi/pix" -Body @{
  evento = "pix"
  pix = @(
    @{
      txid = $checkout.payment.txid
      endToEndId = "E2E-DISPUTE-$($checkout.order.id)"
      horario = (Get-Date).ToString("o")
    }
  )
}
$null = Wait-OrderStatus -OrderId $checkout.order.id -Token $buyer.accessToken -Expected "DELIVERED"
$null = Invoke-Api -Method POST -Path "/orders/$($checkout.order.id)/open-dispute" -Token $buyer.accessToken -Body @{
  reason = "Dispute reason for testing."
}
$null = Invoke-Api -Method POST -Path "/admin/orders/$($checkout.order.id)/refund" -Token $admin.accessToken -Body @{
  reason = "refund held test"
}

Write-Host "== Order list (buyer/seller) =="
$null = Invoke-Api -Method GET -Path "/orders?scope=buyer" -Token $buyer.accessToken
$null = Invoke-Api -Method GET -Path "/orders?scope=seller" -Token $seller.accessToken

Write-Host "== Listing update -> re-approve -> suspend =="
$null = Invoke-Api -Method PATCH -Path "/listings/$($autoListing.id)" -Token $seller.accessToken -Body @{
  title = "Full Flow Auto Listing v2"
  refundPolicy = "Refunds allowed within 7 days after delivery. Updated."
}
$null = Invoke-Api -Method POST -Path "/admin/listings/$($autoListing.id)/approve" -Token $admin.accessToken
$null = Invoke-Api -Method POST -Path "/admin/listings/$($autoListing.id)/suspend" -Token $admin.accessToken -Body @{
  reason = "policy test"
}

Write-Host "== Listing reject flow =="
$rejectListing = Invoke-Api -Method POST -Path "/listings" -Token $seller.accessToken -Body @{
  categoryId = $seedAuto.categoryId
  title = "Reject Listing"
  description = "Listing to reject."
  priceCents = 9900
  currency = "BRL"
  deliveryType = "MANUAL"
  deliverySlaHours = 24
  refundPolicy = "Refunds reviewed manually."
}
$null = Invoke-Api -Method POST -Path "/listings/$($rejectListing.id)/submit" -Token $seller.accessToken
$null = Invoke-Api -Method POST -Path "/admin/listings/$($rejectListing.id)/reject" -Token $admin.accessToken -Body @{
  reason = "reject test"
}

Write-Host "== Listing archive (seller delete) =="
$archiveListing = Invoke-Api -Method POST -Path "/listings" -Token $seller.accessToken -Body @{
  categoryId = $seedAuto.categoryId
  title = "Archive Listing"
  description = "Listing to archive."
  priceCents = 10900
  currency = "BRL"
  deliveryType = "MANUAL"
  deliverySlaHours = 24
  refundPolicy = "Refunds reviewed manually."
}
$null = Invoke-Api -Method DELETE -Path "/listings/$($archiveListing.id)" -Token $seller.accessToken

Write-Host "== Admin listings list =="
$null = Invoke-Api -Method GET -Path "/admin/listings" -Token $admin.accessToken

Write-Host "== Wallet summary/entries (seller) =="
$null = Invoke-Api -Method GET -Path "/wallet/summary" -Token $seller.accessToken
$null = Invoke-Api -Method GET -Path "/wallet/entries" -Token $seller.accessToken

Write-Host "== Webhook metrics =="
$null = Invoke-Api -Method GET -Path "/webhooks/efi/metrics" -Token $admin.accessToken

Write-Host "== Done =="
