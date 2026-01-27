interface Window {
  root: AnyPost;
  subtreeRoot: AnyPost;
  _paq?: any[][];
}

type json = Record<string, any>;

type AnyPost = import("./models/posts.js").Post
             | import("./models/posts.js").BlockedPost
             | import("./models/posts.js").MissingPost
             | import("./models/posts.js").DetachedQuotePost;

type PostPlacement = 'thread' | 'parent' | 'quote' | 'quotes' | 'feed';
