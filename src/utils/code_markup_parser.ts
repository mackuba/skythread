import type { ByteSlice, Facet } from '../../lib/rich_text_lite.js';

type Segment = {
  kind: 'text' | 'inlineCode' | 'codeBlock';
  text: string;
  start: number;
  end: number;
  language?: string | undefined;
};

type Line = {
  text: string;
  start: number;
  end: number;
  nextStart: number;
}

const encoder = new TextEncoder();
const codeBlockOpen = /^```([A-Za-z0-9\+\.\-]+)?$/;
const codeBlockClose = /^```$/;

export class CodeMarkupParser {
  text: string;

  constructor(text: string) {
    this.text = text;
  }

  asSingleSegment(): Segment {
    return { kind: 'text', text: this.text, start: 0, end: this.text.length };
  }

  segments(): Segment[] {
    if (!this.text.includes('`')) {
      return [this.asSingleSegment()];
    }

    let segments: Segment[] = [];
    let cursor = 0;

    let codeBlocks = findCodeBlocks(this.text);

    for (let block of codeBlocks) {
      let beforeBlock = splitInlineCodeSegments(this.text, cursor, block.start);
      segments.push(...beforeBlock, block);
      cursor = block.end;
    }

    let afterBlocks = splitInlineCodeSegments(this.text, cursor);
    segments.push(...afterBlocks);

    return segments;
  }

  removeFacetsInCodeSegments(facets: Facet[] | undefined): Facet[] | undefined {
    if (!facets || !this.text.includes('`')) {
      return facets;
    }

    let codeRanges = this.segments()
      .filter(s => s.kind != 'text')
      .map(s => byteSliceOfSegment(this.text, s));

    if (codeRanges.length == 0) {
      return facets;
    }

    return facets.filter(facet => {
      let overlaps = codeRanges.some(r => facet.index.byteStart < r.byteEnd && facet.index.byteEnd > r.byteStart);
      return !overlaps;
    });
  }
}

function findCodeBlocks(text: string): Segment[] {
  let blocks: Segment[] = [];
  let lines = splitLines(text);

  for (let i = 0; i < lines.length; i++) {
    let openingLine = lines[i];
    let match = openingLine.text.trim().match(codeBlockOpen);

    if (!match) {
      continue;
    }

    let closingLineIndex = lines.findIndex((line, n) => n > i && codeBlockClose.test(line.text.trim()));

    if (closingLineIndex == -1) {
      return blocks;
    } else {
      let closingLine = lines[closingLineIndex];
      let code = text.slice(openingLine.nextStart, closingLine.start);

      blocks.push({
        kind: 'codeBlock',
        text: code,
        language: match[1],
        start: openingLine.start,
        end: closingLine.nextStart
      });

      i = closingLineIndex;
    }
  }

  return blocks;
}

function splitInlineCodeSegments(text: string, start: number, end = text.length): Segment[] {
  let parts: Segment[] = [];
  let cursor = start;

  while (cursor < end) {
    let opening = findSingleBacktick(text, cursor, end);

    if (opening === undefined) {
      parts.push({ kind: 'text', text: text.slice(cursor, end), start: cursor, end: end });
      break;
    }

    let lineEnd = text.indexOf('\n', opening);

    if (lineEnd == -1 || lineEnd > end) {
      lineEnd = end;
    }

    let closing = findSingleBacktick(text, opening + 1, lineEnd);

    if (closing === undefined) {
      parts.push({ kind: 'text', text: text.slice(cursor, end), start: cursor, end: end });
      break;
    }

    parts.push({ kind: 'text', text: text.slice(cursor, opening), start: cursor, end: opening });

    parts.push({
      kind: 'inlineCode',
      text: text.slice(opening + 1, closing),
      start: opening,
      end: closing + 1
    });

    cursor = closing + 1;
  }

  return parts.filter(p => p.text.length > 0);
}

function splitLines(text: string): Line[] {
  let lines: Line[] = [];
  let start = 0;

  while (start < text.length) {
    let lineEnd = text.indexOf('\n', start);

    if (lineEnd !== -1) {
      let line = text.slice(start, lineEnd);
      lines.push({ start: start, end: lineEnd, nextStart: lineEnd + 1, text: line });

      start = lineEnd + 1;
    } else {
      let line = text.slice(start);
      lines.push({ start: start, end: text.length, nextStart: text.length, text: line });

      break;
    }
  }

  return lines;
}

function findSingleBacktick(text: string, start: number, end = text.length): number | undefined {
  let i = text.indexOf('`', start);

  while (i != -1 && i < end) {
    if (text[i-1] != '`' && text[i+1] != '`') { return i }
    i = text.indexOf('`', i + 1);
  }

  return undefined;
}

function byteSliceOfSegment(text: string, segment: Segment): ByteSlice {
  let beforeSegment = encoder.encode(text.slice(0, segment.start));
  let insideSegment = encoder.encode(text.slice(segment.start, segment.end));

  return {
    byteStart: beforeSegment.byteLength,
    byteEnd: beforeSegment.byteLength + insideSegment.byteLength
  };
}
