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
        // Set default values in storage on first install
        chrome.storage.sync.set(DEFAULT_SETTINGS);
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
});
