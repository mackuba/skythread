import { BlueskyAPI, type TimelineFetchOptions } from "./bluesky_api";
import { AuthError, type FetchAllOnPageLoad } from './minisky.js';
import { Post } from '../models/posts.js';
import { atURI, feedPostTime } from '../utils.js';

/**
 * Stores user's access tokens and data in local storage after they log in.
 */

class LocalStorageConfig {
  user: json;

  constructor() {
    let data = localStorage.getItem('userData');
    this.user = data ? JSON.parse(data) : {};
  }

  save() {
    if (this.user) {
      localStorage.setItem('userData', JSON.stringify(this.user));
    } else {
      localStorage.removeItem('userData');
    }
  }
}

export class AuthenticatedAPI extends BlueskyAPI {
  user: json;

  constructor() {
    let config = new LocalStorageConfig();
    let pds: string | null = config.user.pdsEndpoint || null;
    super(pds, config);
    this.user = config.user;
  }

  async getCurrentUserAvatar(): Promise<json | undefined> {
    let json = await this.getRequest('com.atproto.repo.getRecord', {
      repo: this.user.did,
      collection: 'app.bsky.actor.profile',
      rkey: 'self'
    });

    return json.value.avatar;
  }

  async loadCurrentUserAvatar(): Promise<string | null> {
    if (!this.config || !this.config.user) {
      throw new AuthError("User isn't logged in");
    }

    let avatar = await this.getCurrentUserAvatar();

    if (avatar) {
      let url = `https://cdn.bsky.app/img/avatar/plain/${this.user.did}/${avatar.ref.$link}@jpeg`;
      this.config.user.avatar = url;
      this.config.save();
      return url;
    } else {
      return null;
    }
  }

  async loadNotifications(params?: json): Promise<json> {
    return await this.getRequest('app.bsky.notification.listNotifications', params || {});
  }

  async loadMentions(cursor?: string): Promise<{ cursor: string | undefined, posts: json[] }> {
    let response = await this.loadNotifications({ cursor: cursor ?? '', limit: 100, reasons: ['reply', 'mention'] });
    let uris = response.notifications.map((x: any) => x.uri);
    let batches: Promise<json[]>[] = [];

    for (let i = 0; i < uris.length; i += 25) {
      let batch = this.loadPosts(uris.slice(i, i + 25));
      batches.push(batch);
    }

    let postGroups = await Promise.all(batches);

    return { cursor: response.cursor, posts: postGroups.flat() };
  }

  async loadHomeTimeline(days: number, options: TimelineFetchOptions = {}): Promise<json[]> {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getTimeline', {
      params: { limit: 100 },
      field: 'feed',
      breakWhen: (x: json) => feedPostTime(x) < timeLimit,
      ...options
    });
  }

  async loadUserLists(): Promise<json[]> {
    let lists = await this.fetchAll('app.bsky.graph.getLists', {
      params: {
        actor: this.user.did,
        limit: 100
      },
      field: 'lists'
    });

    return lists.filter((x: json) => x.purpose == 'app.bsky.graph.defs#curatelist');
  }

  async likePost(post: Post): Promise<json> {
    return await this.postRequest('com.atproto.repo.createRecord', {
      repo: this.user.did,
      collection: 'app.bsky.feed.like',
      record: {
        subject: {
          uri: post.uri,
          cid: post.cid
        },
        createdAt: new Date().toISOString()
      }
    });
  }

  async removeLike(uri: string) {
    let { rkey } = atURI(uri);

    await this.postRequest('com.atproto.repo.deleteRecord', {
      repo: this.user.did,
      collection: 'app.bsky.feed.like',
      rkey: rkey
    });
  }

  resetTokens() {
    delete this.user.avatar;
    super.resetTokens();
  }
}
