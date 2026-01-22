import { AuthenticatedAPI } from "./api/authenticated_api";
import { BlueskyAPI, URLError } from "./api/bluesky_api";
import { APIError, Minisky } from "./api/minisky";
import { settings } from "./models/settings.svelte";

export { AuthenticatedAPI, BlueskyAPI, Minisky };
export { APIError, URLError };

declare global {
  interface Window {
    AuthenticatedAPI: typeof AuthenticatedAPI;
    BlueskyAPI: typeof BlueskyAPI;
    Minisky: typeof Minisky;

    api: BlueskyAPI;
    appView: BlueskyAPI;
    blueAPI: BlueskyAPI;
    constellationAPI: BlueskyAPI;
    accountAPI: AuthenticatedAPI;
  }
}

export let appView = new BlueskyAPI('api.bsky.app');
export let blueAPI = new BlueskyAPI('blue.mackuba.eu');
export let constellationAPI = new BlueskyAPI('constellation.microcosm.blue');
export let accountAPI = new AuthenticatedAPI();
export let api: BlueskyAPI;

export function setAPI() {
   api = (accountAPI.isLoggedIn && !settings.incognitoMode) ? accountAPI : appView;
   window.api = api;
}

setAPI();

window.AuthenticatedAPI = AuthenticatedAPI;
window.BlueskyAPI = BlueskyAPI;
window.Minisky = Minisky;

window.appView = appView;
window.blueAPI = blueAPI;
window.accountAPI = accountAPI;
window.constellationAPI = constellationAPI;
