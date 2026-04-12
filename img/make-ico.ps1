# Erstellt logo.ico aus logo.png im gleichen Ordner.
# Verwendet PNG-in-ICO Format (Windows Vista+) – jede Groesse wird als
# komprimiertes PNG eingebettet. Kein BMP-Konvertierungsfehler moeglich.
#
# Groessen: 256, 48, 32, 16 px

Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "logo.png"
$dstPath = Join-Path $PSScriptRoot "logo.ico"
$sizes   = @(256, 48, 32, 16)

if (-not (Test-Path $srcPath)) {
    Write-Error "logo.png nicht gefunden: $srcPath"
    exit 1
}

# Fuer jede Groesse eine skalierte PNG-Version erstellen
$pngList = [System.Collections.Generic.List[byte[]]]::new()

foreach ($sz in $sizes) {
    # PNG-Quelldaten per Stream laden (vermeidet Datei-Sperr-Probleme)
    $srcBytes  = [System.IO.File]::ReadAllBytes($srcPath)
    $srcStream = New-Object System.IO.MemoryStream(,$srcBytes)
    $srcImg    = [System.Drawing.Image]::FromStream($srcStream)

    # Skaliertes 32bpp-ARGB-Bitmap erstellen
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz,
           [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode   = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode       = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.CompositingQuality  = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.PixelOffsetMode     = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $sz, $sz)
    $g.Dispose()
    $srcImg.Dispose()
    $srcStream.Dispose()

    # Als PNG in MemoryStream speichern
    $outStream = New-Object System.IO.MemoryStream
    $bmp.Save($outStream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    $pngList.Add($outStream.ToArray())
    $outStream.Dispose()
}

# ICO-Datei zusammenbauen (PNG-in-ICO Format)
$count      = $pngList.Count
$dataOffset = 6 + 16 * $count   # ICO-Header + Verzeichnis-Eintraege

# Datei-Offsets berechnen
$offsets = New-Object int[] $count
$off = $dataOffset
for ($i = 0; $i -lt $count; $i++) {
    $offsets[$i] = $off
    $off += $pngList[$i].Length
}

$fs = [System.IO.File]::Open($dstPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICO-Datei-Header (6 Byte)
$bw.Write([uint16]0)       # Reserved = 0
$bw.Write([uint16]1)       # Typ = 1 (ICO)
$bw.Write([uint16]$count)  # Anzahl Bilder

# Verzeichnis-Eintraege (16 Byte je Bild)
for ($i = 0; $i -lt $count; $i++) {
    $sz = $sizes[$i]
    $w  = if ($sz -ge 256) { 0 } else { $sz }   # 0 = 256 laut ICO-Spec
    $bw.Write([byte]$w)                          # Breite
    $bw.Write([byte]$w)                          # Hoehe
    $bw.Write([byte]0)                           # Farbtabelle (0 = keine)
    $bw.Write([byte]0)                           # Reserved
    $bw.Write([uint16]0)                         # Farbebenen (0 = PNG)
    $bw.Write([uint16]32)                        # Bit pro Pixel
    $bw.Write([uint32]$pngList[$i].Length)       # Datenmenge in Bytes
    $bw.Write([uint32]$offsets[$i])              # Offset in Datei
}

# PNG-Rohdaten schreiben
for ($i = 0; $i -lt $count; $i++) {
    $bw.Write([byte[]]$pngList[$i])
}

$bw.Flush()
$bw.Close()

$size = (Get-Item $dstPath).Length
Write-Host "  logo.ico erstellt: $size Bytes"
Write-Host "  Groessen: $($sizes -join ', ') px (PNG-in-ICO)"
