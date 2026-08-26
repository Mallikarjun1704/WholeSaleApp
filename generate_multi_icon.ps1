Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\lenovo\.gemini\antigravity-ide\brain\00ef0cb8-67f8-4f30-ba68-d574712758a1\.user_uploaded\media_1787775503487.jpg"
$src = [System.Drawing.Image]::FromFile($srcPath)

function CreateSquareImage([System.Drawing.Image]$img, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 0, 0))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    
    $maxDim = [Math]::Max($img.Width, $img.Height)
    $innerSize = [int]($size * 0.94)
    $scale = [double]$innerSize / $maxDim
    $w = [int]($img.Width * $scale)
    $h = [int]($img.Height * $scale)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)
    
    $g.DrawImage($img, $x, $y, $w, $h)
    $g.Dispose()
    $bgBrush.Dispose()
    return $bmp
}

# 1. Generate 512x512 Master PNG
$png512 = CreateSquareImage $src 512

$destPngList = @(
    "d:\techmartWSApp\WholeSaleApp\electron\icon.png",
    "d:\techmartWSApp\WholeSaleApp\electron\app_logo.png",
    "d:\techmartWSApp\WholeSaleApp\frontend\public\app_logo.png",
    "d:\techmartWSApp\WholeSaleApp\frontend\public\favicon.png",
    "d:\techmartWSApp\WholeSaleApp\backend\assets\app_logo.png"
)

foreach ($dest in $destPngList) {
    $dir = Split-Path $dest
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $png512.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved PNG: $dest"
}

# 2. Build multi-resolution ICO file (256, 128, 64, 48, 32, 16)
$sizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($sz in $sizes) {
    $imgRes = CreateSquareImage $src $sz
    $ms = New-Object System.IO.MemoryStream
    $imgRes.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $imgRes.Dispose()
    $pngStreams += @{ Size = $sz; Bytes = $ms.ToArray() }
    $ms.Dispose()
}

$count = $sizes.Length
# ICONDIR is 6 bytes: 2 reserved, 2 type (1=ico), 2 count
# Each ICONDIRENTRY is 16 bytes
$headerSize = 6 + ($count * 16)
$icoStream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $icoStream

# Write ICONDIR
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$count)

$currentOffset = $headerSize

# Write ICONDIRENTRY headers
foreach ($entry in $pngStreams) {
    $sz = $entry.Size
    $widthByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $heightByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    
    $bw.Write($widthByte)       # Width
    $bw.Write($heightByte)      # Height
    $bw.Write([byte]0)          # ColorCount
    $bw.Write([byte]0)          # Reserved
    $bw.Write([UInt16]1)        # Planes
    $bw.Write([UInt16]32)       # BitCount
    $bw.Write([UInt32]$entry.Bytes.Length) # BytesInRes
    $bw.Write([UInt32]$currentOffset)      # ImageOffset
    
    $currentOffset += $entry.Bytes.Length
}

# Write Image Data
foreach ($entry in $pngStreams) {
    $bw.Write($entry.Bytes)
}

$icoBytes = $icoStream.ToArray()
$bw.Close()
$icoStream.Dispose()
$png512.Dispose()
$src.Dispose()

# Save ICO to electron, build, and frontend
$destIcoList = @(
    "d:\techmartWSApp\WholeSaleApp\electron\icon.ico",
    "d:\techmartWSApp\WholeSaleApp\build\icon.ico"
)

foreach ($dest in $destIcoList) {
    $dir = Split-Path $dest
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllBytes($dest, $icoBytes)
    Write-Host "Saved multi-resolution ICO: $dest (Size: $($icoBytes.Length) bytes)"
}

Write-Host "All multi-resolution assets generated successfully!"
