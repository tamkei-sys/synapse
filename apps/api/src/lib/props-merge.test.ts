import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { atomicPropsMerge } from './props-merge.js';

const dialect = new PgDialect();
const render = (patch: Parameters<typeof atomicPropsMerge>[0]) =>
  dialect.sqlToQuery(atomicPropsMerge(patch));

describe('atomicPropsMerge', () => {
  it('set だけなら coalesce した props に 1 つの jsonb 連結を組む', () => {
    const q = render({ set: { title: 'T', tags: ['a'] } });
    expect(q.sql).toBe(`coalesce("block"."props", '{}'::jsonb) || $1::jsonb`);
    expect(q.params).toEqual([JSON.stringify({ title: 'T', tags: ['a'] })]);
  });

  it('clear はキーごとに - key::text を連ねる', () => {
    const q = render({ clear: ['icon', 'cover'] });
    expect(q.sql).toBe(`coalesce("block"."props", '{}'::jsonb) - $1::text - $2::text`);
    expect(q.params).toEqual(['icon', 'cover']);
  });

  it('set と clear の併用は連結 → 削除の順', () => {
    const q = render({ set: { docStatus: 'review' }, clear: ['aiSummary'] });
    expect(q.sql).toBe(`coalesce("block"."props", '{}'::jsonb) || $1::jsonb - $2::text`);
    expect(q.params).toEqual([JSON.stringify({ docStatus: 'review' }), 'aiSummary']);
  });

  it('null 値の set は JSON null として温存される（クリアとは別物）', () => {
    const q = render({ set: { goal: null } });
    expect(q.params).toEqual(['{"goal":null}']);
  });

  it('空 patch は props をそのまま返す式になる（no-op だが妥当な SQL）', () => {
    const q = render({});
    expect(q.sql).toBe(`coalesce("block"."props", '{}'::jsonb)`);
    expect(q.params).toEqual([]);
  });

  it('空の set オブジェクトは連結を生成しない', () => {
    const q = render({ set: {}, clear: ['x'] });
    expect(q.sql).toBe(`coalesce("block"."props", '{}'::jsonb) - $1::text`);
  });
});
