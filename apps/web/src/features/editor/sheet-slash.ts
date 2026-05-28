/**
 * `/sheet` slash command factory.
 *
 * Closure pattern matches /pbi: capture workspaceId at editor mount,
 * call tRPC to create the sheet, insert a sheetEmbed referencing the
 * new block id.
 */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makeSheetSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'sheet',
    title: 'New spreadsheet',
    description: 'Embed an AG Grid + HyperFormula sheet',
    keywords: ['sheet', 'table', 'spreadsheet', 'grid', 'excel'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      void trpc.block.createSheet.mutate({ workspaceId }).then((sheet) => {
        editor.chain().focus().insertSheetEmbed(sheet.id).run();
      });
    },
  };
}
