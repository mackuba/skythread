import { Post } from '../models/posts.js';
import * as paginator from '../utils/paginator.js';
import { BlueskyAPI, accountAPI } from '../api.js';

export type OnPostsLoaded = (data: { posts: Post[], terms: string[] }) => void
export type OnFinish = () => void

export class Lycan {
  get proxyHeaders() {
    return { 'atproto-proxy': 'did:web:lycan.feeds.blue#lycan' };
  }

  async getImportStatus() {
    return await accountAPI.getRequest('blue.feeds.lycan.getImportStatus', null, { headers: this.proxyHeaders });
  }

  async startImport() {
    await accountAPI.postRequest('blue.feeds.lycan.startImport', null, { headers: this.proxyHeaders });
  }

  async makeQuery(collection: string, query: string, cursor: string | undefined) {
    let params: Record<string, string> = { collection, query };
    if (cursor) params.cursor = cursor;

    return await accountAPI.getRequest('blue.feeds.lycan.searchPosts', params, { headers: this.proxyHeaders });
  }

  searchPosts(collection: string, query: string, callbacks: { onPostsLoaded: OnPostsLoaded, onFinish: OnFinish }) {
    let isLoading = false;
    let finished = false;
    let cursor: string | undefined;

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
  localLycan: BlueskyAPI;

  constructor() {
    super();
    this.localLycan = new BlueskyAPI('http://localhost:3000');
  }

  async getImportStatus() {
    return await this.localLycan.getRequest('blue.feeds.lycan.getImportStatus', { user: accountAPI.user.did });
  }

  async startImport() {
    await this.localLycan.postRequest('blue.feeds.lycan.startImport', { user: accountAPI.user.did });
  }

  async makeQuery(collection: string, query: string, cursor: string | undefined) {
    let params: Record<string, string> = { collection, query, user: accountAPI.user.did };
    if (cursor) params.cursor = cursor;

    return await this.localLycan.getRequest('blue.feeds.lycan.searchPosts', params);
  }
}
