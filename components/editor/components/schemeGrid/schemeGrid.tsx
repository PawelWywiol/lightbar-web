import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { MESSAGES } from '../../../../lib/config/messages';
import type { GridCell } from '../../editor.types';
import { moveRow, paintCells, resolveBinaryColorStyle } from '../../editor.utils';
import { useEditorColor, useEditorGrid, useEditorScheme } from '../../providers';
import type { GridController } from './schemeGrid.controller';
import { createGridController } from './schemeGrid.controller';

export const SchemeGrid = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { color } = useEditorColor();
  const { mode, activeRow, setActiveRow, setPreviewRow } = useEditorGrid();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GridController | null>(null);
  const { scheme } = lightsScheme;

  const colors = useMemo(
    () => scheme.frames.map((frame) => frame.colors.map((lightColor) => resolveBinaryColorStyle(lightColor))),
    [scheme.frames],
  );

  const onPaint = useEffectEvent((cells: GridCell[]) => {
    handleUpdate(paintCells(scheme, cells, color));
    const last = cells.at(-1);
    if (last) setPreviewRow(last.row);
  });

  const onSelectRow = useEffectEvent((row: number) => {
    setActiveRow(row);
    setPreviewRow(row);
  });

  const onMoveRow = useEffectEvent((from: number, to: number) => {
    handleUpdate(moveRow(scheme, from, to));
    setActiveRow(to);
    setPreviewRow(to);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = createGridController(canvas, {
      onPaint: (cells) => onPaint(cells),
      onSelectRow: (row) => onSelectRow(row),
      onMoveRow: (from, to) => onMoveRow(from, to),
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update({ colors, mode, activeRow, paintColor: resolveBinaryColorStyle(color) });
  }, [colors, mode, activeRow, color]);

  return (
    <div className="relative flex-1 min-h-0 w-full">
      <div className="absolute inset-y-0 inset-x-2">
        <canvas
          ref={canvasRef}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- canvas has no semantic equivalent
          role="img"
          aria-label={MESSAGES.editor.grid}
          className="block w-full h-full touch-none select-none text-foreground border-border"
        />
      </div>
    </div>
  );
};
