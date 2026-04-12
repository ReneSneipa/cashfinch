# Erstellt logo.ico aus logo.png im gleichen Ordner.
# Erzeugt echte BMP-kodierte ICO-Eintraege (keine PNG-Einbettung)
# fuer maximale Windows-Kompatibilitaet (Shortcuts, Taskbar, Explorer).
#
# Groessen: 256, 48, 32, 16 px

Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "logo.png"
$dstPath = Join-Path $PSScriptRoot "logo.ico"

$sizes = @(256, 48, 32, 16)

# Fuer jede Groesse ein 32bpp-ARGB-Bitmap erstellen und als BMP-Bytes kodieren
$images = foreach ($sz in $sizes) {
    $src  = [System.Drawing.Image]::FromFile($srcPath)
    $bmp  = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g    = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $g.Dispose(); $src.Dispose()

    # BMP-Rohdaten ohne Datei-Header (BITMAPINFOHEADER + Pixeldaten)
    # ICO-Format braucht BITMAPINFOHEADER mit doppelter Hoehe (XOR + AND-Masken)
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Bmp)
    $bmpBytes = $ms.ToArray()
    $ms.Dispose(); $bmp.Dispose()

    # BMP-Datei-Header (14 Byte) abschneiden -> nur DIB-Daten behalten
    # Hoehe im BITMAPINFOHEADER verdoppeln (ICO-Konvention: XOR + AND-Maske)
    $dib = $bmpBytes[14..($bmpBytes.Length - 1)]
    # Bytes 8-11 (biHeight) lesen und verdoppeln
    $h = [BitConverter]::ToInt32($dib, 8)
    $hBytes = [BitConverter]::GetBytes($h * 2)
    $dib[8]  = $hBytes[0]; $dib[9]  = $hBytes[1]
    $dib[10] = $hBytes[2]; $dib[11] = $hBytes[3]

    # AND-Maske (vollstaendig transparent = 0x00, Zeilenbreite auf 4 Bytes aufgerundet)
    $rowBytes = [Math]::Ceiling($sz / 32) * 4
    $andMask  = New-Object byte[] ($rowBytes * $sz)   # alle 0x00

    [PSCustomObject]@{
        Size    = $sz
        DibData = $dib
        AndMask = $andMask
    }
}

# ICO-Binaerformat zusammenbauen
$fs = New-Object System.IO.FileStream($dstPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

$count = $images.Count
$headerSize = 6
$dirEntrySize = 16
$dataOffset = $headerSize + $dirEntrySize * $count

# ICO-Datei-Header
$bw.Write([uint16]0)       # Reserved = 0
$bw.Write([uint16]1)       # Typ = 1 (ICO)
$bw.Write([uint16]$count)  # Anzahl Bilder

# Datenpositionen berechnen
$offsets = @()
$offset  = $dataOffset
foreach ($img in $images) {
    $offsets += $offset
    $offset  += $img.DibData.Length + $img.AndMask.Length
}

# Verzeichnis-Eintraege
for ($i = 0; $i -lt $count; $i++) {
    $img = $images[$i]
    $sz  = $img.Size
    $dataSize = $img.DibData.Length + $img.AndMask.Length

    $bw.Write([byte]$(if ($sz -ge 256) { 0 } else { $sz }))  # Breite  (0 = 256)
    $bw.Write([byte]$(if ($sz -ge 256) { 0 } else { $sz }))  # Hoehe   (0 = 256)
    $bw.Write([byte]0)           # Farbtabelle (0 = keine)
    $bw.Write([byte]0)           # Reserved
    $bw.Write([uint16]1)         # Farbebenen
    $bw.Write([uint16]32)        # Bit pro Pixel
    $bw.Write([uint32]$dataSize) # Groesse der Bilddaten
    $bw.Write([uint32]$offsets[$i]) # Offset zum Bild
}

# Bilddaten schreiben
foreach ($img in $images) {
    $bw.Write($img.DibData)
    $bw.Write($img.AndMask)
}

$bw.Close(); $fs.Close()

Write-Host "logo.ico erstellt: $((Get-Item $dstPath).Length) Bytes"
Write-Host "Groessen: $($sizes -join ', ') px"
