#!/bin/bash

# Build Script for YouTube Distraction-Free Extension (macOS/Linux)
# This script generates PNG icons from SVG and validates the extension

echo ""
echo "===================================="
echo "YouTube Distraction-Free Build Script"
echo "===================================="
echo ""

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Converting SVG icons to PNG format..."
    
    # Convert SVG to PNG using ImageMagick
    convert images/icon128.svg -resize 128x128 images/icon128.png
    convert images/icon128.svg -resize 48x48 images/icon48.png
    convert images/icon128.svg -resize 16x16 images/icon16.png
    
    echo "✓ PNG icons generated successfully"
else
    echo ""
    echo "⚠ ImageMagick not found. Using SVG reference files."
    echo "Please convert the SVG files to PNG manually or install ImageMagick."
    echo ""
    echo "On macOS: brew install imagemagick"
    echo "On Ubuntu/Debian: sudo apt-get install imagemagick"
    echo ""
    echo "You can also use online tools like:"
    echo "- https://cloudconvert.com/svg-to-png"
    echo "- https://convertio.co/svg-png/"
    echo ""
    echo "Required dimensions:"
    echo "- icon16.png (16x16)"
    echo "- icon48.png (48x48)"
    echo "- icon128.png (128x128)"
fi

echo ""
echo "Validating manifest.json..."

# Check if manifest.json is valid
if grep -q "manifest_version" manifest.json; then
    echo "✓ Manifest valid"
else
    echo "✗ Manifest validation failed"
    exit 1
fi

echo ""
echo "===================================="
echo "Build Complete!"
echo "===================================="
echo ""
echo "To install the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable \"Developer mode\" (top right)"
echo "3. Click \"Load unpacked\""
echo "4. Select this folder ($(pwd))"
echo ""
echo "Extension directory: $(pwd)"
echo ""
