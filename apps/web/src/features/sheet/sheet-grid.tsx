/**
 * Spreadsheet rendered with AG Grid Community + HyperFormula.
 *
 * Single source of truth for cell input is `cells` (A1 → raw string,
 * formulas start with `=`). HyperFormula holds a parallel in-memory
 * sheet and tells us the computed value for each cell on every keystroke
 * commit.
 *
 * The renderer is unaware of the database — `onCellsChange` fires after
 * a successful local update so the consumer (TipTap node) can debounce
 * a tRPC `block.updateSheetCells` call.
 */
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import {
  type CellValueChangedEvent,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { HyperFormula } from 'hyperformula';
import { useEffect, useMemo, useRef, useState } from 'react';

import { colIndexToLetter, makeCellRef, parseCellRef, type SheetCells } from '@synapse/blocks';

const HF_LICENSE_KEY = 'gpl-v3'; // HyperFormula's public GPLv3 build key.
const HF_SHEET_ID = 0;

type SheetGridProps = {
  rows: number;
  cols: number;
  cells: SheetCells;
  onCellsChange: (next: SheetCells) => void;
  readOnly?: boolean;
};

/** AG Grid row: `__row` is the zero-based row index; lettered keys hold
 * the rendered cell values for columns A, B, C, ... */
type Row = { __row: number; [columnLetter: string]: string | number };

export function SheetGrid({ rows, cols, cells, onCellsChange, readOnly }: SheetGridProps) {
  // HyperFormula instance is owned by the component for its lifetime.
  // We mutate it in place on edits, so a ref is the right fit.
  const hfRef = useRef<HyperFormula | null>(null);
  if (!hfRef.current) {
    hfRef.current = HyperFormula.buildEmpty({ licenseKey: HF_LICENSE_KEY });
    hfRef.current.addSheet('default');
  }

  // `data` is the AG Grid rowData. We seed it from props once; subsequent
  // edits flow through HyperFormula and back into setData.
  const [data, setData] = useState<Row[]>(() => buildRows(hfRef.current, rows, cols, cells));

  // Re-seed when the cell map changes from outside (initial load, reload).
  useEffect(() => {
    if (!hfRef.current) return;
    const hf = hfRef.current;
    // HF doesn't ship a "clear sheet" helper that's both 1-call and 2.x
    // stable, so we recreate the sheet instead — the engine is small.
    if (hf.doesSheetExist('default')) {
      hf.removeSheet(HF_SHEET_ID);
    }
    hf.addSheet('default');
    seedHF(hf, rows, cols, cells);
    setData(buildRowsFromHF(hf, rows, cols));
    // We intentionally re-seed only on cell-map identity change.
  }, [cells, rows, cols]);

  const colDefs = useMemo<ColDef<Row>[]>(() => {
    const defs: ColDef<Row>[] = [
      {
        field: '__row',
        headerName: '',
        width: 48,
        pinned: 'left',
        editable: false,
        cellClass: 'sheet-row-header',
        valueGetter: (p) => (p.data ? p.data.__row + 1 : ''),
      },
    ];
    for (let c = 0; c < cols; c++) {
      const letter = colIndexToLetter(c);
      defs.push({
        field: letter,
        headerName: letter,
        width: 110,
        editable: !readOnly,
        cellRenderer: (p: ICellRendererParams<Row>) => (
          <span data-cell-ref={makeCellRef(c, p.data?.__row ?? 0)}>{p.value ?? ''}</span>
        ),
      });
    }
    return defs;
  }, [cols, readOnly]);

  function handleCellValueChanged(event: CellValueChangedEvent<Row>) {
    if (!hfRef.current || !event.data || event.colDef.field === '__row') return;
    const colLetter = event.colDef.field;
    if (!colLetter) return;
    const rowIndex = event.data.__row;
    const colIndex = parseCellRef(`${colLetter}${rowIndex + 1}`)?.col ?? 0;
    const cellRef = makeCellRef(colIndex, rowIndex);
    const raw = String(event.newValue ?? '');

    const hf = hfRef.current;
    hf.setCellContents({ sheet: HF_SHEET_ID, col: colIndex, row: rowIndex }, raw);

    // Persist the user-entered formula/value only. Computed values
    // re-derive on reload from the HF re-evaluation of the cell map.
    const next: SheetCells = { ...cells };
    if (raw === '') delete next[cellRef];
    else next[cellRef] = raw;

    onCellsChange(next);
    setData(buildRowsFromHF(hf, rows, cols));
  }

  return (
    <div className="ag-theme-quartz" style={{ height: 32 + rows * 32, width: '100%' }}>
      <AgGridReact<Row>
        rowData={data}
        columnDefs={colDefs}
        rowHeight={32}
        headerHeight={32}
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        suppressMovableColumns
        animateRows={false}
        onCellValueChanged={handleCellValueChanged}
        domLayout="normal"
      />
    </div>
  );
}

// ---- helpers ----------------------------------------------------------------

function seedHF(hf: HyperFormula, rows: number, cols: number, cells: SheetCells): void {
  const data: (string | number | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (string | number | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const ref = makeCellRef(c, r);
      row.push(cells[ref] ?? null);
    }
    data.push(row);
  }
  hf.setSheetContent(HF_SHEET_ID, data);
}

function buildRows(hf: HyperFormula | null, rows: number, cols: number, cells: SheetCells): Row[] {
  if (hf) seedHF(hf, rows, cols, cells);
  return buildRowsFromHF(hf, rows, cols);
}

function buildRowsFromHF(hf: HyperFormula | null, rows: number, cols: number): Row[] {
  const out: Row[] = [];
  for (let r = 0; r < rows; r++) {
    const row: Row = { __row: r };
    for (let c = 0; c < cols; c++) {
      const letter = colIndexToLetter(c);
      if (!hf) {
        row[letter] = '';
        continue;
      }
      const value = hf.getCellValue({ sheet: HF_SHEET_ID, col: c, row: r });
      row[letter] = formatValue(value);
    }
    out.push(row);
  }
  return out;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
    // HF DetailedCellError → "#REF!" etc.
    return String((value as { value: unknown }).value);
  }
  return String(value);
}
