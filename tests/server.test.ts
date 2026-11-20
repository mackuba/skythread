import { describe, expect, mock, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import { createRequestHandler } from '../server';

const HTML = '<!DOCTYPE html>\n<html><head>\n  <meta charset="UTF-8">\n  <title>Skythread</title>\n</head><body><script src="dist/skythread.js"></script></body></html>';
const NOINDEX_HTML = HTML.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n  <meta name="robots" content="noindex, nofollow">');
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const DID = 'did:plc:alice';
const URI = `at://${DID}/app.bsky.feed.post/3abc`;

function request(query = '', userAgent: string | undefined = 'ExampleBot/1.0', method = 'GET', path = '/') {
  return new Request(`http://localhost${path}${query}`, {
    method,
    headers: userAgent === undefined ? {} : { 'User-Agent': userAgent }
  });
}

function postResponse(text = 'Hello\nworld', handle = 'alice.example') {
  return Response.json({ posts: [{ uri: URI, author: { handle }, record: { text } }] });
}

async function metadata(response: Response) {
  const html = await response.text();
  const document = new JSDOM(html).window.document;

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
  expect(response.headers.get('vary')).toBe('User-Agent');
  expect(document.querySelector('meta[charset]')?.nextElementSibling?.outerHTML).toBe('<meta name="robots" content="noindex, nofollow">');
  expect(document.title).toBe('Skythread');
  expect(document.querySelectorAll('script')).toHaveLength(1);

  return {
    html,
    title: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    description: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    document
  };
}

describe('entry server fast paths', () => {
  test('root requests return unchanged HTML synchronously and repeatedly', async () => {
    const fetchAPI = mock(() => Promise.reject(new Error('Unexpected API request')));
    const handle = createRequestHandler(HTML, { fetch: fetchAPI });

    for (const query of ['', '?']) {
      const response = handle(request(query));
      expect(response).toBeInstanceOf(Response);
      expect(await (response as Response).text()).toBe(HTML);
    }

    expect(fetchAPI).not.toHaveBeenCalled();
  });

  test.each([
    CHROME,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    `${CHROME} Edg/141.0.0.0`,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/145.0 Mobile/15E148 Safari/605.1.15'
  ])('browser UA has a synchronous fast path: %s', async (userAgent) => {
    const fetchAPI = mock(() => Promise.reject(new Error('Unexpected API request')));
    const handle = createRequestHandler(HTML, { fetch: fetchAPI });

    for (const query of ['?q=https://bsky.app/profile/alice.example/post/3abc', '?hash=hello', '?page=search&mode=likes']) {
      const response = handle(request(query, userAgent));
      expect(response).toBeInstanceOf(Response);
      expect(await (response as Response).text()).toBe(NOINDEX_HTML);
    }

    expect(fetchAPI).not.toHaveBeenCalled();
  });

  test.each(['Googlebot', `${CHROME} Googlebot/2.1`, `${CHROME} HeadlessChrome/141.0.0.0`, `${CHROME} facebookexternalhit/1.1`, `${CHROME} ChatGPT-User/1.0`, 'curl/8.0', '', undefined])(
    'bots and non-browser UAs get metadata: %s', async (userAgent) => {
      const handle = createRequestHandler(HTML);
      // Pass a Request directly so undefined represents a missing UA, not the helper's default.
      const response = await handle(new Request('http://localhost/?hash=bun', {
        headers: userAgent === undefined ? {} : { 'User-Agent': userAgent }
      }));
      expect((await metadata(response)).description).toBe('Posts tagged with #bun');
    }
  );

  test('rejects other paths and methods without fetching', async () => {
    const fetchAPI = mock(() => Promise.reject(new Error('Unexpected API request')));
    const handle = createRequestHandler(HTML, { fetch: fetchAPI });

    for (const path of ['/index.html', '/dist/skythread.js', '/api', '//']) {
      expect((await handle(request('', CHROME, 'GET', path))).status).toBe(404);
    }

    for (const method of ['POST', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await handle(request('?hash=bun', CHROME, method));
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET');
    }

    expect(fetchAPI).not.toHaveBeenCalled();
  });
});

describe('bot metadata', () => {
  test('escapes hashtag attributes and inserts them just after the title', async () => {
    const hashtag = 'bun\"/><script>alert(\'x\')</script>&🐰';
    const response = await createRequestHandler(HTML)(request(`?${new URLSearchParams({ hash: hashtag })}`));
    const result = await metadata(response);

    expect(result.description).toBe(`Posts tagged with #${hashtag}`);
    expect(result.title).toBeUndefined();
    expect(result.html).toContain('<title>Skythread</title>\n  <meta property="og:description"');
    expect(result.document.querySelectorAll('meta')).toHaveLength(3);
  });

  test.each([
    ['notif', '', 'Replies & Mentions'],
    ['posting_stats', '', 'Bluesky posting statistics'],
    ['like_stats', '', 'Like statistics'],
    ['search', '', 'Timeline search'],
    ['search', '&mode=likes', 'Archive search']
  ])('describes page=%s%s', async (page, extra, expected) => {
    const fetchAPI = mock(() => Promise.reject(new Error('Unexpected API request')));
    const response = await createRequestHandler(HTML, { fetch: fetchAPI })(request(`?page=${page}${extra}`));
    const result = await metadata(response);
    expect(result.description).toBe(expected);
    expect(result.title).toBeUndefined();
    expect(fetchAPI).not.toHaveBeenCalled();
  });

  test('resolves handles and loads the post for author + post', async () => {
    const calls: { url: URL, init: RequestInit }[] = [];
    const fetchAPI = mock((url: URL, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(calls.length == 1 ? Response.json({ did: DID }) : postResponse());
    });
    const response = await createRequestHandler(HTML, { fetch: fetchAPI })(request('?author=alice.example&post=3abc'));
    const result = await metadata(response);

    expect(result.title).toBe('Skythread • Post by @alice.example');
    expect(result.description).toBe('Hello world');
    expect(calls).toHaveLength(2);
    expect(calls[0].url.origin).toBe('https://public.api.bsky.app');
    expect(calls[0].url.pathname).toBe('/xrpc/com.atproto.identity.resolveHandle');
    expect(calls[0].url.searchParams.get('handle')).toBe('alice.example');
    expect(calls[1].url.origin).toBe('https://public.api.bsky.app');
    expect(calls[1].url.pathname).toBe('/xrpc/app.bsky.feed.getPosts');
    expect(calls[1].url.searchParams.getAll('uris')).toEqual([URI]);
    expect(calls[0].init.signal).toBe(calls[1].init.signal);
    expect(calls[0].init.redirect).toBe('error');
  });

  test.each([
    `?author=${DID}&post=3abc`,
    `?q=${encodeURIComponent(`https://bsky.app/profile/${DID}/post/3abc?foo=bar`)}`,
    `?q=${encodeURIComponent(URI)}`,
    `?q=${encodeURIComponent('https://bsky.app/profile/did%3Aplc%3Aalice/post/3abc')}`
  ])('DID references skip resolution: %s', async (query) => {
    const fetchAPI = mock((url: URL) => {
      expect(url.searchParams.get('uris')).toBe(URI);
      return Promise.resolve(postResponse());
    });
    const result = await metadata(await createRequestHandler(HTML, { fetch: fetchAPI })(request(query)));
    expect(result.description).toBe('Hello world');
    expect(fetchAPI).toHaveBeenCalledTimes(1);
  });

  test.each(['q', 'quotes'])('parses handle URLs in %s and resolves the author', async (key) => {
    const fetchAPI = mock((url: URL) => Promise.resolve(
      url.searchParams.has('handle') ? Response.json({ did: DID }) : postResponse()
    ));
    const query = new URLSearchParams({ [key]: 'https://bsky.app/profile/alice.example/post/3abc' });
    const result = await metadata(await createRequestHandler(HTML, { fetch: fetchAPI })(request(`?${query}`)));
    expect(result.description).toBe(key == 'quotes' ? 'Quotes of: "Hello world"' : 'Hello world');
    expect(result.title).toBe(key == 'quotes' ? undefined : 'Skythread • Post by @alice.example');
    expect(fetchAPI).toHaveBeenCalledTimes(2);
  });

  test.each(['q', 'quotes'])('escapes post text and author handle in %s', async (key) => {
    const text = 'A "quote" & <script>bad()</script>\r\nnext\rline\nlast\u2028end';
    const handle = 'alice\" onload=\"bad()\"><script>';
    const fetchAPI = mock(() => Promise.resolve(postResponse(text, handle)));
    const result = await metadata(await createRequestHandler(HTML, { fetch: fetchAPI })(request(`?${new URLSearchParams({ [key]: URI })}`)));
    const flattened = 'A "quote" & <script>bad()</script> next line last end';
    expect(result.description).toBe(key == 'quotes' ? `Quotes of: "${flattened}"` : flattened);
    expect(result.title).toBe(key == 'quotes' ? undefined : `Skythread • Post by @${handle}`);
    expect(result.document.querySelectorAll('[onload]')).toHaveLength(0);
    expect(result.document.querySelectorAll('meta')).toHaveLength(key == 'quotes' ? 3 : 4);
  });

  test('follows frontend route precedence and last-value-wins semantics', async () => {
    const fetchAPI = mock(() => Promise.resolve(postResponse()));
    const handle = createRequestHandler(HTML, { fetch: fetchAPI });
    const result = await metadata(await handle(request(`?q=${encodeURIComponent(URI)}&author=other&post=other&quotes=bad&hash=other&page=notif`)));
    expect(result.description).toBe('Hello world');
    expect((await metadata(await handle(request('?hash=first&hash=last&page=notif')))).description).toBe('Posts tagged with #last');
    expect(await (await handle(request('?hash=bun&hash='))).text()).toBe(NOINDEX_HTML);
  });
});

describe('fallbacks', () => {
  test.each(['?tracking=1', '?page=unknown', '?page=__proto__', '?author=alice.example', '?q=not-a-url', '?q=javascript:alert(1)', '?q=at://did:plc:alice/app.bsky.actor.profile/self', '?quotes=https://bsky.app/profile/alice.example', '?author=alice.example&post=bad/key'])('unrecognized or invalid queries return noindex HTML: %s', async (query) => {
    const fetchAPI = mock(() => Promise.reject(new Error('Unexpected API request')));
    const response = await createRequestHandler(HTML, { fetch: fetchAPI })(request(query));
    expect(await response.text()).toBe(NOINDEX_HTML);
    expect(fetchAPI).not.toHaveBeenCalled();
  });

  test.each([
    () => Promise.reject(new Error('Network failed')),
    () => Promise.resolve(new Response('Unavailable', { status: 503 })),
    () => Promise.resolve(new Response('not JSON')),
    () => Promise.resolve(Response.json(null)),
    () => Promise.resolve(Response.json({})),
    () => Promise.resolve(Response.json({ did: 'invalid' }))
  ])('resolution failures return noindex HTML', async (fetchAPI) => {
    const response = await createRequestHandler(HTML, { fetch: fetchAPI })(request('?author=alice.example&post=3abc'));
    expect(await response.text()).toBe(NOINDEX_HTML);
  });

  test.each([
    () => Promise.reject(new Error('Network failed')),
    () => Promise.resolve(new Response('Unavailable', { status: 429 })),
    () => Promise.resolve(new Response('not JSON')),
    () => Promise.resolve(Response.json(null)),
    () => Promise.resolve(Response.json({ posts: [] })),
    () => Promise.resolve(Response.json({ posts: [{}] })),
    () => Promise.resolve(Response.json({ posts: [{ author: { handle: 'alice.example' }, record: { text: 123 } }] }))
  ])('post failures return noindex HTML', async (fetchAPI) => {
    const response = await createRequestHandler(HTML, { fetch: fetchAPI })(request(`?author=${DID}&post=3abc`));
    expect(await response.text()).toBe(NOINDEX_HTML);
  });

  test('empty post text is valid', async () => {
    const response = await createRequestHandler(HTML, { fetch: () => Promise.resolve(postResponse('')) })(request(`?author=${DID}&post=3abc`));
    expect((await metadata(response)).description).toBe('');
  });

  test('missing title throws an error', () => {
    const html = HTML.replace('<title>Skythread</title>', '');
    expect(() => createRequestHandler(html)).toThrow('Invalid HTML - missing </title>');
  });

  test('missing charset throws an error', () => {
    const html = HTML.replace('<meta charset="UTF-8">', '');
    expect(() => createRequestHandler(html)).toThrow('Invalid HTML - missing <meta charset="UTF-8">');
  });

  test('a shared timeout aborts both fetches and returns noindex HTML', async () => {
    const signals: AbortSignal[] = [];
    const fetchAPI = mock((_url: URL, init: RequestInit) => {
      const signal = init.signal!;
      signals.push(signal);
      return new Promise<Response>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        if (signals.length == 1) {
          setTimeout(() => resolve(Response.json({ did: DID })), 20);
        }
      });
    });
    const started = performance.now();
    const response = await createRequestHandler(HTML, { fetch: fetchAPI, timeoutMs: 80 })(request('?author=alice.example&post=3abc'));
    expect(await response.text()).toBe(NOINDEX_HTML);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(signals).toHaveLength(2);
    expect(signals[0]).toBe(signals[1]);
    expect(signals[1].aborted).toBe(true);
  });

  test('native fetch also times out while reading a stalled response body', async () => {
    const upstream = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"posts":['));
          // Keep the JSON body open indefinitely, even after headers arrive.
        }
      }))
    });

    try {
      const started = performance.now();
      const handle = createRequestHandler(HTML, {
        fetch: (_url, init) => fetch(upstream.url, init),
        timeoutMs: 80
      });
      const response = await handle(request(`?author=${DID}&post=3abc`));
      expect(await response.text()).toBe(NOINDEX_HTML);
      expect(performance.now() - started).toBeLessThan(1000);
    } finally {
      await upstream.stop(true);
    }
  });
});
