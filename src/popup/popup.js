/**
 * Popup script for extension settings
 * Uses chrome.storage API directly since popup scripts can't use ES modules easily
 */

const STORAGE_KEYS = {
  PROGRESS: 'flashcards_progress',
  EXCLUDED_PAGES: 'excluded_pages',
  ALGORITHM_CONFIG: 'algorithm_config',
  ENABLED: 'flashcards_enabled',
  STOP_DURATION: 'flashcards_stop_duration',
  STOP_UNTIL: 'flashcards_stop_until'
};

const DEFAULT_ALGORITHM_CONFIG = {
  algorithm: "OSR's variant of SM-2",
  baseEase: 250,
  intervalChangeHard: 50,
  easyBonus: 130,
  enableLoadBalancer: true,
  maxIntervalDays: 36525,
  maxLinkContribution: 50
};

const DEFAULT_STOP_DURATION = 10; // minutes

// Storage helper functions
function getStorage(key, defaultValue = null) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        resolve(defaultValue);
      } else {
        const value = result[key];
        resolve(value !== undefined ? value : defaultValue);
      }
    });
  });
}

function setStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Get current tab URL
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Load and display progress
async function loadProgress() {
  const progress = await getStorage(STORAGE_KEYS.PROGRESS, {
    completed: [],
    repeatLater: [],
    flashcardData: {}
  });
  
  // Get total from flashcards data (we'll need to fetch this)
  // For now, use a default or fetch from storage
  const total = 10; // This should come from flashcard data
  
  document.getElementById('stat-completed').textContent = progress.completed.length;
  document.getElementById('stat-total').textContent = total;
  const progressPercent = total > 0 ? Math.round((progress.completed.length / total) * 100) : 0;
  document.getElementById('stat-progress').textContent = `${progressPercent}%`;
}

// Load and display excluded pages
async function loadExcludedPages() {
  const excludedPages = await getStorage(STORAGE_KEYS.EXCLUDED_PAGES, []);
  const listElement = document.getElementById('excluded-pages-list');
  
  if (excludedPages.length === 0) {
    listElement.innerHTML = '<p class="empty-message">No pages excluded</p>';
    return;
  }

  listElement.innerHTML = excludedPages.map(page => {
    return `
      <div class="excluded-page-item">
        <span class="page-url">${page}</span>
        <button class="remove-btn" data-url="${page}">Remove</button>
      </div>
    `;
  }).join('');

  // Add event listeners to remove buttons
  listElement.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-url');
      const excludedPages = await getStorage(STORAGE_KEYS.EXCLUDED_PAGES, []);
      const filtered = excludedPages.filter(page => page !== url);
      await setStorage(STORAGE_KEYS.EXCLUDED_PAGES, filtered);
      loadExcludedPages();
    });
  });
}

// Load algorithm settings
async function loadAlgorithmSettings() {
  const config = await getStorage(STORAGE_KEYS.ALGORITHM_CONFIG, DEFAULT_ALGORITHM_CONFIG);
  const stopDuration = await getStorage(STORAGE_KEYS.STOP_DURATION, DEFAULT_STOP_DURATION);

  document.getElementById('base-ease').value = config.baseEase;
  document.getElementById('interval-change-hard').value = config.intervalChangeHard;
  document.getElementById('interval-change-hard-value').textContent = config.intervalChangeHard;
  document.getElementById('easy-bonus').value = config.easyBonus;
  document.getElementById('load-balancer').checked = config.enableLoadBalancer;
  document.getElementById('max-interval').value = config.maxIntervalDays;
  document.getElementById('max-link-contribution').value = config.maxLinkContribution;
  document.getElementById('max-link-contribution-value').textContent = config.maxLinkContribution;
  document.getElementById('stop-duration').value = stopDuration;
}

// Save algorithm settings
async function saveAlgorithmSettings() {
  const config = {
    ...DEFAULT_ALGORITHM_CONFIG,
    baseEase: parseInt(document.getElementById('base-ease').value),
    intervalChangeHard: parseInt(document.getElementById('interval-change-hard').value),
    easyBonus: parseInt(document.getElementById('easy-bonus').value),
    enableLoadBalancer: document.getElementById('load-balancer').checked,
    maxIntervalDays: parseInt(document.getElementById('max-interval').value),
    maxLinkContribution: parseInt(document.getElementById('max-link-contribution').value)
  };

  const stopDuration = parseInt(document.getElementById('stop-duration').value);

  await setStorage(STORAGE_KEYS.ALGORITHM_CONFIG, config);
  await setStorage(STORAGE_KEYS.STOP_DURATION, stopDuration);
  
  // Show success message
  const btn = document.getElementById('save-settings-btn');
  const originalText = btn.textContent;
  btn.textContent = 'Saved!';
  btn.style.backgroundColor = '#4a7c59';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.backgroundColor = '';
  }, 2000);
}

