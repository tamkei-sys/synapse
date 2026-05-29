/**
 * Page favorite router (PBI-53).
 *
 * ユーザー単位のお気に入りページ。toggle / listMine / isFavorite。
 * Sidebar の「お気に入り」セクションが listMine を購読する。
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const favoriteRouter = router({
  /** お気に入りに入れる / 外す（トグル）。戻り値で現在の状態を返す。 */
  toggle: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // ページの存在 + 同一 WS メンバーであることを確認。
      const page = (
        await ctx.db
          .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
          .from(schema.block)
          .where(eq(schema.block.id, input.pageId))
          .limit(1)
      )[0];
      if (!page || page.type !== 'page') return { favorited: false };
      await assertWorkspaceMember(ctx.db, page.workspaceId, userId);

      const existing = (
        await ctx.db
          .select()
          .from(schema.pageFavorite)
          .where(
            and(
              eq(schema.pageFavorite.userId, userId),
              eq(schema.pageFavorite.pageId, input.pageId),
            ),
          )
          .limit(1)
      )[0];
      if (existing) {
        await ctx.db
          .delete(schema.pageFavorite)
          .where(
            and(
              eq(schema.pageFavorite.userId, userId),
              eq(schema.pageFavorite.pageId, input.pageId),
            ),
          );
        return { favorited: false };
      }
      await ctx.db.insert(schema.pageFavorite).values({ userId, pageId: input.pageId });
      return { favorited: true };
    }),

  /** 自分のお気に入り（指定 WS 内）。Sidebar 用にタイトル + icon も返す。 */
  listMine: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await assertWorkspaceMember(ctx.db, input.workspaceId, userId);
      const favs = await ctx.db
        .select({ pageId: schema.pageFavorite.pageId, createdAt: schema.pageFavorite.createdAt })
        .from(schema.pageFavorite)
        .where(eq(schema.pageFavorite.userId, userId))
        .orderBy(desc(schema.pageFavorite.createdAt));
      if (favs.length === 0) return [];
      const ids = favs.map((f) => f.pageId);
      const pages = await ctx.db
        .select({ id: schema.block.id, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            inArray(schema.block.id, ids),
            eq(schema.block.workspaceId, input.workspaceId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        );
      const byId = new Map(pages.map((p) => [p.id, p.props]));
      // favs の順序（新しい順）を保ちつつ、現 WS に存在するものだけ。
      return favs
        .filter((f) => byId.has(f.pageId))
        .map((f) => {
          const props = (byId.get(f.pageId) ?? {}) as { title?: string; icon?: string };
          return {
            pageId: f.pageId,
            title: props.title ?? '無題',
            icon: props.icon ?? null,
          };
        });
    }),

  /** 単一ページのお気に入り状態（ページ詳細の ☆ ボタン用）。 */
  isFavorite: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const row = (
        await ctx.db
          .select({ pageId: schema.pageFavorite.pageId })
          .from(schema.pageFavorite)
          .where(
            and(
              eq(schema.pageFavorite.userId, ctx.session.user.id),
              eq(schema.pageFavorite.pageId, input.pageId),
            ),
          )
          .limit(1)
      )[0];
      return { favorited: Boolean(row) };
    }),
});
