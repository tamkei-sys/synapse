/**
 * Workspace + membership tables.
 *
 * A workspace is the top-level tenant. Every block, PBI, sprint, doc, and
 * sheet hangs off `workspaceId`. Multi-workspace per user is supported via
 * `workspace_member`.
 */
import { pgEnum, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';

export const workspaceRole = pgEnum('workspace_role', ['owner', 'admin', 'member', 'viewer']);

export const workspace = pgTable('workspace', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMember = pgTable(
  'workspace_member',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: workspaceRole('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
  }),
);

export type WorkspaceRow = typeof workspace.$inferSelect;
export type NewWorkspaceRow = typeof workspace.$inferInsert;
export type WorkspaceMemberRow = typeof workspaceMember.$inferSelect;
export type WorkspaceRole = (typeof workspaceRole.enumValues)[number];
