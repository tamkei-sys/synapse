/**
 * Thin Typesense client.
 *
 * We talk to the REST API directly with `fetch` — the official SDK
 * has a heavier Node footprint than we want inside workerd, and our
 * surface is small (one collection, two operations).
 *
 * Collection: `blocks`. Documents mirror the searchable surface of a
 * Block: id, workspaceId, type, title, body. Workspace scoping is
 * enforced by an `eq(workspaceId)` filter at query time.
 */
import type { Env } from '../../env.js';

export type SearchHit = {
  id: string;
  workspaceId: string;
  type: 'page' | 'pbi' | 'sheet';
  title: string;
  body?: string;
  updatedAt?: number;
};

const COLLECTION = 'blocks';

export function getTypesenseConfig(env: Env): { url: string; apiKey: string } | null {
  if (!env.TYPESENSE_URL || !env.TYPESENSE_API_KEY) return null;
  return { url: env.TYPESENSE_URL.replace(/\/$/, ''), apiKey: env.TYPESENSE_API_KEY };
}

async function tsFetch(
  env: Env,
  path: string,
  init: RequestInit & { method: string },
): Promise<Response> {
  const cfg = getTypesenseConfig(env);
  if (!cfg) throw new Error('Typesense is not configured');
  return fetch(`${cfg.url}${path}`, {
    ...init,
    headers: {
      'x-typesense-api-key': cfg.apiKey,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

/** Idempotent: create the `blocks` collection if missing. */
export async function ensureBlocksCollection(env: Env): Promise<void> {
  const cfg = getTypesenseConfig(env);
  if (!cfg) return;
  const probe = await tsFetch(env, `/collections/${COLLECTION}`, { method: 'GET' });
  if (probe.status === 200) return;

  const res = await tsFetch(env, '/collections', {
    method: 'POST',
    body: JSON.stringify({
      name: COLLECTION,
      enable_nested_fields: true,
      fields: [
        { name: 'workspaceId', type: 'string', facet: true },
        { name: 'type', type: 'string', facet: true },
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string', optional: true },
        // Typesense forbids `default_sorting_field` to be optional; keep
        // updatedAt required so empty-query listings stay deterministic.
        { name: 'updatedAt', type: 'int64', sort: true },
      ],
      default_sorting_field: 'updatedAt',
    }),
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    throw new Error(`Typesense createCollection failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

/** Upsert a single document. */
export async function indexBlock(env: Env, doc: SearchHit): Promise<void> {
  const cfg = getTypesenseConfig(env);
  if (!cfg) return;
  await ensureBlocksCollection(env);
  const res = await tsFetch(env, `/collections/${COLLECTION}/documents?action=upsert`, {
    method: 'POST',
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`[typesense] upsert failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

/** Best-effort delete; not found is treated as success. */
export async function unindexBlock(env: Env, id: string): Promise<void> {
  const cfg = getTypesenseConfig(env);
  if (!cfg) return;
  const res = await tsFetch(env, `/collections/${COLLECTION}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.warn(`[typesense] delete failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

export type SearchResponse = {
  hits: Array<{ document: SearchHit }>;
  found: number;
};

export async function searchBlocks(
  env: Env,
  workspaceId: string,
  query: string,
  limit = 10,
): Promise<SearchResponse> {
  const cfg = getTypesenseConfig(env);
  if (!cfg) return { hits: [], found: 0 };
  await ensureBlocksCollection(env);

  const params = new URLSearchParams({
    q: query || '*',
    query_by: 'title,body',
    filter_by: `workspaceId:=${workspaceId}`,
    per_page: String(limit),
    // Sort by recency when the query is empty; relevance wins otherwise.
    sort_by: query ? '_text_match:desc' : 'updatedAt:desc',
  });
  const res = await tsFetch(env, `/collections/${COLLECTION}/documents/search?${params}`, {
    method: 'GET',
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`[typesense] search failed (${res.status}): ${text.slice(0, 200)}`);
    return { hits: [], found: 0 };
  }
  const data = (await res.json()) as {
    found: number;
    hits?: Array<{ document: SearchHit }>;
  };
  return { hits: data.hits ?? [], found: data.found };
}
