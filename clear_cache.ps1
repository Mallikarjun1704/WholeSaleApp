# Clear Windows icon cache and dist-electron
Write-Host "Clearing Windows icon cache..."

$iconCachePath = Join-Path $env:LOCALAPPDATA "IconCache.db"
if (Test-Path $iconCachePath) {
    Remove-Item $iconCachePath -Force
    Write-Host "Removed IconCache.db"
} else {
    Write-Host "IconCache.db not found (may use new cache format)"
}

$explorerCachePath = Join-Path $env:LOCALAPPDATA "Microsoft\Windows\Explorer"
if (Test-Path $explorerCachePath) {
    Get-ChildItem $explorerCachePath -Filter "iconcache*" | ForEach-Object {
        Write-Host ("Removing: " + $_.FullName)
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }
    Get-ChildItem $explorerCachePath -Filter "thumbcache*" | ForEach-Object {
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Clearing dist-electron..."
$distPath = "d:\techmartWSApp\WholeSaleApp\dist-electron"
if (Test-Path $distPath) {
    Remove-Item $distPath -Recurse -Force
    Write-Host "Removed dist-electron"
} else {
    Write-Host "dist-electron already clean"
}

Write-Host "Done! Now run: npm run electron:build"
