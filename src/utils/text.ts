import DOMPurify from 'dompurify';

export function numberOfDays(days: number): string {
  return pluralize(days, 'day');
}

export function pluralize(value: number, word: string, plural?: string) {
  if (value == 1) {
    return `1 ${word}`;
  } else {
    plural = plural ?? `${word}s`;
    return `${value} ${plural}`;
  }
}

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'bdi', 'blockquote', 'br', 'cite', 'code', 'dd', 'del', 'div', 'dl', 'dt', 'em',
      'h1', 'h2', 'h3', 'h4', 'h5', 'hr', 'i', 'li', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby',
      's', 'small', 'span', 'strong', 'sub', 'sup', 'u', 'ul', 'wbr'
    ],
    ALLOWED_ATTR: [
      'align', 'class', 'dir', 'href', 'lang', 'title', 'translate'
    ]
  });
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  } else {
    return text.slice(0, maxLen - 1) + '…';
  }
}
