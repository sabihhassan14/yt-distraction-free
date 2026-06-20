# Testing & Validation Guide - June 2026 Update

## Pre-Deployment Checklist

Complete this checklist before deploying the optimized extension to users.

---

## ✅ TEST 1: Normal Playback (No Black Screen)

**Time Required**: 5 minutes  
**Critical for**: Verifying black screen fix

### Steps:
1. Open YouTube in incognito mode (fresh start)
2. Search for a music video or long-form content
3. Play the video
4. Watch for at least 3 minutes continuously
5. Open DevTools (F12) and check Console tab

### Expected Results:
- [ ] Video plays smoothly
- [ ] No black screens or flashing
- [ ] No console errors
- [ ] No console warnings about deprecated APIs
- [ ] CPU usage stable (check DevTools Performance tab: should be 2-3%)

### If it fails:
- Check that all three JS files were properly updated
- Clear extension cache: Settings → Privacy → Clear browsing data
- Disable/re-enable extension
- Check DevTools console for specific error messages

---

## ✅ TEST 2: Fullscreen Playback (Critical Fix)

**Time Required**: 5 minutes  
**Critical for**: Fullscreen black screen fix

### Steps:
1. Same video as Test 1
2. Click fullscreen button (or press F)
3. Watch for 3-5 minutes in fullscreen
4. Press ESC to exit fullscreen
5. Repeat (go fullscreen again for 2 minutes)

### Expected Results:
- [ ] Video visible throughout fullscreen
- [ ] No black screen when entering fullscreen
- [ ] No black screen when exiting fullscreen
- [ ] Controls fade in/out normally
- [ ] No performance drop in fullscreen

### If it fails:
- This likely means fullscreen canvas CSS not applied
- Check if `FULLSCREEN_SAFETY_CSS` is injected (DevTools → Sources → Styles)
- Verify `contain: layout` rule is in ENDSCREEN_CSS

---

## ✅ TEST 3: Video Completion (Endscreen Suppression)

**Time Required**: 5 minutes  
**Test for**: Endscreen suppression still works

### Steps:
1. Search for a short video (1-3 minutes)
2. Play it from start
3. Let it play to completion
4. Watch the end carefully

### Expected Results:
- [ ] Video ends
- [ ] No "endscreen" cards appear
- [ ] No suggested videos overlay
- [ ] No "next video" timer
- [ ] No pause overlay cards

### If it fails:
- Check `suppressEndscreen()` function is updated
- Check MutationObserver configuration (should have `subtree: false`)
- Verify STRIP_SELS and REMOVE_SELS still exist

---

## ✅ TEST 4: Shorts Blocking

**Time Required**: 3 minutes  
**Test for**: Shorts hiding still works

### Steps:
1. Go to YouTube.com homepage
2. Scroll down through recommendations
3. Look for Shorts section

### Expected Results:
- [ ] Shorts section not visible
- [ ] No Shorts shelf/carousel appears
- [ ] Recommendations flow smoothly without Shorts
- [ ] Mobile viewport: Shorts also hidden

### If it fails:
- YouTube may have changed Shorts selectors
- Check DOM_SELECTOR_REFERENCE_2026.md for latest selectors
- Add new selectors to `buildBlockingCSS()` if needed

---

## ✅ TEST 5: Channel Redirect

**Time Required**: 2 minutes  
**Test for**: Channel redirect logic unchanged

### Steps:
1. Find a channel (e.g., youtube.com/@Google)
2. Visit the channel
3. Watch the redirect happen

### Expected Results:
- [ ] Automatically redirected to /videos tab
- [ ] Doesn't show channel home
- [ ] Redirect happens quickly (<1 second)
- [ ] Works with both @handle and /channel/ID formats

### If it fails:
- `handleChannelRedirect()` may need adjustment
- Check if YouTube changed channel URL structure
- Verify `_redirectInFlight` guard is working

---

## ✅ TEST 6: Memory Leak Test (Long Session)

