import type { PieSectorShapeProps } from 'recharts';
import { describe, expect, it } from 'vitest';
import { renderAdaptiveRadialSector } from './sector';

describe('renderAdaptiveRadialSector', () => {
  it('does not forward the React key through spread props', () => {
    const sector = renderAdaptiveRadialSector({
      cornerRadius: 8,
      cx: 100,
      cy: 100,
      endAngle: 90,
      fill: 'blue',
      innerRadius: 50,
      key: 'segment-key',
      outerRadius: 90,
      startAngle: 0,
    } as PieSectorShapeProps & { key: string });

    expect(sector.key).toBeNull();
    expect(sector.props['data-tooltip-x']).toBeCloseTo(100 + 70 / Math.sqrt(2));
    expect(sector.props['data-tooltip-y']).toBeCloseTo(100 - 70 / Math.sqrt(2));
    expect(sector.props['data-tooltip-radius']).toBe(20);
  });
});
