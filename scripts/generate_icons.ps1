Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Josh\.gemini\antigravity-cli\brain\01cbc3c1-4ac1-4ea4-9256-a87ef80062d7\.user_uploaded\uploaded_media_1795045685998.jpg"
if (-not (Test-Path $srcPath)) {
    throw "Source image not found at $srcPath"
}

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$publicDir = Join-Path $rootDir "public"
$buildDir = Join-Path $rootDir "build"
$androidRes = Join-Path $rootDir "android\app\src\main\res"

New-Item -ItemType Directory -Force -Path $publicDir | Out-Null
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)

function Resize-Bitmap {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [bool]$rounded = $false
    )
    $dest = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($rounded) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $width, $height)
        $g.SetClip($path)
    }

    $g.DrawImage($source, 0, 0, $width, $height)
    $g.Dispose()
    return $dest
}

function Save-Png {
    param(
        [System.Drawing.Bitmap]$bmp,
        [string]$outPath
    )
    $parent = Split-Path -Parent $outPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Build-Ico {
    param(
        [System.Drawing.Bitmap]$source,
        [int[]]$sizes,
        [string]$outPath
    )
    $pngBytesList = @()
    foreach ($sz in $sizes) {
        $bmp = Resize-Bitmap $source $sz $sz $false
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $pngBytesList += ,$ms.ToArray()
        $ms.Dispose()
    }

    $icoMs = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter $icoMs

    $bw.Write([UInt16]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]$sizes.Length)

    $offset = 6 + (16 * $sizes.Length)
    for ($i = 0; $i -lt $sizes.Length; $i++) {
        $sz = $sizes[$i]
        $bytes = $pngBytesList[$i]
        $w = if ($sz -ge 256) { 0 } else { [byte]$sz }
        $h = if ($sz -ge 256) { 0 } else { [byte]$sz }
        $bw.Write([byte]$w)
        $bw.Write([byte]$h)
        $bw.Write([byte]0)
        $bw.Write([byte]0)
        $bw.Write([UInt16]1)
        $bw.Write([UInt16]32)
        $bw.Write([UInt32]$bytes.Length)
        $bw.Write([UInt32]$offset)
        $offset += $bytes.Length
    }

    for ($i = 0; $i -lt $sizes.Length; $i++) {
        $bw.Write($pngBytesList[$i])
    }
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($outPath, $icoMs.ToArray())
    $bw.Dispose()
    $icoMs.Dispose()
}

Write-Output "Generating root & public PNGs..."
$logoPng = Join-Path $rootDir "logo.png"
Save-Png (Resize-Bitmap $srcBmp 1024 1024) $logoPng

$publicPng512 = Join-Path $publicDir "icon.png"
Save-Png (Resize-Bitmap $srcBmp 512 512) $publicPng512
Save-Png (Resize-Bitmap $srcBmp 512 512) (Join-Path $publicDir "icon-512.png")
Save-Png (Resize-Bitmap $srcBmp 192 192) (Join-Path $publicDir "icon-192.png")
Save-Png (Resize-Bitmap $srcBmp 180 180) (Join-Path $publicDir "apple-touch-icon.png")
Save-Png (Resize-Bitmap $srcBmp 32 32) (Join-Path $publicDir "icon-32.png")
Save-Png (Resize-Bitmap $srcBmp 16 16) (Join-Path $publicDir "icon-16.png")

Write-Output "Generating ICO files..."
$icoSizes = @(16, 24, 32, 48, 64, 128, 256)
Build-Ico $srcBmp $icoSizes (Join-Path $publicDir "favicon.ico")
Build-Ico $srcBmp $icoSizes (Join-Path $buildDir "app.ico")

Write-Output "Generating Android mipmaps..."
$mipmapSpecs = @(
    @{ Name = "mipmap-mdpi"; Size = 48 },
    @{ Name = "mipmap-hdpi"; Size = 72 },
    @{ Name = "mipmap-xhdpi"; Size = 96 },
    @{ Name = "mipmap-xxhdpi"; Size = 144 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192 }
)

foreach ($spec in $mipmapSpecs) {
    $dir = Join-Path $androidRes $spec.Name
    $sz = $spec.Size
    Save-Png (Resize-Bitmap $srcBmp $sz $sz $false) (Join-Path $dir "ic_launcher.png")
    Save-Png (Resize-Bitmap $srcBmp $sz $sz $true) (Join-Path $dir "ic_launcher_round.png")
}

$drawableDir = Join-Path $androidRes "drawable"
Save-Png (Resize-Bitmap $srcBmp 432 432 $false) (Join-Path $drawableDir "ic_launcher_foreground.png")

# Generate SVG wrapper with base64 data URL
$png512Bytes = [System.IO.File]::ReadAllBytes($publicPng512)
$base64Png = [Convert]::ToBase64String($png512Bytes)
$svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,$base64Png" x="0" y="0" width="512" height="512" />
</svg>
"@

[System.IO.File]::WriteAllText((Join-Path $rootDir "icon.svg"), $svgContent)
[System.IO.File]::WriteAllText((Join-Path $publicDir "icon.svg"), $svgContent)

$srcBmp.Dispose()
Write-Output "All icons generated successfully!"
