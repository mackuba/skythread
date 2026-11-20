const API_URL = 'https://public.api.bsky.app/xrpc/';
const METADATA_TIMEOUT_MS = 2500;

// Check bot signatures first: many crawlers also advertise Mozilla/Chrome/Safari.
const BOT_UA = /bot|crawl|spider|slurp|scrap|preview|fetch|scan|headless|lighthouse|facebookexternalhit|facebot|meta-external|twitter|slack|discord|telegram|whatsapp|linkedin|pinterest|embedly|quora|vkshare|archive|monitor|validator|chatgpt|claude|anthropic|perplexity|cohere|mediapartners|googleother|google-inspectiontool|google-extended|google-read-aloud/i;
const BROWSER_UA = /^Mozilla\/5\.0\s.+(?:AppleWebKit\/|Gecko\/).+(?:Safari\/|Firefox\/|Chrome\/|Chromium\/|Edg(?:e|A|iOS)?\/|OPR\/|FxiOS\/|CriOS\/)/i;

type PostReference = { author: string, rkey: string };
type Metadata = { title?: string, description: string };
type FetchAPI = (url: URL, init: RequestInit) => Promise<Response>;
type HandlerOptions = { fetch?: FetchAPI, timeoutMs?: number };
type PostData = { author?: { handle?: string }, record?: { text?: string } };

function parsePostURL(value: string): PostReference | undefined {
  const atMatch = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)$/.exec(value);

  if (atMatch) {
    return { author: atMatch[1], rkey: atMatch[2] };
  }

  const url = new URL(value);
  const parts = url.pathname.split('/');

  if (['https:', 'http:'].includes(url.protocol) && parts[1] == 'profile' && parts[3] == 'post' && parts[2] && parts[4]) {
    return { author: decodeURIComponent(parts[2]), rkey: decodeURIComponent(parts[4]) };
  }

  return undefined;
}

async function apiGet<T>(method: string, params: Record<string, string>, signal: AbortSignal, fetchAPI: FetchAPI): Promise<T> {
  const url = new URL(method, API_URL);
  url.search = new URLSearchParams(params).toString();

  const response = await fetchAPI(url, { signal, redirect: 'error' });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Bluesky API returned ${response.status}`);
  }

  return await response.json() as T;
}

async function postMetadata(ref: PostReference, quotes: boolean, signal: AbortSignal, fetchAPI: FetchAPI): Promise<Metadata> {
  let { author, rkey } = ref;

  if (!author || !rkey || /[/\\?#\s]/.test(author) || !/^[A-Za-z0-9._~:-]+$/.test(rkey) || rkey == '.' || rkey == '..') {
    throw new Error('Invalid post reference');
  }

  if (!author.startsWith('did:')) {
    const result = await apiGet<{ did?: string }>('com.atproto.identity.resolveHandle', { handle: author }, signal, fetchAPI);

    if (typeof result.did != 'string' || !result.did.startsWith('did:')) {
      throw new Error('Missing DID');
    }

    author = result.did;
  }

  const uri = `at://${author}/app.bsky.feed.post/${rkey}`;
  const result = await apiGet<{ posts?: PostData[] }>('app.bsky.feed.getPosts', { uris: uri }, signal, fetchAPI);
  const post = Array.isArray(result.posts) ? result.posts[0] : undefined;

  if (typeof post?.record?.text != 'string' || typeof post.author?.handle != 'string' || !post.author.handle) {
    throw new Error('Missing post data');
  }

  const text = post.record.text.replace(/(?:\r\n|[\r\n\u2028\u2029])+/g, ' ');

  return quotes
    ? { description: `Quotes of: "${text}"` }
    : { title: `Skythread • Post by @${post.author.handle}`, description: text };
}

function pageDescription(params: Record<string, string>): string | undefined {
  switch (params.page) {
    case 'notif': return 'Replies & Mentions';
    case 'posting_stats': return 'Bluesky posting statistics';
    case 'like_stats': return 'Like statistics';
    case 'search': return params.mode == 'likes' ? 'Archive search' : 'Timeline search';
  }

  return undefined;
}

export function createHandler(html: string, { fetch: fetchAPI = fetch, timeoutMs = METADATA_TIMEOUT_MS }: HandlerOptions = {}) {
  // Blob stores the UTF-8 bytes once, rather than encoding the HTML on every request.
  const cachedHTML = new Blob([html], { type: 'text/html; charset=utf-8' });
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Vary': 'User-Agent' };
  const titleEnd = /<\/title>/i.exec(html);
  const insertionPoint = titleEnd ? titleEnd.index + titleEnd[0].length : 0;
  const prefix = html.slice(0, insertionPoint);
  const suffix = html.slice(insertionPoint);
  const indexResponse = () => new Response(cachedHTML, { headers });

  function metadataResponse(metadata: Metadata): Response {
    let tags = '';

    if (metadata.title) {
      tags += `\n  <meta property="og:title" content="${Bun.escapeHTML(metadata.title)}">`;
    }

    tags += `\n  <meta property="og:description" content="${Bun.escapeHTML(metadata.description)}">`;
    return new Response(prefix + tags + suffix, { headers });
  }

  async function botResponse(url: URL): Promise<Response> {
    try {
      // Match the frontend's route precedence and last-value-wins query parsing.
      const params = Object.fromEntries(url.searchParams);
      let ref: PostReference | undefined;
      let quotes = false;

      if (params.q) {
        ref = parsePostURL(params.q);
      } else if (params.author && params.post) {
        ref = { author: params.author, rkey: params.post };
      } else if (params.quotes) {
        ref = parsePostURL(params.quotes);
        quotes = true;
      } else if (params.hash) {
        return metadataResponse({ description: `Posts tagged with #${params.hash}` });
      } else if (params.page) {
        const description = pageDescription(params);
        return description ? metadataResponse({ description }) : indexResponse();
      }

      if (ref) {
        // One deadline covers resolution, post fetching, and reading both bodies.
        const signal = AbortSignal.timeout(timeoutMs);
        const metadata = await postMetadata(ref, quotes, signal, fetchAPI);
        return metadataResponse(metadata);
      }
    } catch {
      // Link previews must never prevent the app from loading.
    }

    return indexResponse();
  }

  return function handleRequest(request: Request): Response | Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname != '/') {
      return new Response('Not Found', { status: 404 });
    }

    if (request.method != 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET' } });
    }

    if (!url.search || !insertionPoint) {
      return indexResponse();
    }

    const userAgent = request.headers.get('user-agent') ?? '';

    if (!BOT_UA.test(userAgent) && BROWSER_UA.test(userAgent)) {
      return indexResponse();
    }

    return botResponse(url);
  };
}

if (import.meta.main) {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text();
  const server = Bun.serve({
    hostname: Bun.env.HOST ?? '127.0.0.1',
    port: Bun.env.PORT ?? 3000,
    fetch: createHandler(html)
  });

  console.log(`Skythread entry server listening on ${server.url}`);
}
