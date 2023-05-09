class APIError extends Error {
  constructor(code, json) {
    super("APIError status " + code);
    this.code = code;
    this.json = json;
  }
}

class URLError extends Error {
  constructor(message) {
    super(message);
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

  async postRequest(method, data, useRefreshToken) {
    let url = 'https://bsky.social/xrpc/' + method;
    let token = useRefreshToken ? this.#refreshToken : this.#accessToken;
    let request = { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }};

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
    return (response.status == 400) && json && ['InvalidToken', 'ExpiredToken'].includes(json['Error']);
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

    this.#accessToken = json['accessJwt'];
    this.#refreshToken = json['refreshJwt'];
    this.#userDID = json['did'];

    localStorage.setItem('accessToken', this.#accessToken);
    localStorage.setItem('refreshToken', this.#refreshToken);
    localStorage.setItem('userDID', this.#userDID);
  }

  async loadThreadByURL(url) {
    if (url.startsWith('https://')) {
      let parts = url.substring(8).split('/');

      if (parts.length < 5 || parts[0] != 'staging.bsky.app' || parts[1] != 'profile' || parts[3] != 'post') {
        throw new URLError('Invalid URL');
      }

      let handle = parts[2];
      let postId = parts[4];

      return await this.loadThreadById(handle, postId);
    } else if (url.startsWith('at://')) {
      let threadJSON = await this.getRequest('app.bsky.feed.getPostThread', { uri: url });
      return threadJSON;
    } else {
      throw new URLError('Invalid URL');
    }
  }

  async loadThreadById(author, postId) {
    let did;

    if (author.startsWith('did:')) {
      did = author;
    } else {
      let json = await this.getRequest('com.atproto.identity.resolveHandle', { handle: author });
      did = json['did'];      
    }

    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
    let threadJSON = await this.getRequest('app.bsky.feed.getPostThread', { uri: postURI });
    return threadJSON;
  }

  async likePost(atURI, cid) {
    return await this.postRequest('com.atproto.repo.createRecord', {
      repo: this.#userDID,
      collection: 'app.bsky.feed.like',
      record: {
        subject: {
          uri: atURI,
          cid: cid
        },
        createdAt: new Date().toISOString()
      }
    });
  }

  async removeLike(atURI) {
    await this.postRequest('com.atproto.repo.deleteRecord', {
      repo: this.#userDID,
      collection: 'app.bsky.feed.like',
      rkey: lastPathComponent(atURI)
    });
  }
}
