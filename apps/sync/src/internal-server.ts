/**
 * Internal HTTP endpoint for trusted server-to-server document writes
 * (ADR-0011). Separate from the public Hocuspocus websocket port and gated by
 * a shared secret; the caller (the MCP server) sends it as `x-internal-secret`.
 * Authorization of the acting user happens in `applyDocWrite`.
 *
 * This must only be reachable on an internal network — never exposed publicly.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { Hocuspocus } from '@hocuspocus/server';

import type { Database } from './db.js';
import { applyDocWrite, DocWriteError, type DocWriteRequest, type PmDoc } from './doc-write.js';
import { markdownToPmDoc } from './markdown.js';

const PATH = '/internal/doc/write';
const MAX_BODY_BYTES = 2_000_000;

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new DocWriteError(413, 'body too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Hand-validate the request body (sync has no zod dependency). */
function parseRequest(raw: unknown): DocWriteRequest {
  if (typeof raw !== 'object' || raw === null) throw new DocWriteError(400, 'invalid body');
  const b = raw as Record<string, unknown>;
  if (typeof b['blockId'] !== 'string' || b['blockId'].length === 0) {
    throw new DocWriteError(400, 'blockId required');
  }
  if (typeof b['actorUserId'] !== 'string' || b['actorUserId'].length === 0) {
    throw new DocWriteError(400, 'actorUserId required');
  }
  if (b['mode'] !== 'append' && b['mode'] !== 'replace') {
    throw new DocWriteError(400, 'mode must be append or replace');
  }

  // Content is either `markdown` (converted server-side) or a raw ProseMirror
  // `doc`. The MCP tools send markdown.
  let doc: PmDoc;
  if (typeof b['markdown'] === 'string') {
    if (b['markdown'].trim().length === 0) throw new DocWriteError(400, 'markdown is empty');
    doc = markdownToPmDoc(b['markdown']);
  } else {
    const raw = b['doc'] as { type?: unknown; content?: unknown } | undefined;
    if (!raw || raw.type !== 'doc') {
      throw new DocWriteError(400, 'provide `markdown` or a ProseMirror `doc`');
    }
    if (raw.content !== undefined && !Array.isArray(raw.content)) {
      throw new DocWriteError(400, 'doc.content must be an array');
    }
    doc = raw as PmDoc;
  }
  return { blockId: b['blockId'], actorUserId: b['actorUserId'], mode: b['mode'], doc };
}

export function startInternalServer(opts: {
  server: Hocuspocus;
  db: Database;
  port: number;
  secret: string;
}): void {
  const http = createServer((req, res) => {
    void (async () => {
      try {
        if (req.method !== 'POST' || (req.url ?? '') !== PATH) {
          return send(res, 404, { error: 'not found' });
        }
        if (req.headers['x-internal-secret'] !== opts.secret) {
          return send(res, 401, { error: 'unauthorized' });
        }
        const request = parseRequest(JSON.parse(await readBody(req)));
        const result = await applyDocWrite(opts.server, opts.db, request);
        return send(res, 200, result);
      } catch (err) {
        if (err instanceof DocWriteError) return send(res, err.status, { error: err.message });
        const message = err instanceof Error ? err.message : String(err);
        return send(res, 500, { error: message });
      }
    })();
  });

  http.listen(opts.port, () => {
    console.info(`[synapse-sync] internal doc-write API on :${opts.port}`);
  });
}
