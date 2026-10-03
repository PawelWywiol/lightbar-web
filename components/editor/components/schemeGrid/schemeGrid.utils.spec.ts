import { describe, expect, it } from 'vitest';
import { GRID_CELL_STEP, GRID_ZOOM_MAX, GRID_ZOOM_MIN } from '../../editor.config';
import {
  applyFriction,
  mod,
  resolveBaseCell,
  resolveCopy,
  resolveDrop,
  resolveRowHeight,
  resolveTops,
  resolveVisibleRange,
  resolveWheelDelta,
  resolveZoom,
} from './schemeGrid.utils';

const STEP = GRID_CELL_STEP;
const ones = (rows: number) => Array.from({ length: rows }, () => 1);

describe('schemeGrid.utils', () => {
  it('mod always returns a non-negative remainder', () => {
    expect(mod(4, 3)).toBe(1);
    expect(mod(-1, 3)).toBe(2);
    expect(mod(-3, 3)).toBe(0);
  });

  it('resolveBaseCell maps any repeated copy to its base cell', () => {
    const size = { heights: [1, 1, 1], columns: 2 };
    expect(resolveBaseCell({ x: 1, y: 1 }, { x: 0, y: 0 }, size, STEP)).toEqual({ row: 0, column: 0 });
    expect(resolveBaseCell({ x: 3 * STEP + 1, y: 4 * STEP + 1 }, { x: 0, y: 0 }, size, STEP)).toEqual({
      row: 1,
      column: 1,
    });
    expect(resolveBaseCell({ x: 0, y: 0 }, { x: -1, y: -STEP - 1 }, size, STEP)).toEqual({ row: 1, column: 1 });
  });

  it('resolveBaseCell scales cells with the step', () => {
    const size = { heights: [1, 1, 1], columns: 2 };
    expect(resolveBaseCell({ x: 2 * STEP + 1, y: 2 * STEP + 1 }, { x: 0, y: 0 }, size, 2 * STEP)).toEqual({
      row: 1,
      column: 1,
    });
  });

  it('resolveCopy returns the row and column block of the copy under the point', () => {
    const size = { heights: [1, 1, 1], columns: 2 };
    expect(resolveCopy({ x: 1, y: 1 }, { x: 0, y: 0 }, size, STEP)).toEqual({ rowBlock: 0, columnBlock: 0 });
    expect(resolveCopy({ x: 4 * STEP + 1, y: 3 * STEP + 1 }, { x: 0, y: 0 }, size, STEP)).toEqual({
      rowBlock: 1,
      columnBlock: 2,
    });
    expect(resolveCopy({ x: 0, y: 0 }, { x: -1, y: -1 }, size, STEP)).toEqual({ rowBlock: -1, columnBlock: -1 });
    expect(resolveCopy({ x: 4 * STEP + 1, y: 3 * STEP + 1 }, { x: 0, y: 0 }, size, 2 * STEP)).toEqual({
      rowBlock: 0,
      columnBlock: 1,
    });
  });

  it('resolveVisibleRange covers partially visible cells', () => {
    expect(resolveVisibleRange(0, 100, STEP)).toEqual({ start: 0, end: 3 });
    expect(resolveVisibleRange(-10, STEP, STEP)).toEqual({ start: -1, end: 1 });
    expect(resolveVisibleRange(0, 100, 2 * STEP)).toEqual({ start: 0, end: 2 });
  });

  it('resolveDrop rounds the delta inside the block', () => {
    expect(resolveDrop(1, 40 / STEP, ones(3))).toMatchObject({ to: 2, shift: 0 });
    expect(resolveDrop(1, 10 / STEP, ones(3))).toMatchObject({ to: 1, shift: 0 });
    expect(resolveDrop(1, 30 / (2 * STEP), ones(3))).toMatchObject({ to: 1, shift: 0 });
  });

  it('resolveDrop wraps a target across block boundaries', () => {
    expect(resolveDrop(3, STEP / STEP, ones(4))).toMatchObject({ to: 1, shift: -1 });
    expect(resolveDrop(3, (2 * STEP) / STEP, ones(4))).toMatchObject({ to: 2, shift: -1 });
    expect(resolveDrop(0, -STEP / STEP, ones(4))).toMatchObject({ to: 2, shift: 1 });
    expect(resolveDrop(0, (5 * STEP) / STEP, ones(1))).toMatchObject({ to: 0, shift: 0 });
    expect(resolveDrop(3, (2 * STEP) / (2 * STEP), ones(4))).toMatchObject({ to: 1, shift: -1 });
  });

  it('resolveDrop keeps every visible slot of the drag preview equal to the moved order', () => {
    const mismatches: string[] = [];
    for (let rows = 2; rows <= 5; rows++) {
      for (let from = 0; from < rows; from++) {
        for (let delta = -2 * rows; delta <= 2 * rows; delta++) {
          const { to, shift, targets } = resolveDrop(from, delta, ones(rows));
          const order = Array.from({ length: rows }, (_, row) => row).filter((row) => row !== from);
          order.splice(to, 0, from);
          const preview = targets.map((slot, row) => (row === from ? from + delta : slot + shift));
          for (let slot = from + delta - 2 * rows; slot <= from + delta + 2 * rows; slot++) {
            const shown = preview.findIndex((position) => mod(position - slot, rows) === 0);
            if (shown !== order[mod(slot - shift, rows)]) mismatches.push(`${rows}/${from}/${delta}/${slot}`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('resolveRowHeight uses frame seconds with a minimum height', () => {
    expect([60, 120, 1, 240].map(resolveRowHeight)).toEqual([1, 0.5, 60, 0.3]);
  });

  it('resolveTops stacks row heights', () => {
    expect(resolveTops([1, 0.5, 2])).toEqual([0, 1, 1.5]);
  });

  it('resolveBaseCell and resolveCopy follow variable row heights', () => {
    const layout = { heights: [2, 0.5, 1], columns: 1 };
    const rowAt = (y: number) => resolveBaseCell({ x: 0, y: y * STEP }, { x: 0, y: 0 }, layout, STEP).row;
    expect([rowAt(0), rowAt(1.9), rowAt(2.1), rowAt(2.6), rowAt(3.6), rowAt(-0.1)]).toEqual([0, 0, 1, 2, 0, 2]);
    expect(resolveCopy({ x: 0, y: 3.6 * STEP }, { x: 0, y: 0 }, layout, STEP).rowBlock).toBe(1);
  });

  it('resolveDrop passes a row once the drag covers half of its height', () => {
    const heights = [1, 4, 0.5];
    expect(resolveDrop(0, 1.9, heights)).toMatchObject({ to: 0, steps: 0 });
    expect(resolveDrop(0, 2, heights)).toMatchObject({ to: 1, steps: 1, shift: 0, targets: [4, 0, 5] });
    expect(resolveDrop(2, -2, heights)).toMatchObject({ to: 1, steps: -1, shift: 0, targets: [0, 1.5, 1] });
  });

  it('resolveDrop wraps a variable height row keeping other rows in place', () => {
    const heights = [1, 4, 0.5];
    const { to, shift, block, targets } = resolveDrop(0, -0.5, heights);
    expect({ to, block, shift, targets }).toEqual({ to: 1, block: -1, shift: 1, targets: [4, 0, 5] });
  });

  it('resolveZoom keeps the world point under the anchor fixed', () => {
    const offset = { x: 30, y: -50 };
    const point = { x: 100, y: 40 };
    const { offset: next, zoom } = resolveZoom(offset, point, 1, 1.5);
    expect(zoom).toBe(1.5);
    expect((point.x + next.x) / (STEP * zoom)).toBeCloseTo((point.x + offset.x) / STEP);
    expect((point.y + next.y) / (STEP * zoom)).toBeCloseTo((point.y + offset.y) / STEP);
  });

  it('resolveZoom clamps the zoom before anchoring', () => {
    const offset = { x: 0, y: 0 };
    const point = { x: 10, y: 10 };
    expect(resolveZoom(offset, point, 1, 10)).toEqual({ offset: { x: 10, y: 10 }, zoom: GRID_ZOOM_MAX });
    expect(resolveZoom(offset, point, 1, 0.1)).toEqual({ offset: { x: -5, y: -5 }, zoom: GRID_ZOOM_MIN });
  });

  it('resolveWheelDelta converts line and page deltas to pixels', () => {
    expect(resolveWheelDelta(3, WheelEvent.DOM_DELTA_PIXEL, 500)).toBe(3);
    expect(resolveWheelDelta(3, WheelEvent.DOM_DELTA_LINE, 500)).toBe(48);
    expect(resolveWheelDelta(3, WheelEvent.DOM_DELTA_PAGE, 500)).toBe(1500);
  });

  it('applyFriction decays velocity proportionally to elapsed time', () => {
    expect(applyFriction(1, 16)).toBeCloseTo(0.95);
    expect(applyFriction(1, 32)).toBeCloseTo(0.9025);
  });
});
