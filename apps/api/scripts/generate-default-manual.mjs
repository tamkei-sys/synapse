/**
 * Regenerate src/lib/default-manual-content.ts from a JSON dump of the dev
 * workspace's manual page tree (「SYNAPSE でできること」).
 *
 * 1. Dump the tree (host, dev stack running):
 *
 *    docker exec synapse-dev-postgres-1 psql -U synapse -d synapse_dev -tAc "
 *      WITH RECURSIVE tree AS (
 *        SELECT id, parent_id, type, position, props, 0 AS depth
 *          FROM block WHERE id='01KT5DTBXMQW7VF5JN0NBJEWFG' AND deleted_at IS NULL
 *        UNION ALL
 *        SELECT b.id, b.parent_id, b.type, b.position, b.props, t.depth+1
 *          FROM block b JOIN tree t ON b.parent_id=t.id WHERE b.deleted_at IS NULL)
 *      SELECT json_agg(json_build_object('id', id, 'parent_id', parent_id,
 *        'type', type, 'position', position, 'props', props)) FROM tree;
 *    " > /tmp/manual-tree.json
 *
 * 2. node apps/api/scripts/generate-default-manual.mjs /tmp/manual-tree.json
 *
 * Sanitises the dump so the sync seeder (apps/sync template-schema, ADR-0009)
 * can hydrate every page:
 *   - flowBlock nodes -> italic placeholder paragraph (custom node, unseedable)
 *   - comment marks   -> stripped (their threads don't exist in a fresh WS)
 * Fails hard if any other unsupported node/mark survives sanitising.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HUB_ID = '01KT5DTBXMQW7VF5JN0NBJEWFG';

// Stable seed keys per source page id; unknown ids (future manual additions)
// fall back to a title slug with a warning so regeneration never silently
// reshuffles keys.
const KEYS = {
  [HUB_ID]: 'hub',
  '01KT8H52AGE7ZVAPBJDV87CSAG': 'getting-started',
  '01KT8H54AVPJTWZSKD6F8YWVW6': 'docs-editor',
  '01KT8H6YMDVSVKS46QGCABHP24': 'slash-commands',
  '01KT8H6ZWTEPCGJ02CN2P1VQ6X': 'page-ops',
  '01KT8H56T6J7G6F0A2Y5M2CYAC': 'project-management',
  '01KT8H5974BWFGVCD82DT37GHW': 'spreadsheet',
  '01KT8H5AHXV7WR1WP92ASXST7D': 'database',
  '01KT8H5CTQ0ZGCPFAKEYHKXVR7': 'ai-assist',
  '01KT8H5EPV4KPVR3NEJAF0MD7Q': 'github',
  '01KT8H5GSH6C73DJ5JEZXNJK6W': 'claude-code-mcp',
  '01KT8H5JE2QC5WTN8G72XT5TTH': 'collaboration',
};

// What apps/sync/src/template-schema.ts (StarterKit + task list + table) can
// encode. Keep in sync with default-manual.test.ts.
const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'blockquote',
  'codeBlock',
  'hardBreak',
  'horizontalRule',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
]);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'strike', 'code']);

const FLOW_PLACEHOLDER = {
  type: 'paragraph',
  content: [
    {
      type: 'text',
      marks: [{ type: 'italic' }],
      text: '※ ここには Flow ブロック（実行順つきノードグラフ）のライブ例が入ります。エディタで「/flow」と入力すると挿入できます。',
    },
  ],
};

function sanitize(node) {
  if (node && node.type === 'flowBlock') return FLOW_PLACEHOLDER;
  if (!node || typeof node !== 'object') return node;
  const out = { ...node };
  if (Array.isArray(out.marks)) {
    out.marks = out.marks.filter((m) => m.type !== 'comment');
    if (out.marks.length === 0) delete out.marks;
  }
  if (Array.isArray(out.content)) out.content = out.content.map(sanitize);
  return out;
}

function verify(node, path) {
  if (!node || typeof node !== 'object') return;
  if (node.type && !ALLOWED_NODES.has(node.type)) {
    throw new Error(`unsupported node "${node.type}" at ${path}`);
  }
  for (const m of node.marks ?? []) {
    if (!ALLOWED_MARKS.has(m.type)) throw new Error(`unsupported mark "${m.type}" at ${path}`);
  }
  (node.content ?? []).forEach((c, i) => verify(c, `${path}.${i}`));
}

const input = process.argv[2] ?? '/tmp/manual-tree.json';
const rows = JSON.parse(readFileSync(input, 'utf8')).filter((r) => r.type === 'page');

const byParent = new Map();
for (const r of rows) {
  const list = byParent.get(r.parent_id) ?? [];
  list.push(r);
  byParent.set(r.parent_id, list);
}

function toDef(row) {
  const key =
    KEYS[row.id] ??
    (() => {
      const slug =
        String(row.props.title ?? row.id)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || row.id.toLowerCase();
      console.warn(`WARN: no stable key for ${row.id} (${row.props.title}); using "${slug}"`);
      return slug;
    })();
  const doc = sanitize(row.props.doc);
  verify(doc, key);
  const children = (byParent.get(row.id) ?? [])
    .sort((a, b) => (a.position < b.position ? -1 : 1))
    .map(toDef);
  return {
    key,
    title: String(row.props.title ?? ''),
    icon: String(row.props.icon ?? '📄'),
    doc,
    ...(children.length > 0 ? { children } : {}),
  };
}

const hub = rows.find((r) => r.id === HUB_ID);
if (!hub) throw new Error(`hub page ${HUB_ID} not found in ${input}`);
const tree = toDef(hub);

const count = (d) => 1 + (d.children ?? []).reduce((n, c) => n + count(c), 0);

const header = `/**
 * AUTO-GENERATED — do not hand-edit (regenerate via
 * apps/api/scripts/generate-default-manual.mjs, source of truth is the dev
 * workspace manual tree under page ${HUB_ID}).
 *
 * In-app user manual (「SYNAPSE でできること」) seeded into every new
 * workspace by seedDefaultManual (see default-manual.ts / ADR-0009).
 */
import type { PageDoc } from './page-doc.js';

export type ManualPageDef = {
  key: string;
  title: string;
  icon: string;
  doc: PageDoc;
  children?: ManualPageDef[];
};

export const DEFAULT_MANUAL: ManualPageDef = `;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../src/lib/default-manual-content.ts');
writeFileSync(outPath, `${header}${JSON.stringify(tree, null, 2)};\n`);
console.log(`wrote ${outPath} (${count(tree)} pages)`);
