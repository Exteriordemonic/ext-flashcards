/**
 * Tests for storage operations
 */

import { test, expect } from 'bun:test';
import { storage } from '../src/core/storage.js';
import { STORAGE_KEYS } from '../src/utils/constants.js';

// Mock chrome.storage for testing
if (typeof chrome === 'undefined') {
  global.chrome = {
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
        },
        remove: (keys, callback) => {
          if (global.mockStorage) {
            keys.forEach(key => {
              delete global.mockStorage[key];
            });
          }
          callback();
        }
      }
    },
    runtime: {
      lastError: null
    }
  };
}

test('storage can save and retrieve data', async () => {
  const testData = { test: 'value', number: 123 };
  await storage.set('test_key', testData);
  const retrieved = await storage.get('test_key');
  expect(retrieved).toEqual(testData);
});

test('storage returns default value when key does not exist', async () => {
  const defaultValue = { default: true };
  const result = await storage.get('non_existent_key', defaultValue);
  expect(result).toEqual(defaultValue);
});

test('storage can save and retrieve progress', async () => {
  const progress = {
    completed: ['fc-1', 'fc-2'],
    skipped: ['fc-3'],
    repeatLater: [],
    flashcardData: {}
  };

  await storage.saveProgress(progress);
  const retrieved = await storage.getProgress();
  expect(retrieved.completed).toContain('fc-1');
  expect(retrieved.completed).toContain('fc-2');
  expect(retrieved.skipped).toContain('fc-3');
});

test('storage can manage excluded pages', async () => {
  await storage.addExcludedPage('https://example.com');
  const excluded = await storage.getExcludedPages();
  expect(excluded).toContain('https://example.com');

  await storage.removeExcludedPage('https://example.com');
  const excludedAfter = await storage.getExcludedPages();
  expect(excludedAfter).not.toContain('https://example.com');
});

test('storage does not add duplicate excluded pages', async () => {
  await storage.addExcludedPage('https://example.com');
  await storage.addExcludedPage('https://example.com');
  const excluded = await storage.getExcludedPages();
  const count = excluded.filter(url => url === 'https://example.com').length;
  expect(count).toBe(1);
});

test('storage can save and retrieve algorithm config', async () => {
  const config = {
    baseEase: 300,
    intervalChangeHard: 40,
    easyBonus: 150
  };

  await storage.saveAlgorithmConfig(config);
  const retrieved = await storage.getAlgorithmConfig();
  expect(retrieved.baseEase).toBe(300);
  expect(retrieved.intervalChangeHard).toBe(40);
});

