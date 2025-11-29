interface Window {
  root: AnyPost;
  subtreeRoot: AnyPost;
  init: () => void;
  BlueskyAPI: typeof import("./api/bluesky_api.js").BlueskyAPI;
}

type json = Record<string, any>;

type AnyPost = import("./models/posts.js").Post
             | import("./models/posts.js").BlockedPost
             | import("./models/posts.js").MissingPost
             | import("./models/posts.js").DetachedQuotePost;

type PostPlacement = 'thread' | 'parent' | 'quote' | 'quotes' | 'feed';
