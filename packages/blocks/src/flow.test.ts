import { describe, expect, it } from 'vitest';

import {
  deriveSteps,
  effectiveSteps,
  emptyFlowDoc,
  flowDocSchema,
  parseFlowDoc,
  safeParseFlowDoc,
  topoLayers,
  type FlowDoc,
} from './flow.js';

const cat = { id: 'c1', label: 'Data', color: '#7c3aed' };
const node = (id: string, categoryId = 'c1') => ({ id, label: id, categoryId, x: 0, y: 0 });

function baseDoc(over: Partial<FlowDoc> = {}): unknown {
  return {
    title: 'Pipeline',
    categories: [cat],
    nodes: [node('a'), node('b')],
    edges: [{ id: 'e1', source: 'a', target: 'b' }],
    steps: [{ id: 's1', title: 'Step 1', nodeIds: ['a'] }],
    ...over,
  };
}

describe('flowDocSchema', () => {
  it('parses a valid doc and applies defaults', () => {
    const doc = parseFlowDoc(baseDoc());
    expect(doc.version).toBe(1);
    expect(doc.nodes).toHaveLength(2);
    expect(doc.edges[0]?.label).toBeUndefined();
    // step nodeIds default to [] when omitted
    const d2 = parseFlowDoc(baseDoc({ steps: [{ id: 's', title: 't' }] as never }));
    expect(d2.steps[0]?.nodeIds).toEqual([]);
  });

  it('emptyFlowDoc is valid and empty', () => {
    const doc = emptyFlowDoc();
    expect(doc.nodes).toEqual([]);
    expect(doc.categories).toEqual([]);
    expect(flowDocSchema.safeParse(doc).success).toBe(true);
  });

  it('rejects a node referencing an unknown category', () => {
    const r = safeParseFlowDoc(baseDoc({ nodes: [node('a', 'missing')] }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/unknown category/);
  });

  it('rejects edges referencing unknown nodes', () => {
    const r = safeParseFlowDoc(baseDoc({ edges: [{ id: 'e', source: 'a', target: 'ghost' }] }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => /unknown target/.test(i.message))).toBe(true);
  });

  it('rejects self-loop edges', () => {
    const r = safeParseFlowDoc(baseDoc({ edges: [{ id: 'e', source: 'a', target: 'a' }] }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => /self-loop/.test(i.message))).toBe(true);
  });

  it('rejects duplicate node ids', () => {
    const r = safeParseFlowDoc(baseDoc({ nodes: [node('a'), node('a')], edges: [] }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => /duplicate nodes id/.test(i.message))).toBe(true);
  });

  it('rejects a step referencing an unknown node', () => {
    const r = safeParseFlowDoc(baseDoc({ steps: [{ id: 's', title: 't', nodeIds: ['ghost'] }] }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => /unknown node/.test(i.message))).toBe(true);
  });

  it('rejects a bad hex color', () => {
    const r = safeParseFlowDoc(baseDoc({ categories: [{ id: 'c1', label: 'x', color: 'red' }] }));
    expect(r.success).toBe(false);
  });
});

describe('topoLayers', () => {
  it('orders a simple chain into one node per layer', () => {
    const doc = parseFlowDoc(baseDoc());
    expect(topoLayers(doc)).toEqual([['a'], ['b']]);
  });

  it('groups a diamond correctly', () => {
    const doc = parseFlowDoc({
      categories: [cat],
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'a', target: 'c' },
        { id: '3', source: 'b', target: 'd' },
        { id: '4', source: 'c', target: 'd' },
      ],
    });
    const layers = topoLayers(doc);
    expect(layers[0]).toEqual(['a']);
    expect(new Set(layers[1])).toEqual(new Set(['b', 'c']));
    expect(layers[2]).toEqual(['d']);
  });

  it('covers every node even when a cycle is present', () => {
    const doc = parseFlowDoc({
      categories: [cat],
      nodes: [node('a'), node('b'), node('c')],
      edges: [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'c' },
        { id: '3', source: 'c', target: 'b' }, // cycle b<->c
      ],
    });
    const flat = topoLayers(doc).flat().sort();
    expect(flat).toEqual(['a', 'b', 'c']);
  });
});

describe('deriveSteps / effectiveSteps', () => {
  it('derives one step per topological layer', () => {
    const doc = parseFlowDoc(baseDoc({ steps: [] }));
    const steps = deriveSteps(doc);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.nodeIds).toEqual(['a']);
  });

  it('effectiveSteps prefers authored steps', () => {
    const doc = parseFlowDoc(baseDoc());
    expect(effectiveSteps(doc)).toHaveLength(1);
    expect(effectiveSteps(doc)[0]?.id).toBe('s1');
  });

  it('effectiveSteps falls back to derived when none authored', () => {
    const doc = parseFlowDoc(baseDoc({ steps: [] }));
    expect(effectiveSteps(doc).length).toBeGreaterThan(0);
    expect(effectiveSteps(doc)[0]?.id).toMatch(/^auto-/);
  });
});
