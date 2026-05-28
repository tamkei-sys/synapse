/**
 * Sheet block — Excel-like grid embeddable in docs.
 *
 * Storage shape (S7 minimum):
 *   - `rows` / `cols`  visible grid size
 *   - `cells`          sparse map keyed by A1-style refs ("A1", "B2", …)
 *                      values are RAW user input (strings, possibly
 *                      formulas like "=SUM(A1:A10)"). HyperFormula does
 *                      the rest at render time on the client.
 *
 * Stored under `block.props` so the whole sheet round-trips through one
 * jsonb column. A sheet that grows past a few thousand cells will want
 * its own table (`sheet_cell`); the schema's Zod max-size limit gives
 * us a clean cutover point if we hit that.
 */
import { z } from 'zod';

export const SHEET_DEFAULT_ROWS = 10;
export const SHEET_DEFAULT_COLS = 8;

// Constrained so a single sheet can't blow up the jsonb column. 4096
// non-empty cells covers ~50×80 grids; bigger sheets need the dedicated
// sheet_cell table that's reserved for S7+ follow-ups.
const MAX_CELLS = 4096;

export const cellRefSchema = z.string().regex(/^[A-Z]{1,2}[1-9][0-9]{0,3}$/, 'invalid A1 cell ref');

export const sheetCellsSchema = z
  .record(cellRefSchema, z.string().max(1024))
  .refine((m) => Object.keys(m).length <= MAX_CELLS, {
    message: `sheet has too many cells (max ${MAX_CELLS})`,
  });

export type SheetCells = z.infer<typeof sheetCellsSchema>;

export const sheetPropsSchema = z.object({
  rows: z.number().int().min(1).max(500).default(SHEET_DEFAULT_ROWS),
  cols: z.number().int().min(1).max(26).default(SHEET_DEFAULT_COLS),
  cells: sheetCellsSchema.default({}),
});

export type SheetProps = z.infer<typeof sheetPropsSchema>;

// ---- A1 notation helpers ----------------------------------------------------

/** "A" → 0, "Z" → 25, "AA" → 26 */
export function colLetterToIndex(letter: string): number {
  let idx = 0;
  for (const ch of letter.toUpperCase()) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
}

/** 0 → "A", 25 → "Z", 26 → "AA" */
export function colIndexToLetter(index: number): string {
  let n = index;
  let letter = '';
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/** ("A", 1) → "A1" */
export function makeCellRef(col: number, row: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

/** Parse "A1" → { col: 0, row: 0 } */
export function parseCellRef(ref: string): { col: number; row: number } | null {
  const m = ref.match(/^([A-Z]{1,2})([1-9][0-9]{0,3})$/);
  if (!m || !m[1] || !m[2]) return null;
  return { col: colLetterToIndex(m[1]), row: Number(m[2]) - 1 };
}
