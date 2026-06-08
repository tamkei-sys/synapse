/**
 * Flow block — an embeddable, hand-authored node graph (DAG) with an
 * animated execution-order playback. Inspired by "structure-of-a-large-
 * system" pipeline visualizations: nodes are color-coded by category, edges
 * express flow/dependency, and an ordered list of `steps` lights nodes up
 * one phase at a time.
 *
 * Storage: the whole `FlowDoc` is serialized into a single TipTap node
 * attribute (`flowBlock.doc`, a JSON string) and rides the page's Yjs
 * document — the same self-contained pattern as `mermaidBlock.code`. There is
 * no separate DB `flow` block type; this module owns the *shape* and the pure
 * graph helpers, consumed by the editor node + canvas renderer.
 *
 * `superRefine` enforces referential integrity (edges/steps point at real
 * nodes, nodes at real categories, ids unique) so the renderer can trust the
 * doc without defensive guards.
 */
import { z } from 'zod';

export const FLOW_SCHEMA_VERSION = 1 as const;

/** 6-digit hex, used for category colors (node accent + legend swatch). */
export const flowColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a 6-digit hex like #7c3aed');

const idSchema = z.string().trim().min(1).max(64);

export const flowCategorySchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(80),
  color: flowColorSchema,
});
export type FlowCategory = z.infer<typeof flowCategorySchema>;

export const flowNodeSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(120),
  categoryId: idSchema,
  /** Top-left position in abstract canvas coordinates. */
  x: z.number().finite(),
  y: z.number().finite(),
  /** Optional detail-panel content. */
  subtitle: z.string().max(160).optional(),
  tags: z.array(z.string().trim().min(1).max(48)).max(16).optional(),
  description: z.string().max(2000).optional(),
  /** Implementation snippet / formula shown in the detail panel. */
  code: z.string().max(4000).optional(),
  /** Source reference, e.g. `apps/api/src/handlers/index.ts:handleGetTable`. */
  sourcePath: z.string().max(300).optional(),
});
export type FlowNode = z.infer<typeof flowNodeSchema>;

export const flowEdgeSchema = z.object({
  id: idSchema,
  source: idSchema,
  target: idSchema,
  label: z.string().max(80).optional(),
});
export type FlowEdge = z.infer<typeof flowEdgeSchema>;

export const flowStepSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().max(1200).optional(),
  /** Code / formula snippet shown in the STEP indicator while active. */
  code: z.string().max(2000).optional(),
  /** Nodes lit up during this step (must reference existing nodes). */
  nodeIds: z.array(idSchema).max(64).default([]),
});
export type FlowStep = z.infer<typeof flowStepSchema>;

export const flowDocSchema = z
  .object({
    version: z.literal(FLOW_SCHEMA_VERSION).default(FLOW_SCHEMA_VERSION),
    title: z.string().max(160).default(''),
    subtitle: z.string().max(240).optional(),
    categories: z.array(flowCategorySchema).max(64).default([]),
    nodes: z.array(flowNodeSchema).max(400).default([]),
    edges: z.array(flowEdgeSchema).max(1200).default([]),
    steps: z.array(flowStepSchema).max(200).default([]),
  })
  .superRefine((doc, ctx) => {
    const dupe = (
      arr: ReadonlyArray<{ id: string }>,
      path: string,
    ): Set<string> => {
      const seen = new Set<string>();
      arr.forEach((item, i) => {
        if (seen.has(item.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `duplicate ${path} id "${item.id}"`,
            path: [path, i, 'id'],
          });
        }
        seen.add(item.id);
      });
      return seen;
    };

    const catIds = dupe(doc.categories, 'categories');
    const nodeIds = dupe(doc.nodes, 'nodes');
    dupe(doc.edges, 'edges');
    dupe(doc.steps, 'steps');

    doc.nodes.forEach((n, i) => {
      if (!catIds.has(n.categoryId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `node "${n.id}" references unknown category "${n.categoryId}"`,
          path: ['nodes', i, 'categoryId'],
        });
      }
    });

    doc.edges.forEach((e, i) => {
      if (e.source === e.target) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edge "${e.id}" is a self-loop`,
          path: ['edges', i, 'target'],
        });
      }
      if (!nodeIds.has(e.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edge "${e.id}" references unknown source "${e.source}"`,
          path: ['edges', i, 'source'],
        });
      }
      if (!nodeIds.has(e.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edge "${e.id}" references unknown target "${e.target}"`,
          path: ['edges', i, 'target'],
        });
      }
    });

    doc.steps.forEach((s, i) => {
      s.nodeIds.forEach((nid, j) => {
        if (!nodeIds.has(nid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `step "${s.id}" references unknown node "${nid}"`,
            path: ['steps', i, 'nodeIds', j],
          });
        }
      });
    });
  });

export type FlowDoc = z.infer<typeof flowDocSchema>;

/** Parse untrusted input into a validated FlowDoc (throws on invalid). */
export function parseFlowDoc(input: unknown): FlowDoc {
  return flowDocSchema.parse(input);
}

/** Non-throwing variant for trust boundaries (node attr decode, paste). */
export function safeParseFlowDoc(input: unknown): z.SafeParseReturnType<unknown, FlowDoc> {
  return flowDocSchema.safeParse(input);
}

/** A valid, empty document — the starting point for a fresh flow block. */
export function emptyFlowDoc(): FlowDoc {
  return flowDocSchema.parse({});
}

// ---- Pure graph helpers ----------------------------------------------------

/**
 * Kahn's algorithm grouped by layer: returns node ids in topological waves,
 * where layer N depends only on layers < N. Nodes in a cycle (or whatever
 * remains once the queue drains) are appended as a final layer so the result
 * always covers every node exactly once.
 */
export function topoLayers(doc: Pick<FlowDoc, 'nodes' | 'edges'>): string[][] {
  const ids = doc.nodes.map((n) => n.id);
  const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of doc.edges) {
    if (!indeg.has(e.source) || !indeg.has(e.target)) continue;
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    out.get(e.source)?.push(e.target);
  }

  const layers: string[][] = [];
  const placed = new Set<string>();
  let frontier = ids.filter((id) => (indeg.get(id) ?? 0) === 0);

  while (frontier.length > 0) {
    layers.push(frontier);
    frontier.forEach((id) => placed.add(id));
    const next: string[] = [];
    for (const id of frontier) {
      for (const t of out.get(id) ?? []) {
        const d = (indeg.get(t) ?? 0) - 1;
        indeg.set(t, d);
        if (d === 0 && !placed.has(t)) next.push(t);
      }
    }
    frontier = next;
  }

  const leftover = ids.filter((id) => !placed.has(id));
  if (leftover.length > 0) layers.push(leftover);
  return layers;
}

/**
 * Fallback playback when a flow has no authored `steps`: one step per
 * topological layer, lighting that layer's nodes. Lets "▶ 一括実行" work on
 * any graph without hand-authored steps.
 */
export function deriveSteps(doc: Pick<FlowDoc, 'nodes' | 'edges'>): FlowStep[] {
  return topoLayers(doc).map((nodeIds, i) => ({
    id: `auto-${i + 1}`,
    title: `ステップ ${i + 1}`,
    nodeIds,
  }));
}

/** Authored steps if present, else the topological fallback. */
export function effectiveSteps(doc: FlowDoc): FlowStep[] {
  return doc.steps.length > 0 ? doc.steps : deriveSteps(doc);
}
