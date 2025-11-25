import { HandleCache } from './handle_cache.js';
import { APIError, AuthError, Minisky } from './minisky.js';
import { atURI, feedPostTime } from '../utils.js';
import { Post } from '../models/posts.js';
import { parseBlueskyPostURL } from '../router.js';

export { APIError };

/**
 * Thrown when the response is technically a "success" one, but the returned data is not what it should be.
 */

export class ResponseDataError extends Error {}

/**
 * Thrown when the passed URL is not a supported post URL on bsky.app.
 */

export class URLError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when hidden replies couldn't be loaded from the blue.feeds API.
 */

export class HiddenRepliesError extends Error {
  originalError: Error;

  constructor(error: Error) {
    super(error.message);
    this.originalError = error;
  }
}

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

type AuthorFeedFilter =
  | 'posts_with_replies'          // posts, replies and reposts (default)
  | 'posts_no_replies'            // posts and reposts (no replies)
  | 'posts_and_author_threads'    // posts, reposts, and replies in your own threads
  | 'posts_with_media'            // posts and replies, but only with images (no reposts)
  | 'posts_with_video';           // posts and replies, but only with videos (no reposts)

/**
 * API client for connecting to the Bluesky XRPC API (authenticated or not).
 */

export class BlueskyAPI extends Minisky {
  handleCache: HandleCache;
  profiles: Record<string, json>;

  constructor(host: string | null, useAuthentication: boolean) {
    super(host, useAuthentication ? new LocalStorageConfig() : undefined);

    this.handleCache = new HandleCache();
    this.profiles = {};
  }

  cacheProfile(author: json) {
    this.profiles[author.did] = author;
    this.profiles[author.handle] = author;
    this.handleCache.setHandleDid(author.handle, author.did);
  }

  async fetchHandleForDid(did: string): Promise<string> {
    let cachedHandle = this.handleCache.findHandleByDid(did);

    if (cachedHandle) {
      return cachedHandle;
    } else {
      let author = await this.loadUserProfile(did);
      return author.handle;
    }
  }

  async resolveHandle(handle: string): Promise<string> {
    let cachedDid = this.handleCache.getHandleDid(handle);

    if (cachedDid) {
      return cachedDid;
    } else {
      let json = await this.getRequest('com.atproto.identity.resolveHandle', { handle }, { auth: false });
      let did = json['did'];

      if (did) {
        this.handleCache.setHandleDid(handle, did);
        return did;
      } else {
        throw new ResponseDataError('Missing DID in response: ' + JSON.stringify(json));
      }
    }
  }

  async loadThreadByURL(url: string): Promise<json> {
    let { user, post } = parseBlueskyPostURL(url);
    return await this.loadThreadById(user, post);
  }

  async loadThreadById(author: string, postId: string): Promise<json> {
    let did = author.startsWith('did:') ? author : await this.resolveHandle(author);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
    return await this.loadThreadByAtURI(postURI);
  }

  async loadThreadByAtURI(uri: string): Promise<json> {
    return await this.getRequest('app.bsky.feed.getPostThread', { uri: uri, depth: 10 });
  }

  async loadUserProfile(handle: string): Promise<json> {
    if (this.profiles[handle]) {
      return this.profiles[handle];
    } else {
      let profile = await this.getRequest('app.bsky.actor.getProfile', { actor: handle });
      this.cacheProfile(profile);
      return profile;
    }
  }

