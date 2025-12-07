/**
 * Configuration constants for the Flashcard Overlay extension
 */

// Storage keys
export const STORAGE_KEYS = {
  PROGRESS: 'flashcards_progress',
  EXCLUDED_PAGES: 'excluded_pages',
  ALGORITHM_CONFIG: 'algorithm_config',
  ENABLED: 'flashcards_enabled',
  STOP_DURATION: 'flashcards_stop_duration',
  STOP_UNTIL: 'flashcards_stop_until'
};

// Default algorithm configuration (matching the image settings)
export const DEFAULT_ALGORITHM_CONFIG = {
  algorithm: "OSR's variant of SM-2",
  baseEase: 250, // minimum = 130, preferably approximately 250
  intervalChangeHard: 50, // newInterval = oldInterval * intervalChange / 100
  easyBonus: 130, // minimum = 100%
  enableLoadBalancer: true,
  maxIntervalDays: 36525, // default = 100 years
  maxLinkContribution: 50 // Maximum contribution of weighted ease of linked notes
};

// UI defaults
export const UI_DEFAULTS = {
  overlayBackdropOpacity: 0.6,
  animationDuration: 300,
  cardFlipDuration: 600
};

// Flashcard states
export const FLASHCARD_STATES = {
  DONE: 'done',
  REPEAT_LATER: 'repeatLater',
  NEW: 'new'
};

// Review difficulty levels
export const REVIEW_DIFFICULTY = {
  HARD: 'hard',
  GOOD: 'good',
  EASY: 'easy'
};

// Default review intervals (in days) for first-time reviews
export const DEFAULT_INTERVALS = {
  [REVIEW_DIFFICULTY.HARD]: 0.5, // 12 hours
  [REVIEW_DIFFICULTY.GOOD]: 1,
  [REVIEW_DIFFICULTY.EASY]: 4
};

