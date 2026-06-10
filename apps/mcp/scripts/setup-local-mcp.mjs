/**
 * ローカル実接続セットアップ（使い捨て）。
 *
 * 接続用の API トークンを 1 本発行し（接続中は revoke しない）、リポジトリ直下の
 * .mcp.json を生成する。.mcp.json は .gitignore 済みなのでコミットされない。
 * 平文トークンは .mcp.json にのみ書き込み、標準出力には suffix だけ出す。
 *
 * doc body ツール（synapse_set_doc / synapse_append_doc, ADR-0011）用に
 * SYNC_INTERNAL_URL / SYNC_INTERNAL_SECRET も書き込む。secret は生成時に
 * .devcontainer/docker-compose.yml（services.dev.environment）から読む。
 * 値はハードコードせず、ログにも一切出さない。見つからない場合は警告して
 * この 2 変数だけ省略する（doc body ツール以外は影響なし）。
 *
 * 生成先（.mcp.json をどこで使うか）は --host / --container で指定できる。
 * 省略時は実行環境を自動判定（dev コンテナ内なら container、それ以外は host）。
 *   host      … MCP サーバーをホストで spawn する想定。1235/54322 のループバック
 *               マップ経由で sync / postgres に届く。
 *   container … dev コンテナ内の cc 用。サービス名 DNS と localhost:1235 を使い、
 *               dist パスは固定の /workspace 配下になる。
 */
import { randomUUID, webcrypto as crypto } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(here, '..', '..', '..');
const MCP_JSON = path.join(REPO, '.mcp.json');
const COMPOSE_YML = path.join(REPO, '.devcontainer', 'docker-compose.yml');

const HOST_DB = 'postgres://synapse:synapse@127.0.0.1:54322/synapse_dev';
const CONTAINER_DB = 'postgres://synapse:synapse@postgres:5432/synapse_dev';
const HOST_SYNC_URL = 'http://127.0.0.1:1235';
const CONTAINER_SYNC_URL = 'http://localhost:1235';
// compose が ..:/workspace を bind-mount するため、コンテナ内のリポジトリ位置は固定。
const CONTAINER_REPO = '/workspace';

const WORKSPACE = '01KSRDNCK75Z5QDTGWYTY7JMSF';
const USER = 'v1irxoxDMgHmWar8LwK7oZo9Bcx0tjJp';

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

/**
 * compose の environment から SYNC_INTERNAL_SECRET の値を取り出す。
 * 依存を増やさないため YAML パーサではなく行スキャン。コメント行は無視し、
 * 異なる値が複数見つかったら推測せず null（呼び出し側が警告して省略）。
 * 値は返すだけで、ここでも呼び出し側でもログには出さない。
 */
function readSyncInternalSecret(composePath) {
  let text;
  try {
    text = readFileSync(composePath, 'utf8');
  } catch {
    return null;
  }
  const found = [];
  for (const line of text.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*SYNC_INTERNAL_SECRET:\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    const quoted = v.match(/^(['"])(.*)\1$/);
    v = quoted ? quoted[2] : v.replace(/\s+#.*$/, '').trim();
    if (v) found.push(v);
  }
  if (found.length === 0 || new Set(found).size > 1) return null;
  return found[0];
}

const runsInContainer = existsSync('/.dockerenv') || existsSync('/run/.containerenv');
const argv = process.argv.slice(2);
const target = argv.includes('--container') ? 'container'
  : argv.includes('--host') ? 'host'
  : runsInContainer ? 'container' : 'host';

async function main() {
  if (target === 'host' && runsInContainer) {
    // コンテナ内からはホスト側のリポジトリ絶対パスが分からず args が組めない。
    console.error('[setup] --host はコンテナ内からは生成できません。ホスト側で実行してください。');
    process.exit(1);
  }

  const secret = readSyncInternalSecret(COMPOSE_YML);

  // スクリプト自身の DB 接続先は「実行している場所」基準（生成先とは独立）。
  const client = new pg.Client({ connectionString: runsInContainer ? CONTAINER_DB : HOST_DB });
  await client.connect();

  // 既存の同ラベル（接続用）を revoke してから新規発行（重複を残さない）。
  await client.query(
    `update api_token set revoked_at = now() where label = $1 and revoked_at is null`,
    ['local-claude-code'],
  );

  const plaintext = genToken();
  const hash = await sha256Hex(plaintext);
  const tokenId = randomUUID();
  await client.query(
    `insert into api_token (id, workspace_id, user_id, token_hash, suffix, label, scopes, created_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())`,
    [tokenId, WORKSPACE, USER, hash, plaintext.slice(-8), 'local-claude-code', ['read', 'write']],
  );
  await client.end();

  const repoForTarget = target === 'container' ? CONTAINER_REPO : REPO;
  const env = {
    DATABASE_URL: target === 'container' ? CONTAINER_DB : HOST_DB,
    SYNAPSE_API_TOKEN: plaintext,
  };
  if (secret) {
    env.SYNC_INTERNAL_URL = target === 'container' ? CONTAINER_SYNC_URL : HOST_SYNC_URL;
    env.SYNC_INTERNAL_SECRET = secret;
  }
  const config = {
    mcpServers: {
      synapse: {
        type: 'stdio',
        command: 'node',
        args: [path.posix.join(repoForTarget, 'apps', 'mcp', 'dist', 'index.js')],
        env,
      },
    },
  };
  writeFileSync(MCP_JSON, JSON.stringify(config, null, 2) + '\n');

  console.log(`[setup] target: ${target}${argv.includes('--container') || argv.includes('--host') ? '' : ' (auto-detected — --host / --container で上書き可)'}`);
  console.log(`[setup] token issued (…${plaintext.slice(-4)}, id ${tokenId}, scopes read+write)`);
  if (secret) {
    console.log(`[setup] doc body tools configured: SYNC_INTERNAL_URL=${env.SYNC_INTERNAL_URL}, SYNC_INTERNAL_SECRET は ${path.relative(REPO, COMPOSE_YML)} から取得（値は表示しない）`);
  } else {
    console.warn(`[setup] WARNING: ${path.relative(REPO, COMPOSE_YML)} から SYNC_INTERNAL_SECRET を特定できませんでした — synapse_set_doc / synapse_append_doc は "not configured" のままです`);
  }
  console.log(`[setup] wrote ${MCP_JSON} (gitignored)`);
  console.log('[setup] next: run /mcp in Claude Code and approve "synapse"');
}

main().catch((e) => { console.error('[setup] fatal:', e.message); process.exit(1); });
