/**
 * Background Service Worker - Manifest V3
 * Manages background tasks, storage, and extension lifecycle
 */

const DEFAULT_SETTINGS = {
    blockShorts: true,
    blockHomepage: true,
    blockSidebar: true,
    blockEndscreen: true,
    blockWatermark: true,
    minimizeChat: true,
    blockInfoCards: true,
    blockChannelAutoplay: true,
    redirectChannelHome: true,
    pauseOnLoad: false,
    blurThumbnails: false,
    hideMetrics: false,
    speedControl: '1',
    qualitySelect: 'auto'
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default values in storage
        chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
            console.log('[YT-DF] Default settings initialized');
        });

        // Open options page or welcome page if needed
        chrome.tabs.create({
            url: 'popup.html'
        });
    }

    if (details.reason === 'update') {
        console.log('[YT-DF] Extension updated to version ' + chrome.runtime.getManifest().version);
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_SETTINGS') {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
            sendResponse(settings);
        });

        return true; // Keep the message channel open for async response
    }

    if (request.type === 'LOG_DEBUG') {
        console.log('[YT-DF-BG]', request.data);
        sendResponse({ success: true });
    }
});

// Handle extension uninstall
chrome.runtime.onStartup.addListener(() => {
    console.log('[YT-DF] Extension activated');
});

// Periodic health check — less frequent (5 mins) to save resources
setInterval(() => {
    console.log('[YT-DF-BG] Health check: Service worker active');
}, 300000); // Every 5 minutes
