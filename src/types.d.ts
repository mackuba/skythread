interface Window {
  root: AnyPost;
  subtreeRoot: AnyPost;
  _paq?: any[][];
  Highlighter?: CodeHighlighter;
}

type json = Record<string, any>;

type CodeHighlightResult =
  | { kind: 'highlighted', html: string }
  | { kind: 'plain', text: string };

type CodeHighlighter = {
  highlightCodeBlock(code: string, language: string | undefined): CodeHighlightResult;
};

type AnyPost = import("./models/posts.js").Post
             | import("./models/posts.js").BlockedPost
             | import("./models/posts.js").MissingPost
             | import("./models/posts.js").DetachedQuotePost;

type PostPlacement = 'thread' | 'parent' | 'quote' | 'quotes' | 'feed';
