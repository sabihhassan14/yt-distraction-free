/**
 * Content Script - Main UI Blocker (ISOLATED world)
 * Runs on YouTube pages to hide unwanted elements via CSS injection.
 * Communicates the desired quality to quality.js via localStorage
 * (quality.js runs in the MAIN world and directly accesses the YouTube player API).
 */

const DEFAULT_SETTINGS = {
    blockShorts: true,
    blockHomepage: true,
    blockSidebar: true,
    blockPlayerOverlays: true,
    minimizeChat: true,
    blockChannelAutoplay: true,
    redirectChannelHome: true,
    pauseOnLoad: false,
    blurThumbnails: false,
    hideMetrics: false,
    speedControl: '1',
    qualitySelect: 'auto'
};

// Current settings — start with defaults so CSS injection is instant
let currentSettings = { ...DEFAULT_SETTINGS };

/**
 * Write all settings to localStorage in one pass so quality.js (MAIN world)
 * always has up-to-date values available synchronously.
 */
function syncSettingsToLocalStorage(s) {
    localStorage.setItem('ytdf_quality',          s.qualitySelect || 'auto');
    localStorage.setItem('ytdf_player_overlays',  s.blockPlayerOverlays ? '1' : '0');
    localStorage.setItem('ytdf_chat',             s.minimizeChat      ? '1' : '0');
    localStorage.setItem('ytdf_pause_on_load',    s.pauseOnLoad       ? '1' : '0');
    localStorage.setItem('ytdf_blur_thumbnails',  s.blurThumbnails    ? '1' : '0');
    localStorage.setItem('ytdf_hide_metrics',     s.hideMetrics       ? '1' : '0');
    localStorage.setItem('ytdf_speed',            s.speedControl      || '1');
    localStorage.setItem('ytdf_redirect_channel', s.redirectChannelHome ? '1' : '0');
}

/**
 * Synchronously read user preferences from localStorage into currentSettings
 * BEFORE any CSS is injected so there is no flash of wrong styles.
 * Missing keys are seeded with extension defaults.
 */
(function preSeedLocalStorage() {
    const seed = {
        ytdf_pause_on_load:   DEFAULT_SETTINGS.pauseOnLoad      ? '1' : '0',
        ytdf_player_overlays: DEFAULT_SETTINGS.blockPlayerOverlays ? '1' : '0',
        ytdf_chat:            DEFAULT_SETTINGS.minimizeChat     ? '1' : '0',
        ytdf_blur_thumbnails: DEFAULT_SETTINGS.blurThumbnails   ? '1' : '0',
        ytdf_hide_metrics:    DEFAULT_SETTINGS.hideMetrics      ? '1' : '0',
        ytdf_speed:           DEFAULT_SETTINGS.speedControl     || '1',
        ytdf_redirect_channel: DEFAULT_SETTINGS.redirectChannelHome ? '1' : '0',
        ytdf_quality:         DEFAULT_SETTINGS.qualitySelect || 'auto',
    };
    for (const [k, v] of Object.entries(seed)) {
        if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
    }

    // Read back real values (may differ from defaults if user toggled last visit)
    const ls = (k) => localStorage.getItem(k);
    currentSettings.hideMetrics         = ls('ytdf_hide_metrics')    === '1';
    currentSettings.pauseOnLoad         = ls('ytdf_pause_on_load')   === '1';
    currentSettings.blockPlayerOverlays = ls('ytdf_player_overlays') === '1';
    currentSettings.minimizeChat        = ls('ytdf_chat')            === '1';
    currentSettings.blurThumbnails      = ls('ytdf_blur_thumbnails') === '1';
    currentSettings.speedControl        = ls('ytdf_speed') || '1';
    currentSettings.redirectChannelHome = ls('ytdf_redirect_channel') === '1';
    const q = ls('ytdf_quality');
    if (q) currentSettings.qualitySelect = q;
})();

