/**
 * 画像アップロード+貼付 MCP 煙テスト (PBI-179)。
 *
 *   1. dev DB に read + write_pbi + write_page トークンを発行
 *   2. dist/index.js を spawn
 *   3. synapse_upload_image (dataUrl)          → URL 返却 (data-url storage)
 *   4. synapse_upload_image (bytes + mime)     → URL 返却 (data-url storage)
 *   5. create_page → synapse_insert_image      → props.doc snapshot に image
 *      ノードが乗るまでポーリング
 *   6. negative: path も dataUrl も bytes もなし → INVALID
 *   7. cleanup (page trash + token revoke)
 *
 * 実行 (host から; DB 54322 / 内部API 127.0.0.1:1235 はホストへループバック):
 *   SYNC_INTERNAL_SECRET=… node apps/mcp/scripts/image-smoke.mjs
 */
import { spawn } from 'node:child_process';
import { randomUUID, webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

// host 実行時は 127.0.0.1:54322 (compose の port マップ)、コンテナ内実行時は
// DATABASE_URL を継承する (postgres:5432)。SYNC_INTERNAL_URL も同様に env で
// 切り替わるので、ホスト/コンテナどちらからでも同じスクリプトが動く。
const DB =
  process.env.DATABASE_URL ?? 'postgres://synapse:synapse@127.0.0.1:54322/synapse_dev';
const WORKSPACE = '01KSRDNCK75Z5QDTGWYTY7JMSF';
const USER = 'v1irxoxDMgHmWar8LwK7oZo9Bcx0tjJp';
const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, '..', 'dist', 'index.js');

// 1x1 transparent PNG — the smallest valid PNG byte sequence.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;

const PREFIX = 'synapse_';
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
function genToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = 0,
    value = 0,
    out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return PREFIX + out;
}
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function rpcClient(child) {
  let buf = '';
  const waiters = new Map();
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id != null && waiters.has(msg.id)) {
        waiters.get(msg.id)(msg);
        waiters.delete(msg.id);
      }
    }
  });
  return (method, params) => {
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout: ' + method)), 10_000);
      waiters.set(id, (m) => {
        clearTimeout(t);
        resolve(m);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  };
}
const j = (r) => {
  try {
    return JSON.parse(r.result?.content?.[0]?.text ?? '{}');
  } catch {
    return {};
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();

  const plaintext = genToken();
  const hash = await sha256Hex(plaintext);
  const tokenId = randomUUID();
  await client.query(
    `insert into api_token (id, workspace_id, user_id, token_hash, suffix, label, scopes, created_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())`,
    [
      tokenId,
      WORKSPACE,
      USER,
      hash,
      plaintext.slice(-8),
      'mcp-image-smoke',
      ['read', 'write_pbi', 'write_page'],
    ],
  );
  console.log(`[smoke] issued read+write_pbi+write_page token …${plaintext.slice(-4)}`);

  const child = spawn('node', [DIST], {
    env: {
      ...process.env,
      DATABASE_URL: DB,
      SYNAPSE_API_TOKEN: plaintext,
      SYNC_INTERNAL_URL: process.env.SYNC_INTERNAL_URL ?? 'http://127.0.0.1:1235',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (d) => process.stderr.write('[mcp] ' + d));
  const rpc = rpcClient(child);

  let pass = true;
  const check = (cond, label) => {
    console.log('  ' + (cond ? 'PASS' : 'FAIL') + '  ' + label);
    if (!cond) pass = false;
  };
  const callJson = async (name, args) => {
    const r = await rpc('tools/call', { name, arguments: args });
    return {
      isError: Boolean(r.result?.isError),
      data: j(r),
      raw: r.result?.content?.[0]?.text,
    };
  };

  let pageId;
  try {
    await rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'image-smoke', version: '0' },
    });
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n',
    );

    // -- upload_image (dataUrl) ------------------------------------------------
    const uploadedDataUrl = await callJson('synapse_upload_image', {
      dataUrl: PNG_DATA_URL,
      filename: 'pixel.png',
    });
    check(
      !uploadedDataUrl.isError &&
        typeof uploadedDataUrl.data?.url === 'string' &&
        uploadedDataUrl.data.url.startsWith('data:image/png;base64,'),
      `upload_image (dataUrl) → data:URL (${uploadedDataUrl.data?.storage})`,
    );

    // -- upload_image (bytes + mime) ------------------------------------------
    const uploadedBytes = await callJson('synapse_upload_image', {
      bytes: PNG_BASE64,
      mime: 'image/png',
      filename: 'pixel-bytes.png',
    });
    check(
      !uploadedBytes.isError &&
        typeof uploadedBytes.data?.url === 'string' &&
        uploadedBytes.data.url.startsWith('data:image/png;base64,'),
      `upload_image (bytes+mime) → data:URL (${uploadedBytes.data?.storage})`,
    );

    // -- create_page + insert_image (dataUrl) ---------------------------------
    const page = (await callJson('synapse_create_page', { title: 'smoke image page' })).data;
    pageId = page.id;
    check(!!pageId, 'create_page returns an id');

    const inserted = await callJson('synapse_insert_image', {
      blockId: pageId,
      dataUrl: PNG_DATA_URL,
      alt: 'inserted-smoke-marker',
      filename: 'pixel.png',
    });
    check(
      !inserted.isError && inserted.data?.appended === true && typeof inserted.data?.url === 'string',
      `insert_image returned appended:true (${inserted.raw})`,
    );

    // props.doc snapshot に image ノードが乗るまでポーリング (store hook の debounce 後)
    let snap = '';
    for (let i = 0; i < 12; i++) {
      await sleep(1000);
      const { rows } = await client.query(`select props->'doc' as doc from block where id = $1`, [
        pageId,
      ]);
      snap = JSON.stringify(rows[0]?.doc ?? {});
      if (snap.includes('"image"') && snap.includes('inserted-smoke-marker')) break;
    }
    check(
      snap.includes('"image"'),
      'props.doc snapshot contains an image node',
    );
    check(
      snap.includes('inserted-smoke-marker'),
      'props.doc snapshot carries the alt attribute',
    );
    check(
      snap.includes('"src":"data:image/png;base64,'),
      'props.doc snapshot keeps the data:image src verbatim',
    );

    // -- negative: no payload -------------------------------------------------
    const empty = await callJson('synapse_upload_image', {});
    check(empty.isError, 'upload_image with no payload errors (INVALID)');

    // -- negative: bytes without mime ----------------------------------------
    const orphanBytes = await callJson('synapse_upload_image', {
      bytes: PNG_BASE64,
      // mime intentionally omitted — schema-level refine passes (exactly one
      // of path/dataUrl/bytes is present), but normalize step demands mime.
    });
    check(orphanBytes.isError, 'upload_image (bytes without mime) errors');

    console.log('[smoke] RESULT: ' + (pass ? 'PASS ✅' : 'FAIL ❌'));
  } finally {
    if (pageId) {
      await rpc('tools/call', { name: 'synapse_trash_page', arguments: { pageId } }).catch(
        () => {},
      );
      console.log('[smoke] trashed smoke page (cleanup)');
    }
    child.kill();
    await client.query('update api_token set revoked_at = now() where id = $1', [tokenId]);
    console.log('[smoke] token revoked (cleanup done)');
    await client.end();
    if (!pass) process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('[smoke] fatal:', e.message);
  process.exit(1);
});
