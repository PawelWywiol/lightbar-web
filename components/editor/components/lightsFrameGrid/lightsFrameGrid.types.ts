export interface GridPainterState {
  offsetStart: number;
  offsetCurrent: number;
  offsetTarget: number;
  animationId: number;
  animationTime: number;
  animationDuration: number;
  dragStartOffsetX: number;
  dragDistanceX: number;
  dragLastOffsetX: number;
  dragStartOffsetY: number;
  dragDistanceY: number;
  dragLastOffsetY: number;
  isDragStarted: boolean;
  isDragging: boolean;
  dragged: boolean;
  itemIndex: number;
}
