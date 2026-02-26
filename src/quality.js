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
        '2160': 'hd2160'
    };
    // Ordered from best to worst (base labels only)
    const ordered = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'medium', 'small'];

    // All known fps/hdr variants grouped by base resolution.
    // When "force same quality for all frame rates" is ON, if the base label
    // isn't available we accept any variant at the same resolution.
    const fpsVariants = {
        'hd2160': ['hd2160', 'hd216060', 'hd2160hdr', 'hd2160p2'],
        'hd1440': ['hd1440', 'hd144060', 'hd1440hdr'],
        'hd1080': ['hd1080', 'hd108060', 'hd1080hdr', 'hd1080premium'],
        'hd720': ['hd720', 'hd72060'],
        'medium': ['medium'],
        'small': ['small'],
    };

    function getDesiredQuality() {
        const val = localStorage.getItem('ytdf_quality');
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
        return target;
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
        const val = localStorage.getItem('ytdf_speed');
        if (!val || val === '1') return null; // 1x = native, no override
        const n = parseFloat(val);
        return (isFinite(n) && n > 0 && n <= 16) ? n : null;
    }

    function applySpeed(player) {
        const speed = getDesiredSpeed();
        if (!speed) return;
        try {
            const video = document.querySelector('video.html5-main-video');
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
        const val = localStorage.getItem('ytdf_endscreen');
        return val !== '0';
    }

    function shouldPauseOnLoad() {
        return localStorage.getItem('ytdf_pause_on_load') === '1';
    }

    const ENDSCREEN_CSS = `
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
        // Strip inline styles so our CSS !important stylesheet rule wins
        STRIP_SELS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.style.removeProperty('display');
                el.style.removeProperty('visibility');
                el.style.removeProperty('opacity');
                el.style.removeProperty('pointer-events');
            });
        });
        // Remove card elements entirely
        REMOVE_SELS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });
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

    // Tight-scoped MutationObserver on #movie_player only.
    // childList catches card elements being inserted.
    // attributes (class/style) catches YouTube toggling visibility on existing elements.
    // We strip inline styles immediately — our CSS !important then hides them.
    let endscreenObs = null;
    function attachEndscreenObserver() {
        if (endscreenObs) endscreenObs.disconnect();
        const player = document.getElementById('movie_player');
        if (!player) return;
        endscreenObs = new MutationObserver(() => suppressEndscreen());
        endscreenObs.observe(player, {
            childList: true,
            subtree: true,
        });
        suppressEndscreen();
    }

    // Event-driven suppression — replaces the aggressive interval with clever triggers
    let _suppressionSetUp = false;
    const _listenerAttachedTo = new WeakSet(); // tracks which player elements already have the listener
    function setupSuppressionEvent() {
        const player = document.getElementById('movie_player');
        if (!player) return;

        // Guard: only create the persistent backstop interval once per page lifetime
        if (!_suppressionSetUp) {
            _suppressionSetUp = true;
            setInterval(() => {
                if (shouldBlockEndscreen()) suppressEndscreen();
            }, 1000);
        }

        // Guard: only attach onStateChange once per player element instance.
        // YouTube's SPA keeps #movie_player alive across navigations, so without
        // this guard every yt-navigate-finish / yt-page-data-updated call would
        // stack another listener on the same element.
        if (_listenerAttachedTo.has(player)) return;
        _listenerAttachedTo.add(player);

        const trigger = () => {
            if (shouldBlockEndscreen()) suppressEndscreen();
        };
        player.addEventListener('onStateChange', (state) => {
            if (state === 0 || state === 2 || state === 3) {
                trigger();
                setTimeout(trigger, 500);
                setTimeout(trigger, 1000);
            }
        });
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
                if (localStorage.getItem('ytdf_debug') === '1') {
                    console.log('[YT-DF] Autoplay paused (new tab)');
                }
            }
        }, { capture: true });
    }

    function handlePauseOnLoad() {
        if (hasPausedOnLoad || window.ytdf_navigated) return;
        if (!shouldPauseOnLoad()) return;

        const player = getPlayer();
        if (player && player.pauseVideo) {
            const state = player.getPlayerState();
            if (state === 1) {
                player.pauseVideo();
                hasPausedOnLoad = true;
            }
        }
    }

    // Mark as navigated on SPA events
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

    function startBurstPolling() {
        if (pollTimer) clearInterval(pollTimer);
        let ticks = 0;
        pollTimer = setInterval(() => {
            const player = getPlayer();
            if (player) applyQuality(player);
            if (++ticks >= 40) clearInterval(pollTimer);
        }, 500);
    }

    /** Slow persistent poll: every 3 s while on a watch page.
     *  Covers quality changes made in the popup after the burst has ended. */
    function startPersistentPoll() {
        if (persistTimer) clearInterval(persistTimer);
        persistTimer = setInterval(() => {
            if (!location.pathname.startsWith('/watch')) return;
            const player = getPlayer();
            if (player) applyQuality(player);
        }, 3000);
    }

    // Each YouTube SPA navigation: burst + (re)start persistent poll
    window.addEventListener('yt-navigate-finish', () => {
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
            applyQuality(player);
            handlePauseOnLoad();
        }
    }, true);

    // Also poll specifically for the first pause to be extra reliable
    const plPoll = setInterval(() => {
        if (hasPausedOnLoad) {
            clearInterval(plPoll);
            return;
        }
        handlePauseOnLoad();
    }, 100);
    // Timeout the pause poll after 10 seconds to save resources
    setTimeout(() => clearInterval(plPoll), 10000);
})();
