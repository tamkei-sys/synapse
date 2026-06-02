/**
 * Workspace CRUD + invitation surface.
 *
 * Identity rules:
 *   - `id` is a ULID generated on the server.
 *   - `slug` is derived from the name with a ULID-suffix tiebreaker so
 *     parallel sign-ups never collide.
 *
 * Every authenticated user gets a row in `workspace_member` with role `owner`
 * for workspaces they create. Membership is the only thing that grants
 * access in subsequent queries (enforced in feature routers via
 * `assertWorkspaceMember`).
 *
 * Invitations are token-link based: an owner/admin issues an invite,
 * receives a one-time plaintext token, shares the link, and the recipient
 * accepts it while logged in. The DB only stores SHA-256(token).
 */
import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertIsOwner, assertWorkspaceMember } from '../lib/access.js';
import { seedDefaultTemplates } from '../lib/default-templates.js';
import { slugify, suffixedSlug } from '../lib/slug.js';
import { protectedProcedure, router } from '../trpc.js';

const INVITE_TTL_DAYS = 7;
const INVITE_ASSIGNABLE_ROLES = ['admin', 'member', 'viewer'] as const;
const inviteRoleSchema = z.enum(INVITE_ASSIGNABLE_ROLES);

/** 32 bytes of randomness, base64url. Returns the plaintext and its hash. */
async function mintInviteToken(): Promise<{ token: string; tokenHash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64url(bytes);
  const tokenHash = await sha256Hex(token);
  return { token, tokenHash };
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function assertOwnerOrAdmin(
  db: Parameters<typeof assertWorkspaceMember>[0],
  workspaceId: string,
  userId: string,
) {
  const m = await assertWorkspaceMember(db, workspaceId, userId);
  if (m.role !== 'owner' && m.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'メンバーを招待する権限がありません。' });
  }
  return m;
}

