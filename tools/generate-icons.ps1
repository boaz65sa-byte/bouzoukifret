# Regenerates icons/icon-192.png and icons/icon-512.png from the vector shapes
# defined in icons/icon.svg (kept in sync manually - see that file for source of truth).
Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param([single]$X, [single]$Y, [single]$W, [single]$H, [single]$R)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $R * 2
    $path.AddArc($X, $Y, $d, $d, 180, 90)
    $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
    $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
    $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-Icon {
    param([int]$Size, [string]$OutPath)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = $Size / 512.0
    $g.ScaleTransform($scale, $scale)

    $bg     = [System.Drawing.Color]::FromArgb(255, 0x0b, 0x16, 0x23)
    $gold   = [System.Drawing.Color]::FromArgb(255, 0xe3, 0xb3, 0x41)
    $goldLt = [System.Drawing.Color]::FromArgb(255, 0xf0, 0xcc, 0x74)

    $bgPath = New-RoundedRectPath -X 0 -Y 0 -W 512 -H 512 -R 96
    $g.FillPath((New-Object System.Drawing.SolidBrush($bg)), $bgPath)

    $g.FillEllipse((New-Object System.Drawing.SolidBrush($gold)), 60, 215, 240, 250)
    $g.FillEllipse((New-Object System.Drawing.SolidBrush($bg)), 132, 288, 96, 104)

    $state = $g.Save()
    $g.TranslateTransform(251, 195)
    $g.RotateTransform(38)
    $neckPath = New-RoundedRectPath -X -21 -Y -125 -W 42 -H 250 -R 14
    $g.FillPath((New-Object System.Drawing.SolidBrush($gold)), $neckPath)
    $g.Restore($state)

    $state2 = $g.Save()
    $g.TranslateTransform(375, 66)
    $g.RotateTransform(38)
    $headPath = New-RoundedRectPath -X -35 -Y -26 -W 70 -H 52 -R 12
    $g.FillPath((New-Object System.Drawing.SolidBrush($goldLt)), $headPath)
    $g.Restore($state2)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$iconsDir = Join-Path $PSScriptRoot "..\icons"
New-Icon -Size 192 -OutPath (Join-Path $iconsDir "icon-192.png")
New-Icon -Size 512 -OutPath (Join-Path $iconsDir "icon-512.png")
Write-Host "Generated icon-192.png and icon-512.png in $iconsDir"
