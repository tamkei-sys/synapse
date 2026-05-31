import { describe, expect, it } from 'vitest';

import { resolveDrop } from './kanban-board.js';

type Row = { id: string; status: string };
const items: Row[] = [
  { id: 'a', status: 'backlog' },
  { id: 'b', status: 'in_progress' },
];
const getId = (r: Row) => r.id;
const getStatus = (r: Row) => r.status;

describe('resolveDrop', () => {
  it('moves item to the dropped column status', () => {
    expect(resolveDrop(items, 'a', 'done', getId, getStatus)).toEqual({
      item: items[0],
      status: 'done',
    });
  });

  it('returns null when dropped on the same status', () => {
    expect(resolveDrop(items, 'a', 'backlog', getId, getStatus)).toBeNull();
  });

  it('returns null when there is no drop target', () => {
    expect(resolveDrop(items, 'a', null, getId, getStatus)).toBeNull();
  });

  it('returns null when the active id is unknown', () => {
    expect(resolveDrop(items, 'zzz', 'done', getId, getStatus)).toBeNull();
  });
});
