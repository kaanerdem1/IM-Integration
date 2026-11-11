import { describe, expect, it } from 'vitest';
import { getRadialTooltipAnchor } from './radialAnchor';

describe('radial tooltip anchor', () => {
  const sectorAt = (x: number, y: number, scale = 1) => {
    const sector = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const [name, value] of Object.entries({
      cx: 100,
      cy: 100,
      'data-tooltip-x': x,
      'data-tooltip-y': y,
      'data-tooltip-radius': 12,
    })) {
      sector.setAttribute(name, String(value));
    }
    Object.defineProperty(sector, 'getScreenCTM', {
      value: () => ({ a: scale, b: 0, c: 0, d: scale, e: 40, f: 60 }),
    });
    return sector;
  };

  it.each([
    [180, 100, 'right'],
    [20, 100, 'left'],
    [100, 20, 'top'],
    [100, 180, 'bottom'],
  ] as const)('prefers the slice direction for (%s, %s)', (x, y, side) => {
    const anchor = getRadialTooltipAnchor(sectorAt(x, y))!;
    expect(anchor.preferredSide).toBe(side);
    expect(anchor.bounds.x).toBe(40 + x - 12);
    expect(anchor.bounds.y).toBe(60 + y - 12);
    expect(anchor.bounds.width).toBe(24);
  });

  it('accounts for SVG scaling and screen offset', () => {
    const { bounds } = getRadialTooltipAnchor(sectorAt(180, 100, 1.5))!;
    expect([bounds.left, bounds.right, bounds.top, bounds.bottom]).toEqual([292, 328, 192, 228]);
  });

  it('allows the coordinate fallback before a sector is mounted', () => {
    expect(getRadialTooltipAnchor(null)).toBeUndefined();
  });
});
