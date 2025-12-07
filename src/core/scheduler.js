/**
 * Review scheduling logic and queue management
 */

import { REVIEW_DIFFICULTY } from '../utils/constants.js';

class Scheduler {
  constructor() {
    this.flashcardManager = null;
    this.algorithm = null;
  }

  /**
   * Set dependencies (called after modules are loaded)
   * @param {Object} flashcardManagerInstance - FlashcardManager instance
   * @param {Object} algorithmInstance - Algorithm instance
   */
  setDependencies(flashcardManagerInstance, algorithmInstance) {
    this.flashcardManager = flashcardManagerInstance;
    this.algorithm = algorithmInstance;
  }

  /**
   * Get the next flashcard to review
   * Priority: 1) Due flashcards, 2) Unshown flashcards, 3) Repeat later
   * @returns {Object|null} Flashcard object with progress data or null
   */
  getNextFlashcard() {
    if (!this.flashcardManager || !this.algorithm) {
      console.error('Scheduler dependencies not set');
      return null;
    }

    // First, check for flashcards that are due for review
    const dueFlashcard = this.getDueFlashcard();
    if (dueFlashcard) {
      return dueFlashcard;
    }

    // Then, check for unshown flashcards
    const unshownFlashcard = this.getUnshownFlashcard();
    if (unshownFlashcard) {
      return unshownFlashcard;
    }

    // Finally, check for flashcards marked for later
    const laterFlashcard = this.getLaterFlashcard();
    if (laterFlashcard) {
      return laterFlashcard;
    }

    return null;
  }

  /**
   * Get a flashcard that is due for review
   * @returns {Object|null} Flashcard with progress or null
   */
  getDueFlashcard() {
    if (!this.flashcardManager || !this.algorithm) return null;

    const allFlashcards = this.flashcardManager.getAllFlashcards();
    const progress = this.flashcardManager.progress;

    // Find flashcards that are due
    const dueFlashcards = allFlashcards
      .map(fc => {
        const fcProgress = this.flashcardManager.getFlashcardProgress(fc.id);
        return {
          flashcard: fc,
          progress: fcProgress
        };
      })
      .filter(({ progress }) => {
        // Flashcard is due if it has a dueDate and it's passed, or if it's new
        return !progress.dueDate || this.algorithm.isDue(progress);
      })
      .sort((a, b) => {
        // Sort by due date (earliest first), or by review count (fewer reviews first)
        if (a.progress.dueDate && b.progress.dueDate) {
          return a.progress.dueDate - b.progress.dueDate;
        }
        return (a.progress.reviewCount || 0) - (b.progress.reviewCount || 0);
      });

    if (dueFlashcards.length > 0) {
      // Return the most urgent flashcard
      return dueFlashcards[0];
    }

    return null;
  }

  /**
   * Get a random unshown flashcard
   * @returns {Object|null} Flashcard with progress or null
   */
  getUnshownFlashcard() {
    if (!this.flashcardManager) return null;

    const unshownIds = this.flashcardManager.getUnshownFlashcards();
    
    if (unshownIds.length === 0) {
      return null;
    }

    // Select random unshown flashcard
    const randomIndex = Math.floor(Math.random() * unshownIds.length);
    const selectedId = unshownIds[randomIndex];
    const flashcard = this.flashcardManager.getFlashcardById(selectedId);

    if (flashcard) {
      const progress = this.flashcardManager.getFlashcardProgress(selectedId);
      return { flashcard, progress };
    }

    return null;
  }

  /**
   * Get a flashcard from repeat later list
   * @returns {Object|null} Flashcard with progress or null
   */
  getLaterFlashcard() {
    if (!this.flashcardManager) return null;

    const laterIds = this.flashcardManager.progress.repeatLater;
    
    if (laterIds.length === 0) {
      return null;
    }

    // Get the first one from the list
    const selectedId = laterIds[0];
    const flashcard = this.flashcardManager.getFlashcardById(selectedId);

    if (flashcard) {
      const progress = this.flashcardManager.getFlashcardProgress(selectedId);
      return { flashcard, progress };
    }

    return null;
  }

  /**
   * Record a review result and update scheduling
   * @param {string} flashcardId - Flashcard ID
   * @param {string} difficulty - Review difficulty (hard/good/easy)
   */
  async recordReview(flashcardId, difficulty) {
    if (!this.flashcardManager || !this.algorithm) {
      console.error('Scheduler dependencies not set');
      return;
    }

    const currentProgress = this.flashcardManager.getFlashcardProgress(flashcardId);
    const updatedProgress = this.algorithm.calculateReview(currentProgress, difficulty);
    
    await this.flashcardManager.updateFlashcardProgress(flashcardId, updatedProgress);

    // If marked as "good" or "easy", mark as done (completed review)
    if (difficulty === REVIEW_DIFFICULTY.GOOD || difficulty === REVIEW_DIFFICULTY.EASY) {
      await this.flashcardManager.markAsDone(flashcardId);
      // Remove from repeat later if it was there
      await this.flashcardManager.removeFromLater(flashcardId);
    }

    // If marked as "hard", keep it in rotation but don't mark as done
    // The algorithm will schedule it for earlier review
  }

  /**
   * Mark flashcard for later review
   * @param {string} flashcardId - Flashcard ID
   */
  async markForLater(flashcardId) {
    if (!this.flashcardManager) {
      console.error('FlashcardManager not available');
      return;
    }

    try {
      console.log('Marking flashcard for later:', flashcardId);
      await this.flashcardManager.markForLater(flashcardId);
      console.log('Flashcard marked for later successfully');
    } catch (error) {
      console.error('Error in markForLater:', error);
      throw error;
    }
  }

  /**
   * Get statistics about scheduled reviews
   * @returns {Object} Statistics object
   */
  getSchedulingStats() {
    if (!this.flashcardManager || !this.algorithm) {
      return { due: 0, new: 0, later: 0, total: 0 };
    }

    const allFlashcards = this.flashcardManager.getAllFlashcards();
    const progress = this.flashcardManager.progress;

    let dueCount = 0;
    let newCount = 0;
    let laterCount = 0;

    allFlashcards.forEach(fc => {
      const fcProgress = this.flashcardManager.getFlashcardProgress(fc.id);
      
      if (fcProgress.reviewCount === 0) {
        newCount++;
      } else if (this.algorithm.isDue(fcProgress)) {
        dueCount++;
      }

      if (progress.repeatLater.includes(fc.id)) {
        laterCount++;
      }
    });

    return {
      due: dueCount,
      new: newCount,
      later: laterCount,
      total: allFlashcards.length
    };
  }

  /**
   * Check if there are any flashcards available for review
   * @returns {boolean} True if flashcards are available
   */
  hasFlashcardsAvailable() {
    if (!this.flashcardManager || !this.algorithm) {
      return false;
    }
    return this.getNextFlashcard() !== null;
  }
}

// Export singleton instance
export const scheduler = new Scheduler();

