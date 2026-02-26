@echo off
setlocal enabledelayedexpansion

REM YouTube Distraction-Free Extension - Icon Generator (Batch)
REM Creates minimal PNG placeholder files

echo.
echo YouTube Distraction-Free Extension - Icon Generator
echo =====================================================
echo.

REM Check if images directory exists
if not exist "images" (
    mkdir images
    echo Created images directory
)

REM Create a minimal PNG using Python one-liner if Python is available
python -c "import struct,zlib;data=b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x01\x189_\xb1\x00\x00\x00\x00IEND\xaeB`\x82';open('images/icon128.png','wb').write(data);open('images/icon48.png','wb').write(data);open('images/icon16.png','wb').write(data)" 2>nul

if !ERRORLEVEL! EQU 0 (
    echo ✓ PNG files created successfully!
    echo.
    echo Extension is ready to load in Chrome:
    echo   1. Open: chrome://extensions/
    echo   2. Enable: Developer mode (top-right^)
    echo   3. Click: Load unpacked
    echo   4. Select: This folder (%cd%^)
    echo.
    echo NOTE: These are minimal placeholder PNG files.
    echo For better icons, convert images\icon128.svg using:
    echo   - https://cloudconvert.com/svg-to-png
    echo   - or install ImageMagick: convert.exe images/icon128.svg -resize 128x128 images/icon128.png
) else (
    echo Creating icons using alternative method...
    echo Please manually convert the SVG files to PNG:
    echo   1. Visit: https://cloudconvert.com/svg-to-png
    echo   2. Upload: images\icon128.svg
    echo   3. Download sizes: 128x128, 48x48, 16x16
    echo   4. Save as: icon128.png, icon48.png, icon16.png
)
echo.
