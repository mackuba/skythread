const API_URL = 'https://public.api.bsky.app/xrpc/';
const METADATA_TIMEOUT_MS = 3_000;

const BOT_PATTERNS = new RegExp([
  String.raw`\(\+|@|http`,
  'bot|crawl|spider|slurp|scrap|preview|fetch|scan|headless|archive|monitor|validator',
  'facebook|meta-external|google|slack|discord|telegram|whatsapp|linkedin|pinterest|embedly|quora|vkshare',
  'chatgpt|claude|anthropic|perplexity|cohere|mediapartners'
].join('|'), 'i');

type PostReference = { repo: string, rkey: string };
type Metadata = { title?: string, description: string };
type PostData = { author?: { handle?: string }, record?: { text?: string } };

type FetchAPI = (url: URL, init: RequestInit) => Promise<Response>;
type HandlerOptions = { fetch?: FetchAPI, timeoutMs?: number };

function parsePostURL(value: string): PostReference | undefined {
  let atMatch = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)$/.exec(value);

  if (atMatch) {
    return { repo: atMatch[1], rkey: atMatch[2] };
  }

  let url = new URL(value);
  let parts = url.pathname.split('/');

  if (['https:', 'http:'].includes(url.protocol) && parts[1] == 'profile' && parts[3] == 'post' && parts[2] && parts[4]) {
    return { repo: decodeURIComponent(parts[2]), rkey: decodeURIComponent(parts[4]) };
  }

  return undefined;
}

export class SkythreadOGServer {
  private readonly fetchAPI: FetchAPI;
  private readonly timeout: number;

  private readonly baseHTML: Blob;
  private readonly noindexHTML: Blob;
  private readonly htmlBeforeMeta: string;
  private readonly htmlAfterMeta: string;

