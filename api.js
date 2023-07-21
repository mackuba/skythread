class APIError extends Error {
  constructor(code, json) {
    super("APIError status " + code + "\n\n" + JSON.stringify(json));
    this.code = code;
    this.json = json;
  }
}

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
}

class BlueskyAPI {
  #accessToken;
  #refreshToken;
  #userDID;

  constructor() {
    this.#accessToken = localStorage.getItem('accessToken');
    this.#refreshToken = localStorage.getItem('refreshToken');
    this.#userDID = localStorage.getItem('userDID');
    this.handleCache = new HandleCache();
  }

  get isLoggedIn() {
    return !!(this.#accessToken && this.#refreshToken && this.#userDID);
  }

  async getRequest(method, params) {
    let url = 'https://bsky.social/xrpc/' + method;

    if (params) {
      url += '?' + Object.entries(params).map((x) => `${x[0]}=${encodeURIComponent(x[1])}`).join('&');
    }

    let response = await fetch(url, { headers: { 'Authorization': `Bearer ${this.#accessToken}` }});
    let json = await this.parseResponse(response);

    if (this.isInvalidToken(response, json)) {
      await this.refreshAccessToken();
      response = await fetch(url, { headers: { 'Authorization': `Bearer ${this.#accessToken}` }});
      json = await this.parseResponse(response);
    }

    if (response.status != 200) {
      throw new APIError(response.status, json);
    }

    return json;
  }

  async postRequest(method, data, useRefreshToken, useAuthentication) {
    let url = 'https://bsky.social/xrpc/' + method;
    let request = { method: 'POST', headers: {}};

    if (!(useAuthentication === false)) {
      let token = useRefreshToken ? this.#refreshToken : this.#accessToken;
      request.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      request.body = JSON.stringify(data);
      request.headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, request);
    let json = await this.parseResponse(response);

    if (!useRefreshToken && this.isInvalidToken(response, json)) {
      await this.refreshAccessToken();
      request.headers['Authorization'] = `Bearer ${this.#accessToken}`;
      response = await fetch(url, request);
      json = await this.parseResponse(response);
    }

    if (response.status != 200) {
      throw new APIError(response.status, json);
    }

    return json;
  }

  isInvalidToken(response, json) {
    return (response.status == 400) && json && ['InvalidToken', 'ExpiredToken'].includes(json.error);
  }

  async parseResponse(response) {
    let text = await response.text();

    if (text.trim().length > 0) {
      return JSON.parse(text);
    } else {
      return undefined;
    }
  }

  async refreshAccessToken() {
    console.log('Refreshing access token…');
    let json = await this.postRequest('com.atproto.server.refreshSession', null, true);
    this.saveTokens(json);
  }

  async logIn(handle, password) {
    let json = await this.postRequest('com.atproto.server.createSession', {
      identifier: handle,
      password: password
    }, false, false);

    this.saveTokens(json);
  }

  saveTokens(json) {
    this.#accessToken = json['accessJwt'];
    this.#refreshToken = json['refreshJwt'];
    this.#userDID = json['did'];

    localStorage.setItem('accessToken', this.#accessToken);
    localStorage.setItem('refreshToken', this.#refreshToken);
    localStorage.setItem('userDID', this.#userDID);
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
      let json = await this.getRequest('com.atproto.identity.resolveHandle', { handle });
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
    let threadJSON = await this.getRequest('app.bsky.feed.getPostThread', { uri: postURI });
    return threadJSON;
  }

  async loadRawPostRecord(uri) {
    let { repo, collection, rkey } = atURI(uri);

    return await this.getRequest('com.atproto.repo.getRecord', { repo, collection, rkey });
  }

  async loadRawProfileRecord(handle) {
    return await this.getRequest('app.bsky.actor.getProfile', { actor: handle });
  }

  async likePost(post) {
    return await this.postRequest('com.atproto.repo.createRecord', {
      repo: this.#userDID,
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
      repo: this.#userDID,
      collection: 'app.bsky.feed.like',
      rkey: rkey
    });
  }
}
