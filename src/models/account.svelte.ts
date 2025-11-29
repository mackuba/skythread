import { accountAPI, setAPI } from '../api.js';
import { pdsEndpointForIdentifier } from '../api/identity.js';
import { settings } from './settings.svelte.js';

class Account {
  #loggedIn: boolean;
  #avatarURL: string | undefined;
  #avatarIsLoading: boolean;

  constructor() {
    this.#loggedIn = $state(accountAPI.isLoggedIn);
    this.#avatarURL = $state(accountAPI.isLoggedIn ? accountAPI.user.avatar : undefined);
    this.#avatarIsLoading = $state(false);
  }

  get isIncognito(): boolean {
    return !!settings.incognitoMode;
  }

  toggleIncognitoMode() {
    settings.incognitoMode = !this.isIncognito;
    location.reload();
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

  async logIn(identifier: string, password: string) {
    let pdsEndpoint = await pdsEndpointForIdentifier(identifier);

    accountAPI.host = pdsEndpoint;
    await accountAPI.logIn(identifier, password);

    this.#loggedIn = true;
    this.#avatarIsLoading = true;
    setAPI();

    accountAPI.loadCurrentUserAvatar().then(url => {
      this.#avatarURL = url || undefined;
    }).catch(error => {
      console.log(error);
    }).finally(() => {
      this.#avatarIsLoading = false;
    });
  }

  logOut() {
    accountAPI.resetTokens();
    settings.logOut();
    location.reload();
  }
}

export let account = new Account();
