import type { GridPainterState } from './lightsFrameGrid.types';

export const MINIMUM_DRAG_DISTANCE = 0;
export const DEFAULT_PAINTER_STATE: GridPainterState = {
  offsetStart: 0,
  offsetCurrent: 0,
  offsetTarget: 0,
  animationId: 0,
  animationTime: 0,
  animationDuration: 0,
  dragStartOffsetX: 0,
  dragDistanceX: 0,
  dragLastOffsetX: 0,
  dragStartOffsetY: 0,
  dragDistanceY: 0,
  dragLastOffsetY: 0,
  isDragStarted: false,
  isDragging: false,
  dragged: false,
  itemIndex: -1,
};
