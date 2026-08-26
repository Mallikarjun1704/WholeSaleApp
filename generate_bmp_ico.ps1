Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\lenovo\.gemini\antigravity-ide\brain\00ef0cb8-67f8-4f30-ba68-d574712758a1\.user_uploaded\media_1787776464148.jpg"
$src = [System.Drawing.Image]::FromFile($srcPath)

function CreateSquareImage([System.Drawing.Image]$img, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $bmp.SetResolution(96, 96)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    $maxDim = [Math]::Max($img.Width, $img.Height)
    $innerSize = [int]($size * 0.92)
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

# ========== 1. Save PNGs ==========
$png512 = CreateSquareImage $src 512

$destPngs = @(
    "d:\techmartWSApp\WholeSaleApp\electron\icon.png",
    "d:\techmartWSApp\WholeSaleApp\electron\app_logo.png",
    "d:\techmartWSApp\WholeSaleApp\frontend\public\app_logo.png",
    "d:\techmartWSApp\WholeSaleApp\frontend\public\favicon.png",
    "d:\techmartWSApp\WholeSaleApp\backend\assets\app_logo.png"
)

foreach ($dest in $destPngs) {
    $dir = Split-Path $dest
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $png512.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved PNG: $dest"
}
$png512.Dispose()

# ========== 2. Build BMP-based ICO ==========
function Get-BmpBytesForIco([System.Drawing.Bitmap]$bmp) {
    $w = $bmp.Width
    $h = $bmp.Height

    # Lock bits to get raw BGRA pixel data
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $lockData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = [Math]::Abs($lockData.Stride)
    $totalBytes = $stride * $h
    $rawPixels = New-Object byte[] $totalBytes
    [System.Runtime.InteropServices.Marshal]::Copy($lockData.Scan0, $rawPixels, 0, $totalBytes)
    $bmp.UnlockBits($lockData)

    # BITMAPINFOHEADER (40 bytes)
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    $bw.Write([UInt32]40)          # biSize
    $bw.Write([Int32]$w)           # biWidth
    $bw.Write([Int32]($h * 2))     # biHeight (doubled for ICO)
    $bw.Write([UInt16]1)           # biPlanes
    $bw.Write([UInt16]32)          # biBitCount
    $bw.Write([UInt32]0)           # biCompression (BI_RGB)
    $bw.Write([UInt32]($w * $h * 4)) # biSizeImage
    $bw.Write([Int32]0)            # biXPelsPerMeter
    $bw.Write([Int32]0)            # biYPelsPerMeter
    $bw.Write([UInt32]0)           # biClrUsed
    $bw.Write([UInt32]0)           # biClrImportant

    # Pixel data in bottom-up order (ICO BMP requirement)
    for ($row = $h - 1; $row -ge 0; $row--) {
        $rowOffset = $row * $stride
        $bw.Write($rawPixels, $rowOffset, $w * 4)
    }

    # AND mask (1-bit, all zeros = fully opaque)
    $andRowBytes = [int]([Math]::Ceiling($w / 8.0))
    $andRowPadded = [int]([Math]::Ceiling($andRowBytes / 4.0) * 4)
    $andMask = New-Object byte[] ($andRowPadded * $h)
    $bw.Write($andMask, 0, $andMask.Length)

    $result = $ms.ToArray()
    $bw.Close()
    $ms.Dispose()
    return $result
}

# 256px entry uses PNG (standard for large ICO entries)
$img256 = CreateSquareImage $src 256
$ms256 = New-Object System.IO.MemoryStream
$img256.Save($ms256, [System.Drawing.Imaging.ImageFormat]::Png)
$png256Bytes = $ms256.ToArray()
$ms256.Dispose()
$img256.Dispose()

# Smaller sizes use BMP encoding (maximum Windows compatibility)
$entries = @()
$entries += @{ Size = 256; Bytes = $png256Bytes }

foreach ($sz in @(128, 64, 48, 32, 16)) {
    $imgSz = CreateSquareImage $src $sz
    $bmpBytes = Get-BmpBytesForIco $imgSz
    $entries += @{ Size = $sz; Bytes = $bmpBytes }
    $imgSz.Dispose()
    Write-Host "  Generated BMP entry: ${sz}x${sz} ($($bmpBytes.Length) bytes)"
}

# Build ICO container
$count = $entries.Length
$headerSize = 6 + ($count * 16)

$icoStream = New-Object System.IO.MemoryStream
$icoBw = New-Object System.IO.BinaryWriter($icoStream)

# ICONDIR
$icoBw.Write([UInt16]0)       # Reserved
$icoBw.Write([UInt16]1)       # Type = ICO
$icoBw.Write([UInt16]$count)  # Image count

$currentOffset = $headerSize

# ICONDIRENTRY for each image
foreach ($entry in $entries) {
    $sz = $entry.Size
    $widthByte  = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $heightByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    $icoBw.Write($widthByte)                     # Width
    $icoBw.Write($heightByte)                    # Height
    $icoBw.Write([byte]0)                        # ColorCount
    $icoBw.Write([byte]0)                        # Reserved
    $icoBw.Write([UInt16]1)                      # Planes
    $icoBw.Write([UInt16]32)                     # BitCount
    $icoBw.Write([UInt32]$entry.Bytes.Length)     # BytesInRes
    $icoBw.Write([UInt32]$currentOffset)          # ImageOffset

    $currentOffset += $entry.Bytes.Length
}

# Image data
foreach ($entry in $entries) {
    $icoBw.Write($entry.Bytes)
}

$icoBytes = $icoStream.ToArray()
$icoBw.Close()
$icoStream.Dispose()
$src.Dispose()

# Save ICO
$destIcos = @(
    "d:\techmartWSApp\WholeSaleApp\electron\icon.ico",
    "d:\techmartWSApp\WholeSaleApp\build\icon.ico"
)

foreach ($dest in $destIcos) {
    $dir = Split-Path $dest
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllBytes($dest, $icoBytes)
    Write-Host "Saved BMP-based ICO: $dest ($($icoBytes.Length) bytes, $count entries)"
}

Write-Host ""
Write-Host "SUCCESS: All icon assets generated with BMP-encoded ICO entries!"
Write-Host "ICO contains: 256px (PNG), 128px (BMP), 64px (BMP), 48px (BMP), 32px (BMP), 16px (BMP)"
