export interface PositionOptions {
  triggerRect: DOMRect | null;
  modalWidth: number;
  modalHeight: number;
  arrowDirection?: 'up' | 'down' | 'left' | 'right' | 'none';
  arrowOffset?: { x: number; y: number };
  horizontalAlign?: 'center' | 'start';
  windowMargin?: number;
}

export interface CalculatedPosition {
  top: number;
  left: number;
  arrowLeft?: string;
  arrowTop?: string;
  arrowTransform?: string;
}

/**
 * Computes modal position and SVG arrow position exactly matching YNAB's Ember modal positioning engine.
 * (wrapper-DkFKwf1z.js positionModal & positionArrow)
 */
export function calculatePopoverPosition({
  triggerRect,
  modalWidth,
  modalHeight,
  arrowDirection = 'up',
  arrowOffset = { x: 0, y: 0 },
  horizontalAlign = 'center',
  windowMargin = 10,
}: PositionOptions): CalculatedPosition {
  if (!triggerRect) {
    const defaultTop = Math.max(windowMargin, (window.innerHeight - modalHeight) / 2);
    const defaultLeft = Math.max(windowMargin, (window.innerWidth - modalWidth) / 2);
    return { top: defaultTop, left: defaultLeft };
  }

  const arrowSize = 15; // standard YNAB arrow height/size
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const triggerX = triggerRect.left;
  const triggerY = triggerRect.top;
  const triggerWidth = triggerRect.width;
  const triggerHeight = triggerRect.height;
  const triggerCenterX = triggerX + triggerWidth / 2;
  const triggerCenterY = triggerY + triggerHeight / 2;

  let modalX = 0;
  let modalY = 0;

  const getHorizontalX = () => {
    if (horizontalAlign === 'start') {
      return triggerCenterX - arrowSize - 12;
    }
    return triggerCenterX - modalWidth / 2;
  };

  let actualArrow = arrowDirection;

  if (actualArrow === 'up') {
    modalX = getHorizontalX();
    modalY = triggerY + triggerHeight + arrowSize;
  } else if (actualArrow === 'down') {
    modalX = getHorizontalX();
    modalY = triggerY - modalHeight - arrowSize;
  } else if (actualArrow === 'left') {
    modalX = triggerX + triggerWidth + arrowSize;
    modalY = triggerCenterY - modalHeight / 2;
  } else if (actualArrow === 'right') {
    modalX = triggerX - modalWidth - arrowSize;
    modalY = triggerCenterY - modalHeight / 2;
  }

  // Constrain horizontally within window
  let constrainedX = modalX;
  if (actualArrow === 'up' || actualArrow === 'down' || actualArrow === 'none') {
    if (modalX < windowMargin) {
      constrainedX = windowMargin;
    } else if (modalX + modalWidth > windowWidth - windowMargin) {
      constrainedX = Math.max(windowMargin, windowWidth - modalWidth - windowMargin);
    }
  }

  // Constrain vertically within window
  let constrainedY = modalY;
  if (actualArrow === 'left' || actualArrow === 'right' || actualArrow === 'none') {
    if (modalY < windowMargin) {
      constrainedY = windowMargin;
    } else if (modalY + modalHeight > windowHeight - windowMargin) {
      constrainedY = Math.max(windowMargin, windowHeight - modalHeight - windowMargin);
    }
  }

  modalX = constrainedX;
  modalY = constrainedY;

  // Calculate arrow placement: r.left = `${a - this.modalX - e + this.arrowOffset.x}px`
  let arrowLeft = '50%';
  let arrowTop = '';

  if (actualArrow === 'up' || actualArrow === 'down') {
    const rawArrowLeft = triggerCenterX - modalX - arrowSize + arrowOffset.x;
    // Bound arrow within modal container bounds
    const boundedArrowLeft = Math.max(12, Math.min(modalWidth - 42, rawArrowLeft));
    arrowLeft = `${boundedArrowLeft}px`;
  }

  if (actualArrow === 'left' || actualArrow === 'right') {
    const rawArrowTop = triggerCenterY - modalY - arrowSize + arrowOffset.y;
    const boundedArrowTop = Math.max(12, Math.min(modalHeight - 42, rawArrowTop));
    arrowTop = `${boundedArrowTop}px`;
  }

  return {
    top: Math.round(modalY),
    left: Math.round(modalX),
    arrowLeft,
    arrowTop,
  };
}
