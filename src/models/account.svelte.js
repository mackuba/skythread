import { BlueskyAPI } from '../api/api.js';
import { Minisky } from '../api/minisky.js';

class LoginError extends Error {

  /** @param {string} message */
  constructor(message) {
    super(message);
  }
}

class Account {

  #isIncognito;
  #biohazardEnabled;
  #loggedIn;

  constructor() {
    let incognito = localStorage.getItem('incognito');
    let biohazard = JSON.parse(localStorage.getItem('biohazard') ?? 'null');
    let accountAPI = new BlueskyAPI(undefined, true);

    this.#isIncognito = $state(!!incognito);
    this.#biohazardEnabled = $state(biohazard);
    this.#loggedIn = $state(accountAPI.isLoggedIn);
  }

  get isIncognito() {
    return this.#isIncognito;
  }

  toggleIncognitoMode() {
    if (!this.#isIncognito) {
      localStorage.setItem('incognito', '1');
    } else {
      localStorage.removeItem('incognito');
    }

    location.reload();
  }

  get biohazardEnabled() {
    return this.#biohazardEnabled;
  }

  set biohazardEnabled(value) {
    this.#biohazardEnabled = value;
    localStorage.setItem('biohazard', JSON.stringify(value));
  }

  get loggedIn() {
    return this.#loggedIn;
  }

  /** @param {string} identifier, @returns {Promise<string>} */

  async findPDSEndpoint(identifier) {
    if (identifier.match(/^did:/)) {
      return await Minisky.pdsEndpointForDid(identifier);
    } else if (identifier.match(/^[^@]+@[^@]+$/)) {
      return 'bsky.social';
    } else if (identifier.match(/^@?[\w\-]+(\.[\w\-]+)+$/)) {
      identifier = identifier.replace(/^@/, '');
      let did = await appView.resolveHandle(identifier);
      return await Minisky.pdsEndpointForDid(did);
    } else {
      throw new LoginError('Please enter your handle or DID.');
    }
  }

  /** @param {string} identifier, @param {string} password, @returns {Promise<BlueskyAPI>} */

  async logIn(identifier, password) {
    let pdsEndpoint = await this.findPDSEndpoint(identifier);

    let pds = new BlueskyAPI(pdsEndpoint, true);
    await pds.logIn(identifier, password);
    return pds;
  }

  logOut() {
    window.accountAPI.resetTokens();
    localStorage.removeItem('incognito');
    location.reload();
  }
}

export let account = new Account();
