interface Window {
  dateLocale: string | undefined;
  root: AnyPost;
  subtreeRoot: AnyPost;
  init: () => void;
  BlueskyAPI: { new(host: string | null, useAuthentication: boolean): import("./api/bluesky_api.js").BlueskyAPI };
}

declare var accountAPI: import("./api/bluesky_api.js").BlueskyAPI;
declare var blueAPI: import("./api/bluesky_api.js").BlueskyAPI;
declare var appView: import("./api/bluesky_api.js").BlueskyAPI;
declare var api: import("./api/bluesky_api.js").BlueskyAPI;
declare var avatarPreloader: IntersectionObserver;

type json = Record<string, any>;

type AnyPost = import("./models/posts.js").Post
             | import("./models/posts.js").BlockedPost
             | import("./models/posts.js").MissingPost
             | import("./models/posts.js").DetachedQuotePost;

type PostContext = 'thread' | 'parent' | 'quote' | 'quotes' | 'feed';