// Reset setting to default
function resetSetting(settingName) {
  switch (settingName) {
    case 'baseEase':
      document.getElementById('base-ease').value = DEFAULT_ALGORITHM_CONFIG.baseEase;
      break;
    case 'intervalChangeHard':
      document.getElementById('interval-change-hard').value = DEFAULT_ALGORITHM_CONFIG.intervalChangeHard;
      document.getElementById('interval-change-hard-value').textContent = DEFAULT_ALGORITHM_CONFIG.intervalChangeHard;
      break;
    case 'easyBonus':
      document.getElementById('easy-bonus').value = DEFAULT_ALGORITHM_CONFIG.easyBonus;
      break;
    case 'maxIntervalDays':
      document.getElementById('max-interval').value = DEFAULT_ALGORITHM_CONFIG.maxIntervalDays;
      break;
    case 'maxLinkContribution':
      document.getElementById('max-link-contribution').value = DEFAULT_ALGORITHM_CONFIG.maxLinkContribution;
      document.getElementById('max-link-contribution-value').textContent = DEFAULT_ALGORITHM_CONFIG.maxLinkContribution;
      break;
    case 'stopDuration':
      document.getElementById('stop-duration').value = DEFAULT_STOP_DURATION;
      break;
  }
}

// Initialize popup
async function init() {
  // Load all data
  await loadProgress();
  await loadExcludedPages();
  await loadAlgorithmSettings();

  // Event listeners
  document.getElementById('reset-progress-btn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      await setStorage(STORAGE_KEYS.PROGRESS, {
        completed: [],
        repeatLater: [],
        flashcardData: {}
      });
      await loadProgress();
    }
  });

  document.getElementById('exclude-current-btn').addEventListener('click', async () => {
    const tab = await getCurrentTab();
    if (tab && tab.url) {
      try {
        const urlObj = new URL(tab.url);
        const origin = urlObj.origin; // np. "https://example.com"
        const wildcardPattern = `${origin}/*`; // np. "https://example.com/*"
        
        const excludedPages = await getStorage(STORAGE_KEYS.EXCLUDED_PAGES, []);
        
        // Sprawdź czy wzorzec już istnieje
        if (!excludedPages.includes(wildcardPattern)) {
          // Usuń istniejące dokładne URL z tej samej domeny oraz inne wildcard dla tej domeny
          const filteredPages = excludedPages.filter(page => {
            try {
              const pageUrlObj = new URL(page);
              return pageUrlObj.origin !== origin;
            } catch {
              // Jeśli nie jest to pełny URL, sprawdź czy to nie jest już wildcard dla tej domeny
              if (page.endsWith('/*')) {
                const base = page.slice(0, -2);
                try {
                  const baseUrlObj = new URL(base);
                  return baseUrlObj.origin !== origin;
                } catch {
                  return true; // Zachowaj jeśli nie można sparsować
                }
              }
              return true; // Zachowaj inne wzorce
            }
          });
          
          filteredPages.push(wildcardPattern);
          await setStorage(STORAGE_KEYS.EXCLUDED_PAGES, filteredPages);
          await loadExcludedPages();
        }
      } catch (error) {
        console.error('Error excluding domain:', error);
        // Fallback do starego zachowania dla nieprawidłowych URL (np. chrome://, file://)
        const excludedPages = await getStorage(STORAGE_KEYS.EXCLUDED_PAGES, []);
        if (!excludedPages.includes(tab.url)) {
          excludedPages.push(tab.url);
          await setStorage(STORAGE_KEYS.EXCLUDED_PAGES, excludedPages);
          await loadExcludedPages();
        }
      }
    }
  });

  document.getElementById('save-settings-btn').addEventListener('click', saveAlgorithmSettings);

  // Range input updates
  document.getElementById('interval-change-hard').addEventListener('input', (e) => {
    document.getElementById('interval-change-hard-value').textContent = e.target.value;
  });

  document.getElementById('max-link-contribution').addEventListener('input', (e) => {
    document.getElementById('max-link-contribution-value').textContent = e.target.value;
  });

  // Reset buttons
  document.querySelectorAll('.reset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const setting = btn.getAttribute('data-setting');
      resetSetting(setting);
    });
  });
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
