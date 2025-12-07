/**
 * Storage wrapper with error handling and type-safe operations
 * Uses chrome.storage API for extension-wide storage
 */

import { STORAGE_KEYS } from '../utils/constants.js';

class StorageManager {
  constructor() {
    this.useChromeStorage = typeof chrome !== 'undefined' && chrome.storage;
  }

  /**
   * Get a value from storage with error handling
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {Promise<*>} The stored value or default
   */
  async get(key, defaultValue = null) {
    if (this.useChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.error(`Error reading from storage key "${key}":`, chrome.runtime.lastError);
            resolve(defaultValue);
          } else {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
          }
        });
      });
    } else {
      // Fallback to localStorage
      try {
        const item = window.localStorage.getItem(key);
        if (item === null) {
          return defaultValue;
        }
        return JSON.parse(item);
      } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return defaultValue;
      }
    }
  }

  /**
   * Set a value in storage with error handling
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value) {
    if (this.useChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error writing to storage key "${key}":`, chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } else {
      // Fallback to localStorage
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Error writing to localStorage key "${key}":`, error);
        if (error.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded. Consider cleaning up old data.');
        }
        return false;
      }
    }
  }

  /**
   * Remove a key from storage
   * @param {string} key - Storage key to remove
   * @returns {Promise<boolean>} Success status
   */
  async remove(key) {
    if (this.useChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            console.error(`Error removing storage key "${key}":`, chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } else {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error);
        return false;
      }
    }
  }

  /**
   * Clear all extension-related data from storage
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    if (this.useChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(Object.values(STORAGE_KEYS), () => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing storage:', chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } else {
      try {
        Object.values(STORAGE_KEYS).forEach(key => {
          window.localStorage.removeItem(key);
        });
        return true;
      } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
      }
    }
  }

  /**
   * Get flashcard progress data
   * @returns {Promise<Object>} Progress data structure
   */
  async getProgress() {
    return await this.get(STORAGE_KEYS.PROGRESS, {
      completed: [],
      repeatLater: [],
      flashcardData: {}
    });
  }

  /**
   * Save flashcard progress data
   * @param {Object} progress - Progress data to save
   * @returns {Promise<boolean>} Success status
   */
  async saveProgress(progress) {
    if (!progress) {
      console.error('Cannot save progress: progress data is null or undefined');
      return false;
    }

    try {
      const success = await this.set(STORAGE_KEYS.PROGRESS, progress);
      if (success) {
        console.log('Progress saved to storage:', {
          completed: progress.completed?.length || 0,
          repeatLater: progress.repeatLater?.length || 0
        });
      }
      return success;
    } catch (error) {
      console.error('Error in saveProgress:', error);
      return false;
    }
  }

  /**
   * Get excluded pages list
   * @returns {Promise<string[]>} Array of excluded URLs/patterns
   */
  async getExcludedPages() {
    return await this.get(STORAGE_KEYS.EXCLUDED_PAGES, []);
  }

  /**
   * Save excluded pages list
   * @param {string[]} pages - Array of URLs/patterns to exclude
   * @returns {Promise<boolean>} Success status
   */
  async saveExcludedPages(pages) {
    return await this.set(STORAGE_KEYS.EXCLUDED_PAGES, pages);
  }

  /**
   * Add a page to excluded list
   * @param {string} url - URL to exclude
   * @returns {Promise<boolean>} Success status
   */
  async addExcludedPage(url) {
    const excluded = await this.getExcludedPages();
    if (!excluded.includes(url)) {
      excluded.push(url);
      return await this.saveExcludedPages(excluded);
    }
    return true;
  }

  /**
   * Remove a page from excluded list
   * @param {string} url - URL to remove from exclusion
   * @returns {Promise<boolean>} Success status
   */
  async removeExcludedPage(url) {
    const excluded = await this.getExcludedPages();
    const filtered = excluded.filter(page => page !== url);
    return await this.saveExcludedPages(filtered);
  }

  /**
   * Get algorithm configuration
   * @returns {Promise<Object>} Algorithm configuration
   */
  async getAlgorithmConfig() {
    return await this.get(STORAGE_KEYS.ALGORITHM_CONFIG, null);
  }

  /**
   * Save algorithm configuration
   * @param {Object} config - Algorithm configuration
   * @returns {Promise<boolean>} Success status
   */
  async saveAlgorithmConfig(config) {
    return await this.set(STORAGE_KEYS.ALGORITHM_CONFIG, config);
  }

  /**
   * Check if flashcards are enabled globally
   * @returns {Promise<boolean>} Enabled status
   */
  async isEnabled() {
    return await this.get(STORAGE_KEYS.ENABLED, true);
  }

  /**
   * Set global enabled status
   * @param {boolean} enabled - Enable/disable flashcards
   * @returns {Promise<boolean>} Success status
   */
  async setEnabled(enabled) {
    return await this.set(STORAGE_KEYS.ENABLED, enabled);
  }

  /**
   * Get stop duration setting (in minutes)
   * @returns {Promise<number>} Stop duration in minutes
   */
  async getStopDuration() {
    return await this.get(STORAGE_KEYS.STOP_DURATION, 10);
  }

  /**
   * Set stop duration setting
   * @param {number} minutes - Stop duration in minutes
   * @returns {Promise<boolean>} Success status
   */
  async setStopDuration(minutes) {
    return await this.set(STORAGE_KEYS.STOP_DURATION, minutes);
  }

  /**
   * Get stop until timestamp
   * @returns {Promise<number|null>} Timestamp when flashcards should stop showing, or null
   */
  async getStopUntil() {
    return await this.get(STORAGE_KEYS.STOP_UNTIL, null);
  }

  /**
   * Set stop until timestamp
   * @param {number|null} timestamp - Timestamp when flashcards should stop showing, or null to clear
   * @returns {Promise<boolean>} Success status
   */
  async setStopUntil(timestamp) {
    return await this.set(STORAGE_KEYS.STOP_UNTIL, timestamp);
  }
}

// Export singleton instance
export const storage = new StorageManager();
