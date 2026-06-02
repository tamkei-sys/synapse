/**
 * Hocuspocus persistence hooks backed by Postgres.
 *
 * - `fetch`  loads the binary Yjs state for `page:<blockId>` on first
 *   client connect, or an empty buffer if the page has never been
 *   edited.
 * - `store`  saves the merged Yjs state after a quiet period, AND
 *   renders a JSON snapshot into `block.props.doc` so the regular
 *   tRPC `block.getPage` endpoint can keep serving fast, non-CRDT reads
 *   to other surfaces (search index, MCP server, REST exports).
 *
 * The snapshot step uses y-prosemirror to convert Yjs → ProseMirror JSON
 * with the same schema TipTap uses on the client.
 */
import { Database as HocuspocusDatabase } from '@hocuspocus/extension-database';
import { extractPageRefs } from '@synapse/blocks';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import type * as Y from 'yjs';

import { parseDocumentName } from './auth.js';
import { schema, type Database } from './db.js';
import { seedStateFromDoc } from './template-schema.js';

/** 自動版スナップショットの最小間隔（前回 auto 版からこの時間空けば新版を積む）。 */
const AUTO_SNAPSHOT_INTERVAL_MS = 5 * 60_000;
/** 1 ページが保持する auto 版の上限（超過分は古いものから間引く。manual は対象外）。 */
const MAX_AUTO_VERSIONS_PER_PAGE = 50;

export function createPersistenceExtension(db: Database) {
  return new HocuspocusDatabase({
    fetch: async ({ documentName }) => {
      const { blockId } = parseDocumentName(documentName);
      const [row] = await db
        .select({ state: schema.blockYjsState.state })
        .from(schema.blockYjsState)
        .where(sql`${schema.blockYjsState.blockId} = ${blockId}`)
        .limit(1);
      if (row) return row.state;

      // No stored CRDT state yet. Seed from the page's doc snapshot when it
      // has content — built-in templates and pages created from them carry a
      // `props.doc` but no Yjs state until first edit. (PBI-105)
      const [block] = await db
        .select({ props: schema.block.props })
        .from(schema.block)
        .where(eq(schema.block.id, blockId))
        .limit(1);
      const doc = (block?.props as { doc?: unknown } | null)?.doc;
      return seedStateFromDoc(doc);
    },

    store: async ({ documentName, state, document }) => {
      const { blockId } = parseDocumentName(documentName);

      // Render a JSON snapshot using the editor's default "doc" type so
      // the snapshot matches what tRPC `block.getPage` already returns.
      const snapshot = yDocToProsemirrorJSON(document as Y.Doc, 'default');

      await db.transaction(async (tx) => {
        await tx
          .insert(schema.blockYjsState)
          .values({ blockId, state, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: schema.blockYjsState.blockId,
            set: { state, updatedAt: new Date() },
          });

        await tx.execute(sql`
          UPDATE ${schema.block}
          SET
            props = jsonb_set(coalesce(props, '{}'::jsonb), '{doc}', ${JSON.stringify(snapshot)}::jsonb, true),
            version = ${schema.block.version} + 1,
            updated_at = now()
          WHERE id = ${blockId}
        `);

        // バックリンク索引 (PBI-73): 本文中の pageRef を抽出して page_link を
        // 作り直す。source 分を一旦消してから現在の参照を貼り直す。
        const [meta] = await tx
          .select({ workspaceId: schema.block.workspaceId })
          .from(schema.block)
          .where(eq(schema.block.id, blockId))
          .limit(1);
        await tx.delete(schema.pageLink).where(eq(schema.pageLink.sourceId, blockId));
        const refs = extractPageRefs(snapshot);
        if (meta && refs.length > 0) {
          // 実在する block だけを対象に（FK 違反でトランザクションが落ちないよう）。
          const existing = await tx
            .select({ id: schema.block.id })
            .from(schema.block)
            .where(inArray(schema.block.id, refs));
          const targets = existing.map((e) => e.id).filter((id) => id !== blockId);
          if (targets.length > 0) {
            await tx
              .insert(schema.pageLink)
              .values(
                targets.map((targetId) => ({
                  sourceId: blockId,
                  targetId,
                  workspaceId: meta.workspaceId,
                })),
              )
              .onConflictDoNothing();
          }
        }

        // 版スナップショット (PBI-54): 前回 auto 版から一定間隔空いていれば、現在の
        // doc を auto 版として積む。保持上限を超えた古い auto は間引く（手動版は残す）。
        // 空ドキュメント（新規ページの初回 flush 等）は版を作らない。
        const snap = snapshot as { content?: unknown[] };
        const hasContent = Array.isArray(snap.content) && snap.content.length > 0;
        if (meta && hasContent) {
          const [lastAuto] = await tx
            .select({ createdAt: schema.pageVersion.createdAt })
            .from(schema.pageVersion)
            .where(
              and(eq(schema.pageVersion.blockId, blockId), eq(schema.pageVersion.kind, 'auto')),
            )
            .orderBy(desc(schema.pageVersion.createdAt))
            .limit(1);
          const elapsed = lastAuto ? Date.now() - lastAuto.createdAt.getTime() : Infinity;
          if (elapsed >= AUTO_SNAPSHOT_INTERVAL_MS) {
            await tx.insert(schema.pageVersion).values({
              id: crypto.randomUUID(),
              blockId,
              workspaceId: meta.workspaceId,
              doc: snapshot,
              kind: 'auto',
              createdBy: null,
            });
            await tx.execute(sql`
              DELETE FROM ${schema.pageVersion}
              WHERE block_id = ${blockId} AND kind = 'auto'
                AND id NOT IN (
                  SELECT id FROM ${schema.pageVersion}
                  WHERE block_id = ${blockId} AND kind = 'auto'
                  ORDER BY created_at DESC
                  LIMIT ${MAX_AUTO_VERSIONS_PER_PAGE}
                )
            `);
          }
        }
      });
    },
  });
}
