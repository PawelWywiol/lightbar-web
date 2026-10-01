import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { rafTimeout } from '../../../../lib/utils/rafTimeout/rafTimeout';

import { DEFAULT_PAINTER_STATE, MINIMUM_DRAG_DISTANCE } from './lightsFrameGrid.config';
import type { GridPainterState } from './lightsFrameGrid.types';
import {
  getChildElementFromPoint,
  getPositionFromEvent,
  setChildElementBackgroundColor,
} from './lightsFrameGrid.utils';

export const useGridPainter = (
  containerReference: RefObject<HTMLDivElement | null>,
  color: string,
  onComplete: (colors: number[]) => void,
) => {
  const colors = useRef<number[]>([]);
  const stateObject = useRef<GridPainterState>({ ...DEFAULT_PAINTER_STATE });

  useEffect(() => {
    const currentReferenceContainer = containerReference.current;

    if (!currentReferenceContainer) {
      return;
    }

    const state = stateObject.current;

    const onDragStart = (event: Event) => {
      const { offsetX, offsetY } = getPositionFromEvent(event);

      state.isDragStarted = true;
      state.isDragging = false;
      state.dragged = false;
      state.dragStartOffsetX = offsetX;
      state.dragLastOffsetX = offsetX;
      state.dragStartOffsetY = offsetY;
      state.dragLastOffsetY = offsetY;
      state.offsetStart = state.offsetCurrent || 0;
      state.animationTime = 0;

      colors.current = [];
      state.itemIndex = getChildElementFromPoint(offsetX, offsetY, currentReferenceContainer);

      if (state.itemIndex === -1) {
        return;
      }

      colors.current = [state.itemIndex];

      rafTimeout(() => {
        setChildElementBackgroundColor(state.itemIndex, color, currentReferenceContainer);
      });
    };

    const onDragMove = (event: Event) => {
      const { offsetX, offsetY } = getPositionFromEvent(event);

      if (!state.isDragStarted) {
        return;
      }

      state.dragDistanceX = (state.dragStartOffsetX || offsetX) - offsetX;
      state.dragDistanceY = (state.dragStartOffsetY || offsetY) - offsetY;

      state.dragLastOffsetX = offsetX;
      state.dragLastOffsetY = offsetY;

      if (
        !state.isDragging &&
        Math.abs(state.dragDistanceX) < MINIMUM_DRAG_DISTANCE &&
        Math.abs(state.dragDistanceY) < MINIMUM_DRAG_DISTANCE
      ) {
        state.isDragStarted = false;
        return;
      }

      state.isDragging = true;
      state.dragged = !!state.dragDistanceX;
      state.offsetCurrent = state.offsetStart + state.dragDistanceX;
      state.offsetTarget = state.offsetCurrent;

      state.itemIndex = getChildElementFromPoint(offsetX, offsetY, currentReferenceContainer);

      event.preventDefault();

      if (state.itemIndex === -1 || colors.current.includes(state.itemIndex)) {
        return;
      }

      colors.current.push(state.itemIndex);

      setChildElementBackgroundColor(state.itemIndex, color, currentReferenceContainer);
    };

    const onDragEnd = (event: Event) => {
      if (!state.isDragStarted) {
        return;
      }

      state.isDragStarted = false;
      state.animationTime = 0;
      state.isDragging = false;

      event.preventDefault();

      onComplete(colors.current);

      rafTimeout(() => {
        state.dragged = false;
      });
    };

    const onClick = (event: Event) => {
      if (state.dragged) {
        state.dragged = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const preventDragStart = (dragStartEvent: Event) => dragStartEvent.preventDefault();

    globalThis.addEventListener('mouseup', onDragEnd);
    globalThis.addEventListener('touchend', onDragEnd, { passive: false });
    globalThis.addEventListener('mousemove', onDragMove);
    globalThis.addEventListener('touchmove', onDragMove, { passive: false });

    currentReferenceContainer.addEventListener('mousedown', onDragStart);
    currentReferenceContainer.addEventListener('touchstart', onDragStart);
    currentReferenceContainer.addEventListener('dragstart', preventDragStart);
    currentReferenceContainer.addEventListener('click', onClick, {
      passive: false,
    });

    return () => {
      globalThis.removeEventListener('mouseup', onDragEnd);
      globalThis.removeEventListener('touchend', onDragEnd);
      globalThis.removeEventListener('mousemove', onDragMove);
      globalThis.removeEventListener('touchmove', onDragMove);

      currentReferenceContainer.removeEventListener('mousedown', onDragStart);
      currentReferenceContainer.removeEventListener('touchstart', onDragStart);
      currentReferenceContainer.removeEventListener('dragstart', preventDragStart);
      currentReferenceContainer.removeEventListener('click', onClick);
    };
  }, [containerReference, color, onComplete]);
};
