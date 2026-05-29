/**
 * `/ai` slash command (PBI-75)。
 *
 * 指示文をプロンプトで受け取り、ai.transform(mode='write') で本文生成して
 * カーソル位置に挿入する。ANTHROPIC_API_KEY 未設定なら stub テキストが入る
 * （動線確認用）。
 */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makeAiSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'ai-write',
    title: 'AI で書く',
    description: '指示から文章を生成して挿入',
    keywords: ['ai', '生成', 'write', '書く', 'gpt', 'claude'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const instruction = window.prompt('AI への指示（例: この章の導入を 3 段落で）');
      if (!instruction) return;
      void trpc.ai.transform
        .mutate({ workspaceId, mode: 'write', instruction, text: '' })
        .then((res) => {
          editor.chain().focus().insertContent(res.text).run();
        })
        .catch(() => {
          editor.chain().focus().insertContent('（AI 生成に失敗しました）').run();
        });
    },
  };
}
