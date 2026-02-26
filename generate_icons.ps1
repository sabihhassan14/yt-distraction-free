# Icon Generator using PowerShell - YouTube Distraction-Free Extension
# This script creates minimal PNG placeholder icon files for testing

param(
    [switch]$CreateMinimal
)

function Create-MinimalPNG {
    param(
        [string]$OutputPath,
        [int]$Size = 128
    )
    
    $Dir = Split-Path -Parent $OutputPath
    if (!(Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    }
    
    # Base64-encoded minimal valid PNG (8x8 transparent with colored pixel)
    $MinimalPNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    $bytes = [System.Convert]::FromBase64String($MinimalPNG)
    [System.IO.File]::WriteAllBytes($OutputPath, $bytes)
    
    Write-Host "  ✓ Created: $OutputPath"
}

Write-Host ""
Write-Host "YouTube Distraction-Free Extension - Icon Generator"
Write-Host "======================================================"
Write-Host ""

if ($CreateMinimal) {
    Write-Host "Creating minimal PNG placeholder files..."
    Write-Host ""
    
    $sizes = @(128, 48, 16)
    
    foreach ($size in $sizes) {
        $outputPath = Join-Path $PSScriptRoot "images\icon$($size).png"
        Create-MinimalPNG -OutputPath $outputPath -Size $size
    }
    
    Write-Host ""
    Write-Host "✓ PNG files created successfully!"
    Write-Host ""
    Write-Host "IMPORTANT: These are minimal placeholder files."
    Write-Host ""
    Write-Host "To use better-looking icons, convert the SVG file:"
    Write-Host "  1. Visit: https://cloudconvert.com/svg-to-png"
    Write-Host "  2. Upload: images\icon128.svg"
    Write-Host "  3. Download each size: 128x128, 48x48, 16x16"
    Write-Host "  4. Replace the PNG files with the converted versions"
    Write-Host ""
    Write-Host "Your extension is ready to load in Chrome:"
    Write-Host "  1. Open: chrome://extensions/"
    Write-Host "  2. Enable: Developer mode (top-right)"
    Write-Host "  3. Click: Load unpacked"
    Write-Host "  4. Select: This folder ($PSScriptRoot)"
    Write-Host ""
}
else {
    Write-Host "Quick Start:"
    Write-Host "  .\generate_icons.ps1 -CreateMinimal"
    Write-Host ""
}
