import { AuthenticatedAPI } from "./api/authenticated_api";
import { BlueskyAPI, HiddenRepliesError, URLError } from "./api/bluesky_api";
import { APIError, Minisky } from "./api/minisky";
import { settings } from "./models/settings.svelte";

export { AuthenticatedAPI, BlueskyAPI, Minisky };
export { APIError, HiddenRepliesError, URLError };

export let appView = new BlueskyAPI('api.bsky.app');
export let blueAPI = new BlueskyAPI('blue.mackuba.eu');
export let accountAPI = new AuthenticatedAPI();
export let api: BlueskyAPI;

export function setAPI() {
   api = (accountAPI.isLoggedIn && !settings.incognitoMode) ? accountAPI : appView;
}

setAPI();
