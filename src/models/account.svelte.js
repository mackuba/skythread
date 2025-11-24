import { BlueskyAPI } from '../api/api.js';
import { pdsEndpointForIdentifier } from '../api/identity.js';

class Account {

  #isIncognito;
  #biohazardEnabled;
  #loggedIn;
  #avatarURL;
  #avatarIsLoading;

  constructor() {
    let incognito = localStorage.getItem('incognito');
    let biohazard = JSON.parse(localStorage.getItem('biohazard') ?? 'null');
    let accountAPI = new BlueskyAPI(null, true);

    this.#isIncognito = $state(accountAPI.isLoggedIn && !!incognito);
    this.#biohazardEnabled = $state(biohazard);
    this.#loggedIn = $state(accountAPI.isLoggedIn);
    this.#avatarURL = $state(accountAPI.isLoggedIn && accountAPI.user.avatar);
    this.#avatarIsLoading = $state(false);
  }

  /** @returns {boolean} */

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

  /** @returns {boolean?} */

  get biohazardEnabled() {
    return this.#biohazardEnabled;
  }

  /** @param {boolean} value */

  set biohazardEnabled(value) {
    this.#biohazardEnabled = value;
    localStorage.setItem('biohazard', JSON.stringify(value));
  }

  /** @returns {boolean} */

  get loggedIn() {
    return this.#loggedIn;
  }

  /** @returns {string | undefined} */

  get avatarURL() {
    return this.#avatarURL;
  }

  /** @returns {boolean} */

  get avatarIsLoading() {
    return this.#avatarIsLoading;
  }

  /** @param {string} identifier, @param {string} password, @returns {Promise<BlueskyAPI>} */

  async logIn(identifier, password) {
    let pdsEndpoint = await pdsEndpointForIdentifier(identifier);

    let pdsAPI = new BlueskyAPI(pdsEndpoint, true);
    await pdsAPI.logIn(identifier, password);

    this.#loggedIn = true;
    this.#avatarIsLoading = true;

    pdsAPI.loadCurrentUserAvatar().then(url => {
      this.#avatarURL = url;
    }).catch(error => {
      console.log(error);
    }).finally(() => {
      this.#avatarIsLoading = false;
    });

    return pdsAPI;
  }

  logOut() {
    window.accountAPI.resetTokens();
    localStorage.removeItem('incognito');
    location.reload();
  }
}

export let account = new Account();
