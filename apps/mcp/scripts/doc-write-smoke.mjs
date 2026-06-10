/**
 * 本文書込（ADR-0011）ホスト側 E2E 煙テスト（使い捨て）。
 *
 * デスクトップアプリ / cc の MCP 設定と同一の env（host DATABASE_URL +
 * SYNC_INTERNAL_URL=http://127.0.0.1:1235 + compose のシークレット）で
 * dist/index.js をホストから spawn し、
 *   1. dev DB に read+write_page スコープのテストトークンを発行
 *   2. create_page → append_doc → block.props.doc 反映を DB でポーリング確認
 *   3. trash_page で後始末（ソフト削除・復元可）
 *   4. トークン revoke
 * シークレット値はログに出さない（compose から読むだけ）。
 */
import { spawn } from 'node:child_process';
import { randomUUID, webcrypto as crypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const DB = 'postgres://synapse:synapse@127.0.0.1:54322/synapse_dev';
const WORKSPACE = '01KSRDNCK75Z5QDTGWYTY7JMSF';
const USER = 'v1irxoxDMgHmWar8LwK7oZo9Bcx0tjJp';
const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, '..', 'dist', 'index.js');
const COMPOSE_YML = path.join(here, '..', '..', '..', '.devcontainer', 'docker-compose.yml');
const MARKER = 'host-to-1235 E2E OK 2026-06-10';

function readSyncSecret() {
  for (const line of readFileSync(COMPOSE_YML, 'utf8').split('\n')) {
    const m = line.match(/^\s*SYNC_INTERNAL_SECRET:\s*(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error('SYNC_INTERNAL_SECRET not found in compose file');
}

const PREFIX = 'synapse_';
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
function genToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >> (bits - 5)) & 31]; bits -= 5; }
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
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id != null && waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id); }
    }
  });
  return (method, params, timeoutMs = 15000) => {
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout: ' + method)), timeoutMs);
      waiters.set(id, (m) => { clearTimeout(t); resolve(m); });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  };
}
const j = (r) => {
  try { return JSON.parse(r.result?.content?.[0]?.text ?? '{}'); } catch { return {}; }
};
const errText = (r) =>
  r.result?.isError ? (r.result?.content?.[0]?.text ?? 'unknown tool error') : null;

async function main() {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();

  const plaintext = genToken();
  const hash = await sha256Hex(plaintext);
  const tokenId = randomUUID();
  await client.query(
    `insert into api_token (id, workspace_id, user_id, token_hash, suffix, label, scopes, created_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())`,
    [tokenId, WORKSPACE, USER, hash, plaintext.slice(-8), 'mcp-doc-write-smoke', ['read', 'write_page']],
  );
  console.log(`[smoke] issued read+write_page token …${plaintext.slice(-4)}`);

  // デスクトップアプリの設定と同じ env 構成（シークレットは compose から）。
  const child = spawn('node', [DIST], {
    env: {
      ...process.env,
      DATABASE_URL: DB,
      SYNAPSE_API_TOKEN: plaintext,
      SYNC_INTERNAL_URL: 'http://127.0.0.1:1235',
      SYNC_INTERNAL_SECRET: readSyncSecret(),
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

  let pageId;
  try {
    await rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'doc-write-smoke', version: '0' },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

    const names = ((await rpc('tools/list', {})).result?.tools ?? []).map((t) => t.name);
    check(
      ['synapse_append_doc', 'synapse_set_doc'].every((n) => names.includes(n)),
      'tools/list exposes append_doc / set_doc',
    );

    const created = j(await rpc('tools/call', {
      name: 'synapse_create_page',
      arguments: { title: 'MCP doc-write smoke 2026-06-10' },
    }));
    pageId = created.id;
    check(!!pageId, `create_page returns an id (${pageId ?? 'none'})`);

    const appendRes = await rpc('tools/call', {
      name: 'synapse_append_doc',
      arguments: { pageId, markdown: `## Doc-write smoke\n\n${MARKER}` },
    });
    const appendErr = errText(appendRes);
    check(!appendErr, `append_doc succeeds${appendErr ? ` (got: ${appendErr.slice(0, 120)})` : ''}`);

    // props.doc スナップショットへの反映（persistence.store 経由）をポーリング。
    let reflected = false;
    for (let i = 0; i < 20 && !reflected; i++) {
      const { rows } = await client.query('select props from block where id = $1', [pageId]);
      reflected = JSON.stringify(rows[0]?.props ?? {}).includes(MARKER);
      if (!reflected) await new Promise((r) => setTimeout(r, 500));
    }
    check(reflected, 'block.props.doc reflects the appended markdown');

    const trashed = await rpc('tools/call', { name: 'synapse_trash_page', arguments: { pageId } });
    check(!errText(trashed), 'trash_page cleans up the scratch page');

    console.log('[smoke] RESULT: ' + (pass ? 'PASS ✅' : 'FAIL ❌'));
  } finally {
    child.kill();
    await client.query('update api_token set revoked_at = now() where id = $1', [tokenId]);
    console.log('[smoke] token revoked (cleanup done)');
    await client.end();
    if (!pass) process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('[smoke] FATAL', e);
  process.exit(1);
});
