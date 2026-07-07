import { describe, expect, test } from 'bun:test';

import { CodeMarkupParser } from '../../src/utils/code_markup_parser';
import type { Facet, FacetLink, FacetMention, FacetTag } from '../../lib/rich_text_lite';

const encoder = new TextEncoder();

function lines(parts: string[]): string {
  return parts.join('\n');
}

function facetMention(did: string): FacetMention {
  return { $type: 'app.bsky.richtext.facet#mention', did: did };
}

function facetTag(tag: string): FacetTag {
  return { $type: 'app.bsky.richtext.facet#tag', tag: tag };
}

function facetFor(text: string, token: string, feature: FacetLink | FacetMention | FacetTag, occurrence = 0): Facet {
  let start = -1;

  for (let i = 0; i <= occurrence; i++) {
    start = text.indexOf(token, start + 1);
  }

  if (start == -1) {
    throw new Error(`Missing token in test text: ${token}`);
  }

  return {
    index: {
      byteStart: encoder.encode(text.slice(0, start)).byteLength,
      byteEnd: encoder.encode(text.slice(0, start + token.length)).byteLength,
    },
    features: [feature],
  };
}

describe('CodeMarkupParser', () => {
  describe('asSingleSegment', () => {
    test('returns the whole text as a plain text segment', () => {
      expect(new CodeMarkupParser('something with `code` etc').asSingleSegment()).toEqual(
        { kind: 'text', text: 'something with `code` etc', start: 0, end: 25 }
      );
    });
  });

  describe('segments', () => {
    test('returns a single text segment when no backticks are present', () => {
      expect(new CodeMarkupParser('plain text').segments()).toEqual([
        { kind: 'text', text: 'plain text', start: 0, end: 10 },
      ]);
    });

    test('splits inline code from surrounding text', () => {
      expect(new CodeMarkupParser('hello `code` world').segments()).toEqual([
        { kind: 'text', text: 'hello ', start: 0, end: 6 },
        { kind: 'inlineCode', text: 'code', start: 6, end: 12 },
        { kind: 'text', text: ' world', start: 12, end: 18 },
      ]);
    });

    test('extracts code blocks with a language', () => {
      let text = lines([
        'before',
        '```ts',
        'const x = 1;',
        '```',
        'after',
      ]);

      expect(new CodeMarkupParser(text).segments()).toEqual([
        { kind: 'text', text: 'before\n', start: 0, end: 7 },
        {
          kind: 'codeBlock',
          text: 'const x = 1;\n',
          language: 'ts',
          start: 7,
          end: 30,
        },
        { kind: 'text', text: 'after', start: 30, end: 35 },
      ]);
    });

    test('extracts code blocks with no language tag', () => {
      let text = lines([
        'before',
        '```',
        '[config]',
        'user = root',
        '```',
        'after',
      ]);

      expect(new CodeMarkupParser(text).segments()).toEqual([
        { kind: 'text', text: 'before\n', start: 0, end: 7 },
        {
          kind: 'codeBlock',
          text: '[config]\nuser = root\n',
          language: undefined,
          start: 7,
          end: 36,
        },
        { kind: 'text', text: 'after', start: 36, end: 41 },
      ]);
    });
  });

  describe('removeFacetsInCodeSegments', () => {
    test('removes facets that overlap code ranges', () => {
      let text = lines([
        '@atproto.com new C library #atdev',
        '',
        '```c',
        '#include "atproto.h"',
        'makePost("hello @atproto.com");',
        '```',
        '',
        "Don't forget the `#include`",
      ]);

      let atprotoMention = facetFor(text, '@atproto.com', facetMention('did:web:atproto.com'));
      let atdevTag = facetFor(text, '#atdev', facetTag('atdev'));

      let originalFacets: Facet[] = [
        atprotoMention,
        atdevTag,
        facetFor(text, '#include', facetTag('include')),
        facetFor(text, '@atproto.com', facetMention('did:web:atproto.com'), 1),
        facetFor(text, '#include', facetTag('include'), 1),
      ];

      let filteredFacets = new CodeMarkupParser(text).removeFacetsInCodeSegments(originalFacets);
      expect(filteredFacets).toEqual([atprotoMention, atdevTag]);
    });
  });
});