export const workspaceRouter = router({
  /** List workspaces the current user is a member of. */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({ workspaceId: schema.workspaceMember.workspaceId })
      .from(schema.workspaceMember)
      .where(eq(schema.workspaceMember.userId, ctx.session.user.id));

    if (memberships.length === 0) return [];

    const ids = memberships.map((m) => m.workspaceId);
    return ctx.db.select().from(schema.workspace).where(inArray(schema.workspace.id, ids));
  }),

  /** Create a new workspace and add the caller as `owner`. */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = ulid();
      const slug = suffixedSlug(input.name, id);

      // Single transaction so a half-created workspace is impossible.
      const created = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.workspace)
          .values({
            id,
            slug,
            name: input.name.trim(),
            createdBy: ctx.session.user.id,
          })
          .returning();
        if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        await tx.insert(schema.workspaceMember).values({
          workspaceId: row.id,
          userId: ctx.session.user.id,
          role: 'owner',
        });

        return row;
      });

      // Seed built-in default templates (best-effort — never block workspace
      // creation if templating fails). The editable body is hydrated from
      // props.doc by the sync server on first open. (PBI-105)
      try {
        await seedDefaultTemplates(ctx.db, created.id, ctx.session.user.id);
      } catch (err) {
        console.warn('[templates] default seed failed:', err);
      }

      return created;
    }),

  /**
   * Hard-delete a workspace. Owner only. すべての FK は cascade なので
   * block / member / invitation / token / audit / notification / cc / yjs /
   * dependency / sequence もまとめて消える。
   *
   * 誤爆対策で `confirmName` を受け取り、現行 workspace.name と完全一致した
   * ときだけ実行する。
   */
  delete: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        confirmName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIsOwner(ctx.db, input.workspaceId, ctx.session.user.id);

      const [row] = await ctx.db
        .select({ name: schema.workspace.name })
        .from(schema.workspace)
        .where(eq(schema.workspace.id, input.workspaceId))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      if (row.name !== input.confirmName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'ワークスペース名が一致しません。',
        });
      }

      await ctx.db.delete(schema.workspace).where(eq(schema.workspace.id, input.workspaceId));
      return { ok: true };
    }),

  // ── 招待 ────────────────────────────────────────────────────────

  /**
   * Issue a new invitation. Returns the **plaintext** token once — it is
   * never retrievable again. The hash is what the DB stores.
   */
  invite: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        email: z.string().trim().email().max(200),
        role: inviteRoleSchema.default('member'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnerOrAdmin(ctx.db, input.workspaceId, ctx.session.user.id);

      const { token, tokenHash } = await mintInviteToken();
      const id = ulid();
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

      const [row] = await ctx.db
        .insert(schema.workspaceInvitation)
        .values({
          id,
          workspaceId: input.workspaceId,
          email: input.email,
          role: input.role,
          tokenHash,
          invitedBy: ctx.session.user.id,
          expiresAt,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Plaintext token only escapes through this single return path.
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        expiresAt: row.expiresAt,
        token,
      };
    }),

  listInvitations: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertOwnerOrAdmin(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select({
          id: schema.workspaceInvitation.id,
          email: schema.workspaceInvitation.email,
          role: schema.workspaceInvitation.role,
          createdAt: schema.workspaceInvitation.createdAt,
          expiresAt: schema.workspaceInvitation.expiresAt,
          acceptedAt: schema.workspaceInvitation.acceptedAt,
          acceptedBy: schema.workspaceInvitation.acceptedBy,
          revokedAt: schema.workspaceInvitation.revokedAt,
        })
        .from(schema.workspaceInvitation)
        .where(eq(schema.workspaceInvitation.workspaceId, input.workspaceId))
        .orderBy(desc(schema.workspaceInvitation.createdAt));
    }),

  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          workspaceId: schema.workspaceInvitation.workspaceId,
          revokedAt: schema.workspaceInvitation.revokedAt,
          acceptedAt: schema.workspaceInvitation.acceptedAt,
        })
        .from(schema.workspaceInvitation)
        .where(eq(schema.workspaceInvitation.id, input.invitationId))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertOwnerOrAdmin(ctx.db, row.workspaceId, ctx.session.user.id);
      if (row.acceptedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '既に受諾済みの招待です。' });
      }
      await ctx.db
        .update(schema.workspaceInvitation)
        .set({ revokedAt: new Date() })
        .where(eq(schema.workspaceInvitation.id, input.invitationId));
      return { ok: true };
    }),

  /**
   * Read the invitation that a token points at (for the landing page).
   * Caller does NOT need to be logged in — checking the token is enough.
   * But the procedure stays protected because Better-Auth requires it
   * elsewhere; the receiving UI redirects to /login first if needed.
   */
  previewInvitation: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tokenHash = await sha256Hex(input.token);
      const [row] = await ctx.db
        .select({
          id: schema.workspaceInvitation.id,
          email: schema.workspaceInvitation.email,
          role: schema.workspaceInvitation.role,
          workspaceId: schema.workspaceInvitation.workspaceId,
          expiresAt: schema.workspaceInvitation.expiresAt,
          acceptedAt: schema.workspaceInvitation.acceptedAt,
          revokedAt: schema.workspaceInvitation.revokedAt,
          workspaceName: schema.workspace.name,
        })
        .from(schema.workspaceInvitation)
        .innerJoin(
          schema.workspace,
          eq(schema.workspaceInvitation.workspaceId, schema.workspace.id),
        )
        .where(eq(schema.workspaceInvitation.tokenHash, tokenHash))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: '招待リンクが無効です。' });
      const usable = !row.acceptedAt && !row.revokedAt && row.expiresAt.getTime() > Date.now();
      return { ...row, usable };
    }),

  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = await sha256Hex(input.token);
      const userId = ctx.session.user.id;

      return ctx.db.transaction(async (tx) => {
        const [inv] = await tx
          .select()
          .from(schema.workspaceInvitation)
          .where(eq(schema.workspaceInvitation.tokenHash, tokenHash))
          .limit(1);
        if (!inv) throw new TRPCError({ code: 'NOT_FOUND', message: '招待リンクが無効です。' });
        if (inv.acceptedAt)
          throw new TRPCError({ code: 'BAD_REQUEST', message: '既に受諾されています。' });
        if (inv.revokedAt)
          throw new TRPCError({ code: 'BAD_REQUEST', message: '取り消された招待です。' });
        if (inv.expiresAt.getTime() < Date.now())
          throw new TRPCError({ code: 'BAD_REQUEST', message: '招待の有効期限が切れています。' });

        // 既にメンバーなら role を保ったまま「受諾済み」だけ立てる。
        const [existing] = await tx
          .select({ role: schema.workspaceMember.role })
          .from(schema.workspaceMember)
          .where(
            and(
              eq(schema.workspaceMember.workspaceId, inv.workspaceId),
              eq(schema.workspaceMember.userId, userId),
            ),
          )
          .limit(1);

        if (!existing) {
          await tx.insert(schema.workspaceMember).values({
            workspaceId: inv.workspaceId,
            userId,
            role: inv.role,
          });
        }

        await tx
          .update(schema.workspaceInvitation)
          .set({ acceptedAt: new Date(), acceptedBy: userId })
          .where(eq(schema.workspaceInvitation.id, inv.id));

        return { workspaceId: inv.workspaceId, role: existing?.role ?? inv.role };
      });
    }),

  // ── メンバー一覧と役割管理 ──────────────────────────────────────

  /** メンバー一覧（自分が所属するワークスペース限定）。 */
  listMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select({
          userId: schema.workspaceMember.userId,
          role: schema.workspaceMember.role,
          joinedAt: schema.workspaceMember.joinedAt,
          name: schema.user.name,
          email: schema.user.email,
          image: schema.user.image,
        })
        .from(schema.workspaceMember)
        .innerJoin(schema.user, eq(schema.workspaceMember.userId, schema.user.id))
        .where(eq(schema.workspaceMember.workspaceId, input.workspaceId))
        .orderBy(schema.workspaceMember.joinedAt);
    }),

  /** ロール変更（owner/admin のみ、最後の owner を降格させない）。 */
  setMemberRole: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        userId: z.string().min(1),
        role: z.enum(['owner', 'admin', 'member', 'viewer']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnerOrAdmin(ctx.db, input.workspaceId, ctx.session.user.id);

      // owner を別の人にスライドさせるケース以外で owner が 1 人もいなくなるのは禁止
      if (input.role !== 'owner') {
        const owners = await ctx.db
          .select({ userId: schema.workspaceMember.userId })
          .from(schema.workspaceMember)
          .where(
            and(
              eq(schema.workspaceMember.workspaceId, input.workspaceId),
              eq(schema.workspaceMember.role, 'owner'),
            ),
          );
        if (owners.length === 1 && owners[0]?.userId === input.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '最後の owner を降格させることはできません。',
          });
        }
      }

      const [updated] = await ctx.db
        .update(schema.workspaceMember)
        .set({ role: input.role })
        .where(
          and(
            eq(schema.workspaceMember.workspaceId, input.workspaceId),
            eq(schema.workspaceMember.userId, input.userId),
          ),
        )
        .returning();
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
      return updated;
    }),

  /** 除名（owner/admin のみ、最後の owner は除外不可、自分が owner なら自身を抜くこと不可）。 */
  removeMember: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1), userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const me = await assertOwnerOrAdmin(ctx.db, input.workspaceId, ctx.session.user.id);

      const owners = await ctx.db
        .select({ userId: schema.workspaceMember.userId })
        .from(schema.workspaceMember)
        .where(
          and(
            eq(schema.workspaceMember.workspaceId, input.workspaceId),
            eq(schema.workspaceMember.role, 'owner'),
          ),
        );
      if (owners.length === 1 && owners[0]?.userId === input.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '最後の owner を除名することはできません。',
        });
      }
      // admin は admin / member / viewer のみ除名可。owner だけが owner を抜ける。
      if (me.role === 'admin') {
        const [target] = await ctx.db
          .select({ role: schema.workspaceMember.role })
          .from(schema.workspaceMember)
          .where(
            and(
              eq(schema.workspaceMember.workspaceId, input.workspaceId),
              eq(schema.workspaceMember.userId, input.userId),
            ),
          )
          .limit(1);
        if (target?.role === 'owner') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'admin は owner を除名できません。',
          });
        }
      }

      await ctx.db
        .delete(schema.workspaceMember)
        .where(
          and(
            eq(schema.workspaceMember.workspaceId, input.workspaceId),
            eq(schema.workspaceMember.userId, input.userId),
          ),
        );
      return { ok: true };
    }),

  // ── デフォルトワークスペース取得 ───────────────────────────────────

  /** Convenience: returns existing default workspace or creates one. */
  createDefault: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.db
      .select()
      .from(schema.workspace)
      .innerJoin(
        schema.workspaceMember,
        and(
          eq(schema.workspaceMember.workspaceId, schema.workspace.id),
          eq(schema.workspaceMember.userId, ctx.session.user.id),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      return existing[0].workspace;
    }

    const fallbackName =
      ctx.session.user.name?.split(/\s+/)[0]?.trim() ||
      ctx.session.user.email.split('@')[0] ||
      'My workspace';

    const id = ulid();
    const slug = suffixedSlug(slugify(fallbackName) || 'workspace', id);

    const created = await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.workspace)
        .values({
          id,
          slug,
          name: `${fallbackName}'s workspace`,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await tx.insert(schema.workspaceMember).values({
        workspaceId: row.id,
        userId: ctx.session.user.id,
        role: 'owner',
      });
      return row;
    });

    return created;
  }),
});
