import { AuthenticatedAPI } from "./api/authenticated_api";
import { BluefeedsAPI } from "./api/bluefeeds_api";
import { BlueskyAPI } from "./api/bluesky_api";
import { ConstellationAPI } from "./api/constellation_api";
import { URLError } from "./api/errors";
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
    blueAPI: Minisky;
    constellationAPI: ConstellationAPI;
    slingshotAPI: Minisky;
    accountAPI: AuthenticatedAPI;
  }
}

let appViewHost = 'api.bsky.app';

export let appView = new BlueskyAPI(appViewHost);
export let blueAPI = new BluefeedsAPI('blue.mackuba.eu');
export let constellationAPI = new ConstellationAPI('constellation.microcosm.blue');
export let slingshotAPI = new Minisky("slingshot.microcosm.blue");

export let accountAPI = new AuthenticatedAPI({ proxiedAppView: appViewHost });
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
window.slingshotAPI = slingshotAPI;
