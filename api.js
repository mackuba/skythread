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
    this.user = {};
    this.user.accessToken = localStorage.getItem('accessToken');
    this.user.refreshToken = localStorage.getItem('refreshToken');
    this.user.did = localStorage.getItem('userDID');
    this.user.avatar = localStorage.getItem('avatar');
  }

  save() {
    this.saveItem('accessToken', this.user.accessToken);
    this.saveItem('refreshToken', this.user.refreshToken);
    this.saveItem('userDID', this.user.did);
    this.saveItem('avatar', this.user.avatar);
  }

  /** @param {string} key, @param {string | undefined} value */

  saveItem(key, value) {
    if (value !== undefined) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }
}


/**
 * API client for connecting to the Bluesky XRPC API (authenticated or not).
 */

class BlueskyAPI extends Minisky {

  /** @param {string} host, @param {boolean} useAuthentication */
  constructor(host, useAuthentication) {
    super(host, useAuthentication ? new LocalStorageConfig() : undefined);

    this.handleCache = new HandleCache();
    this.profiles = {};
  }

  /** @param {object} author */

  cacheProfile(author) {
    this.profiles[author.did] = author;
    this.profiles[author.handle] = author;
    this.handleCache.setHandleDid(author.handle, author.did);
  }

  /** @param {string} did, @returns {string | undefined} */

  findHandleByDid(did) {
    return this.handleCache.findHandleByDid(did);
  }

  /** @param {string} string, @returns {[string, string]} */

  static parsePostURL(string) {
    let url;

    try {
      url = new URL(string);
    } catch (error) {
      throw new URLError(`${error}`);
    }

    if (url.protocol != 'https:') {
      throw new URLError('URL must start with https://');
    }

    if (!(url.host == 'staging.bsky.app' || url.host == 'bsky.app')) {
      throw new URLError('Only bsky.app and staging.bsky.app URLs are supported');
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
    let did = this.handleCache.getHandleDid(handle);

    if (did) {
      return did;
    } else {
      let json = await this.getRequest('com.atproto.identity.resolveHandle', { handle }, { auth: false });
      did = json['did'];
      this.handleCache.setHandleDid(handle, did);
      return did;
    }
  }

  /** @param {string} url, @returns {Promise<object>} */

  async loadThreadByURL(url) {
    let [handle, postId] = BlueskyAPI.parsePostURL(url);
    return await this.loadThreadById(handle, postId);
  }

  /** @param {string} author, @param {string} postId, @returns {Promise<object>} */

  async loadThreadById(author, postId) {
    let did = author.startsWith('did:') ? author : await this.resolveHandle(author);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
    let threadJSON = await this.getRequest('app.bsky.feed.getPostThread', { uri: postURI, depth: 10 });
    return threadJSON;
  }

  /** @param {string} handle, @returns {Promise<object>} */

  async loadUserProfile(handle) {
    if (this.profiles[handle]) {
      return this.profiles[handle];
    } else {
      let profile = await this.getRequest('app.bsky.actor.getProfile', { actor: handle });
      this.cacheProfile(profile);
      return profile;
    }
  }

  /** @returns {Promise<object>} */

  async loadCurrentUserAvatar() {
    let json = await this.getRequest('com.atproto.repo.getRecord', {
      repo: this.user.did,
      collection: 'app.bsky.actor.profile',
      rkey: 'self'
    });

    return json.value.avatar;
  }

  /** @param {string} uri, @returns {Promise<number>} */

  async getQuoteCount(uri) {
    let json = await this.getRequest('eu.mackuba.private.getQuoteCount', { uri });
    return json.quoteCount;
  }

  /** @param {string} url, @returns {Promise<object>} */

  async getQuotes(url) {
    let [handle, postId] = BlueskyAPI.parsePostURL(url);
    let did = handle.startsWith('did:') ? handle : await appView.resolveHandle(handle);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;

    let json = await this.getRequest('eu.mackuba.private.getPostQuotes', { uri: postURI });
    return json;
  }

  /** @param {string} hashtag, @returns {Promise<object[]>} */

  async getHashtagFeed(hashtag) {
    let json = await this.getRequest('eu.mackuba.private.getHashtagFeed', { tag: hashtag });
    return json.feed;
  }

  /** @param {string} postURI, @returns {Promise<object>} */

  async loadPost(postURI) {
    let posts = await this.loadPosts([postURI]);
    return posts[0];
  }

  /** @param {string[]} uris, @returns {Promise<object[]>} */

  async loadPosts(uris) {
    let response = await this.getRequest('app.bsky.feed.getPosts', { uris });
    return response.posts;
  }

  /** @param {object} post, @returns {Promise<object>} */

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

  /** @param {string} uri, @returns {Promise<object>} */

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
