/**
 * Generate a proper Windows ICO file with BMP-encoded entries
 * (not PNG-compressed) for maximum compatibility with Windows
 * desktop/taskbar/shortcut icons.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// We'll use sharp if available, otherwise fall back to pure approach
// For this script, we use System.Drawing via PowerShell as a fallback

const SOURCE = path.join(
  'C:', 'Users', 'lenovo', '.gemini', 'antigravity-ide',
  'brain', '00ef0cb8-67f8-4f30-ba68-d574712758a1',
  '.user_uploaded', 'media_1787776464148.jpg'
);

// Since we can't easily do BMP encoding in pure Node without sharp/canvas,
// we'll use a PowerShell helper that uses System.Drawing to create BMP data.
// This script orchestrates the whole process.

const DEST_PNGS = [
  'electron/icon.png',
  'electron/app_logo.png',
  'frontend/public/app_logo.png',
  'frontend/public/favicon.png',
  'backend/assets/app_logo.png',
];

const DEST_ICOS = [
  'electron/icon.ico',
  'build/icon.ico',
];

// PowerShell script that generates BMP-based ICO
const ps1Content = `
Add-Type -AssemblyName System.Drawing

$srcPath = "${SOURCE.replace(/\\/g, '\\\\')}"
$src = [System.Drawing.Image]::FromFile($srcPath)

function CreateSquareImage([System.Drawing.Image]$img, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $bmp.SetResolution(96, 96)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Fill black background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    
    # Scale and center the image
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

# Save PNGs
$png512 = CreateSquareImage $src 512
${DEST_PNGS.map(p => {
  const abs = path.resolve(p).replace(/\\/g, '\\\\');
  return `$png512.Save("${abs}", [System.Drawing.Imaging.ImageFormat]::Png); Write-Host "Saved PNG: ${abs}"`;
}).join('\n')}
$png512.Dispose()

# ---- Build BMP-based ICO ----
# ICO with BMP entries (traditional format, maximum Windows compatibility)
$sizes = @(256, 48, 32, 16)

function Get-BmpBytesForIco([System.Drawing.Bitmap]$bmp) {
    # For ICO BMP entries:
    # - BITMAPINFOHEADER with height = 2 * actual height (to account for AND mask)
    # - Raw BGRA pixel data (bottom-up)
    # - AND mask (1-bit, all zeros for fully opaque)
    
    $w = $bmp.Width
    $h = $bmp.Height
    
    # BITMAPINFOHEADER (40 bytes)
    $header = New-Object byte[] 40
    $bw = New-Object System.IO.BinaryWriter (New-Object System.IO.MemoryStream($header, $true))
    $bw.Write([UInt32]40)          # biSize
    $bw.Write([Int32]$w)           # biWidth
    $bw.Write([Int32]($h * 2))     # biHeight (doubled for ICO)
    $bw.Write([UInt16]1)           # biPlanes
    $bw.Write([UInt16]32)          # biBitCount (32-bit BGRA)
    $bw.Write([UInt32]0)           # biCompression (BI_RGB)
    $bw.Write([UInt32]0)           # biSizeImage
    $bw.Write([Int32]0)            # biXPelsPerMeter
    $bw.Write([Int32]0)            # biYPelsPerMeter
    $bw.Write([UInt32]0)           # biClrUsed
    $bw.Write([UInt32]0)           # biClrImportant
    $bw.Close()
    
    # Pixel data: BGRA, bottom-up row order
    $pixelData = New-Object byte[] ($w * $h * 4)
    for ($y2 = 0; $y2 -lt $h; $y2++) {
        for ($x2 = 0; $x2 -lt $w; $x2++) {
            $pixel = $bmp.GetPixel($x2, ($h - 1 - $y2))  # bottom-up
            $offset = ($y2 * $w + $x2) * 4
            $pixelData[$offset + 0] = $pixel.B
            $pixelData[$offset + 1] = $pixel.G
            $pixelData[$offset + 2] = $pixel.R
            $pixelData[$offset + 3] = $pixel.A
        }
    }
    
    # AND mask: 1 bit per pixel, rows padded to 4 bytes
    $andRowBytes = [Math]::Ceiling($w / 8.0)
    $andRowPadded = [int]([Math]::Ceiling($andRowBytes / 4.0) * 4)
    $andMask = New-Object byte[] ($andRowPadded * $h)
    # All zeros = fully opaque (no transparent pixels in AND mask)
    
    # Combine header + pixels + AND mask
    $ms = New-Object System.IO.MemoryStream
    $ms.Write($header, 0, $header.Length)
    $ms.Write($pixelData, 0, $pixelData.Length)
    $ms.Write($andMask, 0, $andMask.Length)
    $result = $ms.ToArray()
    $ms.Dispose()
    return $result
}

# For 256x256, use PNG compression (this is the standard for large sizes)
$img256 = CreateSquareImage $src 256
$ms256 = New-Object System.IO.MemoryStream
$img256.Save($ms256, [System.Drawing.Imaging.ImageFormat]::Png)
$png256Bytes = $ms256.ToArray()
$ms256.Dispose()
$img256.Dispose()

# For smaller sizes, use BMP encoding
$entries = @()
$entries += @{ Size = 256; Bytes = $png256Bytes; IsPng = $true }

foreach ($sz in @(48, 32, 16)) {
    $imgSz = CreateSquareImage $src $sz
    $bmpBytes = Get-BmpBytesForIco $imgSz
    $entries += @{ Size = $sz; Bytes = $bmpBytes; IsPng = $false }
    $imgSz.Dispose()
}

# Build ICO file
$count = $entries.Length
$headerSize = 6 + ($count * 16)

$icoStream = New-Object System.IO.MemoryStream
$icoBw = New-Object System.IO.BinaryWriter $icoStream

# ICONDIR header
$icoBw.Write([UInt16]0)       # Reserved
$icoBw.Write([UInt16]1)       # Type (1 = ICO)
$icoBw.Write([UInt16]$count)  # Count

$currentOffset = $headerSize

# ICONDIRENTRY for each size
foreach ($entry in $entries) {
    $sz = $entry.Size
    $widthByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
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

# Save ICO files
${DEST_ICOS.map(p => {
  const abs = path.resolve(p).replace(/\\/g, '\\\\');
  return `[System.IO.File]::WriteAllBytes("${abs}", $icoBytes); Write-Host "Saved BMP-based ICO: ${abs} (Size: $($icoBytes.Length) bytes)"`;
}).join('\n')}

Write-Host "SUCCESS: All icon assets generated with BMP-encoded ICO entries!"
`;

const scriptPath = path.resolve('generate_bmp_ico.ps1');
fs.writeFileSync(scriptPath, ps1Content, 'utf-8');
console.log('PowerShell script written to:', scriptPath);
console.log('Run it with: powershell -ExecutionPolicy Bypass -File generate_bmp_ico.ps1');
