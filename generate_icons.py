#!/usr/bin/env python3
"""
Icon Generator for YouTube Distraction-Free Extension
Generates PNG icons from SVG or creates them programmatically
"""

import os
import sys
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        from PIL import Image, ImageDraw
        return True, "PIL (Pillow)"
    except ImportError:
        return False, "PIL (Pillow)"

def create_icon_with_pil(size, output_path):
    """Create an icon using PIL"""
    try:
        from PIL import Image, ImageDraw
        
        # Create image with dark blue background
        img = Image.new('RGB', (size, size), color=(15, 52, 96))  # #0f3460
        draw = ImageDraw.Draw(img)
        
        # Draw circle border
        margin = size // 4
        draw.ellipse(
            [(margin, margin), (size - margin, size - margin)],
            outline=(0, 212, 255),  # #00d4ff
            width=2
        )
        
        # Draw play triangle
        play_margin = size // 3
        triangle = [
            (size // 2 - play_margin // 2, size // 2 - play_margin),
            (size // 2 - play_margin // 2, size // 2 + play_margin),
            (size // 2 + play_margin, size // 2)
        ]
        draw.polygon(triangle, fill=(0, 212, 255))
        
        # Draw slash line (distraction-free indicator)
        line_margin = size // 4
        draw.line(
            [(line_margin, size - line_margin), (size - line_margin, line_margin)],
            fill=(255, 107, 107),  # #ff6b6b
            width=3
        )
        
        # Save the image
        img.save(output_path, 'PNG')
        return True
    except Exception as e:
        print(f"Error creating icon: {e}")
        return False

def main():
    """Main function"""
    print("YouTube Distraction-Free Icon Generator")
    print("=" * 40)
    
    # Determine if we can use PIL
    has_pil, lib_name = check_dependencies()
    
    if not has_pil:
        print(f"\n⚠ {lib_name} not found!")
        print("\nTo install PIL (Pillow):")
        print("  pip install Pillow")
        print("\nOr use the SVG-to-PNG converter online:")
        print("  1. Go to https://cloudconvert.com/svg-to-png")
        print("  2. Upload images/icon128.svg")
        print("  3. Convert and download as PNG")
        print("\nThen rename and place in images/ folder:")
        print("  - icon128.png")
        print("  - icon48.png")
        print("  - icon16.png")
        sys.exit(1)
    
    # Create icons directory if it doesn't exist
    images_dir = Path(__file__).parent / 'images'
    images_dir.mkdir(exist_ok=True)
    
    # Generate icons
    sizes = [128, 48, 16]
    
    print("\nGenerating PNG icons...")
    
    for size in sizes:
        output_path = images_dir / f'icon{size}.png'
        print(f"\nCreating {output_path.name} ({size}x{size})...", end=' ')
        
        if create_icon_with_pil(size, output_path):
            print("✓")
        else:
            print("✗")
            return False
    
    print("\n" + "=" * 40)
    print("✓ All icons generated successfully!")
    print("\nYou can now load the extension in Chrome:")
    print("1. Go to chrome://extensions/")
    print("2. Enable Developer mode")
    print("3. Click 'Load unpacked'")
    print(f"4. Select: {images_dir.parent.absolute()}")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
