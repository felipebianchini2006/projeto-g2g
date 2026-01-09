param(
  [string]$ComposeFile = "compose.test.yml",
  [switch]$LeaveContainers
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-NpmPath {
  $command = Get-Command npm -ErrorAction Stop
  return $command.Path
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$npmPath = Get-NpmPath

Push-Location $repoRoot
try {
  Write-Host "Starting test infrastructure..."
  & docker compose -f $ComposeFile up -d

  Write-Host "Running API e2e tests..."
  & $npmPath run test:e2e -w apps/api
} finally {
  if (-not $LeaveContainers) {
    Write-Host "Stopping test infrastructure..."
    & docker compose -f $ComposeFile down
  }
  Pop-Location
}
