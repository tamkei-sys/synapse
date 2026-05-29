/**
 * User-defined DB block (PBI-30).
 *
 * Notion 風の「任意スキーマ・複数ビュー」を SYNAPSE の Block モデルに
 * 載せた最小版。Notion の Database に相当。
 *
 * 構造:
 *   - 親: type='db' の block。props.columns に列定義、props.title。
 *   - 子: type='db_row' の block。props.values に列 id をキーにした値。
 *     親 db.id を parentId に持つ。position は ulid（並び順 = 挿入順）。
 *
 * ビュー（Table / Board / Gallery / Calendar）は MVP では Table のみ。
 * 後続 PBI で view 定義を `props.views = [{ kind, ... }]` に持たせる予定。
 *
 * 列タイプは text / number / checkbox / select / date が MVP。
 * relation（別 DB の行への参照）と rollup（relation を辿った集計）は
 * PBI-63 / PBI-64 で追加した。
 *   - relation: props に relationDbId（参照先 db ブロック id）。
 *     セル値は参照先 db_row の id 配列（string[]）。
 *   - rollup: 派生列。保存しない。props に rollupRelationColumnId
 *     （同 DB の relation 列 id）/ rollupTargetColumnId（参照先の列 id）/
 *     rollupFn。値は API の db.get が計算して返す。
 */
import { z } from 'zod';

export const DB_COLUMN_KINDS = [
  'text',
  'number',
  'checkbox',
  'select',
  'date',
  'relation',
  'rollup',
] as const;
export type DbColumnKind = (typeof DB_COLUMN_KINDS)[number];

export const ROLLUP_FNS = ['count', 'sum', 'avg', 'min', 'max', 'show'] as const;
export type RollupFn = (typeof ROLLUP_FNS)[number];

export const dbColumnSchema = z
  .object({
    id: z.string().min(1).max(60),
    name: z.string().trim().min(1).max(80),
    kind: z.enum(DB_COLUMN_KINDS),
    /** kind='select' のときの選択肢。それ以外は無視。 */
    options: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
    /** kind='relation' のとき必須: 参照先 db ブロック id。 */
    relationDbId: z.string().min(1).max(60).optional(),
    /** kind='rollup' のとき必須: 同 DB 内の relation 列 id。 */
    rollupRelationColumnId: z.string().min(1).max(60).optional(),
    /** kind='rollup' のとき必須: 参照先 DB の列 id。 */
    rollupTargetColumnId: z.string().min(1).max(60).optional(),
    /** kind='rollup' のとき必須: 集計関数。 */
    rollupFn: z.enum(ROLLUP_FNS).optional(),
  })
  .strict()
  .superRefine((col, ctx) => {
    if (col.kind === 'relation' && !col.relationDbId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'relation 列には relationDbId が必要です',
        path: ['relationDbId'],
      });
    }
    if (col.kind === 'rollup') {
      if (!col.rollupRelationColumnId)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'rollup 列には rollupRelationColumnId が必要です',
          path: ['rollupRelationColumnId'],
        });
      if (!col.rollupTargetColumnId)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'rollup 列には rollupTargetColumnId が必要です',
          path: ['rollupTargetColumnId'],
        });
      if (!col.rollupFn)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'rollup 列には rollupFn が必要です',
          path: ['rollupFn'],
        });
    }
  });

export type DbColumn = z.infer<typeof dbColumnSchema>;

export const dbPropsSchema = z
  .object({
    title: z.string().trim().min(1).max(200).default('無題のデータベース'),
    columns: z.array(dbColumnSchema).min(1).max(40),
  })
  .strict();

export type DbProps = z.infer<typeof dbPropsSchema>;

export const dbCellValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  /** kind='relation' のセル値: 参照先 db_row の id 配列。 */
  z.array(z.string().min(1)),
]);
export type DbCellValue = z.infer<typeof dbCellValueSchema>;

export const dbRowPropsSchema = z
  .object({
    /** 列 id (`dbColumn.id`) → セル値。未入力は省略 / null。 */
    values: z.record(z.string().min(1), dbCellValueSchema).default({}),
    /** 親 db のブロック id。逆引きが必要な検索 / migration 用。 */
    dbId: z.string().min(1),
  })
  .strict();

export type DbRowProps = z.infer<typeof dbRowPropsSchema>;

/** 既定列セット — 「タイトル / ステータス / 期限」だけ用意した空 DB を作るとき用。 */
export function defaultDbColumns(): DbColumn[] {
  return [
    { id: 'title', name: 'タイトル', kind: 'text' },
    {
      id: 'status',
      name: 'ステータス',
      kind: 'select',
      options: ['未着手', '進行中', '完了'],
    },
    { id: 'due', name: '期限', kind: 'date' },
  ];
}
