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

  /** @param {string} message */
  constructor(message) {
    super(message);
  }
}

export class HiddenRepliesError extends Error {

  /** @param {Error} error */
  constructor(error) {
    super(error.message);
    this.originalError = error;
  }
}


/**
 * Stores user's access tokens and data in local storage after they log in.
 */

class LocalStorageConfig {
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


/**
 * API client for connecting to the Bluesky XRPC API (authenticated or not).
 */

export class BlueskyAPI extends Minisky {

  /** @param {string?} host, @param {boolean} useAuthentication */
  constructor(host, useAuthentication) {
    super(host, useAuthentication ? new LocalStorageConfig() : undefined);

    this.handleCache = new HandleCache();
    this.profiles = {};
  }

  /** @param {json} author */

  cacheProfile(author) {
    this.profiles[author.did] = author;
    this.profiles[author.handle] = author;
    this.handleCache.setHandleDid(author.handle, author.did);
  }

  /** @param {string} did, @returns {Promise<string>} */

  async fetchHandleForDid(did) {
    let cachedHandle = this.handleCache.findHandleByDid(did);

    if (cachedHandle) {
      return cachedHandle;
    } else {
      let author = await this.loadUserProfile(did);
      return author.handle;
    }
  }

  /** @param {string} handle, @returns {Promise<string>} */

  async resolveHandle(handle) {
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

  /** @param {string} url, @returns {Promise<json>} */

  async loadThreadByURL(url) {
    let { user, post } = parseBlueskyPostURL(url);
    return await this.loadThreadById(user, post);
  }

  /** @param {string} author, @param {string} postId, @returns {Promise<json>} */

  async loadThreadById(author, postId) {
    let did = author.startsWith('did:') ? author : await this.resolveHandle(author);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
    return await this.loadThreadByAtURI(postURI);
  }

  /** @param {string} uri, @returns {Promise<json>} */

  async loadThreadByAtURI(uri) {
    return await this.getRequest('app.bsky.feed.getPostThread', { uri: uri, depth: 10 });
  }

  /** @param {string} handle, @returns {Promise<json>} */

  async loadUserProfile(handle) {
    if (this.profiles[handle]) {
      return this.profiles[handle];
    } else {
      let profile = await this.getRequest('app.bsky.actor.getProfile', { actor: handle });
      this.cacheProfile(profile);
      return profile;
    }
  }

  /** @param {string} query, @returns {Promise<json[]>} */

  async autocompleteUsers(query) {
    let json = await this.getRequest('app.bsky.actor.searchActorsTypeahead', { q: query });
    return json.actors;
  }

  /** @returns {Promise<json | undefined>} */

  async getCurrentUserAvatar() {
    let json = await this.getRequest('com.atproto.repo.getRecord', {
      repo: this.user.did,
      collection: 'app.bsky.actor.profile',
      rkey: 'self'
    });

    return json.value.avatar;
  }

  /** @returns {Promise<string?>} */

  async loadCurrentUserAvatar() {
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

  /** @param {string} uri, @returns {Promise<string[]>} */

  async getReplies(uri) {
    let json = await this.getRequest('blue.feeds.post.getReplies', { uri });
    return json.replies;
  }

  /** @param {string} uri, @returns {Promise<number>} */

  async getQuoteCount(uri) {
    let json = await this.getRequest('blue.feeds.post.getQuoteCount', { uri });
    return json.quoteCount;
  }

  /** @param {string} url, @param {string | undefined} cursor, @returns {Promise<json>} */

  async getQuotes(url, cursor = undefined) {
    let postURI;

    if (url.startsWith('at://')) {
      postURI = url;
    } else {
      let { user, post } = parseBlueskyPostURL(url);
      let did = user.startsWith('did:') ? user : await appView.resolveHandle(user);
      postURI = `at://${did}/app.bsky.feed.post/${post}`;
    }

    let params = { uri: postURI };

    if (cursor) {
      params['cursor'] = cursor;
    }

    return await this.getRequest('blue.feeds.post.getQuotes', params);
  }

  /** @param {string} hashtag, @param {string | undefined} cursor, @returns {Promise<json>} */

  async getHashtagFeed(hashtag, cursor = undefined) {
    let params = { q: '#' + hashtag, limit: 50, sort: 'latest' };

    if (cursor) {
      params['cursor'] = cursor;
    }

    return await this.getRequest('app.bsky.feed.searchPosts', params);
  }

  /** @param {json} [params], @returns {Promise<json>} */

  async loadNotifications(params) {
    return await this.getRequest('app.bsky.notification.listNotifications', params || {});
  }

  /**
   * @param {string} [cursor]
   * @returns {Promise<{ cursor: string | undefined, posts: json[] }>}
   */

  async loadMentions(cursor) {
    let response = await this.loadNotifications({ cursor: cursor ?? '', limit: 100, reasons: ['reply', 'mention'] });
    let uris = response.notifications.map(x => x.uri);
    let batches = [];

    for (let i = 0; i < uris.length; i += 25) {
      let batch = this.loadPosts(uris.slice(i, i + 25));
      batches.push(batch);
    }

    let postGroups = await Promise.all(batches);

    return { cursor: response.cursor, posts: postGroups.flat() };
  }

  /** @param {Post} post, @returns {Promise<?json[]>} */

  async loadHiddenReplies(post) {
    let expectedReplyURIs;

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

  /**
   * @param {number} days
   * @param {{ onPageLoad?: FetchAllOnPageLoad, keepLastPage?: boolean }} [options]
   * @returns {Promise<json[]>}
   */

  async loadHomeTimeline(days, options = {}) {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getTimeline', {
      params: { limit: 100 },
      field: 'feed',
      breakWhen: (x) => (feedPostTime(x) < timeLimit),
      onPageLoad: options.onPageLoad,
      keepLastPage: options.keepLastPage
    });
  }

  /**
    @typedef
    {'posts_with_replies' | 'posts_no_replies' | 'posts_and_author_threads' | 'posts_with_media' | 'posts_with_video'}
    AuthorFeedFilter

    Filters:
    - posts_with_replies: posts, replies and reposts (default)
    - posts_no_replies: posts and reposts (no replies)
    - posts_and_author_threads: posts, reposts, and replies in your own threads
    - posts_with_media: posts and replies, but only with images (no reposts)
    - posts_with_video: posts and replies, but only with videos (no reposts)
  */

  /**
   * @param {string} did
   * @param {number} days
   * @param {{ filter: AuthorFeedFilter, onPageLoad?: FetchAllOnPageLoad, keepLastPage?: boolean }} options
   * @returns {Promise<json[]>}
   */

  async loadUserTimeline(did, days, options) {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getAuthorFeed', {
      params: {
        actor: did,
        filter: options.filter,
        limit: 100
      },
      field: 'feed',
      breakWhen: (x) => (feedPostTime(x) < timeLimit),
      onPageLoad: options.onPageLoad,
      keepLastPage: options.keepLastPage
    });
  }

