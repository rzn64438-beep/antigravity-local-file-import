$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\antigravity'
$exe = Join-Path $installDir 'Antigravity.exe'
$asar = Join-Path $installDir 'resources\app.asar'
$patcher = Join-Path $PSScriptRoot 'patch.js'

if (!(Test-Path -LiteralPath $exe) -or !(Test-Path -LiteralPath $asar)) {
    throw '未找到 Antigravity 默认安装目录。'
}
$version = (Get-Item -LiteralPath $exe).VersionInfo.ProductVersion
if ($version -notlike '2.13.0*') {
    throw "此补丁仅适用于 Antigravity 2.13.0，当前版本：$version"
}
if (!(Get-Command node -ErrorAction SilentlyContinue) -or !(Get-Command npx -ErrorAction SilentlyContinue)) {
    throw '需要先安装 Node.js（包含 npx）。'
}

$workDir = Join-Path $env:TEMP ("antigravity-file-import-" + [guid]::NewGuid().ToString('N'))
$extracted = Join-Path $workDir 'app'
$newAsar = Join-Path $workDir 'app.asar'
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

try {
    Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY -ErrorAction SilentlyContinue
    & npx --yes '@electron/asar' extract $asar $extracted
    if ($LASTEXITCODE -ne 0) { throw '解包失败。' }
    & node $patcher $extracted
    if ($LASTEXITCODE -ne 0) { throw '补丁注入失败。' }
    & npx --yes '@electron/asar' pack $extracted $newAsar --unpack-dir 'node_modules/chrome-devtools-mcp'
    if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $newAsar)) { throw '重新打包失败。' }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backup = Join-Path $installDir "resources\app.asar.before-local-document-import-$stamp.bak"
    Get-CimInstance Win32_Process | Where-Object {
        $_.ExecutablePath -and $_.ExecutablePath.StartsWith($installDir, [System.StringComparison]::OrdinalIgnoreCase)
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
    Copy-Item -LiteralPath $asar -Destination $backup
    Copy-Item -LiteralPath $newAsar -Destination $asar -Force
    Start-Process -FilePath $exe
    Write-Host "安装完成。备份：$backup" -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $workDir) { Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue }
}

