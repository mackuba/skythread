import { BlueskyAPI } from '../api/api.js';
import { pdsEndpointForIdentifier } from '../api/identity.js';

class Account {
  #isIncognito: boolean;
  #biohazardEnabled: boolean | undefined;
  #loggedIn: boolean;
  #avatarURL: string | undefined;
  #avatarIsLoading: boolean;

  constructor() {
    let incognito = localStorage.getItem('incognito');
    let biohazard = localStorage.getItem('biohazard');
    let biohazardEnabled = biohazard ? !!JSON.parse(biohazard) : undefined;
    let accountAPI = new BlueskyAPI(null, true);

    this.#isIncognito = $state(accountAPI.isLoggedIn && !!incognito);
    this.#biohazardEnabled = $state(biohazardEnabled);
    this.#loggedIn = $state(accountAPI.isLoggedIn);
    this.#avatarURL = $state(accountAPI.isLoggedIn ? accountAPI.user.avatar : undefined);
    this.#avatarIsLoading = $state(false);
  }

  get isIncognito(): boolean {
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

  get biohazardEnabled(): boolean | undefined {
    return this.#biohazardEnabled;
  }

  set biohazardEnabled(value: boolean) {
    this.#biohazardEnabled = value;
    localStorage.setItem('biohazard', JSON.stringify(value));
  }

  get loggedIn(): boolean {
    return this.#loggedIn;
  }

  get avatarURL(): string | undefined {
    return this.#avatarURL;
  }

  get avatarIsLoading(): boolean {
    return this.#avatarIsLoading;
  }

  async logIn(identifier: string, password: string): Promise<BlueskyAPI> {
    let pdsEndpoint = await pdsEndpointForIdentifier(identifier);

    let pdsAPI = new BlueskyAPI(pdsEndpoint, true);
    await pdsAPI.logIn(identifier, password);

    this.#loggedIn = true;
    this.#avatarIsLoading = true;

    pdsAPI.loadCurrentUserAvatar().then(url => {
      this.#avatarURL = url || undefined;
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
