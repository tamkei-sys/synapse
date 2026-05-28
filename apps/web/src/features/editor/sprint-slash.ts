/** `/sprint` slash — plan a new 2-week iteration. */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makeSprintSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'sprint',
    title: 'New sprint',
    description: 'Plan a 2-week sprint',
    keywords: ['sprint', 'スプリント', 'iteration'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const today = new Date().toISOString().slice(0, 10);
      void trpc.sprint.create.mutate({ workspaceId, name: `Sprint ${today}` }).then((row) => {
        const props = (row.props ?? {}) as { number?: number; name?: string };
        const label = `SP-${props.number ?? '?'} ${props.name ?? 'Sprint'}`;
        editor.chain().focus().insertContent(label).run();
      });
    },
  };
}
