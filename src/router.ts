import { URLError } from './api.js';
import { Post } from './models/posts.js';

export function getBaseLocation(): string {
  return location.protocol + '//' + location.host + location.pathname;
}

export function linkToHashtagPage(hashtag: string): string {
  let url = new URL(getBaseLocation());
  url.searchParams.set('hash', hashtag);
  return url.toString();
}

export function linkToQuotesPage(postURL: string): string {
  let url = new URL(getBaseLocation());
  url.searchParams.set('quotes', postURL);
  return url.toString();
}

export function linkToPostThread(post: Post): string {
  return linkToPostById(post.author.handle, post.rkey);
}

export function linkToPostById(handle: string, postId: string): string {
  let url = new URL(getBaseLocation());
  url.searchParams.set('author', handle);
  url.searchParams.set('post', postId);
  return url.toString();
}

export function parseBlueskyPostURL(string: string): { user: string, post: string } {
  let url: URL;

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

export function parseURLParams(urlQuery: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(urlQuery));
}
