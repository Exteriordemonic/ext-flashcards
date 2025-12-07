/**
 * Flashcard data management and operations
 */

import { storage } from './storage.js';
import { FLASHCARD_STATES } from '../utils/constants.js';

class FlashcardManager {
  constructor() {
    this.flashcards = [];
    this.progress = null;
  }

  /**
   * Load flashcards from JSON file
   * @returns {Promise<Array>} Array of flashcard objects
   */
  async loadFlashcards() {
    try {
      const response = await fetch(chrome.runtime.getURL('src/data/flashcards.json'));
      const data = await response.json();
      this.flashcards = data.flashcards || [];
      return this.flashcards;
    } catch (error) {
      console.error('Error loading flashcards:', error);
      return [];
    }
  }

  /**
   * Load progress data from storage
   */
  async loadProgress() {
    this.progress = await storage.getProgress();
  }

  /**
   * Save progress data to storage
   */
  async saveProgress() {
    if (!this.progress) {
      console.error('Cannot save: progress is null');
      return;
    }

    try {
      const success = await storage.saveProgress(this.progress);
      if (!success) {
        console.error('Failed to save progress to storage');
      } else {
        console.log('Progress saved successfully');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  }

  /**
   * Get all flashcards
   * @returns {Array} All flashcards
   */
  getAllFlashcards() {
    return this.flashcards;
  }

  /**
   * Get a flashcard by ID
   * @param {string} id - Flashcard ID
   * @returns {Object|null} Flashcard object or null
   */
  getFlashcardById(id) {
    return this.flashcards.find(fc => fc.id === id) || null;
  }

  /**
   * Get flashcard progress data
   * @param {string} id - Flashcard ID
   * @returns {Object} Progress data for the flashcard
   */
  getFlashcardProgress(id) {
    return this.progress.flashcardData[id] || {
      reviewCount: 0,
      ease: null,
      interval: 0,
      lastReview: null,
      dueDate: null,
      difficulty: null
    };
  }

  /**
   * Update flashcard progress data
   * @param {string} id - Flashcard ID
   * @param {Object} progressData - Progress data to update
   */
  async updateFlashcardProgress(id, progressData) {
    if (!this.progress.flashcardData[id]) {
      this.progress.flashcardData[id] = {};
    }
    this.progress.flashcardData[id] = {
      ...this.progress.flashcardData[id],
      ...progressData
    };
    await this.saveProgress();
  }

  /**
   * Mark flashcard as done
   * @param {string} id - Flashcard ID
   */
  async markAsDone(id) {
    if (!this.progress.completed.includes(id)) {
      this.progress.completed.push(id);
      await this.saveProgress();
    }
  }

  /**
   * Mark flashcard for later review
   * @param {string} id - Flashcard ID
   */
  async markForLater(id) {
    // Ensure progress is loaded
    if (!this.progress) {
      await this.loadProgress();
    }

    if (!this.progress) {
      console.error('Cannot mark for later: progress not loaded');
      return;
    }

    if (!this.progress.repeatLater) {
      this.progress.repeatLater = [];
    }

    if (!this.progress.repeatLater.includes(id)) {
      this.progress.repeatLater.push(id);
      await this.saveProgress();
      console.log('Flashcard marked for later:', id);
    }
  }

  /**
   * Remove flashcard from repeat later list
   * @param {string} id - Flashcard ID
   */
  async removeFromLater(id) {
    this.progress.repeatLater = this.progress.repeatLater.filter(fcId => fcId !== id);
    await this.saveProgress();
  }

  /**
   * Get flashcards that haven't been completed
   * @returns {Array} Array of flashcard IDs
   */
  getUncompletedFlashcards() {
    return this.flashcards
      .map(fc => fc.id)
      .filter(id => !this.progress.completed.includes(id));
  }

  /**
   * Get flashcards that haven't been shown yet
   * @returns {Array} Array of flashcard IDs
   */
  getUnshownFlashcards() {
    const allIds = this.flashcards.map(fc => fc.id);
    const shownIds = [
      ...this.progress.completed
    ];
    return allIds.filter(id => !shownIds.includes(id));
  }

  /**
   * Check if all flashcards have been shown
   * @returns {boolean} True if all flashcards have been shown
   */
  areAllFlashcardsShown() {
    const unshown = this.getUnshownFlashcards();
    return unshown.length === 0;
  }

  /**
   * Get progress statistics
   * @returns {Object} Statistics object
   */
  getProgressStats() {
    const total = this.flashcards.length;
    const completed = this.progress.completed.length;
    const repeatLater = this.progress.repeatLater.length;
    const unshown = this.getUnshownFlashcards().length;

    return {
      total,
      completed,
      repeatLater,
      unshown,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  /**
   * Reset all progress
   */
  async resetProgress() {
    this.progress = {
      completed: [],
      repeatLater: [],
      flashcardData: {}
    };
    await this.saveProgress();
  }

  /**
   * Initialize - load flashcards and progress
   * @returns {Promise<void>}
   */
  async init() {
    await this.loadFlashcards();
    await this.loadProgress();
  }
}

// Export singleton instance
export const flashcardManager = new FlashcardManager();

