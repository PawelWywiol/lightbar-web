const isTouchEvent = (event: Event): event is TouchEvent => 'touches' in event;

const isMouseEvent = (event: Event): event is MouseEvent => 'clientX' in event;

export const getPositionFromEvent = (event: Event): { offsetX: number; offsetY: number } => {
  if (isTouchEvent(event)) {
    const touch = event.touches[0];
    return {
      offsetX: touch?.clientX ?? 0,
      offsetY: touch?.clientY ?? 0,
    };
  }

  if (isMouseEvent(event)) {
    return {
      offsetX: event.clientX,
      offsetY: event.clientY,
    };
  }

  return { offsetX: 0, offsetY: 0 };
};

export const getChildElementFromPoint = (x: number, y: number, parent: HTMLDivElement): number => {
  const element = document?.elementFromPoint(x, y);
  if (!element) {
    return -1;
  }

  const children = [...parent.children];
  return children.indexOf(element);
};

export const setChildElementBackgroundColor = (
  index: number,
  color: string,
  parent: HTMLDivElement,
): void => {
  const children = [...parent.children];
  const element = children[index] as HTMLDivElement;
  element?.style.setProperty('background', color);
};
