import { describe, expect, it } from 'vitest';
import { getChartTooltipPosition } from './position';

describe('chart tooltip positioning', () => {
  const viewport = { width: 1000, height: 800 };

  it('centers below the actual bar without covering it', () => {
    const position = getChartTooltipPosition(
      { left: 200, right: 700, top: 100, bottom: 124 },
      360,
      500,
      viewport
    );
    expect(position).toMatchObject({ side: 'bottom', left: 270, top: 136, arrow: 180 });
  });

  it('flips above a bar near the bottom of the screen', () => {
    const position = getChartTooltipPosition(
      { left: 200, right: 700, top: 720, bottom: 744 },
      360,
      400,
      viewport
    );
    expect(position).toMatchObject({ side: 'top', top: 308 });
  });

  it('uses the right side when neither vertical side fits a tall tooltip', () => {
    const position = getChartTooltipPosition(
      { left: 100, right: 200, top: 350, bottom: 380 },
      360,
      650,
      viewport
    );
    expect(position).toMatchObject({ side: 'right', left: 212, top: 85 });
  });

  it('uses the left side when the right side has no space', () => {
    expect(
      getChartTooltipPosition({ left: 700, right: 900, top: 350, bottom: 380 }, 360, 650, viewport)
    ).toMatchObject({ side: 'left', left: 328 });
  });

  it('limits height to the largest free area instead of moving over the bar', () => {
    const position = getChartTooltipPosition(
      { left: 20, right: 300, top: 260, bottom: 284 },
      296,
      1800,
      { width: 320, height: 700 }
    );
    expect(position).toMatchObject({ side: 'bottom', left: 12, top: 296, maxHeight: 392 });
    expect(position.top + position.maxHeight).toBe(688);
  });

  it('keeps the arrow aligned to the bar when shifted at a viewport edge', () => {
    const position = getChartTooltipPosition(
      { left: 15, right: 45, top: 30, bottom: 54 },
      360,
      150,
      viewport
    );
    expect(position).toMatchObject({ left: 12, arrow: 18 });
  });

  it('prefers the active slice direction with a small gap', () => {
    expect(
      getChartTooltipPosition(
        { left: 328, right: 352, top: 268, bottom: 292 },
        360,
        150,
        viewport,
        'right'
      )
    ).toMatchObject({ side: 'right', left: 364, top: 205 });
    expect(
      getChartTooltipPosition(
        { left: 648, right: 672, top: 268, bottom: 292 },
        360,
        150,
        viewport,
        'left'
      )
    ).toMatchObject({ side: 'left', left: 276, top: 205 });
  });

  it('uses nearby vertical space when the preferred side cannot fit', () => {
    const position = getChartTooltipPosition(
      { left: 308, right: 332, top: 288, bottom: 312 },
      336,
      300,
      { width: 360, height: 800 },
      'right'
    );
    expect(position).toMatchObject({ side: 'bottom', top: 324, left: 12, maxHeight: 464 });
  });
});