**Time Required**: 45 minutes  
**Test for**: Memory cleanup is working

### Steps:
1. Open DevTools → Memory tab
2. Take heap snapshot (click "Take heap snapshot")
3. Note the size (e.g., "45.2 MB")
4. Watch 5-10 different videos (3 minutes each)
5. Navigate between Home, Subscriptions, Trending (10+ times)
6. Take another heap snapshot after 40 minutes
7. Compare sizes

### Expected Results:
- [ ] Second snapshot ≤ first snapshot + 5MB
- [ ] Memory usage stays relatively stable
- [ ] No memory "cliff" where it suddenly spikes

### If it fails:
- Check cleanup code in yt-navigate-finish handler
- Verify intervals/timeouts are being cleared
- Look for any observer references not being disconnected
- Check DevTools Memory tab → Detached DOM Nodes (should be <10)

---

## ✅ TEST 7: Console Errors Check

**Time Required**: 2 minutes  
**Test for**: No deprecation warnings

### Steps:
1. Open any YouTube page
2. Open DevTools → Console
3. Clear console (Ctrl+L or click clear)
4. Reload page
5. Watch console for 30 seconds

### Expected Results:
- [ ] No errors (red messages)
- [ ] No warnings about deprecated APIs
- [ ] No warnings from extension
- [ ] No 404 errors on extension files

### If it fails:
- Look at specific error messages
- Search for the error in the code files
- Check if error is from YouTube or your extension

---

## ✅ TEST 8: Settings Persistence

**Time Required**: 3 minutes  
**Test for**: Storage still works

### Steps:
1. Open extension popup
2. Change a setting (e.g., toggle "Block Shorts")
3. Refresh page
4. Check if setting is still applied

### Expected Results:
- [ ] Setting persists after refresh
- [ ] Setting appears applied immediately
- [ ] No console errors about storage

### If it fails:
- Check if `chrome.storage.sync` is working
- Check if settings are being written to localStorage
- Verify `syncSettingsToLocalStorage()` is being called

---

## ✅ TEST 9: Different Video Types

**Time Required**: 15 minutes  
**Test for**: Compatibility across video types

### For each video type, play for 1 minute:
1. **Regular VOD** - Music video or educational content
   - [ ] Plays smoothly
   - [ ] Endscreen suppressed at end

2. **Premiere** - Live stream or premiere event
   - [ ] Plays without error
   - [ ] Chat sidebar works if not blocked

3. **Short form** - If watching before completion
   - [ ] Plays normally
   - [ ] Playlist continues

4. **Playlist** - Multiple videos
   - [ ] No endscreen between videos
   - [ ] Auto-play works

5. **Embedded** - On third-party website
   - [ ] Plays embedded version
   - [ ] Extension works in embedded context

### If any fails:
- Check if specific video type has special handling needed
- Look for errors in console specific to that video type
- May need to add specific selectors for that video type

---

## ✅ TEST 10: Viewport Tests

**Time Required**: 10 minutes  
**Test for**: Works on all viewport sizes

### Steps:
1. Open DevTools → Device Emulation (Ctrl+Shift+M)
2. Test each viewport:

**Mobile (375x667)**
- [ ] Extension works
- [ ] No layout errors
- [ ] Shorts blocked
- [ ] Endscreen suppressed

**Tablet (768x1024)**
- [ ] Extension works
- [ ] Plays smoothly
- [ ] All features working

**Desktop (1920x1080)**
- [ ] Extension works
- [ ] Performance good
- [ ] Fullscreen works

**Ultra-wide (3840x2160)**
- [ ] Extension works
- [ ] No stretching/distortion

### If any fails:
- Check if selectors are viewport-specific
- Verify CSS rules use relative units
- May need media query adjustments

---

## ✅ TEST 11: Performance Metrics

**Time Required**: 5 minutes  
**Test for**: Verify performance improvements

