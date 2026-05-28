/**
 * Spreadsheet rendered with AG Grid Community + HyperFormula + the
 * SYNAPSE `=ASK()` extension.
 *
 * Cell input is the single source of truth (A1 → raw string). For most
 * formulas HyperFormula evaluates synchronously and we display the
 * computed value. `=ASK("prompt")` is special: it can't run inside HF
 * (async), so the renderer intercepts it, fires a tRPC `ai.ask` call,
 * and shows the resolved text in place of the raw expression. The
 * cells map still stores `=ASK("...")` so the source round-trips on
 * reload.
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { colIndexToLetter, makeCellRef, parseCellRef, type SheetCells } from '@synapse/blocks';
import { parseAskExpression } from '@synapse/formula';

const HF_LICENSE_KEY = 'gpl-v3'; // HyperFormula's public GPLv3 build key.
const HF_SHEET_ID = 0;

type SheetGridProps = {
  rows: number;
  cols: number;
  cells: SheetCells;
  onCellsChange: (next: SheetCells) => void;
  /** Resolver for `=ASK(...)` prompts. Returns `null` while async. */
  resolveAsk?: (prompt: string) => string | null;
  /** Notified when a new `=ASK("...")` lands so the host can kick off
   * the API call. */
  onAskPromptSeen?: (prompt: string) => void;
  readOnly?: boolean;
};

type Row = { __row: number; [columnLetter: string]: string | number };

export function SheetGrid({
  rows,
  cols,
  cells,
  onCellsChange,
  resolveAsk,
  onAskPromptSeen,
  readOnly,
}: SheetGridProps) {
  const hfRef = useRef<HyperFormula | null>(null);
  if (!hfRef.current) {
    hfRef.current = HyperFormula.buildEmpty({ licenseKey: HF_LICENSE_KEY });
    hfRef.current.addSheet('default');
  }

  const computeCellValue = useCallback(
    (col: number, row: number): string => {
      const hf = hfRef.current;
      if (!hf) return '';
      const raw = cells[makeCellRef(col, row)];
      if (typeof raw === 'string') {
        const ask = parseAskExpression(raw);
        if (ask) {
          const resolved = resolveAsk?.(ask.prompt);
          return resolved ?? '…';
        }
      }
      const value = hf.getCellValue({ sheet: HF_SHEET_ID, col, row });
      return formatValue(value);
    },
    [cells, resolveAsk],
  );

  const buildRows = useCallback(
    (rs: number, cs: number): Row[] => {
      const out: Row[] = [];
      for (let r = 0; r < rs; r++) {
        const rowObj: Row = { __row: r };
        for (let c = 0; c < cs; c++) {
          rowObj[colIndexToLetter(c)] = computeCellValue(c, r);
        }
        out.push(rowObj);
      }
      return out;
    },
    [computeCellValue],
  );

  const [data, setData] = useState<Row[]>(() => {
    seedHF(hfRef.current!, rows, cols, cells);
    return buildRows(rows, cols);
  });

  useEffect(() => {
    if (!hfRef.current) return;
    const hf = hfRef.current;
    if (hf.doesSheetExist('default')) hf.removeSheet(HF_SHEET_ID);
    hf.addSheet('default');
    seedHF(hf, rows, cols, cells);
    setData(buildRows(rows, cols));
  }, [cells, rows, cols, buildRows]);

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
    // For ASK cells, don't feed the raw expression to HF (it'd return
    // a #NAME? error). Leave the HF cell empty; the renderer's
    // computeCellValue handles the override.
    const ask = parseAskExpression(raw);
    if (ask) {
      hf.setCellContents({ sheet: HF_SHEET_ID, col: colIndex, row: rowIndex }, null);
      onAskPromptSeen?.(ask.prompt);
    } else {
      hf.setCellContents({ sheet: HF_SHEET_ID, col: colIndex, row: rowIndex }, raw);
    }

    const next: SheetCells = { ...cells };
    if (raw === '') delete next[cellRef];
    else next[cellRef] = raw;

    onCellsChange(next);
    setData(buildRows(rows, cols));
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

// ---- helpers ---------------------------------------------------------------

function seedHF(hf: HyperFormula, rows: number, cols: number, cells: SheetCells): void {
  const data: (string | number | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (string | number | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const ref = makeCellRef(c, r);
      const raw = cells[ref] ?? null;
      // ASK cells stay out of HF — see handleCellValueChanged for why.
      if (typeof raw === 'string' && parseAskExpression(raw)) {
        row.push(null);
      } else {
        row.push(raw);
      }
    }
    data.push(row);
  }
  hf.setSheetContent(HF_SHEET_ID, data);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
    return String((value as { value: unknown }).value);
  }
  return String(value);
}
