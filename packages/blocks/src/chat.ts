/**
 * Chat channel / message (PBI-94)。
 *
 * Slack 風チャットを block モデルで表現する（migration 不要）:
 *   - chat_channel: workspace 直下のブロック。props = { name, description? }
 *   - chat_message: channel を parentId に持つブロック。props = { body, mentions? }
 *
 * メッセージのメンションは comment と同じ `extractMentions`（@user-id 形式）を再利用し、
 * 通知 fan-out に流す。リアクションは comment_reaction テーブルを block 汎用として
 * 流用する（message も block なので comment_id 列に message の block id を入れる）。
 */
import { z } from 'zod';

export const chatChannelPropsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(280).optional(),
});
export type ChatChannelProps = z.infer<typeof chatChannelPropsSchema>;

/** 1 メッセージにつき 1 添付。kind で画像（img 表示）/ ファイル（DL リンク）を分岐。 */
export const chatAttachmentSchema = z.object({
  kind: z.enum(['image', 'file']),
  url: z.string().min(1),
  name: z.string().max(200).default(''),
  mime: z.string().max(120).default(''),
});
export type ChatAttachment = z.infer<typeof chatAttachmentSchema>;

export const chatMessagePropsSchema = z
  .object({
    // 添付があれば本文は空でも可（画像だけ投稿を許す）。
    body: z.string().trim().max(4_000).default(''),
    /** @user-id メンション（extractMentions で抽出）。 */
    mentions: z.array(z.string()).max(32).optional(),
    attachment: chatAttachmentSchema.optional(),
  })
  .refine((p) => p.body.length > 0 || p.attachment !== undefined, {
    message: '本文か添付のいずれかが必要です',
  });
export type ChatMessageProps = z.infer<typeof chatMessagePropsSchema>;
