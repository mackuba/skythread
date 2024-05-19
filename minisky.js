/**
 * Thrown when status code of an API response is not "success".
 */

class APIError extends Error {

  /** @param {number} code, @param {object} json */
  constructor(code, json) {
    super("APIError status " + code + "\n\n" + JSON.stringify(json));
    this.code = code;
    this.json = json;
  }
}


/**
 * Thrown when authentication is needed, but access token is invalid or missing.
 */

class AuthError extends Error {}


/**
 * Thrown when DID or DID document is invalid.
 */

class DIDError extends Error {}


/**
 * Base API client for connecting to an ATProto XRPC API.
 */

class Minisky {

  /** @param {string} did, @returns {Promise<string>} */

  static async pdsEndpointForDid(did) {
    let url;

    if (did.startsWith('did:plc:')) {
      url = new URL(`https://plc.directory/${did}`);
    } else if (did.startsWith('did:web:')) {
      let host = did.replace(/^did:web:/, '');
      url = new URL(`https://${host}/.well-known/did.json`);
    } else {
      throw new DIDError("Unknown DID type: " + did);
    }

    let response = await fetch(url);
    let text = await response.text();
    let json = text.trim().length > 0 ? JSON.parse(text) : undefined;

    if (response.status == 200) {
      let service = (json.service || []).find(s => s.id == '#atproto_pds');
      if (service) {
        return service.serviceEndpoint;
      } else {
        throw new DIDError("Missing #atproto_pds service definition");
      }
    } else {
      throw new APIError(response.status, json);
    }
  }

  /**
   * @typedef {object} MiniskyOptions
   * @prop {boolean} [sendAuthHeaders]
   * @prop {boolean} [autoManageTokens]
   *
   * @param {string | undefined} host, @param {object} config, @param {MiniskyOptions} [options]
   */

  constructor(host, config, options) {
    this.host = host;
    this.config = config;
    this.user = config?.user;

    this.sendAuthHeaders = !!this.user;
    this.autoManageTokens = !!this.user;

    if (options) {
      Object.assign(this, options);
    }
  }

  /** @returns {string} */

  get baseURL() {
    if (this.host) {
      let host = (this.host.includes('://')) ? this.host : `https://${this.host}`;
      return host + '/xrpc';
    } else {
      throw new AuthError('Hostname not set');
    }
  }

  /** @returns {boolean} */

  get isLoggedIn() {
    return !!(this.user && this.user.accessToken && this.user.refreshToken && this.user.did && this.user.pdsEndpoint);
  }

  /**
   * @typedef {object} MiniskyRequestOptions
   * @prop {string | boolean} [auth]
   * @prop {Record<string, string>} [headers]
   *
   * @param {string} method, @param {object} params, @param {MiniskyRequestOptions} [options]
   * @returns {Promise<object>}
   */

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

    if (options && options.headers) {
      Object.assign(headers, options.headers);
    }

    let response = await fetch(url, { headers: headers });
    return await this.parseResponse(response);
  }

  /**
   * @param {string} method, @param {object} [data], @param {MiniskyRequestOptions} [options]
   * @returns Promise<object>
   */

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

    if (options && options.headers) {
      Object.assign(request.headers, options.headers);
    }

    let response = await fetch(url, request);
    return await this.parseResponse(response);
  }

  /** @param {string | boolean} auth, @returns {Record<string, string>} */

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

  /** @param {string} token, @returns {number} */

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

  /** @param {Response} response, @param {object} json, @returns {boolean} */

  isInvalidToken(response, json) {
    return (response.status == 400) && !!json && ['InvalidToken', 'ExpiredToken'].includes(json.error);
  }

  /** @param {Response} response, @returns {Promise<object>} */

  async parseResponse(response) {
    let text = await response.text();
    let json = text.trim().length > 0 ? JSON.parse(text) : undefined;

    if (response.status == 200) {
      return json;
    } else {
      throw new APIError(response.status, json);
    }
  }

  /** @returns {Promise<void>} */

  async checkAccess() {
    if (!this.isLoggedIn) {
      throw new AuthError("Not logged in");
    }

    let expirationTimestamp = this.tokenExpirationTimestamp(this.user.accessToken);

    if (expirationTimestamp < new Date().getTime() + 60 * 1000) {
      await this.performTokenRefresh();
    }
  }

  /** @param {string} handle, @param {string} password, @returns {Promise<object>} */

  async logIn(handle, password) {
    let params = { identifier: handle, password: password };
    let json = await this.postRequest('com.atproto.server.createSession', params, { auth: false });

    this.saveTokens(json);
    return json;
  }

  /** @returns {Promise<object>} */

  async performTokenRefresh() {
    console.log('Refreshing access token…');
    let json = await this.postRequest('com.atproto.server.refreshSession', null, { auth: this.user.refreshToken });
    this.saveTokens(json);
    return json;
  }

  /** @param {object} json */

  saveTokens(json) {
    this.user.accessToken = json['accessJwt'];
    this.user.refreshToken = json['refreshJwt'];
    this.user.did = json['did'];
    this.user.pdsEndpoint = json['didDoc']['service'].find(s => s.id == '#atproto_pds')['serviceEndpoint'];
    this.config.save();
  }

  resetTokens() {
    delete this.user.accessToken;
    delete this.user.refreshToken;
    delete this.user.did;
    delete this.user.pdsEndpoint;
    this.config.save();
  }
}