// ── IMMEDIATE CSS injection at document_start (before DOM renders) ──
// Uses synchronously-read settings so metric-hiding rules are present from frame 0.
(function earlyInjectCSS() {
    const style = document.createElement('style');
    style.id = 'yt-df-blocking';
    style.textContent = buildBlockingCSS();
    (document.head || document.documentElement).appendChild(style);
})();

/**
 * Initialize the content script
 */
function init() {
    // CSS was already injected synchronously at document_start.
    // If the <style> tag somehow got lost (edge case), re-inject it.
    if (!document.getElementById('yt-df-blocking')) injectBlockingCSS();

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener(handleMessage);

    // Fetch real settings from storage; update CSS + localStorage when ready
    // Note: handleChannelRedirect is NOT called here — the readyState check below
    // and the yt-navigate-start listener already cover every case. Calling it a
    // third time here creates a race where the storage callback fires while the
    // SPA router is still processing the first redirect.
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        currentSettings = settings;
        syncSettingsToLocalStorage(settings);
        applyBlocking();
        setupMutationObservers();
        setupGridFixObserver();
    });

    // 1. Instant catch for SPA navigation (before rendering starts).
    //    _redirectInFlight prevents re-entry: when location.replace fires,
    //    YouTube's SPA router raises yt-navigate-start again before the URL
    //    updates, which would otherwise call handleChannelRedirect a second time
    //    with the old pathname still visible.
    window.addEventListener('yt-navigate-start', () => {
        if (currentSettings.redirectChannelHome) handleChannelRedirect();
    });

    // 2. Catch for deep-linking or hard-reloads
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        if (currentSettings.redirectChannelHome) handleChannelRedirect();
    }

    // Re-run on SPA navigation: grid fix, autoplay prevention, subscriber hiding.
    // Also reset the redirect guard so the next channel navigation works.
    window.addEventListener('yt-navigate-finish', () => {
        _redirectInFlight = false;
        setTimeout(() => {
            setupGridFixObserver();
            if (currentSettings.blockChannelAutoplay) preventChannelAutoplay();
            if (currentSettings.hideMetrics) hideSubscriberCountsJS();
        }, 800);
    });
}

/**
 * Handle messages from popup
 */
function handleMessage(request, sender, sendResponse) {
    if (request.type === 'SETTINGS_UPDATED') {
        currentSettings = request.settings;
        syncSettingsToLocalStorage(currentSettings);

        if (currentSettings.blockChannelAutoplay) preventChannelAutoplay();
        if (currentSettings.redirectChannelHome)  handleChannelRedirect();

        applyBlocking();

        // Notify quality.js (MAIN world) that settings changed.
        // CustomEvents dispatched on window are visible across ISOLATED/MAIN worlds
        // because both share the same underlying DOM window object.
        // quality.js listens for this to re-init endscreen suppression when
        // blockEndscreen is toggled ON mid-session (the normal initEndscreen call
        // only runs on navigation, so popup toggles would otherwise be CSS-only).
        window.dispatchEvent(new CustomEvent('ytdf-settings-updated', {
            detail: { blockEndscreen: !!currentSettings.blockPlayerOverlays }
        }));

        sendResponse({ success: true });
    }
}

/**
 * Build the blocking CSS string from current settings
 */
