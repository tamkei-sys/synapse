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
    title: '新規スプレッドシート',
    description: 'AG Grid + HyperFormula のシートを埋め込み',
    keywords: ['sheet', 'シート', 'spreadsheet', '表', 'grid', 'excel'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      void trpc.block.createSheet.mutate({ workspaceId }).then((sheet) => {
        editor.chain().focus().insertSheetEmbed(sheet.id).run();
      });
    },
  };
}
