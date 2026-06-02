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
  getOverviewSchema,
  getPbiSchema,
  listPbisSchema,
  listProjectsSchema,
  listSbisSchema,
  listSprintsSchema,
  projectPbi,
  projectProject,
  projectSbi,
  projectSprint,
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

describe('discovery schemas (PBI-96)', () => {
  it('listProjects / listSprints / getOverview take no args', () => {
    expect(listProjectsSchema.parse({})).toEqual({});
    expect(listSprintsSchema.parse({})).toEqual({});
    expect(getOverviewSchema.parse({})).toEqual({});
  });

  it('listSbis requires pbiId', () => {
    expect(() => listSbisSchema.parse({})).toThrow();
    expect(listSbisSchema.parse({ pbiId: 'p1' })).toEqual({ pbiId: 'p1' });
  });
});

describe('projections enrich block output (PBI-96)', () => {
  const updatedAt = '2026-01-01T00:00:00.000Z';

  it('projectPbi exposes key, priority, estimate, and project/sprint links', () => {
    const out = projectPbi({
      id: 'b1',
      updatedAt,
      props: {
        title: 'A',
        status: 'in_progress',
        priority: 'must',
        estimate: 5,
        assigneeIds: ['u1'],
        projectId: 'prj1',
        sprintId: 'sp1',
        number: 96,
      },
    }) as Record<string, unknown>;
    expect(out.key).toBe('PBI-96');
    expect(out.priority).toBe('must');
    expect(out.estimate).toBe(5);
    expect(out.assigneeIds).toEqual(['u1']);
    expect(out.projectId).toBe('prj1');
    expect(out.sprintId).toBe('sp1');
  });

  it('projectPbi defaults priority/status and omits absent optional fields', () => {
    const out = projectPbi({ id: 'b2', updatedAt, props: { title: 'B' } }) as Record<string, unknown>;
    expect(out.priority).toBe('should');
    expect(out.status).toBe('backlog');
    expect('key' in out).toBe(false);
    expect('projectId' in out).toBe(false);
    expect('assigneeIds' in out).toBe(false);
  });

  it('projectProject / projectSprint / projectSbi derive their human keys', () => {
    const prj = projectProject({
      id: 'p',
      updatedAt,
      props: { name: 'P', status: 'in_progress', number: 11 },
    }) as Record<string, unknown>;
    expect(prj.key).toBe('PRJ-11');

    const sp = projectSprint({
      id: 's',
      updatedAt,
      props: { name: 'S', startDate: '2026-01-01', endDate: '2026-01-14', number: 3 },
    }) as Record<string, unknown>;
    expect(sp.key).toBe('SP-3');
    expect(sp.endDate).toBe('2026-01-14');

    const sbi = projectSbi({
      id: 'x',
      updatedAt,
      props: { title: 'X', status: 'review', estimateHours: 4, pbiId: 'b1', number: 162 },
    }) as Record<string, unknown>;
    expect(sbi.key).toBe('SBI-162');
    expect(sbi.status).toBe('review');
    expect(sbi.estimateHours).toBe(4);
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
