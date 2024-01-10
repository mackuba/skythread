class URLError extends Error {
  constructor(message) {
    super(message);
  }
}

class HandleCache {
  prepareCache() {
    if (!this.cache) {
      this.cache = JSON.parse(localStorage.getItem('handleCache') ?? '{}');
    }
  }

  saveCache() {
    localStorage.setItem('handleCache', JSON.stringify(this.cache));
  }

  getHandleDid(handle) {
    this.prepareCache();
    return this.cache[handle];
  }

  setHandleDid(handle, did) {
    this.prepareCache();
    this.cache[handle] = did;
    this.saveCache();    
  }

  findHandleByDid(did) {
    this.prepareCache();
    let found = Object.entries(this.cache).find((e) => e[1] == did);
    return found ? found[0] : undefined;
  }
}

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

  saveItem(key, value) {
    if (value !== undefined) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }
}

class BlueskyAPI extends Minisky {
  constructor(host, useAuthentication) {
    super(host, useAuthentication ? new LocalStorageConfig() : undefined);

    this.handleCache = new HandleCache();
    this.profiles = {};
  }

  cacheProfile(author) {
    this.profiles[author.did] = author;
    this.profiles[author.handle] = author;
    this.handleCache.setHandleDid(author.handle, author.did);
  }

  findHandleByDid(did) {
    return this.handleCache.findHandleByDid(did);
  }

  static parsePostURL(string) {
    let url;

    try {
      url = new URL(string);
    } catch (error) {
      throw new URLError("This is not a valid URL");
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

  async loadThreadByURL(url) {
    let [handle, postId] = BlueskyAPI.parsePostURL(url);
    return await this.loadThreadById(handle, postId);
  }

  async loadThreadById(author, postId) {
    let did = author.startsWith('did:') ? author : await this.resolveHandle(author);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
    let threadJSON = await this.getRequest('app.bsky.feed.getPostThread', { uri: postURI, depth: 10 });
    return threadJSON;
  }

  async loadUserProfile(handle) {
    if (this.profiles[handle]) {
      return this.profiles[handle];
    } else {
      let profile = await this.getRequest('app.bsky.actor.getProfile', { actor: handle });
      this.cacheProfile(profile);
      return profile;
    }
  }

  async loadCurrentUserAvatar() {
    let json = await this.getRequest('com.atproto.repo.getRecord', {
      repo: this.user.did,
      collection: 'app.bsky.actor.profile',
      rkey: 'self'
    });

    return json.value.avatar;
  }

  async getQuotes(url) {
    let [handle, postId] = BlueskyAPI.parsePostURL(url);
    let did = handle.startsWith('did:') ? handle : await this.resolveHandle(handle);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;

    let json = await this.getRequest('eu.mackuba.private.getPostQuotes', { uri: postURI });
    return json.posts;
  }

  async getHashtagFeed(hashtag) {
    let json = await this.getRequest('eu.mackuba.private.getHashtagFeed', { tag: hashtag });
    return json.feed;
  }

  async loadPost(postURI) {
    let posts = await this.loadPosts([postURI]);
    return posts[0];
  }

  async loadPosts(uris) {
    let response = await this.getRequest('app.bsky.feed.getPosts', { uris });
    return response.posts;
  }

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
