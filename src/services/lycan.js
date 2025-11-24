import { Post } from '../models/posts.js';
import * as paginator from '../utils/paginator.js';
import { BlueskyAPI } from '../api/api.js';

export class Lycan {

  /** @returns {json} */

  get proxyHeaders() {
    return { 'atproto-proxy': 'did:web:lycan.feeds.blue#lycan' };
  }

  /** @returns {Promise<json>} */

  async getImportStatus() {
    return await accountAPI.getRequest('blue.feeds.lycan.getImportStatus', null, { headers: this.proxyHeaders });
  }

  /** @returns {Promise<void>} */

  async startImport() {
    await accountAPI.postRequest('blue.feeds.lycan.startImport', null, { headers: this.proxyHeaders });
  }

  /** @returns {Promise<json>} */

  async makeQuery(collection, query, cursor) {
    let params = { collection, query };
    if (cursor) params.cursor = cursor;

    return await accountAPI.getRequest('blue.feeds.lycan.searchPosts', params, { headers: this.proxyHeaders });
  }

  /**
   * @param {string} collection
   * @param {string} query
   * @param {{ onPostsLoaded: (data: { posts: Post[], terms: string[] }) => void, onFinish?: () => void }} callbacks
   */

  searchPosts(collection, query, callbacks) {
    let isLoading = false;
    let finished = false;
    let cursor;

    paginator.loadInPages(async () => {
      if (isLoading || finished) { return; }
      isLoading = true;

      let response = await this.makeQuery(collection, query, cursor);
      let records = await accountAPI.loadPosts(response.posts);
      let posts = records.map(x => new Post(x));

      isLoading = false;

      callbacks.onPostsLoaded({ posts: posts, terms: response.terms });

      cursor = response.cursor;

      if (!cursor) {
        finished = true;
        callbacks.onFinish?.()
      }
    });
  }
}

export class DevLycan extends Lycan {

  constructor() {
    super();
    this.localLycan = new BlueskyAPI('http://localhost:3000', false);
  }

  /** @returns {Promise<json>} */

  async getImportStatus() {
    return await this.localLycan.getRequest('blue.feeds.lycan.getImportStatus', { user: accountAPI.user.did });
  }

  /** @returns {Promise<void>} */

  async startImport() {
    await this.localLycan.postRequest('blue.feeds.lycan.startImport', { user: accountAPI.user.did });
  }

  /** @returns {Promise<json>} */

  async makeQuery(collection, query, cursor) {
    let params = { collection, query, user: accountAPI.user.did };
    if (cursor) params.cursor = cursor;

    return await this.localLycan.getRequest('blue.feeds.lycan.searchPosts', params);
  }
}
