/**
 * Workspace access helpers.
 *
 * Every feature router that reads or writes blocks must call
 * `assertWorkspaceMember` before doing anything. Returning the membership
 * row lets the caller branch on role without an extra query.
 */
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';

import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';

export async function assertWorkspaceMember(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<schema.WorkspaceMemberRow> {
  const [row] = await db
    .select()
    .from(schema.workspaceMember)
    .where(
      and(
        eq(schema.workspaceMember.workspaceId, workspaceId),
        eq(schema.workspaceMember.userId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this workspace.' });
  }
  return row;
}
