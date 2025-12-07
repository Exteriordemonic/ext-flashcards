/**
 * Main content script orchestrator
 * Coordinates overlay, control panel, and scheduler
 * Uses dynamic imports to load ES modules
 */

// Inject CSS if not already injected
function injectCSS() {
  if (document.getElementById('flashcard-overlay-css') && document.getElementById('flashcard-control-panel-css')) {
    return; // Already injected
  }

  const link1 = document.createElement('link');
  link1.id = 'flashcard-overlay-css';
  link1.rel = 'stylesheet';
  link1.href = chrome.runtime.getURL('src/ui/overlay.css');
  document.head.appendChild(link1);

  const link2 = document.createElement('link');
  link2.id = 'flashcard-control-panel-css';
  link2.rel = 'stylesheet';
  link2.href = chrome.runtime.getURL('src/ui/control-panel.css');
  document.head.appendChild(link2);
}

// Initialize the extension
(async function() {
  try {
    // Inject CSS
    injectCSS();
    
    // Dynamically import all modules using chrome.runtime.getURL
    // All these files must be in web_accessible_resources in manifest.json
    const { storage } = await import(chrome.runtime.getURL('src/core/storage.js'));
    const { urlMatcher } = await import(chrome.runtime.getURL('src/utils/url-matcher.js'));
    const { flashcardManager } = await import(chrome.runtime.getURL('src/core/flashcards.js'));
    const { algorithm } = await import(chrome.runtime.getURL('src/core/algorithm.js'));
    const { scheduler } = await import(chrome.runtime.getURL('src/core/scheduler.js'));
    const { overlay } = await import(chrome.runtime.getURL('src/content/overlay.js'));
    const { controlPanel } = await import(chrome.runtime.getURL('src/content/control-panel.js'));

    // Set dependencies (needed because modules are loaded dynamically)
    // First set scheduler dependencies
    scheduler.setDependencies(flashcardManager, algorithm);
    // Then set overlay and control panel dependencies
    overlay.setScheduler(scheduler);
    overlay.setAlgorithm(algorithm);
    controlPanel.setDependencies({
      overlay,
      scheduler,
      flashcardManager,
      storage,
      urlMatcher
    });

    /**
     * Main Flashcards API
     */
    const Flashcards = {
      /**
       * Initialize the flashcard system
       * @param {Object} config - Optional configuration
       */
      async init(config = {}) {
        try {
          // Load algorithm config
          await algorithm.ensureConfigLoaded();

          // Initialize flashcard manager
          await flashcardManager.init();

          // Inject control panel
          controlPanel.init();
          // Update toggle state asynchronously
          controlPanel.updateToggleState();

          // Check if flashcards should be shown on this page
          const shouldShow = await this.shouldShowFlashcards();
          if (shouldShow) {
            // Wait for page to be fully loaded
            if (document.readyState === 'complete') {
              this.showFlashcardOnLoad();
            } else {
              window.addEventListener('load', () => {
                this.showFlashcardOnLoad();
              });
            }
          }
        } catch (error) {
          console.error('Error initializing flashcards:', error);
        }
      },

      /**
       * Check if flashcards should be shown on current page
       * @returns {Promise<boolean>} True if flashcards should be shown
       */
      async shouldShowFlashcards() {
        // Check global enabled status
        const enabled = await storage.isEnabled();
        if (!enabled) {
          return false;
        }

        // Check if current page is excluded
        const currentURL = urlMatcher.getCurrentURL();
        const excludedPages = await storage.getExcludedPages();
        
        if (urlMatcher.matchesAny(currentURL, excludedPages)) {
          return false;
        }

        return true;
      },

      /**
       * Show flashcard on page load
       */
      async showFlashcardOnLoad() {
        // Don't show if overlay is already visible
        if (overlay.isVisible()) {
          return;
        }

        // Check if flashcards are stopped
        try {
          const stopUntil = await storage.getStopUntil();
          if (stopUntil && Date.now() < stopUntil) {
            // Still in stop period, don't show flashcards
            return;
          } else if (stopUntil && Date.now() >= stopUntil) {
            // Stop period has expired, clear it
            await storage.setStopUntil(null);
          }
        } catch (error) {
          console.error('Error checking stop timestamp:', error);
        }

        // Get next flashcard
        const nextFlashcard = scheduler.getNextFlashcard();
        
        if (nextFlashcard) {
          await overlay.show(nextFlashcard, () => {
            // Update control panel after flashcard is closed
            controlPanel.updateProgress();
          });
        }
      },

      /**
       * Show a random flashcard manually
       */
      async showRandom() {
        if (overlay.isVisible()) {
          return; // Already showing a flashcard
        }

        const nextFlashcard = scheduler.getNextFlashcard();
        if (nextFlashcard) {
          await overlay.show(nextFlashcard, () => {
            controlPanel.updateProgress();
          });
        }
      },

      /**
       * Exclude current page from showing flashcards
       */
      async excludeCurrentPage() {
        const currentURL = urlMatcher.getCurrentURL();
        await storage.addExcludedPage(currentURL);
        await controlPanel.updateToggleState();
      },

      /**
       * Include current page (remove from exclusion list)
       */
      async includeCurrentPage() {
        const currentURL = urlMatcher.getCurrentURL();
        const excludedPages = await storage.getExcludedPages();
        const matchingPage = excludedPages.find(page => urlMatcher.matches(currentURL, page));
        
        if (matchingPage) {
          await storage.removeExcludedPage(matchingPage);
          await controlPanel.updateToggleState();
        }
      },

      /**
       * Reset all progress
       */
      async resetProgress() {
        await flashcardManager.resetProgress();
        controlPanel.updateProgress();
      },

      /**
       * Get progress statistics
       * @returns {Object} Progress statistics
       */
      getProgress() {
        return flashcardManager.getProgressStats();
      },

      /**
       * Update algorithm configuration
       * @param {Object} config - Partial algorithm configuration
       */
      async updateAlgorithmConfig(config) {
        await algorithm.updateConfig(config);
      }
    };

    // Auto-initialize when script loads
    // Wait a bit to ensure DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        Flashcards.init();
      });
    } else {
      Flashcards.init();
    }

    // Expose API globally for popup and other scripts
    window.Flashcards = Flashcards;

  } catch (error) {
    console.error('Error loading flashcard extension:', error);
  }
})();
