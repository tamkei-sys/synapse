/**
 * Default in-app manual seeding (「SYNAPSE でできること」).
 *
 * Every new workspace gets the 10-page user manual tree as ordinary pages
 * (hub + children, easy-Japanese edition for IT-unfamiliar readers). Bodies
 * ride the ADR-0009 rail: the TipTap snapshot lives in `props.doc` and the
 * sync server hydrates the editable Yjs state on first open.
 *
 * `props.builtinKey = "manual:<key>"` makes seeding idempotent the same way
 * default templates work: re-running only inserts pages a workspace doesn't
 * already have, resolving parents against existing rows — so a partially
 * seeded workspace heals instead of duplicating.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { monotonicFactory } from 'ulid';

import * as schema from '@synapse/schema/db';

import type { Database } from '../db.js';
import { DEFAULT_MANUAL, type ManualPageDef } from './default-manual-content.js';

const KEY_PREFIX = 'manual:';

export async function seedDefaultManual(
  db: Database,
  workspaceId: string,
  createdBy: string,
): Promise<number> {
  const existing = await db
    .select({
      id: schema.block.id,
      key: sql<string | null>`${schema.block.props}->>'builtinKey'`,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, workspaceId),
        eq(schema.block.type, 'page'),
        sql`(${schema.block.props}->>'builtinKey') LIKE ${`${KEY_PREFIX}%`}`,
        isNull(schema.block.deletedAt),
      ),
    );
  const have = new Map(existing.map((e) => [e.key ?? '', e.id]));

  // Monotonic so sibling `position` (= id) preserves the chapter order even
  // within the same millisecond — plain ulid() only sorts across ms.
  const nextId = monotonicFactory();
  let added = 0;

  const insertTree = async (def: ManualPageDef, parentId: string | null): Promise<void> => {
    const fullKey = `${KEY_PREFIX}${def.key}`;
    let id = have.get(fullKey);
    if (!id) {
      id = nextId();
      await db.insert(schema.block).values({
        id,
        workspaceId,
        parentId,
        type: 'page',
        position: id,
        props: { title: def.title, icon: def.icon, doc: def.doc, builtinKey: fullKey },
        createdBy,
      });
      added += 1;
    }
    for (const child of def.children ?? []) {
      await insertTree(child, id);
    }
  };

  await insertTree(DEFAULT_MANUAL, null);
  return added;
}
