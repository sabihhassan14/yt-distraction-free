# Developer Documentation

## Extension Architecture

### Overview
This Chrome extension uses Manifest V3 architecture with three main components:

```
┌─────────────────────────────────────────┐
│         Chrome Extension MV3            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Popup UI (popup.html)           │   │
│  │  - Settings Interface            │   │
│  │  - User Configuration            │   │
│  │  - Storage Sync                  │   │
│  └──────────────────────────────────┘   │
│             │                           │
│             ↓                           │
│  ┌──────────────────────────────────┐   │
│  │  Content Script (src/content.js) │   │
│  │  - UI Blocking (CSS)             │   │
│  │  - DOM Monitoring                │   │
│  │  - Script Injection              │   │
│  └──────────────────────────────────┘   │
│             │                           │
│             ↓                           │
│  ┌──────────────────────────────────┐   │
│  │  Injected Script                 │   │
│  │  - YouTube Player API            │   │
│  │  - Quality Control               │   │
│  │  - Frame Rate Handling           │   │
│  └──────────────────────────────────┘   │
│             │                           │
│             ↓                           │
│  ┌──────────────────────────────────┐   │
│  │  Service Worker (src/background) │   │
│  │  - Lifecycle Management          │   │
│  │  - Message Routing               │   │
│  │  - Storage Initialization        │   │
│  └──────────────────────────────────┘   │
│                                         │
│         ↓ Chrome Storage Sync ↓        │
│                                         │
│       youtube.com (YouTube Page)        │
│                                         │
└─────────────────────────────────────────┘
```

## Component Details

### 1. Popup (popup.html + popup.js + styles.css)

**Purpose:** User interface for configuration

**Key Functions:**
```javascript
loadSettings()           // Load from chrome.storage.sync
saveSettings()           // Save to chrome.storage.sync
resetSettings()          // Reset to defaults
setupEventListeners()    // Setup UI event handlers
showStatus()             // Display user feedback
```

**Storage Structure:**
```javascript
{
  blockShorts: boolean,
  blockHomepage: boolean,
  blockSidebar: boolean,
  blockEndscreen: boolean,
  qualitySelect: string,  // 'auto', '360', '480', '720', '1080', '1440', '2160'
  forceQualityFramerate: boolean,
  enableAutoHD: boolean,
  enableDebug: boolean
}
```

### 2. Content Script (src/content.js)

**Purpose:** DOM manipulation and UI blocking

**Key Functions:**
```javascript
init()                   // Initialize content script
loadSettings()           // Load user settings
applyBlocking()          // Apply all blocking rules
blockShorts()            // Hide Shorts
blockHomepage()          // Hide recommendations
blockSidebar()           // Hide related videos
blockEndscreen()         // Hide end cards
injectStyles()           // Inject CSS into page
setupMutationObservers() // Monitor DOM changes
injectPlayerScript()     // Inject quality control
handleMessage()          // Handle popup messages
```

**CSS Blocking Strategy:**
- Uses `display: none !important` for immediate hiding
- Applied to multiple selectors for different YouTube page states
- Reapplied on DOM changes via MutationObserver

**Performance Optimization:**
- Debounced DOM observer (500ms)
- Single style element per blocking rule
- Efficient CSS selectors (avoid complex DOM queries)

### 3. Service Worker (src/background.js)

**Purpose:** Background lifecycle management

**Key Functions:**
```javascript
chrome.runtime.onInstalled     // Setup on first install
chrome.runtime.onMessage        // Route messages
chrome.runtime.onStartup        // Daily startup
setInterval()                   // Health checks
```

**Storage Initialization:**
Runs on first install to set default values in `chrome.storage.sync`

### 4. Injected Script (inline in content.js)

**Purpose:** Access YouTube Player API

**Key Functions:**
```javascript
initializeQualityControl()  // Find and setup player
enforceQuality()            // Check video resolution
logQualityInfo()            // Log current quality
trySetQualityFromAPI()      // Attempt to set quality
```

**Limitations:**
- YouTube Player API doesn't expose quality setter directly
- Script monitors playback to ensure consistency
- User interaction may be required for some quality changes

## Data Flow

### Settings Update Flow
```
Popup UI Change
     ↓
popup.js saveSettings()
     ↓
chrome.storage.sync.set()
     ↓
chrome.tabs.sendMessage() → Content Script
     ↓
content.js handleMessage()
     ↓
window.postMessage() → Injected Script
     ↓
enforceQuality() + applyBlocking()
```

### Initial Load Flow
```
YouTube Page Load
     ↓
content.js init()
     ↓
loadSettings() from chrome.storage.sync
     ↓
injectStyles() + setupMutationObservers()
     ↓
injectPlayerScript()
     ↓
Ready to Block + Control Quality
```

## Manifest V3 Key Features

### Why Manifest V3?
1. **Security:** Restrictive permissions model
2. **Performance:** Service workers instead of persistent background
3. **Privacy:** Reduced content script capabilities
4. **Future-proof:** Required by Chrome in 2024+

