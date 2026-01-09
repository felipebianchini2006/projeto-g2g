param(
  [int[]]$Ports = @(3000, 3001)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

foreach ($port in $Ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "No process listening on port $port."
    continue
  }
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    Write-Host "Stopping process $pid on port $port..."
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
}
