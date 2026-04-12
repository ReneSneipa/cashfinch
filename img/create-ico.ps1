# Erstellt img/logo.ico mit Windows System.Drawing (.NET)
# Garantiert Windows-kompatibles Icon-Format.
# Wird von install.bat aufgerufen.

param([string]$OutPath = (Join-Path $PSScriptRoot "logo.ico"))

Add-Type -AssemblyName System.Drawing

$size = 32
$bmp  = New-Object System.Drawing.Bitmap($size, $size)
$g    = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Cashfinch-Farbverlauf: Teal (#28B6E0) oben → Dunkelblau (#0A3558) unten
$topColor    = [System.Drawing.Color]::FromArgb(255, 40, 182, 224)
$bottomColor = [System.Drawing.Color]::FromArgb(255, 10,  53,  88)
$pt0   = New-Object System.Drawing.PointF(0, 0)
$pt1   = New-Object System.Drawing.PointF(0, $size)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($pt0, $pt1, $topColor, $bottomColor)

$g.FillEllipse($brush, 1, 1, ($size - 2), ($size - 2))
$brush.Dispose()
$g.Dispose()

$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs   = New-Object System.IO.FileStream($OutPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()

Write-Host "  logo.ico erstellt."
