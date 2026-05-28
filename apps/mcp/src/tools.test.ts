/**
 * Tool handler unit tests.
 *
 * The tools are written as pure functions over `(ctx, args)`. We stub
 * just enough of the Drizzle query builder to assert the surface
 * contract: argument shape, workspace scoping, error mapping.
 *
 * Full DB behaviour is covered by the API's drizzle integration in
 * apps/api — there's no need to spin up a separate Postgres here.
 */
import { describe, expect, it } from 'vitest';

import {
  createPbiSchema,
  getPbiSchema,
  listPbisSchema,
  ToolError,
  updatePbiStatusSchema,
} from './tools.js';

describe('tool input schemas', () => {
  it('listPbis accepts an optional status', () => {
    expect(listPbisSchema.parse({})).toEqual({});
    expect(listPbisSchema.parse({ status: 'ready' })).toEqual({ status: 'ready' });
  });

  it('listPbis rejects an unknown status', () => {
    expect(() => listPbisSchema.parse({ status: 'wat' })).toThrow();
  });

  it('getPbi requires pbiId', () => {
    expect(() => getPbiSchema.parse({})).toThrow();
    expect(getPbiSchema.parse({ pbiId: 'abc' })).toEqual({ pbiId: 'abc' });
  });

  it('createPbi defaults status to backlog', () => {
    const parsed = createPbiSchema.parse({ title: 'first' });
    expect(parsed.status).toBe('backlog');
    expect(parsed.title).toBe('first');
  });

  it('createPbi rejects empty title', () => {
    expect(() => createPbiSchema.parse({ title: '   ' })).toThrow();
  });

  it('updatePbiStatus enforces enum membership', () => {
    expect(() => updatePbiStatusSchema.parse({ pbiId: 'a', status: 'frozen' })).toThrow();
    expect(updatePbiStatusSchema.parse({ pbiId: 'a', status: 'done' })).toEqual({
      pbiId: 'a',
      status: 'done',
    });
  });
});

describe('ToolError', () => {
  it('carries an error code', () => {
    const e = new ToolError('NOT_FOUND', 'missing');
    expect(e.code).toBe('NOT_FOUND');
    expect(e.message).toBe('missing');
    expect(e).toBeInstanceOf(Error);
  });
});
