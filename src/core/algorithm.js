/**
 * SM-2 variant spaced repetition algorithm implementation
 * Based on OSR's variant of SM-2 with configurable parameters
 */

import { DEFAULT_ALGORITHM_CONFIG, REVIEW_DIFFICULTY, DEFAULT_INTERVALS } from '../utils/constants.js';
import { storage } from './storage.js';

class SpacedRepetitionAlgorithm {
  constructor() {
    this.config = DEFAULT_ALGORITHM_CONFIG;
    this.configLoaded = false;
  }

  /**
   * Load algorithm configuration from storage or use defaults
   * @returns {Promise<Object>} Algorithm configuration
   */
  async loadConfig() {
    if (!this.configLoaded) {
      const savedConfig = await storage.getAlgorithmConfig();
      this.config = savedConfig ? { ...DEFAULT_ALGORITHM_CONFIG, ...savedConfig } : DEFAULT_ALGORITHM_CONFIG;
      this.configLoaded = true;
    }
    return this.config;
  }

  /**
   * Ensure config is loaded (call before using config)
   */
  async ensureConfigLoaded() {
    if (!this.configLoaded) {
      await this.loadConfig();
    }
  }

  /**
   * Update algorithm configuration
   * @param {Object} newConfig - Partial configuration to update
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await storage.saveAlgorithmConfig(this.config);
  }

  /**
   * Calculate new interval based on review difficulty
   * @param {Object} flashcardData - Current flashcard data
   * @param {string} difficulty - Review difficulty (hard/good/easy)
   * @returns {Object} Updated flashcard data with new interval and ease
   */
  calculateReview(flashcardData, difficulty) {
    // Config should be loaded by now, but use defaults if not
    if (!this.configLoaded) {
      this.config = DEFAULT_ALGORITHM_CONFIG;
    }
    const {
      reviewCount = 0,
      ease = this.config.baseEase,
      interval = 0,
      lastReview = null
    } = flashcardData;

    let newInterval;
    let newEase = ease;
    const now = Date.now();

    if (reviewCount === 0) {
      // First review - use default intervals
      newInterval = DEFAULT_INTERVALS[difficulty];
    } else {
      // Subsequent reviews
      switch (difficulty) {
        case REVIEW_DIFFICULTY.HARD:
          // newInterval = oldInterval * intervalChange / 100
          newInterval = interval * (this.config.intervalChangeHard / 100);
          // Slightly decrease ease for hard reviews
          newEase = Math.max(130, ease - 20);
          break;

        case REVIEW_DIFFICULTY.GOOD:
          // Standard interval calculation
          newInterval = interval * (ease / 100);
          // Ease remains the same for good reviews
          break;

        case REVIEW_DIFFICULTY.EASY:
          // Apply easy bonus: newInterval = oldInterval * ease * easyBonus / 10000
          newInterval = interval * (ease / 100) * (this.config.easyBonus / 100);
          // Slightly increase ease for easy reviews
          newEase = ease + 15;
          break;

        default:
          newInterval = interval;
      }
    }

    // Apply load balancer if enabled
    if (this.config.enableLoadBalancer && newInterval >= 1) {
      newInterval = this.applyLoadBalancer(newInterval);
    }

    // Cap interval at maximum
    newInterval = Math.min(newInterval, this.config.maxIntervalDays);

    // Calculate due date
    const dueDate = now + (newInterval * 24 * 60 * 60 * 1000);

    return {
      ...flashcardData,
      reviewCount: reviewCount + 1,
      ease: Math.round(newEase),
      interval: Math.round(newInterval * 100) / 100, // Round to 2 decimal places
      lastReview: now,
      dueDate: dueDate,
      difficulty: difficulty
    };
  }

  /**
   * Apply load balancer to slightly tweak interval for consistent daily reviews
   * Similar to Anki's fuzz but picks the day with least reviews
   * @param {number} interval - Base interval in days
   * @returns {number} Adjusted interval
   */
  applyLoadBalancer(interval) {
    // Only apply to intervals >= 1 day
    if (interval < 1) {
      return interval;
    }

    // Add small random variation (±5%) to distribute reviews
    // In a real implementation, this would check actual review distribution
    const variation = 0.05; // 5% variation
    const randomFactor = 1 + (Math.random() * 2 - 1) * variation;
    
    return interval * randomFactor;
  }

  /**
   * Calculate initial ease for a new flashcard
   * Can incorporate linked notes' weighted ease if applicable
   * @param {Object} options - Options for ease calculation
   * @param {number} options.linkedEase - Weighted ease from linked notes
   * @returns {number} Initial ease factor
   */
  calculateInitialEase(options = {}) {
    let ease = this.config.baseEase;

    // Incorporate linked notes contribution if provided
    if (options.linkedEase && this.config.maxLinkContribution > 0) {
      const contribution = (options.linkedEase - this.config.baseEase) * 
                          (this.config.maxLinkContribution / 100);
      ease = this.config.baseEase + contribution;
    }

    return Math.max(130, Math.round(ease));
  }

  /**
   * Check if a flashcard is due for review
   * @param {Object} flashcardData - Flashcard data with dueDate
   * @returns {boolean} True if flashcard is due
   */
  isDue(flashcardData) {
    if (!flashcardData.dueDate) {
      return true; // New flashcard is always due
    }
    return Date.now() >= flashcardData.dueDate;
  }

  /**
   * Get days until next review
   * @param {Object} flashcardData - Flashcard data
   * @returns {number} Days until review (0 if due now, negative if overdue)
   */
  getDaysUntilReview(flashcardData) {
    if (!flashcardData.dueDate) {
      return 0;
    }
    const now = Date.now();
    const diff = flashcardData.dueDate - now;
    return Math.round(diff / (24 * 60 * 60 * 1000));
  }

  /**
   * Reset flashcard data (for restarting progress)
   * @param {Object} flashcardData - Current flashcard data
   * @returns {Object} Reset flashcard data
   */
  resetFlashcard(flashcardData) {
    return {
      ...flashcardData,
      reviewCount: 0,
      ease: this.config.baseEase,
      interval: 0,
      lastReview: null,
      dueDate: null,
      difficulty: null
    };
  }
}

// Export singleton instance
export const algorithm = new SpacedRepetitionAlgorithm();

