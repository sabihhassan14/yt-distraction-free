/**
 * Popup Script - Handles UI interactions, Interactive Preview, and storage management
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
    qualitySelect: 'auto',
    theme: 'system'
};

// Initialize popup on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadSettings();
    setupEventListeners();
});

/**
 * Load settings from chrome.storage.sync and populate the UI
 */
function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, function (settings) {
        if (chrome.runtime.lastError) {
            console.error('Error loading settings:', chrome.runtime.lastError);
            showStatus('Error loading settings', 'error');
            return;
        }

        // Update checkboxes
        const toggles = ['blockShorts', 'blockHomepage', 'blockSidebar', 'centerPlayer', 'blockPlayerOverlays', 'minimizeChat', 'blockChannelAutoplay', 'redirectChannelHome', 'pauseOnLoad', 'blurThumbnails', 'hideMetrics'];
        toggles.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.checked = settings[id];
            }
        });

        // Update select
        const qualitySelect = document.getElementById('qualitySelect');
        if (qualitySelect) qualitySelect.value = settings.qualitySelect;

        const speedControl = document.getElementById('speedControl');
        if (speedControl) speedControl.value = settings.speedControl || '1';

        // Show/hide sub-toggle based on loaded sidebar state
        updateCenterPlayerVisibility();
    });
}

/**
 * Show/hide the Center Player sub-toggle based on Sidebar state
 */
function updateCenterPlayerVisibility() {
    const sidebarOn = document.getElementById('blockSidebar').checked;
    const row = document.getElementById('centerPlayerRow');
    if (!row) return;
    if (sidebarOn) {
        row.classList.remove('hidden');
    } else {
        row.classList.add('hidden');
    }
}

/**
 * Setup event listeners for all controls
 */
function setupEventListeners() {
    // Theme toggle button
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Auto-save on change
    const inputs = document.querySelectorAll('input[type="checkbox"], select');
    inputs.forEach(input => {
        input.addEventListener('change', (e) => {
            saveSettings();
        });
    });

    // Keep Center Player sub-toggle visibility in sync with Sidebar toggle
    const sidebarToggle = document.getElementById('blockSidebar');
    if (sidebarToggle) sidebarToggle.addEventListener('change', updateCenterPlayerVisibility);

    // Support Menu Logic
    const supportBtn = document.getElementById('supportBtn');
    const supportMenu = document.getElementById('supportMenu');
    const feedbackBtn = document.getElementById('feedbackBtn');
    const feedbackMenu = document.getElementById('feedbackMenu');

    if (supportBtn && supportMenu) {
        supportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            feedbackMenu && feedbackMenu.classList.remove('active');
            supportMenu.classList.toggle('active');
        });
    }

    if (feedbackBtn && feedbackMenu) {
        feedbackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            supportMenu && supportMenu.classList.remove('active');
            feedbackMenu.classList.toggle('active');
        });
    }

    const emailFeedbackLink = document.getElementById('emailFeedbackLink');
    if (emailFeedbackLink) {
        emailFeedbackLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = emailFeedbackLink.href;
        });
    }

    // Close both menus when clicking elsewhere
    document.addEventListener('click', () => {
        supportMenu && supportMenu.classList.remove('active');
        feedbackMenu && feedbackMenu.classList.remove('active');
    });
}

/**
 * Save all current settings to chrome.storage.sync
 */
function saveSettings() {
    const settings = {
        blockShorts: document.getElementById('blockShorts').checked,
        blockHomepage: document.getElementById('blockHomepage').checked,
        blockSidebar: document.getElementById('blockSidebar').checked,
        centerPlayer: document.getElementById('centerPlayer').checked,
        blockPlayerOverlays: document.getElementById('blockPlayerOverlays').checked,
        minimizeChat: document.getElementById('minimizeChat').checked,
        blockChannelAutoplay: document.getElementById('blockChannelAutoplay').checked,
        redirectChannelHome: document.getElementById('redirectChannelHome').checked,
        pauseOnLoad: document.getElementById('pauseOnLoad').checked,
        blurThumbnails: document.getElementById('blurThumbnails').checked,
        hideMetrics: document.getElementById('hideMetrics').checked,
        qualitySelect: document.getElementById('qualitySelect').value,
        speedControl: document.getElementById('speedControl').value,
        theme: document.body.classList.contains('light-mode') ? 'light' : 'dark'
    };

    chrome.storage.sync.set(settings, function () {
        if (chrome.runtime.lastError) {
            showStatus('Error saving settings', 'error');
            return;
        }

        showStatus('Saved!', 'success');

        // Broadcast to YouTube tabs
        chrome.tabs.query({ url: 'https://www.youtube.com/*' }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SETTINGS_UPDATED',
                    settings
                }).catch(() => { });
            });
        });
    });
}


/**
 * Theme management
 */
function loadTheme() {
    chrome.storage.sync.get({ theme: 'system' }, (data) => applyTheme(data.theme));
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-mode');
    const newTheme = isLight ? 'dark' : 'light';
    chrome.storage.sync.set({ theme: newTheme }, () => applyTheme(newTheme));
}

function applyTheme(theme) {
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('light-mode', !prefersDark);
    } else {
        document.body.classList.toggle('light-mode', theme === 'light');
    }
}

/**
 * Display a premium status pill
 */
function showStatus(message, type = 'success') {
    const el = document.getElementById('statusMessage');
    if (!el) return;
    el.textContent = message;
    el.className = `status-pill ${type}`;
    setTimeout(() => { el.className = 'status-pill'; }, 2000);
}
