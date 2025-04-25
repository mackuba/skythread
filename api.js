/**
 * Thrown when the response is technically a "success" one, but the returned data is not what it should be.
 */

class ResponseDataError extends Error {}


/**
 * Thrown when the passed URL is not a supported post URL on bsky.app.
 */

class URLError extends Error {

  /** @param {string} message */
  constructor(message) {
    super(message);
  }
}


/**
 * Caches the mapping of handles to DIDs to avoid unnecessary API calls to resolveHandle or getProfile.
 */

class HandleCache {
  prepareCache() {
    if (!this.cache) {
      this.cache = JSON.parse(localStorage.getItem('handleCache') ?? '{}');
    }
  }

  saveCache() {
    localStorage.setItem('handleCache', JSON.stringify(this.cache));
  }

  /** @param {string} handle, @returns {string | undefined}  */

  getHandleDid(handle) {
    this.prepareCache();
    return this.cache[handle];
  }

  /** @param {string} handle, @param {string} did */

  setHandleDid(handle, did) {
    this.prepareCache();
    this.cache[handle] = did;
    this.saveCache();
  }

  /** @param {string} did, @returns {string | undefined}  */

  findHandleByDid(did) {
    this.prepareCache();
    let found = Object.entries(this.cache).find((e) => e[1] == did);
    return found ? found[0] : undefined;
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

class BlueskyAPI extends Minisky {

  /** @param {string | undefined} host, @param {boolean} useAuthentication */
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

  /** @param {string} did, @returns {string | undefined} */

  findHandleByDid(did) {
    return this.handleCache.findHandleByDid(did);
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

  /** @param {string} string, @returns {[string, string]} */

  static parsePostURL(string) {
    let url;

    let acceptedHostnames = [
      'bsky.app',
      'main.bsky.dev',
      'deer.social',
    ];

    try {
      url = new URL(string);
    } catch (error) {
      throw new URLError(`${error}`);
    }

    if (url.protocol != 'https:') {
      throw new URLError('URL must start with https://');
    }

    if (!acceptedHostnames.includes(url.host)) {
      throw new URLError('Unsupported URL');
    }

    let parts = url.pathname.split('/');

    if (parts.length < 5 || parts[1] != 'profile' || parts[3] != 'post') {
      throw new URLError('This is not a valid thread URL');
    }

    let handle = parts[2];
    let postId = parts[4];

    return [handle, postId];
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
    let [handle, postId] = BlueskyAPI.parsePostURL(url);
    return await this.loadThreadById(handle, postId);
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

  /** @param {string} uri, @returns {Promise<json[]>} */

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
    let [handle, postId] = BlueskyAPI.parsePostURL(url);
    let did = handle.startsWith('did:') ? handle : await appView.resolveHandle(handle);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;

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

  async loadNotifications(cursor) {
    let params = { limit: 100 };

    if (cursor) {
      params.cursor = cursor;
    }

    return await this.getRequest('app.bsky.notification.listNotifications', params);
  }

  async loadMentions(cursor) {
    let response = await this.loadNotifications(cursor);
    let mentions = response.notifications.filter(x => ['reply', 'mention'].includes(x.reason));
    let uris = mentions.map(x => x['uri']);
    let posts = [];

    for (let i = 0; i < uris.length; i += 25) {
      let batch = await this.loadPosts(uris.slice(i, i + 25));
      posts = posts.concat(batch);
    }

    return { cursor: response.cursor, posts };
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
