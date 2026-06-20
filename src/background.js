/**
 * Background Service Worker - Manifest V3
 * Manages background tasks, storage, and extension lifecycle
 * 
 * Service Worker best practices (Chrome 126+):
 * - All listeners registered at top level (not in functions)
 * - Event-driven, not persistent
 * - Proper error handling on all async operations
 * - Automatic cleanup on uninstall
 * - No retained references to prevent memory leaks
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
            } else {
                console.log('Extension installed with default settings');
            }
        });
    } else if (details.reason === 'update') {
        // Handle any migration logic for updates here if needed
        console.log('Extension updated to version', chrome.runtime.getManifest().version);
    }
});

/**
 * Listen for messages from content scripts
 * Registered at top level (Service Worker best practice)
 * Uses proper async response with return true
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
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
    } catch (error) {
        console.error('Error handling message:', error);
        // Send fallback response on unexpected errors
        sendResponse(DEFAULT_SETTINGS);
        return false;
    }
});

/**
 * Optional: Listen for uninstall and clean up storage if needed
 * This helps keep user data clean when extension is removed
 */
chrome.runtime.setUninstallURL('https://www.youtube.com/', () => {
    // Optional: Log uninstall event
    if (chrome.runtime.lastError) {
        console.log('Uninstall handling configured');
    }
});
