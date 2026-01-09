param(
  [string]$WebUrl = "http://localhost:3000",
  [string]$ApiUrl = "http://localhost:3001",
  [int]$TimeoutSeconds = 60,
  [switch]$KeepRunning,
  [switch]$LeaveInfra
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-NpmPath {
  $command = Get-Command npm -ErrorAction Stop
  return $command.Path
}

function Test-Url {
  param([Parameter(Mandatory = $true)][string]$Url)
  try {
    $null = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 3 -UseBasicParsing
    return $true
  } catch {
    return $false
  }
}

function Wait-Url {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSeconds = 60
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Url -Url $Url) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  throw "Timeout waiting for $Url"
}

function Wait-TcpPort {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutSeconds = 30
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  throw "Timeout waiting for port $Port"
}

function Stop-PortProcess {
  param([Parameter(Mandatory = $true)][int]$Port)
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    return
  }
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$npmPath = Get-NpmPath

$startedApi = $false
$startedWeb = $false
$apiProcess = $null
$webProcess = $null
$infraStarted = $false

if (-not (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Host "Starting dev infrastructure..."
  & docker compose -f "$repoRoot\\docker-compose.dev.yml" up -d
  $infraStarted = $true
}

Write-Host "Waiting for database/redis..."
Wait-TcpPort -Port 5432 -TimeoutSeconds $TimeoutSeconds | Out-Null
Wait-TcpPort -Port 6379 -TimeoutSeconds $TimeoutSeconds | Out-Null

Write-Host "Applying migrations and seed..."
& $npmPath run prisma:migrate:deploy -w apps/api
& $npmPath run prisma:seed -w apps/api

if (-not (Test-Url -Url "$ApiUrl/health")) {
  Write-Host "Starting API..."
  $apiProcess = Start-Process -FilePath $npmPath -ArgumentList @("run", "start:dev", "-w", "apps/api") -WorkingDirectory $repoRoot -PassThru -NoNewWindow
  $startedApi = $true
}

if (-not (Test-Url -Url "$WebUrl/login")) {
  Write-Host "Starting web..."
  $webProcess = Start-Process -FilePath $npmPath -ArgumentList @("run", "dev", "-w", "apps/web") -WorkingDirectory $repoRoot -PassThru -NoNewWindow
  $startedWeb = $true
}

try {
  Write-Host "Waiting for API..."
  Wait-Url -Url "$ApiUrl/health" -TimeoutSeconds $TimeoutSeconds | Out-Null
  Write-Host "Waiting for web..."
  Wait-Url -Url "$WebUrl/login" -TimeoutSeconds $TimeoutSeconds | Out-Null

  Write-Host "Running smoke test..."
  & $npmPath run test:smoke -w apps/web
} finally {
  if (-not $KeepRunning) {
    if ($startedWeb) {
      Stop-PortProcess -Port 3000
      if ($webProcess) {
        Stop-Process -Id $webProcess.Id -Force -ErrorAction SilentlyContinue
      }
    }
    if ($startedApi) {
      Stop-PortProcess -Port 3001
      if ($apiProcess) {
        Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
      }
    }
    if ($infraStarted -and -not $LeaveInfra) {
      Write-Host "Stopping dev infrastructure..."
      & docker compose -f "$repoRoot\\docker-compose.dev.yml" down
    }
  }
}
