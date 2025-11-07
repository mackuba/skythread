interface Window {
  dateLocale: string | undefined;
  root: AnyPost;
  subtreeRoot: AnyPost;
  init: () => void;
  BlueskyAPI: BlueskyAPI;
}

declare var accountAPI: BlueskyAPI;
declare var blueAPI: BlueskyAPI;
declare var appView: BlueskyAPI;
declare var api: BlueskyAPI;
declare var avatarPreloader: IntersectionObserver;

type json = Record<string, any>;
type FetchAllOnPageLoad = (obj: json[]) => { cancel: true } | void;
type AnyPost = Post | BlockedPost | MissingPost | DetachedQuotePost;
type PostContext = 'thread' | 'parent' | 'quote' | 'quotes' | 'feed';
