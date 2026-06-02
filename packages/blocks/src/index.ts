// @synapse/blocks — Block primitive type definitions.
// Mirrors docs/design.md §5. Concrete schemas land per sprint.

export * from './project.js';
export * from './sprint.js';
export * from './pbi.js';
export * from './sbi.js';
export * from './sheet.js';
export * from './comment.js';
export * from './chat.js';
export * from './db.js';
export * from './page-ref.js';
export * from './page-meta.js';

export type BlockType =
  | 'page'
  | 'paragraph'
  | 'heading'
  | 'project'
  | 'pbi'
  | 'sbi'
  | 'sprint'
  | 'epic'
  | 'sheet'
  | 'sheet_cell'
  | 'table_row'
  | 'embed'
  | 'code'
  | 'comment'
  | 'db'
  | 'db_row'
  | 'chat_channel'
  | 'chat_message';

export type Block = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  type: BlockType;
  position: string;
  props: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deletedAt: Date | null;
};
