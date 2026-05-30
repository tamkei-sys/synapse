/**
 * Bookmark router (PBI-42)。
 *
 * URL を受け取りサーバ側で OG メタを取得して返す。SSRF 対策・取得方針は
 * lib/og-fetch.ts に集約している。SSRF 違反 (内部アドレス / 非対応スキーム等)
 * は BAD_REQUEST、到達不能・タイムアウトは fallback カード (lib 側で吸収) を返す。
 * ブラウザから他サイトを直接 fetch できない (CORS) のと、取得先の検証を信頼境界
 * で行うため、必ずこの API 経由にする。
 */
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { BlockedUrlError, fetchBookmarkMeta } from '../lib/og-fetch.js';
import { protectedProcedure, router } from '../trpc.js';

export const bookmarkRouter = router({
  /** URL の OG メタ (title / description / image / favicon / siteName) を取得。 */
  fetch: protectedProcedure
    .input(z.object({ url: z.string().url().max(2048) }))
    .query(async ({ input }) => {
      try {
        return await fetchBookmarkMeta(input.url);
      } catch (err) {
        if (err instanceof BlockedUrlError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
        }
        throw err;
      }
    }),
});
