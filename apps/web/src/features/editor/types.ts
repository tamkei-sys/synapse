/**
 * Shared editor types. Mirrors the server-side shape in
 * apps/api/src/lib/page-doc.ts so client + server stay in lock-step
 * without a runtime dependency on Zod here.
 */
export type PageDoc = {
  type: 'doc';
  content?: unknown[];
};

export const EMPTY_DOC: PageDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
