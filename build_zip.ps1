# Build ZIP for Chrome Web Store submission
# Run from the yt-distraction-free directory:
#   powershell -ExecutionPolicy Bypass -File build_zip.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$outDir = Join-Path $root "dist"
$zipPath = Join-Path $outDir "distraction-free-for-youtube.zip"

# Files/folders to include in the extension package
$include = @(
    "manifest.json",
    "popup.html",
    "popup.js",
    "styles.css",
    "src\background.js",
    "src\content.js",
    "src\quality.js",
    "images\icon16.png",
    "images\icon32.png",
    "images\icon48.png",
    "images\icon128.png",
    "LICENSE"
)

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

foreach ($rel in $include) {
    $full = Join-Path $root $rel
    if (-not (Test-Path $full)) {
        Write-Warning "Skipping missing file: $rel"
        continue
    }
    $entry = $zip.CreateEntry($rel.Replace('\', '/'))
    $writer = $entry.Open()
    $bytes  = [System.IO.File]::ReadAllBytes($full)
    $writer.Write($bytes, 0, $bytes.Length)
    $writer.Close()
    Write-Host "  + $rel"
}

$zip.Dispose()
Write-Host ""
Write-Host "Done! ZIP created at:"
Write-Host "  $zipPath"
Write-Host ""
$size = (Get-Item $zipPath).Length / 1KB
Write-Host ("  Size: {0:N1} KB" -f $size)
