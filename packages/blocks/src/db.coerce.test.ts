import { describe, expect, it } from 'vitest';

import { coerceCellValue } from './db.js';

describe('coerceCellValue', () => {
  it('null stays null', () => {
    expect(coerceCellValue(null, 'number')).toBeNull();
  });

  it('to number', () => {
    expect(coerceCellValue('42', 'number')).toBe(42);
    expect(coerceCellValue('abc', 'number')).toBeNull();
    expect(coerceCellValue(true, 'number')).toBe(1);
  });

  it('to checkbox', () => {
    expect(coerceCellValue('yes', 'checkbox')).toBe(true);
    expect(coerceCellValue('false', 'checkbox')).toBe(false);
    expect(coerceCellValue('0', 'checkbox')).toBe(false);
    expect(coerceCellValue('', 'checkbox')).toBe(false);
    expect(coerceCellValue(1, 'checkbox')).toBe(true);
  });

  it('to date keeps only YYYY-MM-DD', () => {
    expect(coerceCellValue('2026-05-31', 'date')).toBe('2026-05-31');
    expect(coerceCellValue('not a date', 'date')).toBeNull();
  });

  it('to text stringifies primitives', () => {
    expect(coerceCellValue(42, 'text')).toBe('42');
    expect(coerceCellValue(true, 'text')).toBe('true');
    expect(coerceCellValue('keep', 'select')).toBe('keep');
  });

  it('to derived kinds clears the value', () => {
    expect(coerceCellValue('x', 'relation')).toBeNull();
    expect(coerceCellValue('x', 'rollup')).toBeNull();
    expect(coerceCellValue('x', 'formula')).toBeNull();
  });
});
