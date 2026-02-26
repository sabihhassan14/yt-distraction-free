@echo off
REM Build Script for YouTube Distraction-Free Extension
REM This script generates PNG icons from SVG and validates the extension

echo.
echo ====================================
echo YouTube Distraction-Free Build Script
echo ====================================
echo.

REM Check if ffmpeg or imagemagick is available for conversion
where convert >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Converting SVG icons to PNG format...
    
    REM Convert SVG to PNG using ImageMagick
    convert.exe images/icon128.svg -resize 128x128 images/icon128.png
    convert.exe images/icon128.svg -resize 48x48 images/icon48.png
    convert.exe images/icon128.svg -resize 16x16 images/icon16.png
    
    echo ✓ PNG icons generated successfully
) else (
    echo.
    echo ⚠ ImageMagick not found. Using SVG reference files.
    echo Please convert the SVG files to PNG manually or install ImageMagick.
    echo.
    echo You can use online tools like:
    echo - https://cloudconvert.com/svg-to-png
    echo - https://convertio.co/svg-png/
    echo.
    echo Required dimensions:
    echo - icon16.png (16x16)
    echo - icon48.png (48x48)
    echo - icon128.png (128x128)
)

echo.
echo Validating manifest.json...
REM Basic validation
findstr /M "manifest_version" manifest.json >nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Manifest valid
) else (
    echo ✗ Manifest validation failed
    exit /b 1
)

echo.
echo ====================================
echo Build Complete!
echo ====================================
echo.
echo To install the extension:
echo 1. Open Chrome and go to chrome://extensions/
echo 2. Enable "Developer mode" (top right)
echo 3. Click "Load unpacked"
echo 4. Select this folder (%cd%)
echo.
echo Extension directory: %cd%
echo.