  async autocompleteUsers(query: string): Promise<json[]> {
    let json = await this.getRequest('app.bsky.actor.searchActorsTypeahead', { q: query });
    return json.actors;
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

  async getReplies(uri: string): Promise<string[]> {
    let json = await this.getRequest('blue.feeds.post.getReplies', { uri });
    return json.replies;
  }

  async getQuoteCount(uri: string): Promise<number> {
    let json = await this.getRequest('blue.feeds.post.getQuoteCount', { uri });
    return json.quoteCount;
  }

  async getQuotes(url: string, cursor: string | undefined = undefined): Promise<json> {
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

  async getHashtagFeed(hashtag: string, cursor: string | undefined = undefined): Promise<json> {
    let params: Record<string, any> = { q: '#' + hashtag, limit: 50, sort: 'latest' };

    if (cursor) {
      params['cursor'] = cursor;
    }

    return await this.getRequest('app.bsky.feed.searchPosts', params);
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

  async loadHiddenReplies(post: Post): Promise<(json | null)[]> {
    let expectedReplyURIs: string[];

    try {
      expectedReplyURIs = await blueAPI.getReplies(post.uri);
    } catch (error) {
      if (error instanceof APIError && error.code == 404) {
        throw new HiddenRepliesError(error);
      } else {
        throw error;
      }
    }

    let missingReplyURIs = expectedReplyURIs.filter(r => !post.replies.some(x => x.uri === r));
    let promises = missingReplyURIs.map(uri => this.loadThreadByAtURI(uri));
    let responses = await Promise.allSettled(promises);

    return responses.map(r => (r.status == 'fulfilled') ? r.value : null);
  }

  async loadHomeTimeline(
    days: number,
    options: { onPageLoad?: FetchAllOnPageLoad; keepLastPage?: boolean } = {}
  ): Promise<json[]> {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getTimeline', {
      params: { limit: 100 },
      field: 'feed',
      breakWhen: (x: json) => feedPostTime(x) < timeLimit,
      onPageLoad: options.onPageLoad,
      keepLastPage: options.keepLastPage
    });
  }

  async loadUserTimeline(
    did: string,
    days: number,
    options: { filter: AuthorFeedFilter, onPageLoad?: FetchAllOnPageLoad, keepLastPage?: boolean }
  ): Promise<json[]> {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getAuthorFeed', {
      params: {
        actor: did,
        filter: options.filter,
        limit: 100
      },
      field: 'feed',
      breakWhen: (x: json) => feedPostTime(x) < timeLimit,
      onPageLoad: options.onPageLoad,
      keepLastPage: options.keepLastPage
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

  async loadListTimeline(
    list: string,
    days: number,
    options: { onPageLoad?: FetchAllOnPageLoad, keepLastPage?: boolean } = {}
  ): Promise<json[]> {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getListFeed', {
      params: {
        list: list,
        limit: 100
      },
      field: 'feed',
      breakWhen: (x: json) => feedPostTime(x) < timeLimit,
      onPageLoad: options.onPageLoad,
      keepLastPage: options.keepLastPage
    });
  }

  async loadPost(postURI: string): Promise<json> {
    let posts = await this.loadPosts([postURI]);

    if (posts.length == 1) {
      return posts[0];
    } else {
      throw new ResponseDataError('Post not found');
    }
  }

  async loadPostIfExists(postURI: string): Promise<json | undefined> {
    let posts = await this.loadPosts([postURI]);
    return posts[0];
  }

  async loadPosts(uris: string[]): Promise<json[]> {
    if (uris.length > 0) {
      let response = await this.getRequest('app.bsky.feed.getPosts', { uris });
      return response.posts;
    } else {
      return [];
    }
  }

  async loadPostViewerInfo(post: Post): Promise<json | undefined> {
    let data = await this.loadPostIfExists(post.uri);

    if (data) {
      post.author = data.author;
      post.viewerData = data.viewer;
      post.viewerLike = data.viewer?.like;
    }

    return data;
  }

  async reloadBlockedPost(uri: string): Promise<Post | null> {
    let { repo } = atURI(uri);

    let loadPost = appView.loadPostIfExists(uri);
    let loadProfile = this.getRequest('app.bsky.actor.getProfile', { actor: repo });

    let data = await loadPost;

    if (!data) {
      return null;
    }

    let profile = await loadProfile;

    return new Post(data, { author: profile });
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
