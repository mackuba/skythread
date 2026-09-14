import { settings } from './models/settings.svelte.js';

export function linkToBluesky(path: string): string {
  let host = settings.blueskyHost ?? 'bsky.app';
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `https://${host}${normalizedPath}`;
}
