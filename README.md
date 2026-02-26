# YouTube Distraction-Free Extension

A high-performance Chrome extension (Manifest V3) designed to create a distraction-free YouTube experience with automatic quality control.

## 🎯 Features

### 1. **UI Blocker**
- ✓ Hide all YouTube Shorts (homepage, sidebar, search results)
- ✓ Remove homepage recommendations feed
- ✓ Block sidebar/related videos on watch page
- ✓ Hide end screen elements
- ✓ All elements can be toggled on/off

### 2. **Auto-HD & Quality Locker**
- ✓ Force specific video resolution (360p, 480p, 720p, 1080p, 1440p, 2160p)
- ✓ Consistent quality across different frame rates
- ✓ Prevents YouTube from auto-downgrading quality
- ✓ Automatic quality enforcement during playback

### 3. **User Interface**
- ✓ Clean, modern popup settings panel
- ✓ Toggle controls for each blocking feature
- ✓ Quality dropdown selector
- ✓ Real-time settings synchronization
- ✓ One-click reset to defaults

### 4. **Technical Excellence**
- ✓ Manifest V3 compliant
- ✓ Optimized for performance (minimal CPU/memory impact)
- ✓ CSS injection for UI blocking (no layout thrashing)
- ✓ MutationObserver for dynamic content handling
- ✓ Chrome storage.sync for cross-device sync

## 📋 Project Structure

```
yt-distraction-free/
├── manifest.json           # Extension manifest (Manifest V3)
├── popup.html             # Settings UI
├── popup.js               # Settings logic
├── styles.css             # Popup styling
├── build.bat              # Build script (Windows)
├── build.sh               # Build script (Linux/macOS)
├── README.md              # This file
├── images/
│   ├── icon128.svg        # Large icon (SVG)
│   ├── icon128.png        # Large icon (PNG)
│   ├── icon48.png         # Medium icon (PNG)
│   └── icon16.png         # Small icon (PNG)
└── src/
    ├── content.js         # Content script (UI blocker)
    ├── background.js      # Service worker
    └── injected.js        # Player quality control (auto-injected)
```

## 🚀 Installation

### Quick Start (Windows)

1. **Build the extension:**
   ```batch
   cd yt-distraction-free
   build.bat
   ```

2. **Convert Icons (if not using ImageMagick):**
   - Use an online tool to convert `images/icon128.svg` to PNG
   - Save as `icon128.png`, `icon48.png`, `icon16.png`

3. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `yt-distraction-free` folder

### macOS/Linux

1. **Build the extension:**
   ```bash
   cd yt-distraction-free
   chmod +x build.sh
   ./build.sh
   ```

2. **Load in Chrome:** (same as Windows steps 3 above)

## ⚙️ Configuration

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Block YouTube Shorts | Toggle | ON | Hide all Shorts content |
| Block Homepage Recommendations | Toggle | ON | Hide recommended videos feed |
| Block Sidebar/Related Videos | Toggle | ON | Hide related videos on watch page |
| Block End Screens | Toggle | ON | Hide video end cards |
| Fixed Quality | Dropdown | Auto | Set target video resolution |
| Force same quality for all frame rates | Toggle | ON | Maintain resolution across frame rates |
| Enable Auto HD Quality Control | Toggle | ON | Actively enforce quality settings |
| Debug Mode | Toggle | OFF | Enable console logging |

### Saving Settings

Settings are automatically saved to Chrome's sync storage:
- Syncs across all devices (if signed into Chrome account)
- Changes take effect immediately on all YouTube tabs
- Click "Reset to Default" to restore original settings

## 🔧 How It Works

### Content Script (`src/content.js`)

1. **Loads Settings:** Retrieves user preferences from `chrome.storage.sync`
2. **CSS Injection:** Injects targeted CSS to hide unwanted elements
3. **DOM Monitoring:** Uses MutationObserver to reapply blocking when DOM changes
4. **Script Injection:** Injects player quality control script into page context
5. **Message Handling:** Listens for settings updates from popup

