/*
  Extracted from https://github.com/bluesky-social/atproto/

  Copyright (c) 2022-2024 Bluesky PBC, and Contributors
  MIT License

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

// packages/api/src/rich-text/rich-text.ts

class RichTextSegment {
  /** @param {string} text, @param {object} [facet] */
  constructor(text, facet) {
    this.text = text;
    this.facet = facet;
  }

  /** @returns {object | undefined} */
  get link() {
    return this.facet?.features?.find(v => v.$type === 'app.bsky.richtext.facet#link');
  }

  /** @returns {object | undefined} */
  get mention() {
    return this.facet?.features?.find(v => v.$type === 'app.bsky.richtext.facet#mention');
  }

  /** @returns {object | undefined} */
  get tag() {
    return this.facet?.features?.find(v => v.$type === 'app.bsky.richtext.facet#tag');
  }
}

class RichText {
  /** @params {object} props */
  constructor(props) {
    this.unicodeText = new UnicodeString(props.text);
    this.facets = props.facets;

    if (this.facets) {
      this.facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
    }
  }

  /** @returns {string} */
  get text() {
    return this.unicodeText.toString();
  }

  /** @returns {number} */
  get length() {
    return this.unicodeText.length;
  }

  /** @returns {number} */
  get graphemeLength() {
    return this.unicodeText.graphemeLength;
  }

  *segments() {
    const facets = this.facets || [];

    if (facets.length == 0) {
      yield new RichTextSegment(this.unicodeText.utf16);
      return;
    }

    let textCursor = 0;
    let facetCursor = 0;

    do {
      const currFacet = facets[facetCursor];

      if (textCursor < currFacet.index.byteStart) {
        yield new RichTextSegment(this.unicodeText.slice(textCursor, currFacet.index.byteStart));
      } else if (textCursor > currFacet.index.byteStart) {
        facetCursor++;
        continue;
      }

      if (currFacet.index.byteStart < currFacet.index.byteEnd) {
        const subtext = this.unicodeText.slice(currFacet.index.byteStart, currFacet.index.byteEnd);

        if (subtext.trim().length == 0) {
          yield new RichTextSegment(subtext);
        } else {
          yield new RichTextSegment(subtext, currFacet);
        }
      }

      textCursor = currFacet.index.byteEnd;
      facetCursor++;

    } while (facetCursor < facets.length);

    if (textCursor < this.unicodeText.length) {
      yield new RichTextSegment(this.unicodeText.slice(textCursor, this.unicodeText.length));
    }
  }
}


// packages/api/src/rich-text/unicode.ts

/**
 * Javascript uses utf16-encoded strings while most environments and specs
 * have standardized around utf8 (including JSON).
 *
 * After some lengthy debated we decided that richtext facets need to use
 * utf8 indices. This means we need tools to convert indices between utf8
 * and utf16, and that's precisely what this library handles.
 */

class UnicodeString {
  static encoder = new TextEncoder();
  static decoder = new TextDecoder();
  static segmenter = window.Intl && Intl.Segmenter && new Intl.Segmenter();

  /** @param {string} utf16 */
  constructor(utf16) {
    this.utf16 = utf16;
    this.utf8 = UnicodeString.encoder.encode(utf16);
  }

  /** @returns number */
  get length() {
    return this.utf8.byteLength;
  }

  /** @returns number */
  get graphemeLength() {
    return Array.from(UnicodeString.segmenter.segment(this.utf16)).length;
  }

  /** @param {number} start, @param {number} end, @returns string */
  slice(start, end) {
    return UnicodeString.decoder.decode(this.utf8.slice(start, end));
  }

  /** @returns string */
  toString() {
    return this.utf16;
  }
}
