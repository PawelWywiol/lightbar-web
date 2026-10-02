import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRID_CELL_STEP, GRID_LONG_PRESS_MS } from '../../editor.config';
import type { EditorMode } from '../../editor.types';
import type { GridController } from './schemeGrid.controller';
import { createGridController } from './schemeGrid.controller';

const colors = [
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
  ['g', 'h', 'i'],
];

const at = (column: number, row: number) => ({
  clientX: column * GRID_CELL_STEP + 1,
  clientY: row * GRID_CELL_STEP + 1,
});

const controllers: GridController[] = [];

const setup = (mode: EditorMode) => {
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = vi.fn();
  const callbacks = { onPaint: vi.fn(), onSelectRow: vi.fn(), onMoveRow: vi.fn() };
  const controller = createGridController(canvas, callbacks);
  controller.update({ colors, mode, activeRow: 0, paintColor: 'x' });
  controllers.push(controller);
  const dispatch = (type: string, init: PointerEventInit) =>
    canvas.dispatchEvent(
      new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, ...init }),
    );
  return { callbacks, dispatch };
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  for (const controller of controllers.splice(0)) controller.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createGridController', () => {
  describe('paint mode', () => {
    it('paints the clicked base cell', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', at(1, 0));
      dispatch('pointerup', at(1, 0));
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 0, column: 1 }]);
    });

    it('maps a repeated copy to its base cell', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', at(4, 5));
      dispatch('pointerup', at(4, 5));
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 2, column: 1 }]);
    });

    it('collects every crossed cell once per stroke', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', at(0, 0));
      dispatch('pointermove', at(2, 0));
      dispatch('pointermove', at(0, 0));
      dispatch('pointerup', at(0, 0));
      expect(callbacks.onPaint).toHaveBeenCalledTimes(1);
      expect(callbacks.onPaint).toHaveBeenCalledWith([
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
      ]);
    });

    it('cancels the stroke when a second finger touches', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch', pointerId: 1 });
      dispatch('pointerdown', { ...at(2, 2), pointerType: 'touch', pointerId: 2 });
      dispatch('pointermove', { ...at(1, 1), pointerType: 'touch', pointerId: 2 });
      dispatch('pointerup', { ...at(0, 0), pointerType: 'touch', pointerId: 1 });
      dispatch('pointerup', { ...at(1, 1), pointerType: 'touch', pointerId: 2 });
      expect(callbacks.onPaint).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('selects the base row on tap', () => {
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 4));
      dispatch('pointerup', at(0, 4));
      expect(callbacks.onSelectRow).toHaveBeenCalledWith(1);
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    });

    it('moves a row dragged with the mouse', () => {
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 0));
      dispatch('pointermove', at(0, 2));
      dispatch('pointerup', at(0, 2));
      expect(callbacks.onSelectRow).toHaveBeenCalledWith(0);
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(0, 2);
    });

    it('moves a row after a touch long press', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch' });
      vi.advanceTimersByTime(GRID_LONG_PRESS_MS);
      dispatch('pointermove', { ...at(0, 2), pointerType: 'touch' });
      dispatch('pointerup', { ...at(0, 2), pointerType: 'touch' });
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(0, 2);
    });

    it('pans instead of dragging when touch moves before the long press', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch' });
      dispatch('pointermove', { ...at(0, 2), pointerType: 'touch' });
      vi.advanceTimersByTime(GRID_LONG_PRESS_MS);
      dispatch('pointerup', { ...at(0, 2), pointerType: 'touch' });
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
      expect(callbacks.onSelectRow).not.toHaveBeenCalled();
    });

    it('does not move a row dropped on its own slot', () => {
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 1));
      dispatch('pointermove', { clientX: 1, clientY: GRID_CELL_STEP + 12 });
      dispatch('pointerup', { clientX: 1, clientY: GRID_CELL_STEP + 12 });
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    });
  });
});
