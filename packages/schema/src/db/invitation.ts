/**
 * Workspace invitation table.
 *
 * Owners / admins of a workspace can issue tokenised invitations. The
 * plaintext token is only ever returned at creation time; the DB stores
 * `tokenHash` (SHA-256) so leaked rows can't be redeemed. Receiving the
 * link is enough — no email plumbing required.
 *
 * Lifecycle:
 *   issued (acceptedAt=null, revokedAt=null, expiresAt > now)
 *   ─► accepted (acceptedAt set, acceptedBy = userId)
 *   ─► revoked  (revokedAt set; cannot be redeemed even with valid token)
 *   ─► expired  (expiresAt < now; treated like revoked)
 *
 * Cascade on workspace delete keeps the DB tidy; cascade on user delete
 * for `invitedBy` / `acceptedBy` follows the rest of the schema.
 */
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { workspace, workspaceRole } from './workspace.js';

export const workspaceInvitation = pgTable('workspace_invitation', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspace.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: workspaceRole('role').notNull().default('member'),
  /** SHA-256 of the plaintext token. Never store the plaintext itself. */
  tokenHash: text('token_hash').notNull().unique(),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedBy: text('accepted_by').references(() => user.id),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export type WorkspaceInvitationRow = typeof workspaceInvitation.$inferSelect;
export type NewWorkspaceInvitationRow = typeof workspaceInvitation.$inferInsert;
