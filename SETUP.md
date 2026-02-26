# Quick Setup Guide

## Installation Steps

### Option 1: Automatic Icon Generation (Recommended)

#### Windows:
```batch
cd yt-distraction-free
python generate_icons.py
```

#### macOS/Linux:
```bash
cd yt-distraction-free
python3 generate_icons.py
```

### Option 2: Online Icon Conversion

1. Go to https://cloudconvert.com/svg-to-png
2. Upload `images/icon128.svg`
3. Resize to each dimension:
   - 128x128 → Save as `icon128.png`
   - 48x48 → Save as `icon48.png`  
   - 16x16 → Save as `icon16.png`
4. Place files in `images/` folder

### Option 3: Use ImageMagick (if installed)

**Windows:**
```batch
convert.exe images/icon128.svg -resize 128x128 images/icon128.png
convert.exe images/icon128.svg -resize 48x48 images/icon48.png
convert.exe images/icon128.svg -resize 16x16 images/icon16.png
```

**macOS/Linux:**
```bash
convert images/icon128.svg -resize 128x128 images/icon128.png
convert images/icon128.svg -resize 48x48 images/icon48.png
convert images/icon128.svg -resize 16x16 images/icon16.png
```

## Loading in Chrome

1. **Open Chrome**
2. **Go to:** `chrome://extensions/`
3. **Enable:** "Developer mode" (toggle in top-right)
4. **Click:** "Load unpacked"
5. **Select:** The `yt-distraction-free` folder
6. **Done!** The extension should now appear in your extensions list

## First Use

1. Click the extension icon in your Chrome toolbar
2. Configure your preferences:
   - Toggle blocking features on/off
   - Select your preferred video quality
   - Enable debug mode if needed
3. Click "Save Settings"
4. Visit YouTube to see the changes take effect

## Verification Checklist

- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Popup opens when clicked
- [ ] Settings save successfully
- [ ] YouTube Shorts are hidden
- [ ] Homepage feed is blocked
- [ ] Going to YouTube works normally
- [ ] Settings sync across tabs

## Troubleshooting

### Extension won't load
- Verify all files are in place
- Check Developer mode is enabled
- Look for errors in `chrome://extensions/`

### Icons not showing
- Generate PNG files using `generate_icons.py`
- Or convert SVG manually using an online tool
- Ensure files are named exactly: `icon16.png`, `icon48.png`, `icon128.png`

### Settings not saving
- Check you're logged into Chrome
- Try "Reset to Default" in settings
- Clear Chrome storage: Settings → Privacy → Clear browsing data

### Manifest error
- Verify `manifest.json` is valid JSON
- No trailing commas
- All required fields present

## File Checklist

```
yt-distraction-free/
✓ manifest.json
✓ popup.html
✓ popup.js
✓ styles.css
✓ README.md
✓ SETUP.md (this file)
✓ build.bat
✓ build.sh
✓ generate_icons.py
✓ src/
  ✓ content.js
  ✓ background.js
✓ images/
  ✓ icon128.svg
  ✓ icon128.png (after generation)
  ✓ icon48.png (after generation)
  ✓ icon16.png (after generation)
```

## Next Steps

1. **Test on YouTube:** Visit youtube.com and verify blocking works
2. **Try Different Resolutions:** Change quality setting and observe changes
3. **Enable Debug Mode:** See detailed logs in Chrome DevTools (F12)
4. **Check Features:** 
   - Toggle each blocking option on/off
   - Verify end screens are blocked
   - Test sidebar blocking on watch page

## Support

For detailed information, see [README.md](README.md)

---

**Happy distraction-free browsing!** 🎬