function buildBlockingCSS() {
    const s = currentSettings;
    return `
        ${s.blockShorts ? `
        ytd-reel-shelf-renderer,
        ytd-reel-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer:has(a[href*="/shorts/"]),
        ytd-shorts-shelf-renderer,
        ytd-shorts-shelf-renderer:has(a[href*="/shorts/"]),
        ytd-reel-video-renderer,
        ytd-reel-item-renderer,
        ytd-shorts,
        ytd-rich-shelf-renderer[is-shorts],
        ytd-rich-shelf-renderer[is-shorts="true"],
        ytd-rich-shelf-renderer:has(a[href*="/shorts/"]),
        grid-shelf-view-model:has(a[href*="/shorts/"]),
        ytm-shorts-lockup-view-model,
        ytm-shorts-lockup-view-model-v2,
        ytd-lockup-view-model[is-shorts],
        yt-lockup-view-model[is-shorts],
        ytd-rich-item-renderer:has(a[href*="/shorts/"]),
        ytd-grid-video-renderer:has(a[href*="/shorts/"]),
        ytd-video-renderer:has(a[href*="/shorts/"]),
        ytd-compact-video-renderer:has(a[href*="/shorts/"])
        { display:none !important; height:0 !important; min-height:0 !important; margin:0 !important; padding:0 !important; }
        ` : `
        ytd-reel-shelf-renderer,
        ytd-reel-shelf-renderer[is-shorts],
        ytd-shorts-shelf-renderer,
        ytd-reel-video-renderer,
        ytd-reel-item-renderer,
        ytd-shorts,
        ytd-rich-shelf-renderer[is-shorts],
        ytd-rich-shelf-renderer[is-shorts="true"],
        ytd-lockup-view-model[is-shorts],
        yt-lockup-view-model[is-shorts]
        { display:block !important; }
        `}
        ytd-guide-entry-renderer:has(a[href^="/shorts"]),ytd-guide-entry-renderer:has(a[title="Shorts"]),ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]),ytd-mini-guide-entry-renderer:has(a[title="Shorts"]){display:${s.blockShorts ? 'none' : 'flex'} !important}
        ytd-grid-video-renderer:has(a[href*="/shorts/"]),yt-tab-shape[tab-title="Shorts"],tp-yt-paper-tab:has([aria-label="Shorts"]){display:${s.blockShorts ? 'none' : 'flex'} !important}
        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer{display:${s.blockHomepage ? 'none' : 'block'} !important}
        ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts="true"]){
            display:none !important;height:0 !important;min-height:0 !important;margin:0 !important;padding:0 !important;
        }
        #secondary,#secondary-inner,#related{
            display:${s.blockSidebar ? 'none' : 'block'} !important;
        }
        ytd-watch-two-column-results-renderer{display:grid !important;grid-template-columns:${s.blockSidebar ? '1fr' : '1fr 390px'} !important}
        .ytp-watermark,.iv-branding{display:${s.blockPlayerOverlays ? 'none' : 'block'} !important}
        /* End screens and pause overlay — use all four properties to beat
           any specificity or inline-style override YouTube may apply */
        ${s.blockPlayerOverlays ? `
        #movie_player .html5-endscreen,
        #movie_player .ytp-endscreen,
        #movie_player .ytp-endscreen-content,
        #movie_player .ytp-endscreen-container,
        #movie_player .ytp-endscreen-elements,
        #movie_player .ytp-ce-element,
        #movie_player .ytp-ce-rendering-container,
        #movie_player .ytp-ce-element-show,
        #movie_player .ytp-pause-overlay,
        #movie_player .ytp-pause-overlay-container,
        #movie_player .ytp-autonav-endscreen,
        #movie_player .ytp-autonav-endscreen-upnext-container,
        #movie_player .ytp-suggested-action,
        #movie_player .videowall-endscreen,
        #movie_player .ytp-show-videowall-ui,
        #movie_player .ytp-show-videowall,
        #movie_player .ytp-endscreen-paginate,
        #movie_player .ytp-videowall-still,
        #movie_player .ytp-suggestion-set,
        #movie_player [class*="videowall-endscreen"],
        #movie_player [class*="ytp-ce-element"],
        ytd-endscreen-element-renderer,
        ytd-compact-autoplay-renderer,
        .ytp-upnext,
        .ytp-upnext.ytp-show,
        .ytp-ce-element.ytp-ce-video.ytp-ce-element-show {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            width: 0 !important;
        }` : ``}
        /* Live Chat */
        ${s.minimizeChat ? `
        ytd-live-chat-frame#chat,
        #chat-container,
        ytd-live-chat-renderer {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
        }
        ytd-watch-flexy[chat-collapsed] #chat.ytd-watch-flexy,
        ytd-watch-flexy[secondary-collapsed] #chat.ytd-watch-flexy {
            display: none !important;
        }
        ` : ``}
        /* Info Cards */
        ${s.blockPlayerOverlays ? `
        .ytp-cards-button,
        .ytp-cards-teaser,
        .ytp-ce-element-show,
        .ytp-cards-teaser-shown,
        .ytp-cards-button-icon-container,
        .ytp-cards-button-title,
        /* Target the parent container often used for these overlays */
        .iv-drawer,
        .ytp-iv-drawer {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        ` : ``}
        
        /* Thumbnail Blurring */
        ytd-thumbnail img, 
        yt-thumbnail-view-model img, 
        ytd-video-preview img,
        .ytp-videowall-still-image img { 
            filter: ${s.blurThumbnails ? 'blur(12px) grayscale(0.5)' : 'none'} !important; 
            transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            will-change: filter;
            backface-visibility: hidden;
            transform: translateZ(0);
        }
        ytd-thumbnail:hover img, 
        yt-thumbnail-view-model:hover img,
        ytd-video-preview:hover img,
        .ytp-videowall-still-image:hover img { 
            filter: none !important; 
        }

        /* ══════════════════════════════════════════════
           Social Detox — Hide subs, likes, comments
           ══════════════════════════════════════════════ */
        ${s.hideMetrics ? `

            /* ── SUBSCRIBER COUNTS (everywhere) ── */
            #subscriber-count,
            #owner-sub-count,
            yt-formatted-string#subscriber-count,
            #channel-header #subscriber-count,
            #channel-header-container #subscriber-count,
            yt-content-metadata-view-model #subscriber-count,
            /* Newer channel header — handled by hideSubscriberCountsJS() */
            [data-ytdf-sub-hidden] { display: none !important; }

            /* ── LIKES ── */
            segmented-like-dislike-button-view-model like-button-view-model .yt-spec-button-shape-next__button-text-content,
            ytd-watch-metadata #top-level-buttons-computed #segmented-like-button .yt-spec-button-shape-next__button-text-content,
            #segmented-like-button .yt-spec-button-shape-next__button-text-content,
            [aria-label*="likes"] .yt-spec-button-shape-next__button-text-content,
            #vote-count-middle { display: none !important; }

            /* ── COMMENTS ── */
            #comments,
            #sections.ytd-comments,
            ytd-comments,
            ytd-item-section-renderer:has(#comments) { display: none !important; }

        ` : ''}
    `;
}

/**
 * Inject the blocking <style> tag for the first time
 */
function injectBlockingCSS() {
    const style = document.createElement('style');
    style.id = 'yt-df-blocking';
    style.textContent = buildBlockingCSS();
    (document.head || document.documentElement).appendChild(style);
}

/**
 * Update the existing <style> tag with fresh CSS
 */
function applyBlocking() {
    const style = document.getElementById('yt-df-blocking');
    if (style) style.textContent = buildBlockingCSS();
    if (currentSettings.hideMetrics) hideSubscriberCountsJS();
    if (currentSettings.blockShorts) hideShortsDOM();
}

/**
 * Hide subscriber counts that CSS alone can't target (text-content matching).
 * Scans metadata text spans in the channel header for "subscribers" text.
 */
const SUB_RE = /\d[\d.,]*\s*[KMBkm]?\s*subscribers?\b/i;
const DOT_RE = /^[\s·•\u00b7\u2022\u22c5\u2027\u30fb]+$/;
function hideSubscriberCountsJS() {
    if (!currentSettings.hideMetrics) return;

    // Target metadata text spans in the newer channel header
    const candidates = document.querySelectorAll(
        'yt-content-metadata-view-model .yt-content-metadata-view-model-wiz__metadata-text, ' +
        '#page-header span, ' +
        '#channel-header span'
    );
    for (const el of candidates) {
        const txt = el.textContent.trim();
        if (txt && txt.length < 80 && SUB_RE.test(txt)) {
            el.setAttribute('data-ytdf-sub-hidden', '');

            // Walk siblings to find and hide adjacent dot delimiter
            // Check previous sibling chain for a dot
            let sib = el.previousElementSibling;
            while (sib) {
                if (sib.hasAttribute('data-ytdf-sub-hidden')) break;
                const t = sib.textContent.trim();
                if (DOT_RE.test(t) || sib.className.includes('delimiter')) {
                    sib.setAttribute('data-ytdf-sub-hidden', '');
                    break;
                }
                break; // only check immediate previous
            }
            // If no previous dot found, check next sibling
            if (!sib || !sib.hasAttribute('data-ytdf-sub-hidden') || sib === el) {
                let next = el.nextElementSibling;
                if (next && !next.hasAttribute('data-ytdf-sub-hidden')) {
                    const t = next.textContent.trim();
                    if (DOT_RE.test(t) || next.className.includes('delimiter')) {
                        next.setAttribute('data-ytdf-sub-hidden', '');
                    }
                }
            }
        }
    }
}

/**
 * YouTube's JS sets explicit inline grid-row/grid-column on every video item.
 * When the Shorts shelf (which occupies the first 1-2 rows) is hidden, those
 * row slots stay empty because subsequent items have absolute row numbers.
 * Fix: strip the inline grid placement so CSS auto-placement fills the gaps.
 */
function fixGridLayout() {
    const contents = document.querySelector('ytd-rich-grid-renderer #contents');
    if (!contents) return;
    contents.querySelectorAll('ytd-rich-item-renderer, ytd-rich-section-renderer').forEach(el => {
        el.style.removeProperty('grid-row');
        el.style.removeProperty('grid-column');
    });
}

// Debounced grid fixer — created ONCE so the timeout is shared across calls
const debouncedFixGrid = debounce(fixGridLayout, 150);

let gridFixObserver = null;
function setupGridFixObserver() {
    if (gridFixObserver) gridFixObserver.disconnect();
    const contents = document.querySelector('ytd-rich-grid-renderer #contents');
    if (!contents) return;

    gridFixObserver = new MutationObserver((mutations) => {
        const hasRelevantChange = mutations.some(m =>
            m.addedNodes.length > 0 ||
            (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class'))
        );
        if (hasRelevantChange) debouncedFixGrid();
    });

    gridFixObserver.observe(contents, { childList: true, attributes: true, attributeFilter: ['style', 'class'] });
    fixGridLayout();
}

/**
 * Setup mutation observers to reapply blocking when DOM changes.
 * Guard prevents creating duplicate observers if called more than once.
 */
let _observersInitialised = false;
function setupMutationObservers() {
    if (_observersInitialised) return;
    _observersInitialised = true;

    const debouncedReapply = debounce(applyBlocking, 300);

    const mainObserver = new MutationObserver((mutations) => {
        const shouldReblock = mutations.some(m => {
            if (m.addedNodes.length === 0) return false;
            for (let i = 0; i < m.addedNodes.length; i++) {
                const node = m.addedNodes[i];
                if (node.nodeType !== 1) continue;
                const tag = node.tagName.toLowerCase();
                if (tag.startsWith('ytd-') || tag.startsWith('ytp-') || tag.startsWith('yt-') ||
                    node.classList.contains('ytp-ce-element')) {
                    return true;
                }
            }
            return false;
        });
        if (shouldReblock) debouncedReapply();
    });

    // Periodic checks — only JS-dependent features that CSS cannot handle alone
    setInterval(() => {
        if (currentSettings.blockChannelAutoplay) preventChannelAutoplay();
        if (currentSettings.hideMetrics) hideSubscriberCountsJS();
        if (currentSettings.blockShorts) hideShortsDOM();
    }, 1500);

    // Wait for ytd-app then start the main observer
    const waitForApp = setInterval(() => {
        const contentArea = document.querySelector('ytd-app');
        if (contentArea) {
            clearInterval(waitForApp);
            clearTimeout(waitForAppTimeout);
            mainObserver.observe(contentArea, { childList: true, subtree: true });
        }
    }, 500);
    // Bail out after 15 s to avoid polling forever on broken/changed pages
    const waitForAppTimeout = setTimeout(() => clearInterval(waitForApp), 15000);
}

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Lightweight Shorts detection helpers
 */
function nodeHasShortsMarker(el) {
    if (!el) return false;
    if (el.hasAttribute && (el.hasAttribute('is-shorts') || el.hasAttribute('is_shorts'))) return true;
    if (el.dataset && (el.dataset.isShorts === 'true' || el.dataset.isShort === 'true')) return true;
    return false;
}

function nodeHasShortsLink(el) {
    if (!el) return false;
    const anchor = el.querySelector && el.querySelector('a[href*="/shorts/"]');
    return !!anchor;
}

function isShortCard(el) {
    return nodeHasShortsMarker(el) || nodeHasShortsLink(el);
}

/**
 * Hide Shorts shelves and cards that bypass CSS-only rules.
 * Scoped to known container/card tags to avoid nuking unrelated content.
 */
function hideShortsDOM() {
    // Hide obvious shelf and reel elements
    document.querySelectorAll(
        'ytd-shorts-shelf-renderer, ytd-reel-shelf-renderer, ytd-reel-video-renderer, ytd-reel-item-renderer, ytd-rich-shelf-renderer[is-shorts], grid-shelf-view-model, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2'
    ).forEach(el => el.style.setProperty('display', 'none', 'important'));

    // Hide individual cards/lockups that link to Shorts
    document.querySelectorAll(
        'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-lockup-view-model, yt-lockup-view-model, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2'
    ).forEach(el => {
        if (el.style.display === 'none') return;
        if (isShortCard(el)) {
            el.style.setProperty('display', 'none', 'important');
        }
    });
}

/**
 * Specifically targets and pauses the featured video on channel homepages
 */
function preventChannelAutoplay() {
    // Only run on channel pages (identified by @ or certain URL structures)
    if (!window.location.pathname.includes('/@') && !window.location.pathname.includes('/channel/')) {
        return;
    }

    // Target the featured video player renderer
    const featuredPlayer = document.querySelector('ytd-channel-video-player-renderer #movie_player');
    if (featuredPlayer && featuredPlayer.pauseVideo) {
        // Pause if it's currently playing (1 = Playing)
        try {
            if (featuredPlayer.getPlayerState() === 1) {
                featuredPlayer.pauseVideo();
            }
        } catch (e) { }
    }

    // Fallback: Direct video element control
    const video = document.querySelector('ytd-channel-video-player-renderer video');
    if (video && !video.paused) {
        video.pause();
    }
}

// Re-entry guard: prevents a double-redirect when YouTube's own SPA router
// fires yt-navigate-start in response to our location.replace() call.
let _redirectInFlight = false;

/**
 * Detects if on a channel's Home tab and redirects to the Videos tab
 */
function handleChannelRedirect() {
    if (!currentSettings.redirectChannelHome) return;
    if (_redirectInFlight) return;

    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p !== '');

    // Pattern: /@username or /@username/ (Home tab)
    const isHandleHome = parts.length === 1 && parts[0].startsWith('@');

    // Pattern: /channel/CHANNEL_ID (Home tab)
    const isChannelIDHome = parts.length === 2 && parts[0] === 'channel';

    // Pattern: /user/USER_ID (Home tab - older style)
    const isUserHome = parts.length === 2 && parts[0] === 'user';

    if (isHandleHome || isChannelIDHome || isUserHome) {
        _redirectInFlight = true;
        const newUrl = window.location.origin + path + (path.endsWith('/') ? '' : '/') + 'videos';
        window.location.replace(newUrl);
    }
}

// Start the content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
