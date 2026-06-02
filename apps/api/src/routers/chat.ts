/**
 * Chat router (PBI-94) — Slack 風チャット。
 *
 * チャンネル = workspace 直下の block(type='chat_channel')、メッセージ = channel を
 * parentId に持つ block(type='chat_message')。comment と同じ block-as-record 方式で
 * migration 不要。リアルタイムはクライアントの polling（Yjs と並行する sync は作らない）。
 * メンション通知は comment と同じ fan-out、リアクションは comment_reaction テーブルを
 * block 汎用として流用する（message も block）。
 */
import { TRPCError } from '@trpc/server';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import {
  chatAttachmentSchema,
  chatChannelPropsSchema,
  chatMessagePropsSchema,
  extractMentions,
} from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

const REACTION_EMOJIS = ['👍', '🎉', '👀', '✅', '🤔', '❤️'] as const;
const reactionEmojiSchema = z.enum(REACTION_EMOJIS);

export const chatRouter = router({
  /** workspace のチャンネル一覧（作成順）。 */
  listChannels: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const rows = await ctx.db
        .select({ id: schema.block.id, props: schema.block.props, createdAt: schema.block.createdAt })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, input.workspaceId),
            eq(schema.block.type, 'chat_channel'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.createdAt));
      return rows.map((r) => {
        const p = (r.props ?? {}) as { name?: string; description?: string };
        return { id: r.id, name: p.name ?? '無題', description: p.description ?? null };
      });
    }),

  /** チャンネルを作成。 */
  createChannel: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        name: z.string().trim().min(1).max(80),
        description: z.string().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const props = chatChannelPropsSchema.parse({
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
      });
      await ctx.db.insert(schema.block).values({
        id,
        workspaceId: input.workspaceId,
        parentId: null,
        type: 'chat_channel',
        position: id,
        props,
        createdBy: ctx.session.user.id,
      });
      return { id };
    }),

  /** チャンネルのメッセージ一覧（新しい順に limit、表示は昇順に戻す）+ リアクション集計。 */
  listMessages: protectedProcedure
    .input(z.object({ channelId: z.string().min(1), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const [channel] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
        .from(schema.block)
        .where(and(eq(schema.block.id, input.channelId), isNull(schema.block.deletedAt)))
        .limit(1);
      if (!channel || channel.type !== 'chat_channel') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, channel.workspaceId, ctx.session.user.id);

      const rows = await ctx.db
        .select({
          id: schema.block.id,
          props: schema.block.props,
          createdBy: schema.block.createdBy,
          createdAt: schema.block.createdAt,
          authorName: schema.user.name,
          authorImage: schema.user.image,
        })
        .from(schema.block)
        .innerJoin(schema.user, eq(schema.block.createdBy, schema.user.id))
        .where(
          and(
            eq(schema.block.parentId, input.channelId),
            eq(schema.block.type, 'chat_message'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(desc(schema.block.createdAt))
        .limit(input.limit);

      const ids = rows.map((r) => r.id);
      const byMsg = new Map<string, { emoji: string; count: number; byMe: boolean }[]>();
      if (ids.length > 0) {
        const me = ctx.session.user.id;
        const agg = await ctx.db
          .select({
            commentId: schema.commentReaction.commentId,
            emoji: schema.commentReaction.emoji,
            count: count(),
            byMe: sql<boolean>`bool_or(${schema.commentReaction.userId} = ${me})`,
          })
          .from(schema.commentReaction)
          .where(inArray(schema.commentReaction.commentId, ids))
          .groupBy(schema.commentReaction.commentId, schema.commentReaction.emoji);
        for (const a of agg) {
          const arr = byMsg.get(a.commentId) ?? [];
          arr.push({ emoji: a.emoji, count: Number(a.count), byMe: a.byMe });
          byMsg.set(a.commentId, arr);
        }
      }

      // 新しい順で取得 → 表示用に昇順へ。
      return rows
        .map((r) => {
          const p = (r.props ?? {}) as {
            body?: string;
            attachment?: { kind: 'image' | 'file'; url: string; name: string; mime: string };
          };
          return {
            id: r.id,
            body: p.body ?? '',
            attachment: p.attachment ?? null,
            authorName: r.authorName,
            authorImage: r.authorImage,
            createdBy: r.createdBy,
            createdAt: r.createdAt,
            reactions: byMsg.get(r.id) ?? [],
          };
        })
        .reverse();
    }),

  /** メッセージ送信。メンションは通知 fan-out。 */
  sendMessage: protectedProcedure
    .input(
      z.object({
        channelId: z.string().min(1),
        body: z.string().trim().max(4_000).default(''),
        attachment: chatAttachmentSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.body && !input.attachment) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '本文か添付が必要です' });
      }
      const [channel] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
        .from(schema.block)
        .where(and(eq(schema.block.id, input.channelId), isNull(schema.block.deletedAt)))
        .limit(1);
      if (!channel || channel.type !== 'chat_channel') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, channel.workspaceId, ctx.session.user.id);

      const mentions = extractMentions(input.body);
      const id = ulid();
      const props = chatMessagePropsSchema.parse({
        body: input.body,
        ...(mentions.length > 0 ? { mentions } : {}),
        ...(input.attachment ? { attachment: input.attachment } : {}),
      });
      await ctx.db.insert(schema.block).values({
        id,
        workspaceId: channel.workspaceId,
        parentId: input.channelId,
        type: 'chat_message',
        position: id,
        props,
        createdBy: ctx.session.user.id,
      });

      // メンション通知（best-effort）。member かつ自分以外。
      if (mentions.length > 0) {
        try {
          const targets = await ctx.db
            .select({ userId: schema.workspaceMember.userId })
            .from(schema.workspaceMember)
            .where(
              and(
                eq(schema.workspaceMember.workspaceId, channel.workspaceId),
                inArray(schema.workspaceMember.userId, mentions),
              ),
            );
          const actorName = ctx.session.user.name ?? ctx.session.user.email;
          const recipients = targets
            .map((t) => t.userId)
            .filter((uid) => uid !== ctx.session.user.id);
          if (recipients.length > 0) {
            await ctx.db.insert(schema.notification).values(
              recipients.map((recipientId) => ({
                id: ulid(),
                workspaceId: channel.workspaceId,
                recipientId,
                actorUserId: ctx.session.user.id,
                kind: 'mention',
                blockId: input.channelId,
                commentId: id,
                body: `${actorName} さんがチャットでメンション：${input.body.slice(0, 140)}`,
              })),
            );
          }
        } catch (err) {
          console.warn('[chat] mention fan-out failed:', err);
        }
      }
      return { id };
    }),

  /** メッセージ削除（投稿者本人 or admin/owner）。soft delete。 */
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, createdBy: schema.block.createdBy })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.messageId),
            eq(schema.block.type, 'chat_message'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const me = await assertWorkspaceMember(ctx.db, row.workspaceId, ctx.session.user.id);
      const isAdmin = me.role === 'owner' || me.role === 'admin';
      if (row.createdBy !== ctx.session.user.id && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await ctx.db
        .update(schema.block)
        .set({ deletedAt: new Date() })
        .where(eq(schema.block.id, input.messageId));
      return { ok: true };
    }),

  /** メッセージへのリアクション toggle（comment_reaction を block 汎用で流用）。 */
  toggleReaction: protectedProcedure
    .input(z.object({ messageId: z.string().min(1), emoji: reactionEmojiSchema }))
    .mutation(async ({ ctx, input }) => {
      const [msg] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.messageId),
            eq(schema.block.type, 'chat_message'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!msg) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, msg.workspaceId, ctx.session.user.id);

      const where = and(
        eq(schema.commentReaction.commentId, input.messageId),
        eq(schema.commentReaction.userId, ctx.session.user.id),
        eq(schema.commentReaction.emoji, input.emoji),
      );
      const existing = await ctx.db
        .select({ emoji: schema.commentReaction.emoji })
        .from(schema.commentReaction)
        .where(where)
        .limit(1);
      if (existing.length > 0) {
        await ctx.db.delete(schema.commentReaction).where(where);
        return { active: false };
      }
      await ctx.db.insert(schema.commentReaction).values({
        commentId: input.messageId,
        userId: ctx.session.user.id,
        emoji: input.emoji,
      });
      return { active: true };
    }),
});
