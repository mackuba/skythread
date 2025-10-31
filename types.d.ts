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

declare var Paginator: PaginatorType;

type json = Record<string, any>;

type FetchAllOnPageLoad = (obj: json[]) => { cancel: true } | void;

type AnyPost = Post | BlockedPost | MissingPost | DetachedQuotePost;
