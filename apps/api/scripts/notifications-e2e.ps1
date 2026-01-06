param(
  [string]$ApiBaseUrl = "http://localhost:3001",
  [int]$PollAttempts = 12,
  [int]$PollDelayMs = 500,
  [switch]$CheckEmailOutbox
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

function Get-EmailOutbox {
  param(
    [Parameter(Mandatory = $true)][string[]]$Emails
  )

  $script = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emails = process.argv.slice(2);
  const items = await prisma.emailOutbox.findMany({
    where: { to: { in: emails } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log(JSON.stringify(items));
  await prisma.\$disconnect();
}
main().catch(async (error) => {
  console.error(error);
  await prisma.\$disconnect();
  process.exit(1);
});
"@

  $tempPath = Join-Path -Path $env:TEMP -ChildPath "g2g-email-outbox-$([guid]::NewGuid().ToString('N')).js"
  Set-Content -Path $tempPath -Value $script -Encoding UTF8
  try {
    $raw = & node $tempPath @Emails
    if (-not $raw) {
      return @()
    }
    return $raw | ConvertFrom-Json
  } finally {
    if (Test-Path $tempPath) {
      Remove-Item $tempPath -Force
    }
  }
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

Write-Host "== Fetch seed listing for category =="
$seedListings = Invoke-Api -Method GET -Path "/listings?status=PUBLISHED" -Token $seller.accessToken
$seedListings = @($seedListings)
if ($seedListings.Count -eq 0) {
  throw "No published listings for seller."
}
$seedAuto = $seedListings | Where-Object { $_.deliveryType -eq "AUTO" } | Select-Object -First 1
if (-not $seedAuto) {
  throw "No AUTO listing found for seed."
}

Write-Host "== Create listing (AUTO) with inventory =="
$title = "Notify Flow Auto $([guid]::NewGuid().ToString('N').Substring(0, 8))"
$autoListing = Invoke-Api -Method POST -Path "/listings" -Token $seller.accessToken -Body @{
  categoryId = $seedAuto.categoryId
  title = $title
  description = "Auto listing for notification flow tests."
  priceCents = 15900
  currency = "BRL"
  deliveryType = "AUTO"
  deliverySlaHours = 6
  refundPolicy = "Refunds allowed within 7 days after delivery."
}

$null = Invoke-Api -Method POST -Path "/listings/$($autoListing.id)/inventory/items" -Token $seller.accessToken -Body @{
  codes = @("NOTIFY-KEY-001", "NOTIFY-KEY-002")
}

Write-Host "== Submit + approve listing =="
$null = Invoke-Api -Method POST -Path "/listings/$($autoListing.id)/submit" -Token $seller.accessToken
$null = Invoke-Api -Method POST -Path "/admin/listings/$($autoListing.id)/approve" -Token $admin.accessToken

Write-Host "== Create order -> payment -> webhook -> delivery =="
$order = Invoke-Api -Method POST -Path "/orders" -Token $buyer.accessToken -Body @{
  listingId = $autoListing.id
  quantity = 1
}
$payment = Invoke-Api -Method POST -Path "/payments/pix/create" -Token $buyer.accessToken -Body @{
  orderId = $order.id
}
$null = Invoke-Api -Method POST -Path "/webhooks/efi/pix" -Body @{
  evento = "pix"
  pix = @(
    @{
      txid = $payment.txid
      endToEndId = "E2E-NOTIFY-$($order.id)"
      horario = (Get-Date).ToString("o")
    }
  )
}
$null = Wait-OrderStatus -OrderId $order.id -Token $buyer.accessToken -Expected "DELIVERED"

Write-Host "== Open dispute (buyer) =="
$null = Invoke-Api -Method POST -Path "/orders/$($order.id)/open-dispute" -Token $buyer.accessToken -Body @{
  reason = "Dispute reason for notification flow test."
}

Write-Host "== Resolve dispute (admin refund) =="
$disputes = Invoke-Api -Method GET -Path "/admin/disputes" -Token $admin.accessToken
$disputes = @($disputes)
$dispute = $disputes | Where-Object { $_.order.id -eq $order.id } | Select-Object -First 1
if (-not $dispute) {
  throw "Dispute not found for order $($order.id)."
}
$null = Invoke-Api -Method POST -Path "/admin/disputes/$($dispute.id)/resolve" -Token $admin.accessToken -Body @{
  action = "refund"
  reason = "Refund due to dispute."
}

Write-Host "== Notifications list (buyer/seller) =="
$buyerUnread = Invoke-Api -Method GET -Path "/notifications?unread=true&take=50" -Token $buyer.accessToken
$sellerUnread = Invoke-Api -Method GET -Path "/notifications?unread=true&take=50" -Token $seller.accessToken
$buyerUnread = @($buyerUnread)
$sellerUnread = @($sellerUnread)
Write-Host "Buyer unread: $($buyerUnread.Count)"
Write-Host "Seller unread: $($sellerUnread.Count)"

if ($buyerUnread.Count -gt 0) {
  $null = Invoke-Api -Method POST -Path "/notifications/$($buyerUnread[0].id)/read" -Token $buyer.accessToken
}
if ($sellerUnread.Count -gt 0) {
  $null = Invoke-Api -Method POST -Path "/notifications/$($sellerUnread[0].id)/read" -Token $seller.accessToken
}

$null = Invoke-Api -Method POST -Path "/notifications/read-all" -Token $buyer.accessToken
$null = Invoke-Api -Method POST -Path "/notifications/read-all" -Token $seller.accessToken

$buyerUnreadAfter = Invoke-Api -Method GET -Path "/notifications?unread=true&take=10" -Token $buyer.accessToken
$sellerUnreadAfter = Invoke-Api -Method GET -Path "/notifications?unread=true&take=10" -Token $seller.accessToken
$buyerUnreadAfter = @($buyerUnreadAfter)
$sellerUnreadAfter = @($sellerUnreadAfter)
Write-Host "Buyer unread after mark-all: $($buyerUnreadAfter.Count)"
Write-Host "Seller unread after mark-all: $($sellerUnreadAfter.Count)"

if ($CheckEmailOutbox) {
  Write-Host "== Email outbox (last 20) =="
  $outbox = Get-EmailOutbox -Emails @("buyer@email.com", "seller@email.com")
  $outbox = @($outbox)
  Write-Host "Outbox entries: $($outbox.Count)"
  if ($outbox.Count -gt 0) {
    $sent = ($outbox | Where-Object { $_.status -eq "SENT" }).Count
    $failed = ($outbox | Where-Object { $_.status -eq "FAILED" }).Count
    $pending = ($outbox | Where-Object { $_.status -eq "PENDING" }).Count
    Write-Host "SENT: $sent | FAILED: $failed | PENDING: $pending"
  }
}

Write-Host "== Done =="
