/**
 * Thrown when the passed URL is not a supported post URL on bsky.app.
 */

export class URLError extends Error {
  constructor(message: string) {
    super(message);
  }
}
