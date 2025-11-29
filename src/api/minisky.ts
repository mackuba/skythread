/**
 * Thrown when status code of an API response is not "success".
 */

export class APIError extends Error {
  code: number;
  json: json;

  constructor(code: number, json: json) {
    super("APIError status " + code + "\n\n" + JSON.stringify(json));
    this.code = code;
    this.json = json;
  }
}


/**
 * Thrown when passed arguments/options are invalid or missing.
 */

export class RequestError extends Error {}


/**
 * Thrown when authentication is needed, but access token is invalid or missing.
 */

export class AuthError extends Error {}


/**
 * Base API client for connecting to an ATProto XRPC API.
 */

export type MiniskyOptions = {
  sendAuthHeaders?: boolean;
  autoManageTokens?: boolean;
};

export type MiniskyConfig = {
  user: json | null | undefined;
  save: () => void;
};

export type MiniskyRequestOptions = {
  auth?: string | boolean;
  headers?: Record<string, string>;
};

export type FetchAllOnPageLoad = (items: json[]) => { cancel: true } | undefined | void;

export type FetchAllOptions = MiniskyOptions & MiniskyRequestOptions & {
  field: string;
  params?: json;
  breakWhen?: (obj: json) => boolean;
  keepLastPage?: boolean;
  onPageLoad?: FetchAllOnPageLoad;
};

export class Minisky {
  host: string | null;
  config: MiniskyConfig | null;
  user: json | null;
  sendAuthHeaders: boolean;
  autoManageTokens: boolean;

  constructor(host: string | null, config?: MiniskyConfig | null, options?: MiniskyOptions | null) {
    this.host = host;
    this.config = config || null;
    this.user = config?.user || null;

    // defaults, can be overridden with options
    this.sendAuthHeaders = !!this.user;
    this.autoManageTokens = !!this.user;

    if (options) {
      Object.assign(this, options);
    }
  }

  get baseURL(): string {
    if (this.host) {
      let host = (this.host.includes('://')) ? this.host : `https://${this.host}`;
      return host + '/xrpc';
    } else {
      throw new RequestError('Hostname not set');
    }
  }

  get isLoggedIn(): boolean {
    return !!(this.user && this.user.accessToken && this.user.refreshToken && this.user.did && this.user.pdsEndpoint);
  }

  async getRequest(method: string, params?: json | null, options?: MiniskyRequestOptions): Promise<json> {
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

  async postRequest(method: string, data?: json | null, options?: MiniskyRequestOptions): Promise<json> {
    let url = `${this.baseURL}/${method}`;
    let auth = options && ('auth' in options) ? options.auth : this.sendAuthHeaders;

    if (this.autoManageTokens && auth === true) {
      await this.checkAccess();
    }

    let request: Record<string, any> = { method: 'POST', headers: this.authHeaders(auth) };

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

  async fetchAll(method: string, options?: FetchAllOptions): Promise<json[]> {
    if (!options || !options.field) {
      throw new RequestError("'field' option is required");
    }

    let data: json[] = [];
    let reqParams: json = options.params ?? {};
    let reqOptions = this.sliceOptions(options, ['auth', 'headers']);

    for (;;) {
      let response = await this.getRequest(method, reqParams, reqOptions);

      let items = response[options.field];
      let cursor = response.cursor;

      if (options.breakWhen) {
        let test = options.breakWhen;

        if (items.some((x: json) => test(x))) {
          if (!options.keepLastPage) {
            items = items.filter((x: json) => !test(x));
          }

          cursor = null;
        }
      }

      data = data.concat(items);
      reqParams.cursor = cursor;

      if (options.onPageLoad) {
        let result = options.onPageLoad(items);

        if (result?.cancel) {
          break;
        }
      }

      if (!cursor) {
        break;
      }
    }

    return data;
  }

  authHeaders(auth: string | boolean) {
    if (typeof auth == 'string') {
      return { 'Authorization': `Bearer ${auth}` };
    } else if (auth) {
      if (this.user?.accessToken) {
        return { 'Authorization': `Bearer ${this.user.accessToken}` };
      } else {
        throw new AuthError("Can't send auth headers, access token is missing");
      }
    } else {
      return {};
    }
  }

  sliceOptions(options: json, list: string[]): json {
    let newOptions: any = {};

    for (let i of list) {
      if (i in options) {
        newOptions[i] = options[i];
      }
    }

    return newOptions;
  }

  tokenExpirationTimestamp(token: string): number {
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

  isInvalidToken(response: Response, json: json): boolean {
    return (response.status == 400) && !!json && ['InvalidToken', 'ExpiredToken'].includes(json.error);
  }

  async parseResponse(response: Response): Promise<json> {
    let text = await response.text();
    let json = text.trim().length > 0 ? JSON.parse(text) : undefined;

    if (response.status >= 200 && response.status < 300) {
      return json;
    } else {
      throw new APIError(response.status, json);
    }
  }

  requireUserConfig(): asserts this is { config: MiniskyConfig, user: json } {
    if (!this.config || !this.config.user) {
      throw new AuthError("Missing user configuration object");
    }
  }

  requireLoggedInUser(): asserts this is { config: MiniskyConfig, user: json } {
    this.requireUserConfig();

    if (!this.isLoggedIn) {
      throw new AuthError("Not logged in");
    }
  }

  async checkAccess() {
    this.requireLoggedInUser();

    let expirationTimestamp = this.tokenExpirationTimestamp(this.user.accessToken);

    if (expirationTimestamp < new Date().getTime() + 60 * 1000) {
      await this.performTokenRefresh();
    }
  }

  async logIn(handle: string, password: string): Promise<json> {
    this.requireUserConfig();

    let params = { identifier: handle, password: password };
    let json = await this.postRequest('com.atproto.server.createSession', params, { auth: false });

    this.saveTokens(json);
    return json;
  }

  async performTokenRefresh(): Promise<json> {
    this.requireLoggedInUser();

    console.log('Refreshing access token…');
    let json = await this.postRequest('com.atproto.server.refreshSession', null, { auth: this.user.refreshToken });
    this.saveTokens(json);
    return json;
  }

  saveTokens(json: json) {
    this.requireUserConfig();

    this.user.accessToken = json['accessJwt'];
    this.user.refreshToken = json['refreshJwt'];
    this.user.did = json['did'];

    if (json.didDoc?.service) {
      let service = json.didDoc.service.find((s: json) => s.id == '#atproto_pds');
      this.host = service.serviceEndpoint.replace('https://', '');
    }

    this.user.pdsEndpoint = this.host;
    this.config.save();
  }

  resetTokens() {
    this.requireUserConfig();

    delete this.user.accessToken;
    delete this.user.refreshToken;
    delete this.user.did;
    delete this.user.pdsEndpoint;
    this.config.save();
  }
}
