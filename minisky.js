class APIError extends Error {
  constructor(code, json) {
    super("APIError status " + code + "\n\n" + JSON.stringify(json));
    this.code = code;
    this.json = json;
  }
}

class Minisky {
  #accessToken;
  #refreshToken;
  #userDID;

  constructor(host, useAuthentication = true) {
    this.host = host;
    this.useAuthentication = useAuthentication;

    if (useAuthentication) {
      this.#accessToken = localStorage.getItem('accessToken');
      this.#refreshToken = localStorage.getItem('refreshToken');
      this.#userDID = localStorage.getItem('userDID');      
    }
  }

  get isLoggedIn() {
    return !!(this.#accessToken && this.#refreshToken && this.#userDID);
  }

  get userDID() {
    return this.#userDID;
  }

  async getRequest(method, params) {
    let url = `https://${this.host}/xrpc/${method}`;

    if (params) {
      url += '?' + Object.entries(params).map((x) => {
        if (x[1] instanceof Array) {
          return x[1].map((i) => `${x[0]}=${encodeURIComponent(i)}`).join('&');
        } else {
          return `${x[0]}=${encodeURIComponent(x[1])}`;
        }
      }).join('&');
    }

    let headers = this.useAuthentication ? { 'Authorization': `Bearer ${this.#accessToken}` } : {};
    let response = await fetch(url, { headers: headers });
    let json = await this.parseResponse(response);

    if (this.useAuthentication && this.isInvalidToken(response, json)) {
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
    let url = `https://${this.host}/xrpc/${method}`;
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

  async logIn(handle, password) {
    let json = await this.postRequest('com.atproto.server.createSession', {
      identifier: handle,
      password: password
    }, false, false);

    this.saveTokens(json);
  }

  async refreshAccessToken() {
    console.log('Refreshing access token…');
    let json = await this.postRequest('com.atproto.server.refreshSession', null, true);
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
}
