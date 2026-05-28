/**
 * `/pr` slash command.
 *
 * Opens a minimal prompt for `owner/repo#number`, then inserts a
 * `prDiffEmbed` node carrying those coordinates. We use the browser
 * `prompt()` for S10 — a proper modal lives in the design backlog.
 */
import type { SlashCommand } from './slash-menu.js';

const PR_PATTERN = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)#(\d+)$/;

export function makePrSlashCommand(): SlashCommand {
  return {
    id: 'pr',
    title: 'GitHub PR を埋め込み',
    description: 'プルリクエストへのリンクを挿入',
    keywords: ['pr', 'pull', 'request', 'github', 'プルリク', 'review'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const input =
        typeof window !== 'undefined'
          ? window.prompt('PR を owner/repo#number 形式で入力してください')
          : '';
      if (!input) return;
      const m = PR_PATTERN.exec(input.trim());
      if (!m || !m[1] || !m[2] || !m[3]) return;
      editor
        .chain()
        .focus()
        .insertPrDiffEmbed({
          owner: m[1],
          repo: m[2],
          number: Number(m[3]),
        })
        .run();
    },
  };
}
