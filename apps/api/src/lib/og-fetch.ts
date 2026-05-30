/**
 * Web bookmark の OG メタ取得 (PBI-42)。
 *
 * 任意 URL を受け取り、サーバ側で HTML を取得して Open Graph / 基本メタ
 * (title / description / image / favicon / siteName) を抽出する。bookmark
 * ブロックのカード表示に使う。ブラウザから直接 fetch しない理由は二つ:
 *   ① CORS — 他サイトの HTML はブラウザから読めない
 *   ② SSRF — 取得先の検証はサーバの信頼境界で行う必要がある
 *
 * セキュリティ (SSRF 対策):
 *   - http(s) スキームのみ許可
 *   - ホスト名 / IP リテラルが内部レンジ (loopback / private / link-local /
 *     metadata 169.254.169.254 等) なら拒否
 *   - Node 環境では DNS 解決して解決先 IP も検証 (Workers では skip)
 *   - リダイレクトは手動追跡し各ホップで再検証 (最大 3)
 *   - タイムアウト (6s) / レスポンスサイズ上限 (512KB) / Content-Type 検証
 *
 * SSRF 違反は BlockedUrlError を throw、到達不能・タイムアウト・パース失敗は
 * 「title = ホスト名」の最小カード (fallback) を返す。これが dev / 本番共通の
 * seam — 本番で取得方針を変えるならこのファイルだけ差し替える。
 */

const TIMEOUT_MS = 6000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const MAX_TITLE = 300;
const MAX_DESC = 500;

export type BookmarkMeta = {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
};

/** SSRF 違反 (内部アドレス / 非対応スキーム / 不正 URL) を表す。fallback せず拒否する。 */
export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

// ---- SSRF guards ---------------------------------------------------------

const BLOCKED_HOSTNAMES = new Set<string>([
  'localhost',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
]);

function isBlockedHostname(host: string): boolean {
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  return host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal');
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
}

function isBlockedIpv4(ip: string): boolean {
  const octets = ip.split('.').map((n) => Number(n));
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // 不正な v4 は安全側で拒否
  }
  const [a, b, c] = octets;
  if (a === undefined || b === undefined || c === undefined) return true;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const h = ip.toLowerCase();
  if (h === '::1' || h === '::') return true; // loopback / unspecified
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(h)) return true; // fc00::/7 unique-local
  return false;
}

function isBlockedIp(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped?.[1]) return isBlockedIpv4(mapped[1]);
  if (h.includes(':')) return isBlockedIpv6(h);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return isBlockedIpv4(h);
  return false;
}

/**
 * URL を検証して安全な URL オブジェクトを返す。http(s) 以外・内部ホスト・
 * 内部 IP リテラルは BlockedUrlError を throw する (同期)。
 */
export function assertSafeUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new BlockedUrlError('URL の形式が不正です');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new BlockedUrlError('http / https のみ取得できます');
  }
  const host = u.hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (!host) throw new BlockedUrlError('ホスト名がありません');
  if (isBlockedHostname(host)) throw new BlockedUrlError('内部ホストは取得できません');
  if (isIpLiteral(host) && isBlockedIp(host)) {
    throw new BlockedUrlError('内部アドレスは取得できません');
  }
  return u;
}

/**
 * ホスト名を DNS 解決し、解決先 IP が内部レンジなら拒否する。Node 環境専用 —
 * node:dns が無い (Cloudflare Workers) / 解決できない場合は skip し fetch に委ねる。
 */
async function assertResolvedHostSafe(host: string): Promise<void> {
  const h = host.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (isIpLiteral(h)) return; // リテラルは assertSafeUrl で検証済み
  try {
    const dns = await import('node:dns/promises');
    const records = await dns.lookup(h, { all: true });
    for (const rec of records) {
      if (isBlockedIp(rec.address)) {
        throw new BlockedUrlError('内部アドレスへ解決される URL は取得できません');
      }
    }
  } catch (err) {
    if (err instanceof BlockedUrlError) throw err;
    // node:dns 不在 (Workers) / 名前解決失敗 → スキップ (fetch 側で失敗すれば fallback)
  }
}

// ---- HTML meta parsing ---------------------------------------------------

