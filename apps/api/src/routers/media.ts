/**
 * Media upload router (PBI-178).
 *
 * Web エディタの drag/drop/paste 経路と、MCP の synapse_upload_image /
 * synapse_insert_image (PBI-179) は **同じ** procedure を叩く。R2 binding
 * (`env.MEDIA_BUCKET`) が configure されていれば bytes を R2 に put して
 * 公開 URL を返し、無ければ dev 用に `data:` URL を生成して返す — 本番と
 * dev の切替は env.MEDIA_BUCKET の有無のみ (env-based seam)。
 *
 * 認可は assertCanWrite (viewer は弾く) を通す。アップロード上限は 5MB。
 * R2 オブジェクトキーは `media/<workspaceId>/<random>.<ext>` で
 * workspace スコープ。base64 payload はそのまま data:URL に流せる形で
 * 受け取る (caller は `data:` プレフィックスを剥がしてから渡す)。
 */
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { assertCanWrite } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const uploadInputSchema = z.object({
  workspaceId: z.string().min(1).max(64),
  filename: z.string().min(1).max(200),
  mime: z.string().min(1).max(120),
  /** base64 encoded raw bytes (without any `data:` prefix). */
  bytes: z.string().min(1).max(10_000_000),
});

export type MediaUploadResult = {
  url: string;
  bytes: number;
  mime: string;
  storage: 'r2' | 'data-url';
  key: string | null;
};

function decodeBase64(str: string): Uint8Array {
  // atob is available in Workers and in Node ≥ 16. We avoid Buffer here so
  // the same router works in both runtimes (vitest hits Node directly).
  const bin = atob(str);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function safeExt(filename: string, mime: string): string {
  const m = /\.([a-zA-Z0-9]{1,8})$/.exec(filename);
  if (m) return m[1]!.toLowerCase();
  const fromMime = /^image\/([a-zA-Z0-9.+-]{1,40})$/.exec(mime);
  if (fromMime) return fromMime[1]!.toLowerCase().replace(/^x-/, '').slice(0, 8);
  return 'bin';
}

function randomKey(): string {
  // crypto.randomUUID is available in workerd and Node ≥ 19. We strip the
  // hyphens to keep R2 keys short.
  return crypto.randomUUID().replace(/-/g, '');
}

export const mediaRouter = router({
  /**
   * Upload media bytes (image/* primarily, but the same path will serve
   * file/* later). Returns a URL that can be embedded in a doc body as an
   * image src. The same procedure is invoked by the MCP server via
   * createServiceCaller (apps/mcp).
   */
  upload: protectedProcedure
    .input(uploadInputSchema)
    .mutation(async ({ ctx, input }): Promise<MediaUploadResult> => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);

      const bytes = decodeBase64(input.bytes);
      if (bytes.byteLength === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'empty payload' });
      }
      if (bytes.byteLength > MAX_BYTES) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'media too large (max 5MB)' });
      }

      const ext = safeExt(input.filename, input.mime);
      const key = `media/${input.workspaceId}/${randomKey()}.${ext}`;

      if (ctx.env.MEDIA_BUCKET) {
        await ctx.env.MEDIA_BUCKET.put(key, bytes, {
          httpMetadata: { contentType: input.mime },
        });
        const base = ctx.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? '';
        const url = base ? `${base}/${key}` : `/media/${key}`;
        return {
          url,
          bytes: bytes.byteLength,
          mime: input.mime,
          storage: 'r2',
          key,
        };
      }

      // dev fallback: synthesize a data: URL so the editor + MCP path still
      // round-trip end-to-end without needing R2 wired up. The bytes field
      // is the same base64 the caller sent, so this is zero-copy.
      const url = `data:${input.mime};base64,${input.bytes}`;
      return {
        url,
        bytes: bytes.byteLength,
        mime: input.mime,
        storage: 'data-url',
        key: null,
      };
    }),
});
