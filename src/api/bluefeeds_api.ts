import { appView } from '../api.js';
import { Minisky } from './minisky.js';
import { parseBlueskyPostURL } from '../router.js';

/**
 * API client for connecting to the Bluefeeds API.
 */

export class BluefeedsAPI extends Minisky {

  constructor(host: string) {
    super(host);
  }

  async getQuoteCount(uri: string): Promise<number> {
    let json = await this.getRequest('blue.feeds.post.getQuoteCount', { uri });
    return json.quoteCount;
  }

  async getQuotes(url: string, cursor?: string): Promise<json> {
    let postURI: string;

    if (url.startsWith('at://')) {
      postURI = url;
    } else {
      let { user, post } = parseBlueskyPostURL(url);
      let did = user.startsWith('did:') ? user : await appView.resolveHandle(user);
      postURI = `at://${did}/app.bsky.feed.post/${post}`;
    }

    let params: Record<string, string> = { uri: postURI };

    if (cursor) {
      params['cursor'] = cursor;
    }

    return await this.getRequest('blue.feeds.post.getQuotes', params);
  }

  async getReplies(uri: string): Promise<string[]> {
    let json = await this.getRequest('blue.feeds.post.getReplies', { uri });
    return json.replies;
  }
}
