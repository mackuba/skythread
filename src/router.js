import { URLError } from './api.js';
import { Post } from './models/posts.js';


/** @returns {string} */

export function getBaseLocation() {
  return location.origin + location.pathname;
}

/** @param {string} hashtag, @returns {string} */

export function linkToHashtagPage(hashtag) {
  let url = new URL(getBaseLocation());
  url.searchParams.set('hash', hashtag);
  return url.toString();
}

/** @param {string} postURL, @returns {string} */

export function linkToQuotesPage(postURL) {
  let url = new URL(getBaseLocation());
  url.searchParams.set('quotes', postURL);
  return url.toString();
}

/** @param {Post} post, @returns {string} */

export function linkToPostThread(post) {
  return linkToPostById(post.author.handle, post.rkey);
}

/** @param {string} handle, @param {string} postId, @returns {string} */

export function linkToPostById(handle, postId) {
  let url = new URL(getBaseLocation());
  url.searchParams.set('author', handle);
  url.searchParams.set('post', postId);
  return url.toString();
}

/** @param {string} string, @returns {{ user: string, post: string }} */

export function parseBlueskyPostURL(string) {
  let url;

  try {
    url = new URL(string);
  } catch (error) {
    throw new URLError(`${error}`);
  }

  if (url.protocol != 'https:' && url.protocol != 'http:') {
    throw new URLError('URL must start with http(s)://');
  }

  let parts = url.pathname.split('/');

  if (parts.length < 5 || parts[1] != 'profile' || parts[3] != 'post') {
    throw new URLError('This is not a valid thread URL');
  }

  let user = parts[2];
  let post = parts[4];

  return { user, post };
}

/** @param {string} urlQuery, @returns {Record<string, string>} */

export function parseURLParams(urlQuery) {
  return Object.fromEntries(new URLSearchParams(urlQuery));
}
