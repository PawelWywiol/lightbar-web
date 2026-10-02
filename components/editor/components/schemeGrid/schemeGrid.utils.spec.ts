import { describe, expect, it } from 'vitest';
import { GRID_CELL_STEP } from '../../editor.config';
import {
  applyFriction,
  mod,
  resolveBaseCell,
  resolveDropRow,
  resolveRowSlots,
  resolveVisibleRange,
} from './schemeGrid.utils';

describe('schemeGrid.utils', () => {
  it('mod always returns a non-negative remainder', () => {
    expect(mod(4, 3)).toBe(1);
    expect(mod(-1, 3)).toBe(2);
    expect(mod(-3, 3)).toBe(0);
  });

  it('resolveBaseCell maps any repeated copy to its base cell', () => {
    const size = { rows: 3, columns: 2 };
    expect(resolveBaseCell({ x: 1, y: 1 }, { x: 0, y: 0 }, size)).toEqual({ row: 0, column: 0 });
    expect(resolveBaseCell({ x: 3 * GRID_CELL_STEP + 1, y: 4 * GRID_CELL_STEP + 1 }, { x: 0, y: 0 }, size)).toEqual({
      row: 1,
      column: 1,
    });
    expect(resolveBaseCell({ x: 0, y: 0 }, { x: -1, y: -GRID_CELL_STEP - 1 }, size)).toEqual({ row: 1, column: 1 });
  });

  it('resolveVisibleRange covers partially visible cells', () => {
    expect(resolveVisibleRange(0, 100)).toEqual({ start: 0, end: 3 });
    expect(resolveVisibleRange(-10, GRID_CELL_STEP)).toEqual({ start: -1, end: 1 });
  });

  it('resolveDropRow rounds the delta and clamps to existing rows', () => {
    expect(resolveDropRow(1, 40, 3)).toBe(2);
    expect(resolveDropRow(1, 10, 3)).toBe(1);
    expect(resolveDropRow(1, 500, 3)).toBe(2);
    expect(resolveDropRow(1, -500, 3)).toBe(0);
  });

  it('resolveRowSlots returns visual slot of each base row after a move', () => {
    expect(resolveRowSlots(3, 0, 2)).toEqual([2, 0, 1]);
    expect(resolveRowSlots(3, 2, 0)).toEqual([1, 2, 0]);
    expect(resolveRowSlots(3, 1, 1)).toEqual([0, 1, 2]);
  });

  it('applyFriction decays velocity proportionally to elapsed time', () => {
    expect(applyFriction(1, 16)).toBeCloseTo(0.95);
    expect(applyFriction(1, 32)).toBeCloseTo(0.9025);
  });
});
