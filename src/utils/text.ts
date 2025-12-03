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
      'a', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'div', 'dl', 'dt', 'em', 'font',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'li', 'ol', 'p', 'q', 'pre', 's', 'span', 'strong',
      'sub', 'sup', 'u', 'wbr', '#text'
    ],
    ALLOWED_ATTR: [
      'align', 'alt', 'class', 'clear', 'color', 'dir', 'href', 'lang', 'rel', 'title', 'translate'
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
