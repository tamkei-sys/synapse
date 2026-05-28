/**
 * Page document shape.
 *
 * The canonical content of a page is a TipTap / ProseMirror JSON document
 * stored at `block.props.doc`. We keep the runtime schema loose (jsonb on
 * the DB side, `z.record(z.unknown())` here) — TipTap's own validators
 * catch malformed input on the client, and re-validating on every write
 * would force us to mirror every TipTap extension's node spec.
 */
import { z } from 'zod';

export const pageDocSchema: z.ZodType<PageDoc> = z.object({
  type: z.literal('doc'),
  content: z.array(z.unknown()).optional(),
});

export type PageDoc = {
  type: 'doc';
  content?: unknown[];
};

/** Empty document used when a page is first created. */
export const EMPTY_DOC: PageDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

/** Shape of `block.props` for a page block. */
export const pagePropsSchema = z.object({
  title: z.string(),
  doc: pageDocSchema,
});

export type PageProps = z.infer<typeof pagePropsSchema>;
