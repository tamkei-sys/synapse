/**
 * Allocate the next human-readable id for a workspace + entity kind.
 *
 * Atomic via a single INSERT ... ON CONFLICT DO UPDATE ... RETURNING.
 * Postgres serializes the upsert; concurrent allocations interleave
 * cleanly and each caller gets a unique integer.
 *
 * Conventions:
 *   - kind='project' → "PRJ-1", "PRJ-2", ...
 *   - kind='pbi'     → "PBI-1", ...
 *   - kind='sbi'     → "SBI-1", ...
 *   - kind='sprint'  → "SP-1", ...
 */
import { sql } from 'drizzle-orm';

import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';

export type HumanIdKind = 'project' | 'pbi' | 'sbi' | 'sprint';

const PREFIX: Record<HumanIdKind, string> = {
  project: 'PRJ',
  pbi: 'PBI',
  sbi: 'SBI',
  sprint: 'SP',
};

export async function allocateHumanId(
  db: Database,
  workspaceId: string,
  kind: HumanIdKind,
): Promise<{ number: number; label: string }> {
  // Upsert + RETURNING gives us the row that *will* exist after the
  // operation, with `next_id` already bumped if it was new (default 1)
  // or +1 if it existed.
  const [row] = await db
    .insert(schema.entitySequence)
    .values({ workspaceId, kind, nextId: 2 })
    .onConflictDoUpdate({
      target: [schema.entitySequence.workspaceId, schema.entitySequence.kind],
      set: {
        nextId: sql`${schema.entitySequence.nextId} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ nextId: schema.entitySequence.nextId });

  // Branch: on conflict the returned `nextId` is the bumped value
  // (already +1), so the allocated number is nextId - 1. On a fresh
  // insert the row stored nextId=2, so the allocated number is 1.
  const allocated = (row?.nextId ?? 2) - 1;
  return { number: allocated, label: `${PREFIX[kind]}-${allocated}` };
}