### Player Script (Injected)

1. **Waits for Player:** Monitors for YouTube player initialization
2. **Quality Enforcement:** Monitors video element and enforces quality settings
3. **Dynamic Updates:** Responds to quality setting changes in real-time
4. **Frame Rate Consistency:** Maintains resolution regardless of FPS

### Background Service Worker (`src/background.js`)

1. **Extension Lifecycle:** Handles install/update events
2. **Default Settings:** Initializes extension with default configuration
3. **Message Routing:** Relays messages between content scripts and popup
4. **Health Monitoring:** Periodic checks (debug mode)

## 🎨 UI/UX Design

- **Modern Dark Theme:** Easy on the eyes during extended use
- **Gradient Accents:** Blue/cyan highlights for key elements
- **Smooth Animations:** Polished toggle and button transitions
- **Responsive Layout:** Optimized for 400px popup width
- **Status Feedback:** Real-time confirmation of setting changes

## ⚡ Performance Optimization

| Optimization | Method | Benefit |
|--------------|--------|---------|
| CSS-based Hiding | Direct style injection | No layout recalculation |
| Debounced Updates | 500ms debounce on DOM changes | Reduced processing |
| Efficient Selectors | Specific CSS targets | Minimal DOM queries |
| Single Injection | Styles injected once | No memory bloat |
| Minimal Scripts | Focused functionality | Low CPU/memory |

## 🐛 Troubleshooting

### Settings Not Saving
- Ensure you're logged into a Google account in Chrome
- Check if `chrome.storage.sync` has quota available
- Try "Reset to Default" option

### Shorts Still Appearing
- YouTube updates its DOM structure frequently
- Try refreshing the page (Ctrl+R / Cmd+R)
- Check Debug Mode to see applied CSS

### Quality Not Holding
- Some videos may force specific quality limits
- Network bandwidth may cause auto-downgrade
- YouTube API limitations prevent programmatic quality setting

### Extension Not Loading
- Verify `manifest.json` is valid JSON
- Ensure all referenced files exist
- Check Developer mode is enabled in Chrome
- Review extension errors in `chrome://extensions/`

## 📝 Debug Mode

Enable "Debug Mode" in settings to see console logs:

```javascript
[YT-DF] Settings loaded: {...}
[YT-DF-Player] Video resolution: 1920x1080
[YT-DF] DOM changed, reapplying blocking...
```

View logs: Press `F12` → Console tab

## 🔐 Privacy & Permissions

### Requested:
- `storage` - Store user preferences
- `scripting` - Inject scripts for quality control
- `activeTab` - Access current YouTube tab
- `tabs` - Query and message YouTube tabs

### NOT Collected:
- ✓ No browsing history
- ✓ No personal data
- ✓ No analytics/tracking
- ✓ No external communication

## 📦 Dependencies

None! This extension uses only Chrome's built-in APIs:
- Chrome Manifest V3
- Chrome Storage API
- Chrome Scripting API
- Vanilla JavaScript (ES6+)

## 🤝 Contributing

To enhance this extension:

1. **UI Blocking:** Add more CSS selectors in `src/content.js`
2. **Quality Control:** Improve YouTube Player API integration
3. **Settings:** Add new options to `popup.html` and logic
4. **Styling:** Customize the popup design in `styles.css`

### Testing Checklist
- [ ] Settings save and persist
- [ ] Blocking works on different YouTube pages
- [ ] Popup opens without errors
- [ ] Quality settings don't break playback
- [ ] Extension works on fresh YouTube session

## 📄 License

This extension is provided as-is for personal use.

## 🔄 Version History

### v1.0.0 (Current)
-✓ Initial release
- ✓ All core features implemented
- ✓ Manifest V3 compliant
- ✓ Full settings sync

## 📞 Support

For issues or suggestions:
1. Check Debug Mode logs
2. Review troubleshooting section
3. Verify all files are present
4. Try reinstalling the extension

## 🎓 Learning Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

---

**Enjoy a distraction-free YouTube experience!** 🚀
