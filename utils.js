function $tag(tag, params) {
  let element;

  if (tag.includes('.')) {
    let parts = tag.split('.');
    let tagName = parts.shift();
    element = document.createElement(tagName);
    element.className = parts.join(' ');
  } else {
    element = document.createElement(tag);
  }

  if (typeof params === 'string') {
    element.className = element.className + ' ' + params;
  } else if (params) {
    for (let key in params) {
      if (key == 'text') {
        element.innerText = params[key];
      } else if (key == 'content') {
        element.innerHTML = params[key];
      } else {
        element[key] = params[key];
      }
    }
  }

  return element;
}

function $id(name) {
  return document.getElementById(name);
}

function atURI(uri) {
  return new AtURI(uri);
}

class AtURI {
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

function escapeHTML(html) {
  return html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g,'&gt;');
}

function getLocation() {
  return location.origin + location.pathname;
}

function sameDay(date1, date2) {
  return (
    date1.getDate() == date2.getDate() &&
    date1.getMonth() == date2.getMonth() &&
    date1.getFullYear() == date2.getFullYear()
  );
}

function linkToPostThread(post) {
  return linkToPostById(post.author.handle, post.rkey);
}

function linkToPostById(handle, postId) {
  let url = new URL(getLocation());
  url.searchParams.set('author', handle);
  url.searchParams.set('post', postId);

  if (window.unauthed) {
    url.searchParams.set('_u', 1);    
  }

  return url.toString();
}
