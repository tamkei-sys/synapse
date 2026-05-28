/**
 * `=ASK("prompt")` — out-of-band "formula" for the SYNAPSE spreadsheet.
 *
 * HyperFormula's plugin API requires functions to be synchronous; an
 * async API call doesn't fit. Instead the SheetGrid renderer
 * intercepts raw cell input matching the ASK pattern, fires a tRPC
 * call to fetch the answer, and renders the resolved text in place of
 * the raw expression. Cells with `=ASK(...)` are stored as-is in the
 * block.props.cells map so the source-of-truth round-trips.
 *
 * This module owns the parsing surface so both client and server can
 * share it.
 */

const ASK_PATTERN = /^=\s*ASK\s*\(\s*("([^"]*)"|'([^']*)')\s*\)\s*$/i;

export type AskExpression = {
  raw: string;
  prompt: string;
};

/** Detect a literal `=ASK("...")` cell. Returns the inner prompt or null. */
export function parseAskExpression(value: string): AskExpression | null {
  const m = ASK_PATTERN.exec(value);
  if (!m) return null;
  const prompt = m[2] ?? m[3] ?? '';
  return { raw: value, prompt };
}

export function isAskExpression(value: string): boolean {
  return ASK_PATTERN.test(value);
}
