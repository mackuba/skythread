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

export interface ByteSlice {
  $type?: 'app.bsky.richtext.facet#byteSlice'
  byteStart: number
  byteEnd: number
}

export interface Facet {
  $type?: 'app.bsky.richtext.facet'
  index: ByteSlice
  features: (FacetMention | FacetLink | FacetTag | { $type: string })[]
}

export interface FacetTag {
  $type?: 'app.bsky.richtext.facet#tag'
  tag: string
}

export interface FacetLink {
  $type?: 'app.bsky.richtext.facet#link'
  uri: string
}

export interface FacetMention {
  $type?: 'app.bsky.richtext.facet#mention'
  did: string
}

export interface RichTextProps {
  text: string
  facets?: Facet[] | undefined
}

export class RichTextSegment {
  constructor(public text: string, public facet?: Facet) {}

  get link(): FacetLink | undefined {
    return this.facet?.features.find(v => v.$type === 'app.bsky.richtext.facet#link') as FacetLink
  }

  isLink() {
    return !!this.link
  }

  get mention(): FacetMention | undefined {
    return this.facet?.features.find(v => v.$type === 'app.bsky.richtext.facet#mention') as FacetMention
  }

  isMention() {
    return !!this.mention
  }

  get tag(): FacetTag | undefined {
    return this.facet?.features.find(v => v.$type === 'app.bsky.richtext.facet#tag') as FacetTag
  }

  isTag() {
    return !!this.tag
  }
}

export class RichText {
  unicodeText: UnicodeString
  facets?: Facet[] | undefined

  constructor(props: RichTextProps) {
    this.unicodeText = new UnicodeString(props.text);
    this.facets = props.facets;

    if (this.facets) {
      this.facets = this.facets.filter(facetFilter).sort(facetSort)
    }
  }

  get text() {
    return this.unicodeText.toString();
  }

  get length() {
    return this.unicodeText.length;
  }

  get graphemeLength() {
    return this.unicodeText.graphemeLength;
  }

  *segments(): Generator<RichTextSegment, void, void> {
    const facets = this.facets || [];

    if (!facets.length) {
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

        if (!subtext.trim()) {
          // dont empty string entities
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

const facetSort = (a: Facet, b: Facet) => a.index.byteStart - b.index.byteStart

const facetFilter = (facet: Facet) =>
  // discard negative-length facets. zero-length facets are valid
  facet.index.byteStart <= facet.index.byteEnd


// packages/api/src/rich-text/unicode.ts

/**
 * Javascript uses utf16-encoded strings while most environments and specs
 * have standardized around utf8 (including JSON).
 *
 * After some lengthy debated we decided that richtext facets need to use
 * utf8 indices. This means we need tools to convert indices between utf8
 * and utf16, and that's precisely what this library handles.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const segmenter = new Intl.Segmenter();

export const graphemeLen = (str: string): number => {
  return Array.from(segmenter.segment(str)).length;
}

export class UnicodeString {
  utf16: string
  utf8: Uint8Array
  private _graphemeLen?: number | undefined

  constructor(utf16: string) {
    this.utf16 = utf16;
    this.utf8 = encoder.encode(utf16);
  }

  get length() {
    return this.utf8.byteLength;
  }

  get graphemeLength() {
    if (!this._graphemeLen) {
      this._graphemeLen = graphemeLen(this.utf16)
    }
    return this._graphemeLen;
  }

  slice(start?: number, end?: number): string {
    return decoder.decode(this.utf8.slice(start, end));
  }

  toString() {
    return this.utf16;
  }
}
