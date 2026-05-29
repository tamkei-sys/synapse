/**
 * ロードマップ進行 helper (dev only).
 *
 *   node apps/api/scripts/roadmap-helper.mjs pbi-status PBI-26 in_progress
 *   node apps/api/scripts/roadmap-helper.mjs sbi-create <pbiBlockId> "タイトル" [estimateHours]
 *   node apps/api/scripts/roadmap-helper.mjs sbi-status <sbiBlockId> done
 *   node apps/api/scripts/roadmap-helper.mjs list-sbi <pbiBlockId>
 *
 * dev compose で立ち上がる Postgres にしか繋がない。本番では絶対に
 * 使わない（DB URL ハードコード）。CLAUDE.md §1 のシークレット規約に
 * 引っかからないように .dev.vars は読まない。
 */
import pg from 'pg';
import { ulid } from 'ulid';

const DB = 'postgres://synapse:synapse@127.0.0.1:54322/synapse_dev';

const [cmd, ...rest] = process.argv.slice(2);

const client = new pg.Client({ connectionString: DB });
await client.connect();

async function findPbiByNumber(label) {
  const num = label.replace(/^PBI-/i, '');
  const r = await client.query(
    `SELECT id, workspace_id, props FROM block WHERE type='pbi' AND props->>'number'=$1 LIMIT 1`,
    [num],
  );
  if (r.rows.length === 0) throw new Error(`PBI ${label} not found`);
  return r.rows[0];
}

async function setStatus(blockId, type, status) {
  const r = await client.query(
    `UPDATE block SET props = jsonb_set(props, '{status}', to_jsonb($1::text)), updated_at = now() WHERE id=$2 AND type=$3 RETURNING id, props->>'status' s`,
    [status, blockId, type],
  );
  return r.rows[0];
}

async function nextSequence(workspaceId, kind) {
  // human-id.ts に合わせる: next_id=2 で insert, on conflict は +1 して返す。
  // allocated = returned next_id - 1.
  const r = await client.query(
    `INSERT INTO entity_sequence (workspace_id, kind, next_id) VALUES ($1, $2, 2)
     ON CONFLICT (workspace_id, kind) DO UPDATE SET next_id = entity_sequence.next_id + 1, updated_at = now()
     RETURNING next_id - 1 AS n`,
    [workspaceId, kind],
  );
  return Number(r.rows[0].n);
}

async function createSbi(pbiBlockId, title, estimateHours) {
  const pbi = (
    await client.query(
      `SELECT id, workspace_id, created_by FROM block WHERE id=$1 AND type='pbi'`,
      [pbiBlockId],
    )
  ).rows[0];
  if (!pbi) throw new Error('parent PBI not found');
  const number = await nextSequence(pbi.workspace_id, 'sbi');
  const sbiId = ulid();
  const props = {
    title,
    status: 'todo',
    pbiId: pbiBlockId,
    number,
  };
  if (typeof estimateHours === 'number' && Number.isFinite(estimateHours)) {
    props.estimateHours = estimateHours;
  }
  // 位置は最後尾。ulid を使うとデフォルトで時系列で並ぶので position も ulid。
  await client.query(
    `INSERT INTO block (id, workspace_id, type, parent_id, position, props, created_by, created_at, updated_at)
     VALUES ($1, $2, 'sbi', $3, $4, $5, $6, now(), now())`,
    [sbiId, pbi.workspace_id, pbiBlockId, ulid(), props, pbi.created_by],
  );
  return { id: sbiId, number };
}

async function listSbis(pbiBlockId) {
  const r = await client.query(
    `SELECT id, props->>'number' n, props->>'title' t, props->>'status' s FROM block WHERE type='sbi' AND parent_id=$1 ORDER BY (props->>'number')::int`,
    [pbiBlockId],
  );
  return r.rows;
}

try {
  switch (cmd) {
    case 'pbi-status': {
      const [label, status] = rest;
      const pbi = await findPbiByNumber(label);
      const r = await setStatus(pbi.id, 'pbi', status);
      console.log(`OK ${label} (${pbi.id}) -> ${r.s}`);
      break;
    }
    case 'sbi-create': {
      const [pbiId, title, estStr] = rest;
      const est = estStr ? Number(estStr) : undefined;
      const r = await createSbi(pbiId, title, est);
      console.log(`OK SBI-${r.number} ${r.id} "${title}"`);
      break;
    }
    case 'sbi-status': {
      const [sbiId, status] = rest;
      const r = await setStatus(sbiId, 'sbi', status);
      console.log(`OK ${sbiId} -> ${r.s}`);
      break;
    }
    case 'list-sbi': {
      const [pbiId] = rest;
      const rows = await listSbis(pbiId);
      for (const row of rows) console.log(`SBI-${row.n} ${row.id} [${row.s}] ${row.t}`);
      break;
    }
    case 'lookup-pbi': {
      const [label] = rest;
      const r = await findPbiByNumber(label);
      console.log(`${r.id} ws=${r.workspace_id} status=${r.props.status}`);
      break;
    }
    default:
      console.error('unknown cmd:', cmd);
      process.exitCode = 1;
  }
} finally {
  await client.end();
}
