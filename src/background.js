/**
 * Background Service Worker - Manifest V3
 * Manages background tasks, storage, and extension lifecycle
 * 
 * Service Worker best practices:
 * - All listeners registered at top level (not in functions)
 * - Event-driven, not persistent
 * - Proper error handling on storage operations
 */

const DEFAULT_SETTINGS = {
    blockShorts: true,
    blockHomepage: true,
    blockSidebar: true,
    centerPlayer: false,
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

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default values in storage on first install
        chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to initialize default settings:', chrome.runtime.lastError);
            }
        });
    }
});

/**
 * Listen for messages from content scripts
 * Registered at top level (Service Worker best practice)
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_SETTINGS') {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
            if (chrome.runtime.lastError) {
                console.error('Error retrieving settings:', chrome.runtime.lastError);
                sendResponse(DEFAULT_SETTINGS); // Fallback to defaults on error
                return;
            }
            sendResponse(settings || DEFAULT_SETTINGS);
        });
        // Return true to keep the message channel open for async response
        return true;
    }
});
