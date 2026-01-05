param(
  [string]$ApiBaseUrl = "http://localhost:3001",
  [int]$PollAttempts = 12,
  [int]$PollDelayMs = 500,
  [switch]$IncludeRefund
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

Write-Host "== Fetch seller listings =="
$listings = Invoke-Api -Method GET -Path "/listings?status=PUBLISHED" -Token $seller.accessToken
$listings = @($listings)
if ($listings.Count -eq 0) {
  throw "No published listings for seller."
}
$listing = $listings | Where-Object { $_.deliveryType -eq "AUTO" } | Select-Object -First 1
if (-not $listing) {
  throw "No AUTO listing found. Seed data should include one."
}
Write-Host "Using listing: $($listing.id) ($($listing.title))"

Write-Host "== Create order (buyer) =="
$order = Invoke-Api -Method POST -Path "/orders" -Token $buyer.accessToken -Body @{
  listingId = $listing.id
  quantity = 1
}
$orderId = $order.id
Write-Host "Order created: $orderId"

Write-Host "== Create Pix payment =="
$payment = Invoke-Api -Method POST -Path "/payments/pix/create" -Token $buyer.accessToken -Body @{
  orderId = $orderId
}
$txid = $payment.txid
Write-Host "Payment txid: $txid"

Write-Host "== Send webhook (mock) =="
$null = Invoke-Api -Method POST -Path "/webhooks/efi/pix" -Body @{
  evento = "pix"
  pix = @(
    @{
      txid = $txid
      endToEndId = "E2E-SMOKE-$($orderId)"
      horario = (Get-Date).ToString("o")
    }
  )
}

Write-Host "== Wait for delivery status =="
$current = $null
for ($i = 0; $i -lt $PollAttempts; $i++) {
  Start-Sleep -Milliseconds $PollDelayMs
  $current = Invoke-Api -Method GET -Path "/orders/$orderId" -Token $buyer.accessToken
  if ($current.status -eq "DELIVERED") {
    break
  }
}
if (-not $current -or $current.status -ne "DELIVERED") {
  throw "Order status not DELIVERED after webhook. Current: $($current.status)"
}
Write-Host "Order status: $($current.status)"

Write-Host "== Confirm receipt (buyer) =="
$null = Invoke-Api -Method POST -Path "/orders/$orderId/confirm-receipt" -Token $buyer.accessToken -Body @{
  note = "ok!"
}

Write-Host "== Admin release =="
$release = Invoke-Api -Method POST -Path "/admin/orders/$orderId/release" -Token $admin.accessToken -Body @{
  reason = "smoke test"
}
Write-Host "Release status: $($release.status)"

if ($IncludeRefund) {
  Write-Host "== Admin refund (chargeback manual if already released) =="
  $refund = Invoke-Api -Method POST -Path "/admin/orders/$orderId/refund" -Token $admin.accessToken -Body @{
    reason = "smoke test refund"
  }
  Write-Host "Refund status: $($refund.status)"
}

Write-Host "== Webhook metrics =="
$metrics = Invoke-Api -Method GET -Path "/webhooks/efi/metrics" -Token $admin.accessToken
Write-Host ("Processed: {0} | Pending: {1} | Total: {2}" -f $metrics.processed, $metrics.pending, $metrics.total)

Write-Host "== Done =="
