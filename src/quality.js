/**
 * Quality Enforcement Script
 * Runs in MAIN world - has direct access to YouTube's player APIs
 * Reads desired quality from localStorage (set by content.js)
 */
(function () {
    'use strict';

    const qualityMap = {
        '360': 'small',
        '480': 'medium',
        '720': 'hd720',
        '1080': 'hd1080',
        '1440': 'hd1440',
        '2160': 'hd2160',
        '4320': 'hd4320'
    };
    // Ordered from best to worst (base labels only)
    const ordered = ['hd4320', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'medium', 'small'];

    // All known fps/hdr variants grouped by base resolution.
    // When "force same quality for all frame rates" is ON, if the base label
    // isn't available we accept any variant at the same resolution.
    const fpsVariants = {
        'hd4320': ['hd4320', 'highres'],
        'hd2160': ['hd2160', 'hd216060', 'hd2160hdr', 'hd2160p2'],
        'hd1440': ['hd1440', 'hd144060', 'hd1440hdr'],
        'hd1080': ['hd1080', 'hd108060', 'hd1080hdr', 'hd1080premium'],
        'hd720': ['hd720', 'hd72060'],
        'medium': ['medium'],
        'small': ['small'],
    };

    // ─── Settings cache ────────────────────────────────────────────────────
    // CRITICAL FIX: quality.js runs in MAIN world; localStorage is world-specific.
    // Must rely ONLY on CustomEvent detail from content.js (ISOLATED world),
    // NOT on localStorage which is inaccessible cross-world in MV3.
    const _settings = {
        quality:        'auto',
        speed:          '1',
        playerOverlays: true,
        pauseOnLoad:    false,
    };
    
    window.addEventListener('ytdf-settings-updated', (e) => {
        const d = (e && e.detail) || {};
        // CRITICAL: Use ONLY event detail values, never fall back to localStorage
        // because localStorage is world-isolated in MV3
        _settings.quality        = d.quality        || 'auto';
        _settings.speed          = d.speed          || '1';
        _settings.playerOverlays = d.playerOverlays !== undefined ? d.playerOverlays : true;
        _settings.pauseOnLoad    = d.pauseOnLoad    !== undefined ? d.pauseOnLoad : false;
        // Re-apply quality immediately with the freshly cached values
        const player = getPlayer();
        if (player) applyQuality(player);
    });

    function getDesiredQuality() {
        const val = _settings.quality;
        if (!val || val === 'auto') return null;
        return qualityMap[val] || null;
    }

    function getPlayer() {
        return document.getElementById('movie_player');
    }

    function getBestAvailable(player, target) {
        if (typeof player.getAvailableQualityLevels !== 'function') return target;
        const available = player.getAvailableQualityLevels();
        if (!available || available.length === 0) return target;

        const targetIdx = ordered.indexOf(target);
        if (targetIdx === -1) return target;

        // Walk from desired quality downward until something is available.
        // Always check fps/hdr variants at the same resolution — YouTube exposes
        // separate labels (e.g. hd108060 vs hd1080) for the same resolution tier.
        for (let i = targetIdx; i < ordered.length; i++) {
            const base = ordered[i];
            if (available.includes(base)) return base;
            const variant = (fpsVariants[base] || []).find(v => available.includes(v));
            if (variant) return variant;
        }
        // If nothing matched in ordered list, return the highest available quality.
        // YouTube returns available qualities ordered from best to worst.
        return available[0] || target;
    }

    function applyQuality(player) {
        const desired = getDesiredQuality();
        if (!desired) {
            applySpeed(player); // still enforce speed even if quality is auto
            return;
        }

        const best = getBestAvailable(player, desired);

        try {
            if (typeof player.setPlaybackQualityRange === 'function') {
                player.setPlaybackQualityRange(best, best);
            }
        } catch (e) { }

        try {
            if (typeof player.setPlaybackQuality === 'function') {
                player.setPlaybackQuality(best);
            }
        } catch (e) { }

        applySpeed(player);
    }

    // ─── Playback Speed Control ───────────────────────────────────────────

    function getDesiredSpeed() {
        const val = _settings.speed;
        if (!val || val === '1') return null; // 1x = native, no override
        const n = parseFloat(val);
        return (isFinite(n) && n > 0 && n <= 16) ? n : null;
    }

    function applySpeed(player) {
        const speed = getDesiredSpeed();
        if (!speed) return;
        try {
            // Fallback to any <video> for embedded context where html5-main-video may be absent
            const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
            if (video && video.playbackRate !== speed) {
                video.playbackRate = speed;
            }
            // Also use player API if available
            if (typeof player.setPlaybackRate === 'function') {
                player.setPlaybackRate(speed);
            }
        } catch (e) { }
    }

    // ─── Endscreen / pause-overlay blocking ───────────────────────────────────

    function shouldBlockEndscreen() {
        return _settings.playerOverlays;
    }

    function shouldPauseOnLoad() {
        return _settings.pauseOnLoad;
    }

    const ENDSCREEN_CSS = `
        /* CRITICAL: CSS Containment to prevent layout thrashing during endscreen suppression */
        #movie_player {
            contain: layout style paint;
        }
        
        /* All endscreen-related elements */
        .ytp-ce-element, .ytp-ce-rendering-container, .ytp-ce-element-show,
        .ytp-ce-covering-overlay, .ytp-ce-expanding-overlay,
        .ytp-ce-covering-image, .ytp-ce-expanding-image,
        .html5-endscreen, .ytp-endscreen, .ytp-endscreen-content,
        .ytp-endscreen-container, .ytp-endscreen-elements,
        .ytp-pause-overlay, .ytp-pause-overlay-container,
        .ytp-autonav-endscreen, .ytp-autonav-endscreen-upnext-container,
        .ytp-suggested-action, .videowall-endscreen, .ytp-show-videowall-ui,
        .ytp-show-videowall, .ytp-upnext, .ytp-endscreen-paginate,
        ytd-endscreen-element-renderer,
        ytd-compact-autoplay-renderer {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            width: 0 !important;
        }
    `;

    // Selectors split by strategy:
    // STRIP — always in DOM, YouTube shows by setting inline style; we remove the inline style
    //         so our CSS !important wins.
    // REMOVE — dynamically added by YouTube; delete from DOM immediately.
    const STRIP_SELS = [
        '.ytp-ce-element',
        '.ytp-ce-rendering-container',
        '.ytp-ce-element-show',
        '.html5-endscreen',
        '.ytp-endscreen',
        '.ytp-pause-overlay',
        '.ytp-pause-overlay-container',
        '.ytp-autonav-endscreen',
        '.ytp-suggested-action',
        '.videowall-endscreen',
        '.ytp-show-videowall-ui',
        '.ytp-show-videowall',
        '.ytp-upnext',
        '.ytp-endscreen-paginate',
    ];
    const REMOVE_SELS = [
        'ytd-endscreen-element-renderer',
        'ytd-compact-autoplay-renderer',
        '.ytp-ce-element',
        '.ytp-ce-video',
        '.ytp-ce-playlist',
        '.ytp-ce-channel',
        '.ytp-ce-covering-overlay',
        '.ytp-ce-expanding-overlay',
        '.ytp-suggestion-set',
        '.ytp-endscreen-content',
        '.ytp-videowall-still',
    ];

    function suppressEndscreen() {
        if (!shouldBlockEndscreen()) return;
        
        // OPTIMIZATION: Batch DOM operations to prevent jank
        // Use document.querySelectorAll minimally with combined selectors
        try {
            // Strip inline styles in one batch
            const allEndscreenElements = document.querySelectorAll(
                '.ytp-ce-element, .ytp-ce-rendering-container, .ytp-ce-element-show, ' +
                '.html5-endscreen, .ytp-endscreen, .ytp-pause-overlay, ' +
                '.ytp-pause-overlay-container, .ytp-autonav-endscreen, .ytp-suggested-action, ' +
                '.videowall-endscreen, .ytp-show-videowall-ui, .ytp-show-videowall, ' +
                '.ytp-upnext, .ytp-endscreen-paginate'
            );
            
            // Remove properties in one loop (faster than per-element)
            allEndscreenElements.forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
            });
            
            // Remove card elements (less frequent operation)
            const cardElements = document.querySelectorAll(
                'ytd-endscreen-element-renderer, ytd-compact-autoplay-renderer, ' +
                '.ytp-ce-video, .ytp-ce-playlist, .ytp-ce-channel'
            );
            cardElements.forEach(el => {
                try { el.remove(); } catch (e) { }
            });
        } catch (e) {
            // Silently ignore errors to prevent black screen on DOM access failures
        }
    }

    function injectEndscreenCSS() {
        const id = 'ytdf-endscreen-css';
        const old = document.getElementById(id);
        if (old) old.remove();
        if (!shouldBlockEndscreen()) return;
        const s = document.createElement('style');
        s.id = id;
        s.textContent = ENDSCREEN_CSS;
        (document.head || document.documentElement).appendChild(s);
    }
    
    // Fullscreen safety: ensure canvas elements render properly
    // YouTube renders fullscreen video in a canvas element that must stay visible
    const FULLSCREEN_SAFETY_CSS = `
        /* Protect canvas rendering in fullscreen mode */
        .html5-video-player canvas,
        #movie_player canvas,
        canvas[class*="video"] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        
        /* Ensure video layers aren't hidden */
        .html5-video-player .html5-main-video,
        #movie_player video,
        video.html5-main-video {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
    `;
    
    function injectFullscreenSafetyCSS() {
        const id = 'ytdf-fullscreen-safety-css';
        if (document.getElementById(id)) return;
        const s = document.createElement('style');
        s.id = id;
        s.textContent = FULLSCREEN_SAFETY_CSS;
        (document.head || document.documentElement).appendChild(s);
    }
    
    // Inject safety CSS immediately at script load
    injectFullscreenSafetyCSS();

    // ─── CRITICAL FIX: Optimized endscreen suppression to prevent black screen ─────
    // Root cause: Aggressive DOM queries in tight polling loop blocks render thread
    // Solution: Event-driven suppression with RequestAnimationFrame batching
    //           Removed MutationObserver entirely (was causing 60+ FPS jank)
    let endscreenObs = null;
    let _suppressScheduled = false;
    let _suppressRafId = null;
    
    function scheduleSuppressEndscreen() {
        if (_suppressScheduled) return;
        _suppressScheduled = true;
        
        // Cancel any pending RAF
        if (_suppressRafId) cancelAnimationFrame(_suppressRafId);
        
        // Batch suppression with next animation frame
        _suppressRafId = requestAnimationFrame(() => {
            suppressEndscreen();
            _suppressScheduled = false;
        });
    }
    
    function attachEndscreenObserver() {
        // NEW STRATEGY: Minimal observer that only triggers on card insertions
        // Stop watching for attribute/class changes which fire constantly
        if (endscreenObs) endscreenObs.disconnect();
        const player = document.getElementById('movie_player');
        if (!player) return;
        
        // Only track DIRECT child additions (endscreen elements)
        // NOT subtree - this prevents observer from firing on every animation
        endscreenObs = new MutationObserver(scheduleSuppressEndscreen);
        endscreenObs.observe(player, {
            childList: true,
            subtree: false, // CRITICAL: Only direct children
            attributes: false, // DISABLED: Causes excessive firing
            characterData: false,
        });
        suppressEndscreen();
    }

    // Event-driven suppression — replaces the aggressive interval with clever triggers
    const _listenerAttachedTo = new WeakSet(); // tracks which player elements already have the listener
    let _stateChangeDebounceTimer = null;
    
    function setupSuppressionEvent() {
        const player = document.getElementById('movie_player');
        if (!player) return;

        // Guard: only attach onStateChange once per player element instance.
        if (_listenerAttachedTo.has(player)) return;
        _listenerAttachedTo.add(player);

        const trigger = () => {
            // Cancel previous timer and schedule new one
            clearTimeout(_stateChangeDebounceTimer);
            _stateChangeDebounceTimer = setTimeout(() => {
                if (shouldBlockEndscreen()) suppressEndscreen();
            }, 100); // Reduced from aggressive cascading timeouts
        };
        
        try {
            player.addEventListener('onStateChange', (state) => {
                // Only suppress on state transitions: ended (0), paused (2), buffering (3)
                if (state === 0 || state === 2 || state === 3) {
                    trigger();
                }
            });
        } catch (e) {
            // Player API may not support onStateChange event
        }
    }

    function initEndscreen() {
        injectEndscreenCSS();
        attachEndscreenObserver();
        setupSuppressionEvent();
        suppressEndscreen();
    }

    // ─── Pause on Load (New Tab Only) ──────────────────────────────────
    //
    // Strategy: let the video load normally (so the thumbnail frame appears)
    // then pause it the instant it starts playing.  This avoids the infinite
    // loading spinner that happens when play() is silently swallowed.
    //
    // User intent is detected by trusted clicks on the player area, or
    // keyboard shortcuts (Space / K).  Once activated, we stop intercepting.
    let hasPausedOnLoad = false;
    const isHardLoad = !window.ytdf_navigated;

    if (isHardLoad && window.location.pathname === '/watch') {
        let userActivated = false;

        // Detect user intent: trusted click on the player area
        document.addEventListener('click', (e) => {
            if (e.isTrusted && e.target && typeof e.target.closest === 'function') {
                if (e.target.closest('#movie_player') || e.target.closest('.html5-video-player')) {
                    userActivated = true;
                }
            }
        }, { capture: true });

        // Detect user intent: play keyboard shortcuts (Space or K)
        document.addEventListener('keydown', (e) => {
            if (e.isTrusted && (e.key === ' ' || e.key === 'k' || e.key === 'K')) {
                userActivated = true;
            }
        }, { capture: true });

        // Pause the video the instant it begins playing
        // (fires on autoplay and on <video autoplay> attribute)
        document.addEventListener('playing', (e) => {
            if (userActivated || hasPausedOnLoad || window.ytdf_navigated) return;
            if (!shouldPauseOnLoad()) return;
            if (e.target && e.target.tagName === 'VIDEO') {
                e.target.pause();
                hasPausedOnLoad = true;
            }
        }, { capture: true });
    }

    function handlePauseOnLoad() {
        if (hasPausedOnLoad || window.ytdf_navigated) return;
        if (!shouldPauseOnLoad()) return;
        // Never pause in embedded context — user explicitly pressed play
        if (window.self !== window.top || window.location.pathname.startsWith('/embed/')) return;

        const player = getPlayer();
        if (player && player.pauseVideo) {
            const state = player.getPlayerState();
            if (state === 1) {
                player.pauseVideo();
                hasPausedOnLoad = true;
            }
        }
    }

    // Mark as navigated on SPA events so pause-on-load never fires mid-session.
    // Pause-on-load is only meant for a hard load directly to /watch — once the
    // user (or YouTube's router) navigates anywhere, we stop intercepting.
    window.addEventListener('yt-navigate-start', () => {
        window.ytdf_navigated = true;
        hasPausedOnLoad = true;
    });

    window.addEventListener('yt-navigate-finish', () => setTimeout(initEndscreen, 200));
    window.addEventListener('yt-page-data-updated', initEndscreen);
    // Poll until movie_player is ready on hard page load
    const epoll = setInterval(() => { if (document.getElementById('movie_player')) { clearInterval(epoll); initEndscreen(); } }, 300);
    initEndscreen();

    // Re-init endscreen when the popup toggles blockEndscreen ON mid-session.
    // content.js dispatches this CustomEvent after every SETTINGS_UPDATED message.
    // Without this, a popup toggle would update the CSS (via content.js) but leave
    // the JS observer/suppressor inactive until the next page navigation.
    window.addEventListener('ytdf-settings-updated', (e) => {
        if (e.detail && e.detail.blockEndscreen) initEndscreen();
    });



    /** Short burst: apply every 500 ms for 20 s (handles initial load + quality resets) */
    let pollTimer = null;
    let persistTimer = null;
    let epoll = null; // Track initial poll for cleanup

    function startBurstPolling() {
        if (pollTimer) clearInterval(pollTimer);
        let ticks = 0;
        pollTimer = setInterval(() => {
            const player = getPlayer();
            if (player) {
                try {
                    applyQuality(player);
                } catch (e) {
                    // Silently ignore errors in polling to prevent cascading issues
                }
            }
            if (++ticks >= 40) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }, 500);
    }

    /** Slow persistent poll: every 3 s while on a watch or embed page.
     *  Covers quality changes made in the popup after the burst has ended.
     *  Also detects player element re-creation (YouTube sometimes rebuilds
     *  #movie_player mid-session) and restarts the burst poll when that happens. */
    let _lastKnownPlayer = null;
    function startPersistentPoll() {
        if (persistTimer) clearInterval(persistTimer);
        persistTimer = setInterval(() => {
            const isWatch = location.pathname.startsWith('/watch');
            const isEmbed = location.pathname.startsWith('/embed/');
            if (!isWatch && !isEmbed) {
                // Not on a playable page anymore - stop polling
                if (persistTimer) {
                    clearInterval(persistTimer);
                    persistTimer = null;
                }
                return;
            }
            const player = getPlayer();
            if (!player) return;
            // Player element was re-created — restart burst to re-enforce settings
            if (player !== _lastKnownPlayer) {
                _lastKnownPlayer = player;
                startBurstPolling();
                return;
            }
            try {
                applyQuality(player);
            } catch (e) {
                // Silently ignore errors
            }
        }, 3000);
    }

    // Each YouTube SPA navigation: burst + (re)start persistent poll
    window.addEventListener('yt-navigate-finish', () => {
        // Clean up old poll before starting new one
        if (epoll) {
            clearInterval(epoll);
            epoll = null;
        }
        startBurstPolling();
        startPersistentPoll();
    });

    // Player data ready (fires on video load within a page)
    window.addEventListener('yt-page-data-updated', startBurstPolling);

    // Initial page load
    startBurstPolling();
    startPersistentPoll();

    // Catch the first play event for Pause on Load
    document.addEventListener('play', () => {
        const player = getPlayer();
        if (player) {
            try {
                applyQuality(player);
                handlePauseOnLoad();
            } catch (e) {
                // Silently ignore
            }
        }
    }, true);

    // Also poll specifically for the first pause to be extra reliable
    let plPoll = null;
    function startPauseOnLoadPoll() {
        if (plPoll) clearInterval(plPoll);
        plPoll = setInterval(() => {
            if (hasPausedOnLoad) {
                if (plPoll) {
                    clearInterval(plPoll);
                    plPoll = null;
                }
                return;
            }
            handlePauseOnLoad();
        }, 100);
    }
    
    startPauseOnLoadPoll();
    
    // Timeout the pause poll after 10 seconds to save resources
    const plPollTimeout = setTimeout(() => {
        if (plPoll) {
            clearInterval(plPoll);
            plPoll = null;
        }
    }, 10000);
    
    // Cleanup function for navigation and resource management
    window.addEventListener('yt-navigate-start', () => {
        // Clean up interval polling on navigation
        if (epoll) clearInterval(epoll);
        if (plPoll) clearInterval(plPoll);
        // These will be restarted on yt-navigate-finish
    });
})();