  /** @returns {Promise<json[]>} */

  async loadUserLists() {
    let lists = await this.fetchAll('app.bsky.graph.getLists', {
      params: {
        actor: this.user.did,
        limit: 100
      },
      field: 'lists'
    });

    return lists.filter(x => x.purpose == "app.bsky.graph.defs#curatelist");
  }

  /**
   * @param {string} list
   * @param {number} days
   * @param {{ onPageLoad?: FetchAllOnPageLoad, keepLastPage?: boolean }} [options]
   * @returns {Promise<json[]>}
   */

  async loadListTimeline(list, days, options = {}) {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getListFeed', {
      params: {
        list: list,
        limit: 100
      },
      field: 'feed',
      breakWhen: (x) => (feedPostTime(x) < timeLimit),
      onPageLoad: options.onPageLoad,
      keepLastPage: options.keepLastPage
    });
  }

  /** @param {string} postURI, @returns {Promise<json>} */

  async loadPost(postURI) {
    let posts = await this.loadPosts([postURI]);

    if (posts.length == 1) {
      return posts[0];
    } else {
      throw new ResponseDataError('Post not found');
    }
  }

  /** @param {string} postURI, @returns {Promise<json | undefined>} */

  async loadPostIfExists(postURI) {
    let posts = await this.loadPosts([postURI]);
    return posts[0];
  }

  /** @param {string[]} uris, @returns {Promise<object[]>} */

  async loadPosts(uris) {
    if (uris.length > 0) {
      let response = await this.getRequest('app.bsky.feed.getPosts', { uris });
      return response.posts;
    } else {
      return [];
    }
  }

  /** @param {Post} post, @returns {Promise<json | undefined>} */

  async loadPostViewerInfo(post) {
    let data = await this.loadPostIfExists(post.uri);

    if (data) {
      post.author = data.author;
      post.viewerData = data.viewer;
      post.viewerLike = data.viewer?.like;
    }

    return data;
  }

  /** @param {string} uri, @returns {Promise<Post?>} */

  async reloadBlockedPost(uri) {
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

  /** @param {Post} post, @returns {Promise<json>} */

  async likePost(post) {
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

  /** @param {string} uri, @returns {Promise<void>} */

  async removeLike(uri) {
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
