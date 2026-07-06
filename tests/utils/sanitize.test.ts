import { describe, expect, test } from 'bun:test';

await import('../jsdom');

const { sanitizeHTML } = await import('../../src/utils/sanitize');

describe('sanitizeHTML', () => {
  test('keeps allowed tags and attributes', () => {
    let html = '<p>Hello <b>world</b>! <a href="https://bsky.app">bsky.app</a></p>';
    expect(sanitizeHTML(html)).toBe(html);
  });

  test('removes disallowed tags while keeping their text content', () => {
    let html = '<button>clik</button> <script>alert(1)</script> <p>Hello <code>code</code> <a href="/x">x</a></p>';

    expect(sanitizeHTML(html)).toBe('clik  <p>Hello <code>code</code> <a href="/x">x</a></p>');
  });

  test('removes disallowed attributes', () => {
    let html = '<p onclick="boom()" title="ok">Hi</p>';
    expect(sanitizeHTML(html)).toBe('<p title="ok">Hi</p>');
  });

  test('removes unsafe link URLs', () => {
    expect(sanitizeHTML('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });
});
