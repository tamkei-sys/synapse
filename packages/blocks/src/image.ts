/**
 * ProseMirror/TipTap の image ノード attrs スキーマ。
 *
 * Web は @tiptap/extension-image を `inline: false` (block) として使う
 * (apps/web/src/features/editor/editor.tsx)。MCP の本文書込み、sync の
 * markdown→PM 変換、apps/api の sanitizePublicDoc が同じ shape を参照
 * できるよう、共通の zod schema をここに置く。
 *
 * 描画サイズ (width/height/naturalWidth/naturalHeight) は将来的な
 * 拡張余地として確保しつつ、現状の TipTap 標準 extension は
 * src/alt/title しか保持しないので、まずはそこだけ必須/任意で定義する。
 */
import { z } from 'zod';

export const imageNodeAttrsSchema = z.object({
  src: z.string().min(1),
  alt: z.string().optional(),
  title: z.string().optional(),
});

export type ImageNodeAttrs = z.infer<typeof imageNodeAttrsSchema>;

/**
 * 公開ページ向けにも安全な image src か判定する。
 * apps/api/src/lib/public-doc.ts の safeImageSrc と同じ規則
 * (http(s) or data:image/) を共通化しておく。
 */
export function isSafeImageSrc(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^https?:/i.test(v) || /^data:image\//i.test(v);
}
