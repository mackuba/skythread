interface Window {
  dateLocale: string | undefined;
  root: AnyPost;
  subtreeRoot: AnyPost;
  loadInfohazard: (() => void) | undefined;
}

declare var accountAPI: BlueskyAPI;
declare var blueAPI: BlueskyAPI;
declare var appView: BlueskyAPI;
declare var api: BlueskyAPI;
declare var isIncognito: boolean;
declare var biohazardEnabled: boolean;
declare var loginDialog: HTMLElement;
declare var accountMenu: Menu;
declare var avatarPreloader: IntersectionObserver;
declare var threadPage: ThreadPage;
declare var postingStatsPage: PostingStatsPage;
declare var likeStatsPage: LikeStatsPage;
declare var notificationsPage: NotificationsPage;
declare var privateSearchPage: PrivateSearchPage;

type json = Record<string, any>;

function $tag(tag: string): HTMLElement;
function $tag<T extends HTMLElement>(tag: string, type: new (...args: any[]) => T): T;
function $tag(tag: string, params: string | object): HTMLElement;
function $tag<T extends HTMLElement>(tag: string, params: string | object, type: new (...args: any[]) => T): T;
