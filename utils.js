class AtURI {
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

/** @param {string} tag, @param {string | object} [params], @returns {any} */

function $tag(tag, params) {
  let element;
  let parts = tag.split('.');

  if (parts.length > 1) {
    let tagName = parts[0];
    element = document.createElement(tagName);
    element.className = parts.slice(1).join(' ');
  } else {
    element = document.createElement(tag);
  }

  if (typeof params === 'string') {
    element.className = element.className + ' ' + params;
  } else if (params) {
    for (let key in params) {
      if (key == 'text') {
        element.innerText = params[key];
      } else if (key == 'html') {
        element.innerHTML = params[key];
      } else {
        element[key] = params[key];
      }
    }
  }

  return element;
}

/** @param {string} name, @returns {any} */

function $id(name) {
  return document.getElementById(name);
}

/** @param {string} uri, @returns {AtURI} */

function atURI(uri) {
  return new AtURI(uri);
}

function castToInt(value) {
  if (value === undefined || value === null || typeof value == "number") {
    return value;
  } else {
    return parseInt(value, 10);
  }
}

/** @param {string} html, @returns {string} */

function escapeHTML(html) {
  return html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g,'&gt;');
}

/** @param {string} html, @returns {string} */

function sanitizeHTML(html) {
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

/** @returns {string} */

function getLocation() {
  return location.origin + location.pathname;
}

/** @param {Date} date1, @param {Date} date2, @returns {boolean} */

function sameDay(date1, date2) {
  return (
    date1.getDate() == date2.getDate() &&
    date1.getMonth() == date2.getMonth() &&
    date1.getFullYear() == date2.getFullYear()
  );
}

/** @param {Post} post, @returns {string} */

function linkToPostThread(post) {
  return linkToPostById(post.author.handle, post.rkey);
}

/** @param {string} handle, @param {string} postId, @returns {string} */

function linkToPostById(handle, postId) {
  let url = new URL(getLocation());
  url.searchParams.set('author', handle);
  url.searchParams.set('post', postId);
  return url.toString();
}
