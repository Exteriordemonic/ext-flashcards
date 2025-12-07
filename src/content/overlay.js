/**
 * Overlay UI system for displaying flashcards
 */

import { REVIEW_DIFFICULTY } from '../utils/constants.js';
import { UI_DEFAULTS } from '../utils/constants.js';
import { storage } from '../core/storage.js';

class OverlayManager {
  constructor() {
    this.overlay = null;
    this.currentFlashcard = null;
    this.isFlipped = false;
    this.onCloseCallback = null;
    this.scheduler = null; // Will be set from outside
    this.algorithm = null; // Will be set from outside
  }

  /**
   * Set scheduler instance (called after modules are loaded)
   * @param {Object} schedulerInstance - Scheduler instance
   */
  setScheduler(schedulerInstance) {
    this.scheduler = schedulerInstance;
  }

  /**
   * Set algorithm instance (called after modules are loaded)
   * @param {Object} algorithmInstance - Algorithm instance
   */
  setAlgorithm(algorithmInstance) {
    this.algorithm = algorithmInstance;
  }

  /**
   * Create and show overlay with flashcard
   * @param {Object} flashcardData - Flashcard data from scheduler
   * @param {Function} onClose - Callback when overlay is closed
   */
  async show(flashcardData, onClose = null) {
    if (!flashcardData) {
      console.error('No flashcard data provided to overlay');
      return;
    }
    
    if (!flashcardData.flashcard) {
      console.error('Invalid flashcard data: missing flashcard object', flashcardData);
      return;
    }
    
    if (!flashcardData.flashcard.question || !flashcardData.flashcard.answer) {
      console.error('Invalid flashcard: missing question or answer', flashcardData.flashcard);
      return;
    }

    this.currentFlashcard = flashcardData;
    this.onCloseCallback = onClose;
    this.isFlipped = false;

    // Remove existing overlay if present (without clearing currentFlashcard)
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    // Restore body scroll if it was hidden
    document.body.style.overflow = '';

    // Create overlay element
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);

    // Update "Stop for X min" button text
    await this.updateStopButtonText();

