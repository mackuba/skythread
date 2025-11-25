interface Window {
  dateLocale: string | undefined;
  root: import("./models/posts.js").AnyPost;
  subtreeRoot: import("./models/posts.js").AnyPost;
  init: () => void;
  BlueskyAPI: { new(host: string | null, useAuthentication: boolean): import("./api/api.js").BlueskyAPI };
}

declare var accountAPI: import("./api/api.js").BlueskyAPI;
declare var blueAPI: import("./api/api.js").BlueskyAPI;
declare var appView: import("./api/api.js").BlueskyAPI;
declare var api: import("./api/api.js").BlueskyAPI;
declare var avatarPreloader: IntersectionObserver;

type json = Record<string, any>;
type FetchAllOnPageLoad = (obj: json[]) => { cancel: true } | undefined | void;

type AnyPost = import("./models/posts.js").Post
             | import("./models/posts.js").BlockedPost
             | import("./models/posts.js").MissingPost
             | import("./models/posts.js").DetachedQuotePost;

type PostContext = 'thread' | 'parent' | 'quote' | 'quotes' | 'feed';
