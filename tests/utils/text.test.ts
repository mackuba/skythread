import { describe, expect, test } from 'bun:test';

import { numberOfDays, pluralize, truncateText } from '../../src/utils/text';

describe('numberOfDays', () => {
  test('returns a string with the number and the word day or days', () => {
    expect(numberOfDays(1)).toBe('1 day');
    expect(numberOfDays(3)).toBe('3 days');
  });
});

describe('pluralize', () => {
  test('uses the singular or plural form of a given word accordingly', () => {
    expect(pluralize(0, 'cat')).toBe('0 cats');
    expect(pluralize(1, 'cat')).toBe('1 cat');
    expect(pluralize(2, 'cat')).toBe('2 cats');
    expect(pluralize(11, 'cat')).toBe('11 cats');
  });

  test('accepts a custom plural form', () => {
    expect(pluralize(2, 'reply', 'replies')).toBe('2 replies');
  });
});

describe('truncateText', () => {
  test('returns text shorter than the limit as is', () => {
    expect(truncateText('hello', 5)).toBe('hello');
    expect(truncateText('hello', 6)).toBe('hello');
  });

  test('for longer text, truncates it to a given number of characters including an ellipsis', () => {
    expect(truncateText('hello world', 8)).toBe('hello w…');
  });
});