    // Calculate and update time estimates for review buttons
    await this.updateTimeEstimates();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Add escape key handler
    this.addEscapeHandler();
  }

  /**
   * Create overlay DOM structure
   * @returns {HTMLElement} Overlay element
   */
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'flashcard-overlay';
    overlay.id = 'flashcard-overlay';

    const backdrop = document.createElement('div');
    backdrop.className = 'flashcard-overlay-backdrop';
    backdrop.addEventListener('click', (e) => {
      // Close on backdrop click (optional - can be disabled)
      // this.hide();
    });

    const container = document.createElement('div');
    container.className = 'flashcard-overlay-container';

    const card = this.createCard();
    container.appendChild(card);

    const controls = this.createControls();
    container.appendChild(controls);

    overlay.appendChild(backdrop);
    overlay.appendChild(container);

    return overlay;
  }

  /**
   * Create flashcard card with flip animation
   * @returns {HTMLElement} Card element
   */
  createCard() {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'flashcard-card-wrapper';

    const card = document.createElement('div');
    card.className = 'flashcard-card';
    card.addEventListener('click', () => this.flipCard());

    const front = document.createElement('div');
    front.className = 'flashcard-front';
    const question = document.createElement('div');
    question.className = 'flashcard-question';
    question.textContent = this.currentFlashcard.flashcard.question;
    front.appendChild(question);

    const back = document.createElement('div');
    back.className = 'flashcard-back';
    const answer = document.createElement('div');
    answer.className = 'flashcard-answer';
    answer.textContent = this.currentFlashcard.flashcard.answer;
    back.appendChild(answer);

    card.appendChild(front);
    card.appendChild(back);

    cardWrapper.appendChild(card);
    return cardWrapper;
  }

  /**
   * Create control buttons
   * @returns {HTMLElement} Controls element
   */
  createControls() {
    const controls = document.createElement('div');
    controls.className = 'flashcard-controls';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'flashcard-btn flashcard-btn-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.hide());

    // Action buttons (shown after flip)
    const actions = document.createElement('div');
    actions.className = 'flashcard-actions';
    actions.style.display = 'none';

    const hardBtn = document.createElement('button');
    hardBtn.className = 'flashcard-btn flashcard-btn-hard';
    const hardLabel = document.createElement('span');
    hardLabel.className = 'flashcard-btn-label';
    hardLabel.textContent = 'Hard';
    const hardTime = document.createElement('span');
    hardTime.className = 'flashcard-btn-time';
    hardBtn.appendChild(hardLabel);
    hardBtn.appendChild(hardTime);
    hardBtn.addEventListener('click', () => this.handleReview(REVIEW_DIFFICULTY.HARD));

    const goodBtn = document.createElement('button');
    goodBtn.className = 'flashcard-btn flashcard-btn-good';
    const goodLabel = document.createElement('span');
    goodLabel.className = 'flashcard-btn-label';
    goodLabel.textContent = 'Good';
    const goodTime = document.createElement('span');
    goodTime.className = 'flashcard-btn-time';
    goodBtn.appendChild(goodLabel);
    goodBtn.appendChild(goodTime);
    goodBtn.addEventListener('click', () => this.handleReview(REVIEW_DIFFICULTY.GOOD));

    const easyBtn = document.createElement('button');
    easyBtn.className = 'flashcard-btn flashcard-btn-easy';
    const easyLabel = document.createElement('span');
    easyLabel.className = 'flashcard-btn-label';
    easyLabel.textContent = 'Easy';
    const easyTime = document.createElement('span');
    easyTime.className = 'flashcard-btn-time';
    easyBtn.appendChild(easyLabel);
    easyBtn.appendChild(easyTime);
    easyBtn.addEventListener('click', () => this.handleReview(REVIEW_DIFFICULTY.EASY));

    const laterBtn = document.createElement('button');
    laterBtn.className = 'flashcard-btn flashcard-btn-later';
    laterBtn.textContent = 'Repeat Later'; // Will be updated when overlay is shown
    laterBtn.addEventListener('click', () => this.handleLater());

    actions.appendChild(hardBtn);
    actions.appendChild(goodBtn);
    actions.appendChild(easyBtn);
    actions.appendChild(laterBtn);

    controls.appendChild(closeBtn);
    controls.appendChild(actions);

    // Store reference to actions for showing/hiding
    this.actionsElement = actions;

    return controls;
  }

  /**
   * Flip the card to show answer
   */
  flipCard() {
    if (!this.overlay) return;

    const card = this.overlay.querySelector('.flashcard-card');
    if (!card) return;

    this.isFlipped = !this.isFlipped;

    if (this.isFlipped) {
      card.classList.add('flipped');
      // Show action buttons after flip
      if (this.actionsElement) {
        this.actionsElement.style.display = 'flex';
      }
    } else {
      card.classList.remove('flipped');
      if (this.actionsElement) {
        this.actionsElement.style.display = 'none';
      }
    }
  }

  /**
   * Handle review difficulty selection
   * @param {string} difficulty - Review difficulty
   */
  async handleReview(difficulty) {
    if (!this.currentFlashcard) return;
    if (!this.scheduler) {
      console.error('Scheduler not available');
      return;
    }

    const flashcardId = this.currentFlashcard.flashcard.id;
    await this.scheduler.recordReview(flashcardId, difficulty);
    this.hide();
  }

  /**
   * Handle stop for X minutes action
   */
  async handleLater() {
    try {
      // Get stop duration from settings
      const stopDuration = await storage.getStopDuration();
      
      // Calculate stop until timestamp (current time + duration in minutes)
      const stopUntil = Date.now() + (stopDuration * 60 * 1000);
      
      // Store stop timestamp
      await storage.setStopUntil(stopUntil);
      
      console.log(`Stopping flashcards for ${stopDuration} minutes until ${new Date(stopUntil).toLocaleString()}`);
      
      this.hide();
    } catch (error) {
      console.error('Error setting stop timestamp:', error);
      // Hide overlay even if there's an error
      this.hide();
    }
  }

  /**
   * Hide and remove overlay
   */
  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Clear current flashcard
    this.currentFlashcard = null;
    this.isFlipped = false;

    // Call close callback if provided
    if (this.onCloseCallback) {
      this.onCloseCallback();
      this.onCloseCallback = null;
    }

    // Remove escape handler
    this.removeEscapeHandler();
  }

  /**
   * Add escape key handler
   */
  addEscapeHandler() {
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.overlay) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  /**
   * Remove escape key handler
   */
  removeEscapeHandler() {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  /**
   * Check if overlay is currently visible
   * @returns {boolean} True if overlay is visible
   */
  isVisible() {
    return this.overlay !== null && document.body.contains(this.overlay);
  }

  /**
   * Update "Stop for X min" button text with current stop duration
   */
  async updateStopButtonText() {
    if (!this.overlay) return;
    
    const laterBtn = this.overlay.querySelector('.flashcard-btn-later');
    if (laterBtn) {
      try {
        const stopDuration = await storage.getStopDuration();
        laterBtn.textContent = `Stop for ${stopDuration}min`;
      } catch (error) {
        console.error('Error updating stop button text:', error);
        laterBtn.textContent = 'Stop for 10min'; // Fallback
      }
    }
  }

  /**
   * Format time until review in a human-readable format
   * @param {number} milliseconds - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTimeUntilReview(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    if (totalDays > 0) {
      const hours = totalHours % 24;
      if (hours > 0) {
        return `in ${totalDays}d ${hours}h`;
      }
      return `in ${totalDays}d`;
    } else if (totalHours > 0) {
      return `in ${totalHours}h`;
    } else if (totalMinutes > 0) {
      return `in ${totalMinutes}m`;
    } else {
      return 'now';
    }
  }

  /**
   * Calculate and update time estimates for Hard/Good/Easy buttons
   */
  async updateTimeEstimates() {
    if (!this.overlay || !this.currentFlashcard || !this.algorithm) return;

    try {
      // Ensure algorithm config is loaded
      await this.algorithm.ensureConfigLoaded();

      const flashcardId = this.currentFlashcard.flashcard.id;
      const currentProgress = this.currentFlashcard.progress;

      // Calculate next review time for each difficulty
      const difficulties = [
        { difficulty: REVIEW_DIFFICULTY.HARD, button: '.flashcard-btn-hard', timeEl: '.flashcard-btn-hard .flashcard-btn-time' },
        { difficulty: REVIEW_DIFFICULTY.GOOD, button: '.flashcard-btn-good', timeEl: '.flashcard-btn-good .flashcard-btn-time' },
        { difficulty: REVIEW_DIFFICULTY.EASY, button: '.flashcard-btn-easy', timeEl: '.flashcard-btn-easy .flashcard-btn-time' }
      ];

      for (const { difficulty, timeEl } of difficulties) {
        const updatedProgress = this.algorithm.calculateReview(currentProgress, difficulty);
        const now = Date.now();
        const timeUntil = updatedProgress.dueDate - now;
        const formattedTime = this.formatTimeUntilReview(timeUntil);

        const timeElement = this.overlay.querySelector(timeEl);
        if (timeElement) {
          timeElement.textContent = formattedTime;
        }
      }
    } catch (error) {
      console.error('Error calculating time estimates:', error);
    }
  }
}

// Export singleton instance
export const overlay = new OverlayManager();