function safeFromCodePoint(cp: number): string {
  try {
    return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
  } catch {
    return '';
  }
}

/** よく使う HTML エンティティをデコードする (&amp; は二重デコードを避け最後に処理)。 */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => safeFromCodePoint(Number(dec)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');
}

/** タグ文字列から属性値を取り出す (二重引用符 / 一重引用符 / 無引用に対応)。 */
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? '';
}

/** value を base から絶対 URL 化する。http(s) でなければ '' (危険スキーム除去)。 */
function absolutize(value: string, base: string): string {
  try {
    const u = new URL(value.trim(), base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}

function clip(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? t.slice(0, n) : t;
}

/** HTML 文字列から OG / 基本メタを抽出する。純粋関数 (テスト対象)。 */
export function parseOgMeta(html: string, finalUrl: string): BookmarkMeta {
  let hostname = '';
  try {
    hostname = new URL(finalUrl).hostname.replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  // <meta property|name="..." content="..."> を収集 (先勝ち)。
  const metaMap = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, 'property') ?? attr(tag, 'name') ?? '').toLowerCase();
    if (!key) continue;
    const content = attr(tag, 'content');
    if (content === null) continue;
    if (!metaMap.has(key)) metaMap.set(key, decodeEntities(content));
  }

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const docTitle = titleTag?.[1] ? decodeEntities(titleTag[1]) : '';

  const title = clip(metaMap.get('og:title') || docTitle || hostname, MAX_TITLE);
  const description = clip(metaMap.get('og:description') || metaMap.get('description') || '', MAX_DESC);
  const rawImage = metaMap.get('og:image') || metaMap.get('og:image:url') || '';
  const image = rawImage ? absolutize(rawImage, finalUrl) : '';
  const siteName = clip(metaMap.get('og:site_name') || hostname, MAX_TITLE);

  let favicon = '';
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, 'rel') ?? '').toLowerCase();
    if (!rel.includes('icon')) continue;
    const href = attr(tag, 'href');
    if (href) {
      favicon = absolutize(href, finalUrl);
      if (favicon) break;
    }
  }
  if (!favicon) favicon = absolutize('/favicon.ico', finalUrl);

  return { url: finalUrl, title, description, image, favicon, siteName };
}

// ---- fetch orchestration -------------------------------------------------

function fallback(u: URL): BookmarkMeta {
  const host = u.hostname.replace(/^www\./, '');
  return {
    url: u.href,
    title: host,
    description: '',
    image: '',
    favicon: absolutize('/favicon.ico', u.href),
    siteName: host,
  };
}

async function fetchOnce(u: URL): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(u.href, {
      method: 'GET',
      redirect: 'manual',
      signal: ac.signal,
      headers: {
        'user-agent': 'SynapseBot/1.0 (+https://synapse.app bookmark preview)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readLimitedText(res: Response): Promise<string> {
  const body = res.body;
  if (!body) return (await res.text()).slice(0, MAX_BYTES);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
      if (total >= MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder('utf-8').decode(merged);
}

async function fetchLoop(start: URL): Promise<BookmarkMeta> {
  let current = start;
  await assertResolvedHostSafe(current.hostname);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchOnce(current);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return fallback(current);
      current = assertSafeUrl(new URL(loc, current).href);
      await assertResolvedHostSafe(current.hostname);
      continue;
    }
    if (!res.ok) return fallback(current);
    const ctype = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml\+xml/i.test(ctype)) return fallback(current);
    const html = await readLimitedText(res);
    return parseOgMeta(html, current.href);
  }
  return fallback(current);
}

/**
 * URL の bookmark メタを取得する。SSRF 違反は BlockedUrlError を throw、
 * 到達不能・タイムアウト・パース失敗は fallback カードを返す。
 */
export async function fetchBookmarkMeta(rawUrl: string): Promise<BookmarkMeta> {
  const start = assertSafeUrl(rawUrl); // BlockedUrlError は呼び出し側へ伝播
  try {
    return await fetchLoop(start);
  } catch (err) {
    if (err instanceof BlockedUrlError) throw err; // リダイレクト先が内部 → 拒否
    return fallback(start); // ネットワーク / タイムアウト / パース失敗
  }
}
