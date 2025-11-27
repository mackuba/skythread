import DOMPurify from 'dompurify';
import { URLError } from './api/api.js';

export class AtURI {
  repo: string;
  collection: string;
  rkey: string;

  constructor(uri: string) {
    if (!uri.startsWith('at://')) {
      throw new URLError(`Not an at:// URI: ${uri}`);
    }

    let parts = uri.split('/');

    if (parts.length != 5) {
      throw new URLError(`Invalid at:// URI: ${uri}`);
    }

    this.repo = parts[2];
    this.collection = parts[3];
    this.rkey = parts[4];
  }
}

export function $id<T>(name: string, type?: new (...args: any[]) => T): T {
  return document.getElementById(name) as T;
}

export function atURI(uri: string): AtURI {
  return new AtURI(uri);
}

export function castToInt(value: any): number | null | undefined {
  if (value === undefined || value === null || typeof value == "number") {
    return value;
  } else {
    return parseInt(value, 10);
  }
}

export function escapeHTML(html: string): string {
  return html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g,'&gt;');
}

export function feedPostTime(feedPost: json): number {
  let timestamp = feedPost.reason ? feedPost.reason.indexedAt : feedPost.post.record.createdAt;
  return Date.parse(timestamp);
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    console.error("Invalid URL: " + error);
    return false;
  }
}

export function numberOfDays(days: number): string {
  return (days == 1) ? '1 day' : `${days} days`;
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

export function showError(error: Error) {
  console.log(error);
  alert(error);
}

export function sameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() == date2.getDate() &&
    date1.getMonth() == date2.getMonth() &&
    date1.getFullYear() == date2.getFullYear()
  );
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  } else {
    return text.slice(0, maxLen - 1) + '…';
  }
}
