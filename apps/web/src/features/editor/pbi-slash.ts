/**
 * `/pbi` slash command factory.
 *
 * Returns a SlashCommand that closes over the current workspaceId so the
 * editor knows where to create the PBI. On invocation:
 *   1. Remove the `/pbi` query the user typed.
 *   2. Call tRPC `pbi.create` for an "Untitled PBI".
 *   3. Insert a `pbiRef` node at the caret pointing to the new PBI.
 *
 * The fetch happens after the deletion so the editor visibly clears the
 * slash query; the ref node lands as soon as the mutation resolves
 * (typically <100ms in dev).
 */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makePbiSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'pbi',
    title: 'New PBI',
    description: 'Create a backlog item and embed a reference',
    keywords: ['pbi', 'task', 'backlog', 'card', 'issue'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      void trpc.pbi.create.mutate({ workspaceId, title: 'Untitled PBI' }).then((created) => {
        editor.chain().focus().insertPbiRef(created.id).run();
      });
    },
  };
}
