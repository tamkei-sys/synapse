import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertSafeUrl, BlockedUrlError, fetchBookmarkMeta, parseOgMeta } from './og-fetch.js';

describe('assertSafeUrl', () => {
  it('allows public http(s) URLs', () => {
    expect(assertSafeUrl('https://example.com').href).toBe('https://example.com/');
    expect(assertSafeUrl('http://203.0.113.5/path').hostname).toBe('203.0.113.5');
    expect(assertSafeUrl('http://172.32.0.1/').hostname).toBe('172.32.0.1'); // 172.32 はパブリック
  });

  it.each([
    'http://localhost/',
    'http://foo.localhost/',
    'http://service.internal/',
    'http://printer.local/',
    'http://127.0.0.1/',
    'http://10.1.2.3/',
    'http://192.168.0.1/',
    'http://172.16.5.5/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/',
    'http://[::1]/',
    'http://0.0.0.0/',
  ])('rejects internal target %s', (url) => {
    expect(() => assertSafeUrl(url)).toThrow(BlockedUrlError);
  });

  it.each(['ftp://example.com/', 'file:///etc/passwd', 'not a url'])(
    'rejects non-http scheme / invalid %s',
    (url) => {
      expect(() => assertSafeUrl(url)).toThrow(BlockedUrlError);
    },
  );

  it('rejects javascript: scheme', () => {
    const js = 'java' + 'script:alert(1)'; // eslint no-script-url 回避のため分割
    expect(() => assertSafeUrl(js)).toThrow(BlockedUrlError);
  });
});

describe('parseOgMeta', () => {
  it('extracts og tags', () => {
    const html = `<html><head>
      <meta property="og:title" content="Hello OG">
      <meta property="og:description" content="A description here">
      <meta property="og:image" content="https://cdn.example.com/cover.png">
      <meta property="og:site_name" content="Example Site">
      <link rel="icon" href="/favicon.ico">
      <title>Doc Title</title>
    </head></html>`;
    expect(parseOgMeta(html, 'https://example.com/page')).toMatchObject({
      title: 'Hello OG',
      description: 'A description here',
      image: 'https://cdn.example.com/cover.png',
      siteName: 'Example Site',
      favicon: 'https://example.com/favicon.ico',
      url: 'https://example.com/page',
    });
  });

  it('falls back og:title -> <title> -> hostname', () => {
    expect(parseOgMeta('<title>Just Title</title>', 'https://example.com/').title).toBe('Just Title');
    expect(parseOgMeta('<html></html>', 'https://example.com/').title).toBe('example.com');
  });

  it('uses meta name=description when og is absent', () => {
    expect(parseOgMeta('<meta name="description" content="meta desc">', 'https://x.test/').description).toBe(
      'meta desc',
    );
  });

  it('absolutizes relative og:image against finalUrl', () => {
    const html = '<meta property="og:image" content="/img/c.png">';
    expect(parseOgMeta(html, 'https://example.com/a/b').image).toBe('https://example.com/img/c.png');
  });

  it('drops dangerous image scheme', () => {
    const js = 'java' + 'script:alert(1)';
    const html = `<meta property="og:image" content="${js}">`;
    expect(parseOgMeta(html, 'https://example.com/').image).toBe('');
  });

  it('decodes HTML entities', () => {
    const html = '<meta property="og:title" content="Tom &amp; Jerry &#39;s &lt;tag&gt;">';
    expect(parseOgMeta(html, 'https://example.com/').title).toBe("Tom & Jerry 's <tag>");
  });

  it('reads name= fallback and single-quoted attrs', () => {
    const html = "<meta name='og:title' content='Single Quoted'>";
    expect(parseOgMeta(html, 'https://example.com/').title).toBe('Single Quoted');
  });

  it('defaults favicon to /favicon.ico', () => {
    expect(parseOgMeta('<title>x</title>', 'https://example.com/deep/page').favicon).toBe(
      'https://example.com/favicon.ico',
    );
  });
});

describe('fetchBookmarkMeta', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses fetched HTML (ip literal skips DNS)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<meta property="og:title" content="Fetched"><title>t</title>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          }),
      ),
    );
    const meta = await fetchBookmarkMeta('http://203.0.113.5/');
    expect(meta.title).toBe('Fetched');
  });

  it('falls back on non-html content-type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('%PDF-1.4', { status: 200, headers: { 'content-type': 'application/pdf' } })),
    );
    const meta = await fetchBookmarkMeta('http://203.0.113.5/');
    expect(meta.title).toBe('203.0.113.5');
    expect(meta.url).toBe('http://203.0.113.5/');
  });

  it('falls back on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    expect((await fetchBookmarkMeta('http://203.0.113.5/')).title).toBe('203.0.113.5');
  });

  it('follows safe redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === 'http://203.0.113.5/'
          ? new Response('', { status: 301, headers: { location: 'http://203.0.113.6/final' } })
          : new Response('<title>Final Page</title>', {
              status: 200,
              headers: { 'content-type': 'text/html' },
            }),
      ),
    );
    const meta = await fetchBookmarkMeta('http://203.0.113.5/');
    expect(meta.title).toBe('Final Page');
    expect(meta.url).toBe('http://203.0.113.6/final');
  });

  it('rejects redirect to internal address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 302, headers: { location: 'http://169.254.169.254/latest/' } })),
    );
    await expect(fetchBookmarkMeta('http://203.0.113.5/')).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it('rejects internal URL before any fetch', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    await expect(fetchBookmarkMeta('http://127.0.0.1/')).rejects.toBeInstanceOf(BlockedUrlError);
    expect(spy).not.toHaveBeenCalled();
  });
});