### Key Differences from MV2
```javascript
// MV2 (Deprecated)
"background": {
  "scripts": ["background.js"]
}

// MV3 (Current)
"background": {
  "service_worker": "src/background.js"
}
```

### Manifest V3 Limitations & Solutions

| Limitation | Solution |
|-----------|----------|
| No persistent background | Use service_worker + storage |
| Restricted DOM access | Use content_scripts + injection |
| Limited history API | Use storage API |
| No eval() | Pre-compile all functions |

## Performance Considerations

### CSS Injection
- **Why:** Fastest way to hide elements
- **How:** Direct style element injection
- **Cost:** Minimal (one-time per rule)
- **Effect:** Immediate visual update

### MutationObserver
- **Why:** YouTube updates DOM frequently
- **How:** Debounced reapplication
- **Cost:** Low (500ms debounce)
- **Effect:** Maintains blocking on dynamic content

### Storage Sync
- **Why:** Chrome-cloud sync
- **How:** Async storage API
- **Cost:** One-time on startup
- **Benefit:** Cross-device synchronization

## Testing Guidelines

### Unit Testing Checklist
1. **Settings Storage**
   - [ ] Settings save correctly
   - [ ] Settings load on startup
   - [ ] Reset works properly

2. **UI Blocking**
   - [ ] Shorts hidden on homepage
   - [ ] Recommendations removed
   - [ ] Sidebar doesn't appear
   - [ ] End screens blocked

3. **Quality Control**
   - [ ] Quality selection works
   - [ ] Resolution is enforced
   - [ ] Quality persists during playback

4. **Integration**
   - [ ] Popup and content script communicate
   - [ ] Settings changes apply immediately
   - [ ] Multiple tabs sync correctly

### Debug Commands
```javascript
// In Console (F12) on youtube.com:

// Force quality check
window.postMessage({type: 'YT_DF_SETTINGS_UPDATED', settings: {...}}, '*')

// Check current settings
chrome.storage.sync.get(null, console.log)

// Clear storage
chrome.storage.sync.clear()

// Enable debug logs
chrome.storage.sync.set({enableDebug: true})
```

## Security Considerations

### Content Script Isolation
- Content script runs in isolated world
- Cannot directly access page scripts
- Uses `window.postMessage()` for communication

### Storage Permissions
- `chrome.storage.sync` requires explicit permission
- User can clear Chrome data to reset extension
- Settings encrypted during sync

### Host Permissions
- Only applies to `https://www.youtube.com/*`
- Cannot access YouTube API directly
- Limited to DOM manipulation only

## Extending the Extension

### Adding New Blocking Rules
```javascript
function blockNewFeature() {
    const styles = `
        /* Your CSS selectors */
        .some-element { display: none !important; }
    `;
    injectStyles('block-newfeature', styles);
}
```

### Adding New Settings
1. Add to `popup.html` UI element
2. Add to `DEFAULT_SETTINGS` object
3. Update `saveSettings()` function
4. Use in content script logic

### Quality Level Addition
```javascript
// In popup.html
<option value="new-res">Custom Resolution</option>

// Then use in enforceQuality()
```

## Common Issues & Solutions

### Issue: Content Script Not Loading
```
Debug:
1. Check manifest.json host_permissions
2. Verify content_scripts section
3. Check browser console errors
Solution: Restart extension (chrome://extensions/)
```

### Issue: Storage Not Syncing
```
Debug:
1. Verify chrome.storage.sync in permissions
2. Check user is logged into Chrome
3. Look for storage quota exceeded
Solution: Clear extension storage → Reset
```

### Issue: Blocking Not Working
```
Debug:
1. Enable Debug Mode in settings
2. Check console logs for CSS injection
3. Verify selectors match current YouTube DOM
Solution: YouTube updates DOM → May need CSS updates
```

## Updating CSS Selectors

YouTube frequently updates its DOM structure. If blocking stops working:

1. **Identify changed element:**
   - Right-click element in browser
   - Select "Inspect" 
   - Find new class/id names

2. **Update src/content.js:**
   - Add new selector in appropriate block function
   - Test in console first
   - Reload extension

3. **Example:**
```javascript
// Old selector might stop working
// ytd-video-renderer[is-shorts="true"]

// Update with new selector
// yt-video-item-view-model:has([content-id*="shorts"])
```

## Build & Distribution

### For Development
```bash
# Load unpacked in chrome://extensions/
# Enable Developer mode
# Click "Load unpacked"
# Select extension folder
```

### For Distribution (Future)
1. Create extension package (.zip)
2. Submit to Chrome Web Store
3. Set proper privacy policy
4. Request necessary permissions

## Conclusion

This extension demonstrates:
- ✅ Manifest V3 best practices
- ✅ Efficient DOM manipulation
- ✅ Chrome Storage API usage
- ✅ Message passing between scripts
- ✅ Performance optimization
- ✅ Security isolation

For questions or improvements, refer to:
- Chrome Extension Docs
- README.md
- INSTALLATION.md
- SETUP.md
