import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePopoverPosition } from './popoverPosition';

describe('calculatePopoverPosition', () => {
  beforeEach(() => {
    // Provide window geometry for node test environment
    (globalThis as unknown as { window: Record<string, unknown> }).window = {
      innerWidth: 1920,
      innerHeight: 1080,
    };
  });

  const mockTriggerRect = (rect: Partial<DOMRect>): DOMRect => ({
    top: 200,
    left: 400,
    width: 100,
    height: 40,
    bottom: 240,
    right: 500,
    x: 400,
    y: 200,
    toJSON: () => {},
    ...rect,
  });

  it('centers popover when triggerRect is null', () => {
    const pos = calculatePopoverPosition({
      triggerRect: null,
      modalWidth: 300,
      modalHeight: 200,
      windowMargin: 10,
    });

    expect(pos.left).toBe((1920 - 300) / 2);
    expect(pos.top).toBe((1080 - 200) / 2);
  });

  it('positions below trigger with arrow pointing up', () => {
    const trigger = mockTriggerRect({ top: 100, left: 500, width: 80, height: 30 });
    const pos = calculatePopoverPosition({
      triggerRect: trigger,
      modalWidth: 200,
      modalHeight: 150,
      arrowDirection: 'up',
    });

    // top should be trigger.top + trigger.height + arrowSize(15) = 100 + 30 + 15 = 145
    expect(pos.top).toBe(145);
    // left centered on trigger: (500 + 40) - 200 / 2 = 540 - 100 = 440
    expect(pos.left).toBe(440);
    expect(pos.arrowTransform).toBe('');
    expect(pos.arrowLeft).toBeDefined();
  });

  it('positions above trigger with arrow pointing down', () => {
    const trigger = mockTriggerRect({ top: 300, left: 500, width: 80, height: 30 });
    const pos = calculatePopoverPosition({
      triggerRect: trigger,
      modalWidth: 200,
      modalHeight: 100,
      arrowDirection: 'down',
    });

    // top should be trigger.top - modalHeight - arrowSize(15) = 300 - 100 - 15 = 185
    expect(pos.top).toBe(185);
    expect(pos.arrowTransform).toBe('rotate(180 50 50)');
  });

  it('positions to the right of trigger with arrow pointing left', () => {
    const trigger = mockTriggerRect({ top: 200, left: 300, width: 100, height: 50 });
    const pos = calculatePopoverPosition({
      triggerRect: trigger,
      modalWidth: 250,
      modalHeight: 120,
      arrowDirection: 'left',
    });

    // left should be trigger.left + trigger.width + arrowSize(15) = 300 + 100 + 15 = 415
    expect(pos.left).toBe(415);
    expect(pos.arrowTransform).toBe('rotate(-90 50 50)');
  });

  it('positions to the left of trigger with arrow pointing right', () => {
    const trigger = mockTriggerRect({ top: 200, left: 600, width: 100, height: 50 });
    const pos = calculatePopoverPosition({
      triggerRect: trigger,
      modalWidth: 200,
      modalHeight: 120,
      arrowDirection: 'right',
    });

    // left should be trigger.left - modalWidth - arrowSize(15) = 600 - 200 - 15 = 385
    expect(pos.left).toBe(385);
    expect(pos.arrowTransform).toBe('rotate(90 50 50)');
  });

  it('constrains position to window margin boundaries on screen edges', () => {
    // Near left edge
    const nearLeft = mockTriggerRect({ top: 200, left: 5, width: 20, height: 20 });
    const posLeft = calculatePopoverPosition({
      triggerRect: nearLeft,
      modalWidth: 300,
      modalHeight: 200,
      arrowDirection: 'up',
      windowMargin: 15,
    });
    expect(posLeft.left).toBeGreaterThanOrEqual(15);

    // Near right edge
    const nearRight = mockTriggerRect({ top: 200, left: 1900, width: 20, height: 20 });
    const posRight = calculatePopoverPosition({
      triggerRect: nearRight,
      modalWidth: 300,
      modalHeight: 200,
      arrowDirection: 'up',
      windowMargin: 15,
    });
    expect(posRight.left + 300).toBeLessThanOrEqual(1920);
  });

  it('supports horizontalAlign start alignment', () => {
    const trigger = mockTriggerRect({ top: 200, left: 400, width: 100, height: 40 });
    const pos = calculatePopoverPosition({
      triggerRect: trigger,
      modalWidth: 200,
      modalHeight: 150,
      arrowDirection: 'up',
      horizontalAlign: 'start',
    });

    // triggerCenterX = 450, arrowSize = 15, l = 12 => 450 - 15 - 12 = 423
    expect(pos.left).toBe(423);
  });
});
