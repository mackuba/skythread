class APIError extends Error {
  constructor(code, json) {
    super("APIError status " + code + "\n\n" + JSON.stringify(json));
    this.code = code;
    this.json = json;
  }
}

class AuthError extends Error {
}

class Minisky {
  constructor(host, config, options) {
    this.host = host;
    this.config = config;
    this.user = config?.user;
    this.baseURL = `https://${host}/xrpc`;

    this.sendAuthHeaders = !!this.user;
    this.autoManageTokens = !!this.user;

    if (options) {
      Object.assign(this, options);
    }
  }

  get isLoggedIn() {
    return !!(this.user.accessToken && this.user.refreshToken && this.user.did);
  }

  async getRequest(method, params, options) {
    let url = new URL(`${this.baseURL}/${method}`);
    let auth = options && ('auth' in options) ? options.auth : this.sendAuthHeaders;

    if (this.autoManageTokens && auth === true) {
      await this.checkAccess();
    }

    if (params) {
      for (let p in params) {
        if (params[p] instanceof Array) {
          params[p].forEach(x => url.searchParams.append(p, x));
        } else {
          url.searchParams.append(p, params[p]);
        }
      }
    }

    let headers = this.authHeaders(auth);
    let response = await fetch(url, { headers: headers });
    return await this.parseResponse(response);
  }

  async postRequest(method, data, options) {
    let url = `${this.baseURL}/${method}`;
    let auth = options && ('auth' in options) ? options.auth : this.sendAuthHeaders;

    if (this.autoManageTokens && auth === true) {
      await this.checkAccess();
    }

    let request = { method: 'POST', headers: this.authHeaders(auth) };

    if (data) {
      request.body = JSON.stringify(data);
      request.headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, request);
    return await this.parseResponse(response);
  }

  authHeaders(auth) {
    if (typeof auth == 'string') {
      return { 'Authorization': `Bearer ${auth}` };
    } else if (auth) {
      if (this.user.accessToken) {
        return { 'Authorization': `Bearer ${this.user.accessToken}` };
      } else {
        throw new AuthError("Can't send auth headers, access token is missing");
      }
    } else {
      return {};
    }
  }

  tokenExpirationTimestamp(token) {
    let parts = token.split('.');
    if (parts.length != 3) {
      throw new AuthError("Invalid access token format");
    }

    let payload = JSON.parse(atob(parts[1]));
    let exp = payload.exp;

    if (!(exp && typeof exp == 'number' && exp > 0)) {
      throw new AuthError("Invalid token expiry data");
    }

    return exp * 1000;
  }

  isInvalidToken(response, json) {
    return (response.status == 400) && json && ['InvalidToken', 'ExpiredToken'].includes(json.error);
  }

  async parseResponse(response) {
    let text = await response.text();
    let json = text.trim().length > 0 ? JSON.parse(text) : undefined;

    if (response.status == 200) {
      return json;
    } else {
      throw new APIError(response.status, json);
    }
  }

  async checkAccess() {
    if (!this.isLoggedIn) {
      throw new AuthError("Not logged in");
    }

    let expirationTimestamp = this.tokenExpirationTimestamp(this.user.accessToken);

    if (expirationTimestamp < new Date().getTime() + 60 * 1000) {
      await this.performTokenRefresh();
    }
  }

  async logIn(handle, password) {
    let params = { identifier: handle, password: password };
    let json = await this.postRequest('com.atproto.server.createSession', params, { auth: false });

    this.saveTokens(json);
  }

  async performTokenRefresh() {
    console.log('Refreshing access token…');
    let json = await this.postRequest('com.atproto.server.refreshSession', null, { auth: this.user.refreshToken });
    this.saveTokens(json);
  }

  saveTokens(json) {
    this.user.accessToken = json['accessJwt'];
    this.user.refreshToken = json['refreshJwt'];
    this.user.did = json['did'];
    this.config.save();
  }
}
