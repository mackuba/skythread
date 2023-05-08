class APIError extends Error {
  constructor(code) {
    super("APIError status " + code);
    this.code = code;
  }
}

class BlueskyAPI {
  #accessToken;
  #refreshToken;

  constructor() {
    this.#accessToken = localStorage.getItem('accessToken');
    this.#refreshToken = localStorage.getItem('refreshToken');
  }

  async getRequest(method, params, token) {
    let url = 'https://bsky.social/xrpc/' + method;

    if (params) {
      url += '?' + Object.entries(params).map((x) => `${x[0]}=${encodeURIComponent(x[1])}`).join('&');
    }

    let response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});

    if (response.status != 200) {
      throw new APIError(response.status);
    }

    let json = await response.json();
    return json;
  }

  async postRequest(method, token) {
    let url = 'https://bsky.social/xrpc/' + method;
    let response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});

    if (response.status != 200) {
      throw new APIError(response.status);
    }

    let json = await response.json();
    return json;
  }

  async refreshAccessToken() {
    let json = await this.postRequest('com.atproto.server.refreshSession', this.#refreshToken);

    this.#accessToken = json['accessJwt'];
    this.#refreshToken = json['refreshJwt'];

    localStorage.setItem('accessToken', this.#accessToken);
    localStorage.setItem('refreshToken', this.#refreshToken);
  }

  async loadThreadJSON(url) {
    if (url.startsWith('https://')) {
      let parts = url.substring(8).split('/');

      if (parts.length < 5 || parts[0] != 'staging.bsky.app' || parts[1] != 'profile' || parts[3] != 'post') {
        console.log('invalid url');
        return;    
      }

      let handle = parts[2];
      let postId = parts[4];

      let json = await this.getRequest('com.atproto.identity.resolveHandle', { handle }, this.#accessToken);
      let did = json['did']

      let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
      let threadJSON = await this.getRequest('app.bsky.feed.getPostThread', { uri: postURI }, this.#accessToken);

      return threadJSON;
    } else if (url.startsWith('at://')) {
      let threadJSON = await this.getRequest('app.bsky.feed.getPostThread', { uri: url }, this.#accessToken);
      return threadJSON;
    } else {
      console.log('invalid url');
    }
  }
}
