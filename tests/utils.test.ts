import { describe, expect, test } from 'bun:test';
import { castToInt, feedPostTime, isValidURL, parseHTTPURL, sameDay } from '../src/utils';

describe('castToInt', () => {
  test('keeps null, undefined and numeric values as-is', () => {
    expect(castToInt(undefined)).toBeUndefined();
    expect(castToInt(null)).toBeNull();
    expect(castToInt(42)).toBe(42);
  });

  test('parses strings as base-10 integers', () => {
    expect(castToInt('42')).toBe(42);
    expect(castToInt('08')).toBe(8);
    expect(castToInt('12px')).toBe(12);
  });
});

describe('feedPostTime', () => {
  test('uses reason indexedAt if reason is present', () => {
    let feedPost = {
      reason: { indexedAt: '2026-01-02T03:04:05.000Z' },
      post: { record: { createdAt: '2025-01-02T03:04:05.000Z' } },
    };

    expect(feedPostTime(feedPost)).toBe(Date.parse('2026-01-02T03:04:05.000Z'));
  });

  test('uses post createdAt timestamp if no reason is set', () => {
    let feedPost = {
      post: { record: { createdAt: '2025-01-02T03:04:05.000Z' } },
    };

    expect(feedPostTime(feedPost)).toBe(Date.parse('2025-01-02T03:04:05.000Z'));
  });
});

describe('parseHTTPURL', () => {
  test('parses HTTP URLs', () => {
    let url = parseHTTPURL('http://example.com/path');

    expect(url).toBeInstanceOf(URL);
    expect(url?.href).toBe('http://example.com/path');
  });

  test('parses HTTPS URLs', () => {
    let url = parseHTTPURL('https://example.com/path');

    expect(url).toBeInstanceOf(URL);
    expect(url?.href).toBe('https://example.com/path');
  });

  test('returns undefined if URL is not HTTP or HTTPS', () => {
    expect(parseHTTPURL('ftp://example.com')).toBeUndefined();
  });

  test('returns undefined if argument is not an URL', () => {
    expect(parseHTTPURL('not a url')).toBeUndefined();
  });
});

describe('isValidURL', () => {
  test('returns true for HTTP and HTTPS URLs', () => {
    expect(isValidURL('http://google.com')).toBe(true);
    expect(isValidURL('https://blue.mackuba.eu/directory/pdses')).toBe(true);
  });

  test('returns false for other URLs and non-URLs', () => {
    expect(isValidURL('javascript:hacksYou()')).toBe(false);
    expect(isValidURL('mailto:hello@example.com')).toBe(false);
    expect(isValidURL('ftp://agh.edu.pl')).toBe(false);
    expect(isValidURL('DROP TABLE students')).toBe(false);
  });
});

describe('sameDay', () => {
  test('returns true if given timestamps are within the same day', () => {
    expect(sameDay(
      new Date('2026-07-06T00:00:00.000Z'),
      new Date('2026-07-06T23:59:59.000Z'),
    )).toBe(true);

    expect(sameDay(
      new Date('2026-07-06T23:59:59.000Z'),
      new Date('2026-07-07T00:00:00.000Z'),
    )).toBe(false);
  });
});
