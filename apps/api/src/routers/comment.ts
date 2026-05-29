/**
 * Comment router — どの Block にも軽量スレッドを生やすための CRUD。
 *
 * Comment は Block テーブルに type='comment' で保存し、parentId に対象
 * Block の id を入れる。これによりタイムライン / 一覧表示は通常の Block
 * クエリで賄えるが、可読性のため専用 router を用意した。
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { commentPropsSchema, extractMentions } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

/**
 * メンション → 通知の fan-out。
 *
 * - `extractMentions` で拾った userId のうち、ワークスペース member の
 *   ものだけを対象にする（権限漏洩を防ぐ）。
 * - 投稿者自身を mention した分はスキップ（自分への通知は意味ない）。
 * - 1 SQL でフィルタしてから insert。
 */
async function fanoutMentionNotifications(
  db: Database,
  args: {
    workspaceId: string;
    blockId: string;
    commentId: string;
    actorUserId: string;
    actorName: string;
    mentions: string[];
    body: string;
  },
): Promise<void> {
  if (args.mentions.length === 0) return;

  const targets = await db
    .select({ userId: schema.workspaceMember.userId })
    .from(schema.workspaceMember)
    .where(
      and(
        eq(schema.workspaceMember.workspaceId, args.workspaceId),
        inArray(schema.workspaceMember.userId, args.mentions),
      ),
    );
  const recipients = targets.map((t) => t.userId).filter((id) => id !== args.actorUserId);
  if (recipients.length === 0) return;

  const snippet = args.body.slice(0, 140);
  const rows = recipients.map((recipientId) => ({
    id: ulid(),
    workspaceId: args.workspaceId,
    recipientId,
    actorUserId: args.actorUserId,
    kind: 'mention',
    blockId: args.blockId,
    commentId: args.commentId,
    body: `${args.actorName} さんからメンション：${snippet}`,
  }));
  await db.insert(schema.notification).values(rows);
}

export const commentRouter = router({
  list: protectedProcedure
    .input(z.object({ blockId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // 親 Block を取って workspace 所属を確認してから子を返す。
      const [parent] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(and(eq(schema.block.id, input.blockId), isNull(schema.block.deletedAt)))
        .limit(1);
      if (!parent) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, parent.workspaceId, ctx.session.user.id);

      const rows = await ctx.db
        .select({
          id: schema.block.id,
          props: schema.block.props,
          createdBy: schema.block.createdBy,
          createdAt: schema.block.createdAt,
          updatedAt: schema.block.updatedAt,
          authorName: schema.user.name,
          authorEmail: schema.user.email,
          authorImage: schema.user.image,
        })
        .from(schema.block)
        .innerJoin(schema.user, eq(schema.block.createdBy, schema.user.id))
        .where(
          and(
            eq(schema.block.parentId, input.blockId),
            eq(schema.block.type, 'comment'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.createdAt));
      return rows;
    }),

  create: protectedProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        body: z.string().trim().min(1).max(4_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [parent] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(and(eq(schema.block.id, input.blockId), isNull(schema.block.deletedAt)))
        .limit(1);
      if (!parent) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, parent.workspaceId, ctx.session.user.id);

      const mentions = extractMentions(input.body);
      const props = commentPropsSchema.parse({
        body: input.body,
        ...(mentions.length > 0 ? { mentions } : {}),
      });

      const id = ulid();
      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: parent.workspaceId,
          parentId: input.blockId,
          type: 'comment',
          position: id,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // 通知 fan-out は best-effort。失敗してもコメント投稿自体は成功扱い。
      if (mentions.length > 0) {
        try {
          await fanoutMentionNotifications(ctx.db, {
            workspaceId: parent.workspaceId,
            blockId: input.blockId,
            commentId: id,
            actorUserId: ctx.session.user.id,
            actorName: ctx.session.user.name ?? ctx.session.user.email,
            mentions,
            body: input.body,
          });
        } catch (err) {
          console.warn('[comment] mention fan-out failed:', err);
        }
      }
      return row;
    }),

  /**
   * コメント削除。投稿者本人 or workspace の admin/owner のみ可。
   * 物理削除はせず deletedAt を立てる。
   */
  delete: protectedProcedure
    .input(z.object({ commentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          workspaceId: schema.block.workspaceId,
          createdBy: schema.block.createdBy,
        })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.commentId),
            eq(schema.block.type, 'comment'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const me = await assertWorkspaceMember(ctx.db, row.workspaceId, ctx.session.user.id);
      const isAuthor = row.createdBy === ctx.session.user.id;
      const isAdmin = me.role === 'owner' || me.role === 'admin';
      if (!isAuthor && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '自分の投稿か、管理者以上のロールでないと削除できません。',
        });
      }
      await ctx.db
        .update(schema.block)
        .set({ deletedAt: new Date(), version: sql`${schema.block.version} + 1` })
        .where(eq(schema.block.id, input.commentId));
      return { ok: true };
    }),
});
