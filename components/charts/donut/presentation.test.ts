import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { getAdaptiveRadialCornerRadius } from '../radial/sector';
import {
  formatDonutPercentage,
  getDonutLabelIndexes,
  getDonutSegmentAngleLayout,
  renderDonutLabelLine,
  renderDonutValuePercentageLabel,
  type DonutLabelLineRenderProps,
} from './presentation';

describe('getDonutSegmentAngleLayout', () => {
  it('uses readable defaults when the chart has a small number of segments', () => {
    expect(
      getDonutSegmentAngleLayout({
        chartAngle: 360,
        requestedPaddingAngle: 3,
        segmentCount: 4,
      })
    ).toEqual({ minAngle: 6, paddingAngle: 3 });
  });

  it('caps minimum angles and gaps when the chart has many segments', () => {
    expect(
      getDonutSegmentAngleLayout({
        chartAngle: 360,
        requestedPaddingAngle: 3,
        segmentCount: 60,
      })
    ).toEqual({ minAngle: 2.4, paddingAngle: 0.9 });
  });

  it('does not reserve angles for a single segment', () => {
    expect(
      getDonutSegmentAngleLayout({
        chartAngle: 360,
        requestedPaddingAngle: 3,
        segmentCount: 1,
      })
    ).toEqual({ minAngle: 0, paddingAngle: 0 });
  });
});

describe('getAdaptiveRadialCornerRadius', () => {
  it('keeps the requested radius when the segment has enough room', () => {
    expect(
      getAdaptiveRadialCornerRadius({
        endAngle: 90,
        innerRadius: 140,
        outerRadius: 180,
        requestedCornerRadius: 8,
        startAngle: 0,
      })
    ).toBe(8);
  });

  it('reduces the radius instead of removing it for narrow segments', () => {
    const radius = getAdaptiveRadialCornerRadius({
      endAngle: 2.4,
      innerRadius: 140,
      outerRadius: 180,
      requestedCornerRadius: 8,
      startAngle: 0,
    });

    expect(radius).toBeGreaterThan(0);
    expect(radius).toBeLessThan(8);
  });

  it('keeps a full single-segment ring square when radius is disabled', () => {
    expect(
      getAdaptiveRadialCornerRadius({
        endAngle: 360,
        innerRadius: 140,
        outerRadius: 180,
        requestedCornerRadius: 0,
        startAngle: 0,
      })
    ).toBe(0);
  });
});

describe('donut labels', () => {
  it('keeps all readable labels when they fit the limit', () => {
    expect(
      getDonutLabelIndexes(
        [{ value: 23 }, { value: 1 }, { value: 1 }, { value: 1 }, { value: 1 }],
        5,
        true,
        360
      )
    ).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('keeps significant labels instead of hiding every label above the limit', () => {
    const indexes = getDonutLabelIndexes(
      [72, 48, 36, 35, 32, 23, 23, 22, 21, 16, 1, 1].map((value) => ({ value })),
      8,
      true,
      360
    );

    expect(indexes.size).toBeGreaterThan(0);
    expect(indexes.size).toBeLessThanOrEqual(8);
    expect(indexes.has(0)).toBe(true);
  });

  it('spreads equal-value labels around a crowded ring', () => {
    const segmentCount = 60;
    const segmentAngle = 360 / segmentCount;
    const indexes = [
      ...getDonutLabelIndexes(
        Array.from({ length: segmentCount }, () => ({ value: 1 })),
        8,
        true,
        360
      ),
    ];

    indexes.forEach((leftIndex, leftPosition) => {
      indexes.slice(leftPosition + 1).forEach((rightIndex) => {
        const distance = Math.abs(leftIndex - rightIndex) * segmentAngle;

        expect(Math.min(distance, 360 - distance)).toBeGreaterThanOrEqual(10);
      });
    });
  });

  it('does not render labels for a single segment or when labels are disabled', () => {
    expect(getDonutLabelIndexes([{ value: 4 }], 5, true, 360)).toEqual(new Set());
    expect(getDonutLabelIndexes([{ value: 4 }, { value: 2 }], 5, false, 360)).toEqual(new Set());
  });

  it('formats the real ratio without using the visual minimum angle', () => {
    expect(formatDonutPercentage(1 / 615)).toBe('0.2%');
  });

  it('keeps a small gap between the connector line and its value label', () => {
    const line = renderDonutLabelLine(
      { cx: 100, cy: 100, index: 0, midAngle: 0, outerRadius: 100 } as DonutLabelLineRenderProps,
      new Set([0])
    ) as ReactElement<{ points: { x: number; y: number }[] }>;
    const label = renderDonutValuePercentageLabel(
      {
        cx: 100,
        cy: 100,
        index: 0,
        midAngle: 0,
        outerRadius: 100,
        percent: 0.5,
        value: 1,
      } as Parameters<typeof renderDonutValuePercentageLabel>[0],
      new Set([0])
    ) as ReactElement<{ x: number }>;

    expect(label.props.x - line.props.points[1].x).toBe(4);
  });
});