### Steps:
1. Open DevTools → Performance
2. Click record
3. Play a video for 10 seconds
4. Stop recording
5. Check metrics

### Expected Results:
- [ ] Frame rate stable at 60 FPS
- [ ] No long tasks (>50ms)
- [ ] CPU usage < 5%
- [ ] Memory stable (no leak)

### Comparison:
| Metric | Before | After | Target |
|--------|--------|-------|--------|
| CPU % | 8-12% | 2-3% | ✅ |
| FPS | 45-50 | 59-60 | ✅ |
| Long tasks | 5-8 | 0-1 | ✅ |
| Memory | 15-18 MB | 8-10 MB | ✅ |

---

## ✅ TEST 12: Browser Compatibility

**Time Required**: 10 minutes  
**Test for**: Works on supported browsers

### Chrome (Latest)
- [ ] Extension loads
- [ ] All features work
- [ ] No errors

### Edge (Latest)
- [ ] Extension loads
- [ ] All features work
- [ ] No errors

### Brave (Latest)
- [ ] Extension loads
- [ ] All features work
- [ ] No errors

### If any fails:
- Check browser-specific API differences
- May need polyfills or fallbacks
- Check browser console for compatibility errors

---

## 🔄 REGRESSION TEST CHECKLIST

After any future updates, verify these don't break:

- [ ] Black screen doesn't return
- [ ] Fullscreen video visible
- [ ] Endscreen cards don't appear
- [ ] Shorts are hidden
- [ ] No memory leak
- [ ] CPU usage stays low
- [ ] FPS stays at 60
- [ ] Settings persist
- [ ] Channel redirect works
- [ ] Works on mobile/tablet

---

## 📊 PERFORMANCE BASELINE (For Comparison)

Record these values for future comparisons:

**Date**: June 20, 2026  
**Version**: 1.1.0

| Metric | Value | Target |
|--------|-------|--------|
| CPU Usage (idle) | 2-3% | < 5% |
| CPU Usage (playing) | 3-5% | < 10% |
| FPS | 59-60 | > 50 |
| Memory | 8-10 MB | < 15 MB |
| Load Time | 150ms | < 500ms |
| Observer Fires/sec | 0-2 | < 5 |

---

## 🐛 TROUBLESHOOTING

### Black Screen Appears Again
1. Check fullscreen CSS is still in place
2. Verify MutationObserver `subtree: false`
3. Clear extension cache and reload
4. Check DevTools console for errors

### Memory Grows Over Time
1. Check all intervals are being cleared
2. Verify observers are disconnected on navigation
3. Check for circular references
4. Use DevTools Memory → Take heap snapshot

### Settings Don't Persist
1. Check `chrome.storage.sync` errors
2. Verify `syncSettingsToLocalStorage()` called
3. Check browser privacy settings aren't blocking
4. Look for Storage API errors in console

### Endscreen Cards Still Appear
1. Verify `suppressEndscreen()` is updated
2. Check observer configuration
3. Clear cache and reload
4. Try opening a different video

### Fullscreen Still Black
1. Check `FULLSCREEN_SAFETY_CSS` is injected
2. Verify canvas rules are in stylesheet
3. Check DevTools → Elements → Styles for the CSS
4. Try different video (may be video-specific issue)

---

## ✅ FINAL SIGN-OFF

Before deploying, initial all completed items:

- [ ] All 12 tests passed
- [ ] No console errors
- [ ] Performance metrics meet targets
- [ ] Code changes reviewed
- [ ] Backward compatibility verified
- [ ] Documentation updated
- [ ] Regression tests passed

**Tester Name**: _________________  
**Date**: _________________  
**Browser**: _________________  
**OS**: _________________  

**Status**: ☐ Ready for Deployment | ☐ Needs More Work

---

**Notes**:

_____________________________________________________________________

_____________________________________________________________________

---

**Version**: 1.1.0  
**Updated**: June 20, 2026  
**Next Review**: September 2026
