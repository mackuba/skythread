import DOMPurify from 'dompurify';

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
