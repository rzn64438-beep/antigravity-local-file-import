$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\antigravity'
$exe = Join-Path $installDir 'Antigravity.exe'
$asar = Join-Path $installDir 'resources\app.asar'
$backup = Get-ChildItem -LiteralPath (Join-Path $installDir 'resources') -Filter 'app.asar.before-local-document-import-*.bak' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (!$backup) { throw '没有找到本补丁生成的备份。' }
Get-CimInstance Win32_Process | Where-Object {
    $_.ExecutablePath -and $_.ExecutablePath.StartsWith($installDir, [System.StringComparison]::OrdinalIgnoreCase)
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Copy-Item -LiteralPath $backup.FullName -Destination $asar -Force
Start-Process -FilePath $exe
Write-Host "已从备份恢复：$($backup.FullName)" -ForegroundColor Green

