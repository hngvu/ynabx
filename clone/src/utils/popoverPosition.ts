export interface PositionOptions {
  triggerRect: DOMRect | null;
  modalWidth: number;
  modalHeight: number;
  arrowDirection?: 'up' | 'down' | 'left' | 'right' | 'none';
  arrowOffset?: { x: number; y: number };
  horizontalAlign?: 'center' | 'start';
  offset?: { x: number; y: number; directionChangedX?: number; directionChangedY?: number };
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
  offset = { x: 0, y: 0 },
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

  const l = 12; // Ember const l = 12
  const getHorizontalX = () => {
    if (horizontalAlign === 'start') {
      return triggerCenterX - arrowSize - l;
    }
    return triggerCenterX - modalWidth / 2;
  };

  const actualArrow = arrowDirection;

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

  // Apply offset: (a += d.x), (s += d.y)
  modalX += offset.x;
  modalY += offset.y;

  // Constrain horizontally within window (matching Ember lines in positionModal):
  // if (("up" === r || "down" === r || "none" === r) && (a < i && (c = i), a + e.width > n.width - i)) {
  //   const t = o.x + 0.5 * o.width - e.width;
  //   c = Math.max(n.width - e.width - i, t);
  // }
  let constrainedX = modalX;
  if (actualArrow === 'up' || actualArrow === 'down' || actualArrow === 'none') {
    if (modalX < windowMargin) {
      constrainedX = windowMargin;
    } else if (modalX + modalWidth > windowWidth - windowMargin) {
      const t = triggerX + 0.5 * triggerWidth - modalWidth;
      constrainedX = Math.max(windowWidth - modalWidth - windowMargin, t);
    }
  }

  // Constrain vertically within window:
  let constrainedY = modalY;
  if (actualArrow === 'left' || actualArrow === 'right' || actualArrow === 'none') {
    if (modalY < windowMargin) {
      constrainedY = Math.min(windowMargin, triggerY + triggerHeight);
    } else if (modalY + modalHeight > windowHeight - windowMargin) {
      constrainedY = windowHeight - modalHeight - windowMargin;
    }
  }

  modalX = constrainedX;
  modalY = constrainedY;

  // Calculate arrow placement (matching Ember positionArrow):
  // ("up" !== n && "down" !== n) || ((r.left = `${a - this.modalX - e + this.arrowOffset.x}px`))
  // where a = o.x + o.width / 2 (triggerCenterX), e = arrowSize = 15
  let arrowLeft = '50%';
  let arrowTop = '';

  if (actualArrow === 'up' || actualArrow === 'down') {
    const rawArrowLeft = triggerCenterX - modalX - arrowSize + (arrowOffset.x ?? 0);
    // Bound arrow within modal container bounds
    const boundedArrowLeft = Math.max(12, Math.min(modalWidth - 42, rawArrowLeft));
    arrowLeft = `${boundedArrowLeft}px`;
  }

  if (actualArrow === 'left' || actualArrow === 'right') {
    const rawArrowTop = triggerCenterY - modalY - arrowSize + (arrowOffset.y ?? 0);
    const boundedArrowTop = Math.max(12, Math.min(modalHeight - 42, rawArrowTop));
    arrowTop = `${boundedArrowTop}px`;
  }

  let arrowTransform = '';
  switch (actualArrow) {
    case 'down':
      arrowTransform = 'rotate(180 50 50)';
      break;
    case 'left':
      arrowTransform = 'rotate(-90 50 50)';
      break;
    case 'right':
      arrowTransform = 'rotate(90 50 50)';
      break;
    default:
      arrowTransform = '';
  }

  return {
    top: Math.round(modalY),
    left: Math.round(modalX),
    arrowLeft,
    arrowTop,
    arrowTransform,
  };
}
