import { describe, expect, test } from 'bun:test';

import { URLError } from '../../src/api/errors';
import { AtURI, atURI } from '../../src/utils/at_uri';

describe('AtURI', () => {
  test('parses repo, collection and rkey from an at:// URI', () => {
    let uri = new AtURI('at://did:plc:abc/app.bsky.feed.post/3kabc');

    expect(uri.repo).toBe('did:plc:abc');
    expect(uri.collection).toBe('app.bsky.feed.post');
    expect(uri.rkey).toBe('3kabc');
  });

  test('atURI() works as a convenience constructor', () => {
    expect(atURI('at://alice.example/app.bsky.feed.post/3kabc')).toEqual(
      new AtURI('at://alice.example/app.bsky.feed.post/3kabc'),
    );
  });

  test('throws URLError when the argument is not an at:// URI', () => {
    expect(() => new AtURI('https://bsky.app/profile/alice.example')).toThrow(URLError);
  });

  test('throws URLError if the URI has a wrong number of path segments', () => {
    expect(() => new AtURI('at://did:plc:abc/app.bsky.feed.post')).toThrow(URLError);
    expect(() => new AtURI('at://did:plc:foobar/')).toThrow(URLError);
    expect(() => new AtURI('at://atproto.com')).toThrow(URLError);
    expect(() => new AtURI('at://did:plc:qwerty/app.bsky.feed.post/3rkey/v2')).toThrow(URLError);
  });
});
