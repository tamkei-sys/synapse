/**
 * block.props を 1 つの UPDATE 文の中で部分更新するための jsonb 式ビルダー。
 *
 * props を SELECT → JS でマージ → 全量書き戻しすると、SELECT と UPDATE の間に
 * 入った並行書き込み（別ミューテーションや、sync の store フックによる
 * props.doc の jsonb_set 焼き込み）を古い props で巻き戻す lost update になる。
 * updatePageMeta ではこれが実バグ化し、ステータス→種別を連続変更すると先の
 * ステータスが消え、e2e page-doc-meta が間欠失敗していた（PR #58）。
 * 単一文の jsonb 連結／キー削除なら行ロックで直列化され、READ COMMITTED でも
 * 式はロック取得後の最新行に対して評価されるため、触っていないキーは常に
 * 最新の値が残る。
 *
 * `set` は jsonb `||` による浅いマージ（JS スプレッド同様トップレベルキーの
 * 置換）、`clear` は `- key` によるキー削除。ネストしたキーの部分更新が
 * 必要な場合は各呼び出し側で式を組む（db.ts の values.<columnId> など）。
 */
import { sql, type SQL } from 'drizzle-orm';

import { db as schema } from '@synapse/schema';

export function atomicPropsMerge(patch: {
  set?: Record<string, unknown>;
  clear?: readonly string[];
}): SQL {
  let expr = sql`coalesce(${schema.block.props}, '{}'::jsonb)`;
  if (patch.set && Object.keys(patch.set).length > 0) {
    expr = sql`${expr} || ${JSON.stringify(patch.set)}::jsonb`;
  }
  for (const key of patch.clear ?? []) {
    expr = sql`${expr} - ${key}::text`;
  }
  return expr;
}
