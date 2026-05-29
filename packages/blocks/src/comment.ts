/**
 * Comment block — どの Block にもスレッドを生やせるシンプルな注釈。
 *
 * ストレージは Block テーブルを再利用する：
 *   - type='comment'
 *   - parentId = 親 Block の id（Project / Sprint / PBI / SBI / Page / Sheet）
 *   - props.body = プレーンテキスト本文（v1 は markdown 風で十分）
 *   - props.mentions = `@userId` 引用された userId 配列（将来の通知用、まずは表示用に保持）
 *
 * リッチ編集や添付、絵文字リアクションは v2 以降。
 */
import { z } from 'zod';

export const commentPropsSchema = z.object({
  body: z.string().trim().min(1).max(4_000),
  mentions: z.array(z.string()).max(32).optional(),
  /**
   * 親コメントの id（同 Block 配下のコメント）。
   *
   * v1 では 1 階層のみサポート：ルートコメント（parentCommentId = undefined）
   * とその直下のリプライ（parentCommentId = ルートの id）。孫リプライは
   * 親のルートに付け替える方針（多段化は v2）。
   */
  parentCommentId: z.string().optional(),
});

export type CommentProps = z.infer<typeof commentPropsSchema>;

/** `@user-id` を本文から拾い、mentions 配列に整列。重複排除。 */
const MENTION_PATTERN = /@([A-Za-z0-9_-]{6,32})/g;
export function extractMentions(body: string): string[] {
  const seen = new Set<string>();
  for (const m of body.matchAll(MENTION_PATTERN)) {
    const id = m[1];
    if (id) seen.add(id);
  }
  return [...seen];
}
