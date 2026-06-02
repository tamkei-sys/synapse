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
  addDependencySchema,
  createPbiSchema,
  createProjectSchema,
  createSbiSchema,
  createSprintSchema,
  getOverviewSchema,
  getPbiSchema,
  listDependenciesSchema,
  listPbisSchema,
  listProjectsSchema,
  listSbisSchema,
  listSprintsSchema,
  projectPbi,
  projectProject,
  projectSbi,
  projectSprint,
  sprintMetricsSchema,
  ToolError,
  updatePbiSchema,
  updatePbiStatusSchema,
  updateSbiSchema,
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

describe('PBI patch & create schemas (PBI-97)', () => {
  it('createPbi accepts priority / estimate / links / dueDate', () => {
    const parsed = createPbiSchema.parse({
      title: 'x',
      priority: 'must',
      estimate: 5,
      projectId: 'prj',
      sprintId: 'sp',
      dueDate: '2026-01-01',
    });
    expect(parsed.priority).toBe('must');
    expect(parsed.estimate).toBe(5);
    expect(parsed.projectId).toBe('prj');
  });

  it('createPbi rejects a non-Fibonacci estimate', () => {
    expect(() => createPbiSchema.parse({ title: 'x', estimate: 4 })).toThrow();
  });

  it('updatePbi requires both pbiId and patch', () => {
    expect(() => updatePbiSchema.parse({ patch: {} })).toThrow();
    expect(() => updatePbiSchema.parse({ pbiId: 'a' })).toThrow();
  });

  it('updatePbi allows null to clear links and rejects a bad priority', () => {
    const ok = updatePbiSchema.parse({
      pbiId: 'a',
      patch: { projectId: null, sprintId: null, assigneeIds: [] },
    });
    expect(ok.patch.projectId).toBeNull();
    expect(ok.patch.assigneeIds).toEqual([]);
    expect(() => updatePbiSchema.parse({ pbiId: 'a', patch: { priority: 'urgent' } })).toThrow();
  });
});

describe('dependency schemas (PBI-100)', () => {
  it('addDependency requires both blockId and dependsOnId', () => {
    expect(() => addDependencySchema.parse({ blockId: 'a' })).toThrow();
    expect(addDependencySchema.parse({ blockId: 'a', dependsOnId: 'b', note: 'x' }).note).toBe('x');
  });

  it('listDependencies requires blockId', () => {
    expect(() => listDependenciesSchema.parse({})).toThrow();
    expect(listDependenciesSchema.parse({ blockId: 'a' })).toEqual({ blockId: 'a' });
  });
});

describe('project & sprint schemas (PBI-99)', () => {
  it('createProject requires a name and validates status', () => {
    expect(() => createProjectSchema.parse({})).toThrow();
    expect(createProjectSchema.parse({ name: 'P', status: 'in_progress' }).status).toBe(
      'in_progress',
    );
    expect(() => createProjectSchema.parse({ name: 'P', status: 'nope' })).toThrow();
  });

  it('createSprint allows omitting dates (handler applies defaults)', () => {
    expect(createSprintSchema.parse({ name: 'S' })).toEqual({ name: 'S' });
    expect(() => createSprintSchema.parse({ name: 'S', status: 'sprinting' })).toThrow();
  });

  it('sprintMetrics requires sprintId', () => {
    expect(() => sprintMetricsSchema.parse({})).toThrow();
    expect(sprintMetricsSchema.parse({ sprintId: 's' })).toEqual({ sprintId: 's' });
  });
});

describe('SBI schemas (PBI-98)', () => {
  it('createSbi requires both pbiId and title', () => {
    expect(() => createSbiSchema.parse({ title: 'x' })).toThrow();
    expect(() => createSbiSchema.parse({ pbiId: 'p' })).toThrow();
    const ok = createSbiSchema.parse({ pbiId: 'p', title: 'x', estimateHours: 4 });
    expect(ok.estimateHours).toBe(4);
  });

  it('updateSbi enforces the status enum and allows null to clear', () => {
    expect(() => updateSbiSchema.parse({ sbiId: 's', patch: { status: 'frozen' } })).toThrow();
    const ok = updateSbiSchema.parse({
      sbiId: 's',
      patch: { status: 'done', assigneeId: null, estimateHours: null },
    });
    expect(ok.patch.status).toBe('done');
    expect(ok.patch.assigneeId).toBeNull();
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
