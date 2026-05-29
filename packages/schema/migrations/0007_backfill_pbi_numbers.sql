-- 既存の PBI に number を後追い付与する one-shot backfill。
--
-- M1 (workspace_member + assertCanWrite + pbi.create に allocateHumanId) より
-- 前に作成された PBI は props.number を持たない。一覧画面で "PBI-–" と
-- 表示される視覚不整合と、entity_sequence が新規 PBI から 1 を再採番する
-- ため履歴が壊れて見える問題を解決する。
--
-- ワークスペース単位で連続採番し、entity_sequence を最終値 + 1 まで
-- 押し上げる。再実行しても WHERE 句で未採番のみ対象になるので冪等。

WITH max_existing AS (
  SELECT
    workspace_id,
    COALESCE(MAX((props->>'number')::int), 0) AS max_num
  FROM block
  WHERE type = 'pbi'
    AND deleted_at IS NULL
    AND props ? 'number'
  GROUP BY workspace_id
),
to_backfill AS (
  SELECT
    b.id,
    b.workspace_id,
    COALESCE(m.max_num, 0)
      + ROW_NUMBER() OVER (PARTITION BY b.workspace_id ORDER BY b.created_at) AS new_num
  FROM block b
  LEFT JOIN max_existing m ON m.workspace_id = b.workspace_id
  WHERE b.type = 'pbi'
    AND b.deleted_at IS NULL
    AND NOT (b.props ? 'number')
)
UPDATE block
SET props = jsonb_set(props, '{number}', to_jsonb(t.new_num)),
    version = block.version + 1,
    updated_at = now()
FROM to_backfill t
WHERE block.id = t.id;
--> statement-breakpoint

-- entity_sequence の next_id を「現状の最大 number + 1」まで押し上げる。
-- 既存値の方が大きい場合は触らない（GREATEST で防御）。
WITH workspace_max AS (
  SELECT
    workspace_id,
    MAX((props->>'number')::int) AS max_num
  FROM block
  WHERE type = 'pbi'
    AND deleted_at IS NULL
    AND props ? 'number'
  GROUP BY workspace_id
)
INSERT INTO entity_sequence (workspace_id, kind, next_id, updated_at)
SELECT workspace_id, 'pbi', max_num + 1, now()
FROM workspace_max
ON CONFLICT (workspace_id, kind) DO UPDATE
SET next_id = GREATEST(entity_sequence.next_id, EXCLUDED.next_id),
    updated_at = now();
