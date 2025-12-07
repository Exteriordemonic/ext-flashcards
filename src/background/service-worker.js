/**
 * Background service worker for Chrome extension
 * Handles extension lifecycle and initialization
 */

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    initializeExtension();
  } else if (details.reason === 'update') {
    // Extension update
    handleUpdate(details.previousVersion);
  }
});

/**
 * Initialize extension on first install
 */
async function initializeExtension() {
  try {
    // Set default values in chrome.storage
    const defaults = {
      flashcards_progress: {
        completed: [],
        repeatLater: [],
        flashcardData: {}
      },
      excluded_pages: [],
      algorithm_config: {
        algorithm: "OSR's variant of SM-2",
        baseEase: 250,
        intervalChangeHard: 50,
        easyBonus: 130,
        enableLoadBalancer: true,
        maxIntervalDays: 36525,
        maxLinkContribution: 50
      },
      flashcards_enabled: true
    };

    // Set defaults only if they don't exist
    for (const [key, value] of Object.entries(defaults)) {
      const existing = await chrome.storage.local.get(key);
      if (!existing[key]) {
        await chrome.storage.local.set({ [key]: value });
      }
    }

    console.log('Flashcard Overlay extension initialized');
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

/**
 * Handle extension update
 * @param {string} previousVersion - Previous version number
 */
async function handleUpdate(previousVersion) {
  console.log(`Extension updated from version ${previousVersion}`);
  
  // Perform any necessary data migrations here
  // For now, just log the update
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProgress') {
    chrome.storage.local.get(['flashcards_progress'], (result) => {
      sendResponse({ progress: result.flashcards_progress });
    });
    return true; // Indicates we will send a response asynchronously
  }

  if (request.action === 'resetProgress') {
    const defaultProgress = {
      completed: [],
      repeatLater: [],
      flashcardData: {}
    };
    chrome.storage.local.set({ flashcards_progress: defaultProgress }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Add more message handlers as needed
});

// Optional: Handle tab updates to inject content script if needed
// This is usually handled by manifest.json content_scripts configuration

