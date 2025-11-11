import DOMPurify from 'dompurify';
import { URLError } from './api/api.js';

export class AtURI {
  /** @param {string} uri */
  constructor(uri) {
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

/**
 * @template {HTMLElement} T
 * @param {string} name
 * @param {new (...args: any[]) => T} [type]
 * @returns {T}
 */

export function $id(name, type) {
  return /** @type {T} */ (document.getElementById(name));
}

/**
 * @template {HTMLElement} T
 * @param {Node | EventTarget | null} element
 * @param {new (...args: any[]) => T} [type]
 * @returns {T}
 */

export function $(element, type) {
  return /** @type {T} */ (element);
}

/** @param {string} uri, @returns {AtURI} */

export function atURI(uri) {
  return new AtURI(uri);
}

export function castToInt(value) {
  if (value === undefined || value === null || typeof value == "number") {
    return value;
  } else {
    return parseInt(value, 10);
  }
}

/** @param {string} html, @returns {string} */

export function escapeHTML(html) {
  return html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g,'&gt;');
}

/** @param {json} feedPost, @returns {number} */

export function feedPostTime(feedPost) {
  let timestamp = feedPost.reason ? feedPost.reason.indexedAt : feedPost.post.record.createdAt;
  return Date.parse(timestamp);
}

/** @param {string} url, @returns {boolean} */

export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    console.error("Invalid URL: " + error);
    return false;
  }
}

/** @param {number} days, @returns {string} */

export function numberOfDays(days) {
  return (days == 1) ? '1 day' : `${days} days`;
}

/** @param {string} html, @returns {string} */

export function sanitizeHTML(html) {
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

/** @param {object} error */

export function showError(error) {
  console.log(error);
  alert(error);
}

/** @param {Date} date1, @param {Date} date2, @returns {boolean} */

export function sameDay(date1, date2) {
  return (
    date1.getDate() == date2.getDate() &&
    date1.getMonth() == date2.getMonth() &&
    date1.getFullYear() == date2.getFullYear()
  );
}

export function truncateText(text, maxLen) {
  if (text <= maxLen) {
    return text;
  } else {
    return text.slice(0, maxLen - 1) + '…';
  }
}
