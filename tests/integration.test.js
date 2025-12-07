/**
 * Integration tests for flashcard system
 */

import { test, expect } from 'bun:test';
import { flashcardManager } from '../src/core/flashcards.js';
import { scheduler } from '../src/core/scheduler.js';

// Mock chrome.runtime for testing
if (typeof chrome === 'undefined') {
  global.chrome = {
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`,
      lastError: null
    },
    storage: {
      local: {
        get: (keys, callback) => {
          const result = {};
          keys.forEach(key => {
            const value = global.mockStorage?.[key];
            if (value !== undefined) {
              result[key] = value;
            }
          });
          callback(result);
        },
        set: (data, callback) => {
          if (!global.mockStorage) {
            global.mockStorage = {};
          }
          Object.assign(global.mockStorage, data);
          callback();
        }
      }
    }
  };
}

// Mock fetch for loading flashcards
global.fetch = async (url) => {
  if (url.includes('flashcards.json')) {
    return {
      ok: true,
      json: async () => ({
        flashcards: [
          { id: 'fc-1', question: 'Q1', answer: 'A1', tags: [], createdAt: '2024-01-01' },
          { id: 'fc-2', question: 'Q2', answer: 'A2', tags: [], createdAt: '2024-01-01' },
          { id: 'fc-3', question: 'Q3', answer: 'A3', tags: [], createdAt: '2024-01-01' }
        ]
      })
    };
  }
  throw new Error('Not found');
};

test('flashcard manager can load flashcards', async () => {
  await flashcardManager.init();
  const flashcards = flashcardManager.getAllFlashcards();
  expect(flashcards.length).toBeGreaterThan(0);
});

test('scheduler can get next flashcard', async () => {
  await flashcardManager.init();
  const nextFlashcard = scheduler.getNextFlashcard();
  expect(nextFlashcard).not.toBeNull();
  expect(nextFlashcard.flashcard).toBeDefined();
  expect(nextFlashcard.flashcard.id).toBeDefined();
});

test('scheduler records review correctly', async () => {
  await flashcardManager.init();
  const nextFlashcard = scheduler.getNextFlashcard();
  if (nextFlashcard) {
    const flashcardId = nextFlashcard.flashcard.id;
    await scheduler.recordReview(flashcardId, 'good');
    
    const progress = flashcardManager.getFlashcardProgress(flashcardId);
    expect(progress.reviewCount).toBeGreaterThan(0);
  }
});

test('scheduler marks flashcard as done after good review', async () => {
  await flashcardManager.init();
  const nextFlashcard = scheduler.getNextFlashcard();
  if (nextFlashcard) {
    const flashcardId = nextFlashcard.flashcard.id;
    await scheduler.recordReview(flashcardId, 'good');
    
    const stats = flashcardManager.getProgressStats();
    expect(stats.completed.length).toBeGreaterThan(0);
  }
});

test('scheduler provides progress statistics', async () => {
  await flashcardManager.init();
  const stats = scheduler.getSchedulingStats();
  expect(stats).toHaveProperty('due');
  expect(stats).toHaveProperty('new');
  expect(stats).toHaveProperty('total');
});

