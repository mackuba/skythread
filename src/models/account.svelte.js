import { BlueskyAPI } from '../api/api.js';
import { Minisky } from '../api/minisky.js';
import { pdsEndpointForIdentifier } from '../api/identity.js';

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

  /** @param {string} identifier, @param {string} password, @returns {Promise<BlueskyAPI>} */

  async logIn(identifier, password) {
    let pdsEndpoint = await pdsEndpointForIdentifier(identifier);

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