  private readonly responseHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
    'Vary': 'User-Agent'
  };

  constructor(html: string, options: HandlerOptions = {}) {
    let titleCloseTag = /<\/title>/i.exec(html);

    if (!titleCloseTag) {
      throw 'Invalid HTML - missing </title>';
    }

    let charsetTag = /<meta\s+charset="UTF-8"\s*>/i.exec(html);

    if (!charsetTag) {
      throw 'Invalid HTML - missing <meta charset="UTF-8">';
    }

    this.fetchAPI = options.fetch ?? globalThis.fetch;
    this.timeout = options.timeoutMs ?? METADATA_TIMEOUT_MS;

    // Blob stores the UTF-8 bytes once, rather than encoding the HTML on every request
    this.baseHTML = new Blob([html], { type: 'text/html; charset=utf-8' });

    let afterTitleOffset = titleCloseTag.index + titleCloseTag[0].length;
    let afterCharsetOffset = charsetTag.index + charsetTag[0].length;

    let robotsNoindex = '\n  <meta name="robots" content="noindex, nofollow">';
    let noindexHTML = html.slice(0, afterCharsetOffset) + robotsNoindex + html.slice(afterCharsetOffset);
    this.noindexHTML = new Blob([noindexHTML], { type: 'text/html; charset=utf-8' });

    let metadataOffset = (afterCharsetOffset <= afterTitleOffset) ? afterTitleOffset + robotsNoindex.length : afterTitleOffset;
    this.htmlBeforeMeta = noindexHTML.slice(0, metadataOffset);
    this.htmlAfterMeta = noindexHTML.slice(metadataOffset);
  }

  handleRequest(request: Request): Response | Promise<Response> {
    let url = new URL(request.url);

    if (url.pathname != '/' && url.pathname != '/index.html') {
      return new Response('Not Found', { status: 404 });
    }

    if (request.method != 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'GET' } });
    }

    if (!url.search) {
      // we don't add any meta tags for the root path /, only for content pages
      return new Response(this.baseHTML, { headers: this.responseHeaders })
    }

    let userAgent = request.headers.get('user-agent') ?? '';

    if (!userAgent.startsWith('Mozilla/5.0 (')) {
      // if it doesn't start with Mozilla/5.0 then it's not a normal browser -> serve meta tags
      return this.botResponse(url);
    }

    if (BOT_PATTERNS.test(userAgent)) {
      // if it starts with Mozilla/5.0 but contains terms like bot, facebook, @ -> serve meta tags
      return this.botResponse(url);
    }

    // starts with Mozilla/5.0 and doesn't contain anything suspicious -> fast path for a normal browser
    return new Response(this.noindexHTML, { headers: this.responseHeaders })
  }

  private metadataResponse(metadata: Metadata): Response {
    let tags = '';

    if (metadata.title) {
      tags += `\n  <meta property="og:title" content="${Bun.escapeHTML(metadata.title)}">`;
    }

    tags += `\n  <meta property="og:description" content="${Bun.escapeHTML(metadata.description)}">`;
    return new Response(this.htmlBeforeMeta + tags + this.htmlAfterMeta, { headers: this.responseHeaders });
  }

  private async botResponse(url: URL): Promise<Response> {
    try {
      let params = Object.fromEntries(url.searchParams);
      let postRef: PostReference | undefined;
      let quotes = false;

      if (params.q) {
        postRef = parsePostURL(params.q);
      } else if (params.author && params.post) {
        postRef = { repo: params.author, rkey: params.post };
      } else if (params.quotes) {
        postRef = parsePostURL(params.quotes);
        quotes = true;
      } else if (params.hash) {
        return this.metadataResponse({ description: `Posts tagged with #${params.hash}` });
      } else if (params.page) {
        let description = this.pageDescription(params);

        if (description) {
          return this.metadataResponse({ description });
        }
      }

      if (postRef) {
        // one timeout for handle resolution (if needed) and post record fetch
        let signal = AbortSignal.timeout(this.timeout);
        let metadata = await this.postMetadata(postRef, quotes, signal);

        return this.metadataResponse(metadata);
      }
    } catch (e) {
      // link preview errors shouldn't prevent the app from loading
      console.error(`Error while fetching ${url}: ${e}`);
    }

    // if nothing else returned, return index without meta tags, but with a robots noindex
    return new Response(this.noindexHTML, { headers: this.responseHeaders })
  }

  private async apiGet<T>(method: string, params: Record<string, string>, signal: AbortSignal): Promise<T> {
    let url = new URL(method, API_URL);
    url.search = new URLSearchParams(params).toString();

    let fetchAPI = this.fetchAPI;
    let response = await fetchAPI(url, { signal, redirect: 'error' });

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Bluesky API returned ${response.status}`);
    }

    return await response.json() as T;
  }

  private async postMetadata(postRef: PostReference, quotes: boolean, signal: AbortSignal): Promise<Metadata> {
    let { repo: author, rkey } = postRef;

    if (!author || !rkey || /[/\\?#\s]/.test(author) || !/^[A-Za-z0-9._~:-]+$/.test(rkey)) {
      throw new Error(`Invalid post reference: { ${author}, ${rkey} }`);
    }

    if (!author.startsWith('did:')) {
      let result: { did?: string } = await this.apiGet('com.atproto.identity.resolveHandle', { handle: author }, signal);

      if (typeof result.did != 'string' || !result.did.startsWith('did:')) {
        throw new Error(`Missing DID for author: ${author}`);
      }

      author = result.did;
    }

    let postURI = `at://${author}/app.bsky.feed.post/${rkey}`;
    let result: { posts?: PostData[] } = await this.apiGet('app.bsky.feed.getPosts', { uris: postURI }, signal);
    let post = Array.isArray(result.posts) ? result.posts[0] : undefined;

    if (typeof post?.record?.text != 'string' || typeof post.author?.handle != 'string' || !post.author.handle) {
      throw new Error(`Missing post data for post: ${postURI}`);
    }

    let text = post.record.text.replace(/(?:\r\n|[\r\n\u2028\u2029])+/g, ' ');

    if (quotes) {
      return { description: `Quotes of: "${text}"` };
    } else {
      return {
        title: `Skythread • Post by @${post.author.handle}`,
        description: text
      };
    }
  }

  private pageDescription(params: Record<string, string>): string | undefined {
    switch (params.page) {
      case 'notif':
        return 'Replies & Mentions';
      case 'posting_stats':
        return 'Bluesky posting statistics';
      case 'like_stats':
        return 'Like statistics';
      case 'search':
        return (params.mode == 'likes') ? 'Archive search' : 'Timeline search';
      default:
        return undefined;
    }
  }
}

export function createRequestHandler(html: string, options: HandlerOptions = {}) {
  let server = new SkythreadOGServer(html, options);
  return server.handleRequest.bind(server);
}

if (import.meta.main) {
  let indexHtmlContents = await Bun.file(new URL('../index.html', import.meta.url)).text();

  let server = Bun.serve({
    hostname: Bun.env.HOST ?? '127.0.0.1',
    port: Bun.env.PORT ?? 3000,
    fetch: createRequestHandler(indexHtmlContents)
  });

  console.log(`Skythread server started on ${server.url}`);
}
