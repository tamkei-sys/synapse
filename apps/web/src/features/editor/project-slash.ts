/**
 * `/project` slash — create a project block and place a marker.
 *
 * Block-level placement only: we drop the project's `PRJ-<n>` label as
 * a plain text run, mirroring how 大和心 mentions are flat references.
 * A proper `projectRef` inline node lands when we need live status on
 * the reference (deferred).
 */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makeProjectSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'project',
    title: '新規プロジェクト',
    description: 'トップ階層のプロジェクトを作成',
    keywords: ['project', 'プロジェクト', 'epic'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      void trpc.project.create.mutate({ workspaceId, name: '無題プロジェクト' }).then((row) => {
        const props = (row.props ?? {}) as { number?: number; name?: string };
        const label = `PRJ-${props.number ?? '?'} ${props.name ?? '無題プロジェクト'}`;
        editor.chain().focus().insertContent(label).run();
      });
    },
  };
}
