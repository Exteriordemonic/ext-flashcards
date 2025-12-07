/**
 * Tests for spaced repetition algorithm
 */

import { test, expect } from 'bun:test';
import { algorithm } from '../src/core/algorithm.js';
import { REVIEW_DIFFICULTY } from '../src/utils/constants.js';

test('algorithm calculates review intervals correctly for first review', () => {
  const flashcardData = {
    reviewCount: 0,
    ease: 250,
    interval: 0,
    lastReview: null
  };

  const hardResult = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.HARD);
  expect(hardResult.interval).toBeGreaterThan(0);
  expect(hardResult.reviewCount).toBe(1);

  const goodResult = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.GOOD);
  expect(goodResult.interval).toBeGreaterThan(0);
  expect(goodResult.reviewCount).toBe(1);

  const easyResult = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.EASY);
  expect(easyResult.interval).toBeGreaterThan(0);
  expect(easyResult.reviewCount).toBe(1);
});

test('algorithm increases interval for good reviews', () => {
  const flashcardData = {
    reviewCount: 1,
    ease: 250,
    interval: 1,
    lastReview: Date.now() - 86400000 // 1 day ago
  };

  const result = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.GOOD);
  expect(result.interval).toBeGreaterThan(flashcardData.interval);
  expect(result.reviewCount).toBe(2);
});

test('algorithm decreases interval for hard reviews', () => {
  const flashcardData = {
    reviewCount: 1,
    ease: 250,
    interval: 10,
    lastReview: Date.now() - 86400000
  };

  const result = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.HARD);
  expect(result.interval).toBeLessThan(flashcardData.interval);
  expect(result.reviewCount).toBe(2);
});

test('algorithm increases interval more for easy reviews', () => {
  const flashcardData = {
    reviewCount: 1,
    ease: 250,
    interval: 1,
    lastReview: Date.now() - 86400000
  };

  const goodResult = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.GOOD);
  const easyResult = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.EASY);
  
  expect(easyResult.interval).toBeGreaterThan(goodResult.interval);
});

test('algorithm respects maximum interval', async () => {
  await algorithm.ensureConfigLoaded();
  const maxInterval = algorithm.config.maxIntervalDays;

  const flashcardData = {
    reviewCount: 100,
    ease: 250,
    interval: maxInterval * 2, // Way over max
    lastReview: Date.now() - 86400000
  };

  const result = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.EASY);
  expect(result.interval).toBeLessThanOrEqual(maxInterval);
});

test('algorithm calculates due date correctly', () => {
  const flashcardData = {
    reviewCount: 1,
    ease: 250,
    interval: 5,
    lastReview: null
  };

  const result = algorithm.calculateReview(flashcardData, REVIEW_DIFFICULTY.GOOD);
  expect(result.dueDate).toBeGreaterThan(Date.now());
  expect(result.lastReview).toBeGreaterThan(0);
});

test('algorithm checks if flashcard is due', () => {
  const dueFlashcard = {
    dueDate: Date.now() - 1000 // 1 second ago
  };

  const notDueFlashcard = {
    dueDate: Date.now() + 86400000 // 1 day from now
  };

  expect(algorithm.isDue(dueFlashcard)).toBe(true);
  expect(algorithm.isDue(notDueFlashcard)).toBe(false);
  expect(algorithm.isDue({})).toBe(true); // No dueDate means it's due
});

