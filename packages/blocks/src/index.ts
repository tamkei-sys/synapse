// @synapse/blocks — Block primitive type definitions.
// Mirrors docs/design.md §5. Concrete schemas land per sprint.

export * from './pbi.js';
export * from './sheet.js';

export type BlockType =
  | 'page'
  | 'paragraph'
  | 'heading'
  | 'pbi'
  | 'sprint'
  | 'epic'
  | 'sheet'
  | 'sheet_cell'
  | 'table_row'
  | 'embed'
  | 'code';

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
