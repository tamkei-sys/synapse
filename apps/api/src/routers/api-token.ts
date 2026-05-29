/**
 * API token router.
 *
 * Tokens are workspace-scoped — the caller picks a workspace they're a
 * member of, and the token grants the SAME role for any agent holding
 * it. Rotation = revoke + create.
 *
 * The plaintext token is returned by `create` exactly once. List and
 * subsequent reads only ever surface the 8-char suffix.
 */
import { TRPCError } from '@trpc/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { generateToken, hashToken, tokenSuffix } from '../lib/api-token.js';
import { assertCanAdmin, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

const tokenScopeSchema = z.enum(schema.TOKEN_SCOPES);

export const apiTokenRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select({
          id: schema.apiToken.id,
          label: schema.apiToken.label,
          suffix: schema.apiToken.suffix,
          scopes: schema.apiToken.scopes,
          createdAt: schema.apiToken.createdAt,
          expiresAt: schema.apiToken.expiresAt,
          revokedAt: schema.apiToken.revokedAt,
          lastUsedAt: schema.apiToken.lastUsedAt,
        })
        .from(schema.apiToken)
        .where(eq(schema.apiToken.workspaceId, input.workspaceId))
        .orderBy(desc(schema.apiToken.createdAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        label: z.string().trim().min(1).max(80),
        /** TTL in days; null = no expiry. Default 30 days. */
        ttlDays: z.number().int().min(1).max(365).nullable().default(30),
        /** 細粒度の権限。最低 1 つ必要。 */
        scopes: z.array(tokenScopeSchema).min(1).default(['read']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // MCP トークンは外部システムが workspace 全体を読み書きできる強い権限
      // を持つので admin 以上のロールに限定する。
      await assertCanAdmin(ctx.db, input.workspaceId, ctx.session.user.id);

      // 重複を除いて昇順化（DB 内が安定する）。
      const scopes = [...new Set(input.scopes)].sort();

      const plaintext = generateToken();
      const tokenHash = await hashToken(plaintext);
      const expiresAt =
        input.ttlDays === null ? null : new Date(Date.now() + input.ttlDays * 24 * 60 * 60 * 1000);

      const [row] = await ctx.db
        .insert(schema.apiToken)
        .values({
          id: ulid(),
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
          tokenHash,
          suffix: tokenSuffix(plaintext),
          label: input.label,
          scopes,
          expiresAt,
        })
        .returning({
          id: schema.apiToken.id,
          label: schema.apiToken.label,
          suffix: schema.apiToken.suffix,
          scopes: schema.apiToken.scopes,
          createdAt: schema.apiToken.createdAt,
          expiresAt: schema.apiToken.expiresAt,
        });
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Plaintext is returned ONCE here; never persisted in plain.
      return { ...row, token: plaintext };
    }),

  revoke: protectedProcedure
    .input(z.object({ tokenId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.apiToken.workspaceId })
        .from(schema.apiToken)
        .where(and(eq(schema.apiToken.id, input.tokenId), isNull(schema.apiToken.revokedAt)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await assertCanAdmin(ctx.db, existing.workspaceId, ctx.session.user.id);

      const [updated] = await ctx.db
        .update(schema.apiToken)
        .set({ revokedAt: new Date() })
        .where(eq(schema.apiToken.id, input.tokenId))
        .returning({ id: schema.apiToken.id, revokedAt: schema.apiToken.revokedAt });
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return updated;
    }),
});
