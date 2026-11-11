import { describe, expect, it } from 'vitest';
import { radialChartLayout } from '../chartTheme';
import {
  getMinimumRadialSegmentAngle,
  getRadialCenterFontSize,
  getRadialRingThickness,
} from './layout';

describe('radial proportions', () => {
  it.each([
    [160, 24, 24],
    [200, 24, 24],
    [320, 35, 24],
    [360, 40, 27],
    [480, 40, 32],
    [800, 40, 32],
  ])(
    'scales a %spx chart while keeping single and nested rings bounded',
    (diameter, single, nested) => {
      expect(getRadialRingThickness(diameter)).toBe(single);
      expect(getRadialRingThickness(diameter, 2)).toBe(nested);
      expect(getRadialRingThickness(diameter, 3)).toBe(nested);
    }
  );

  it.each([
    [160, 112, 22],
    [200, 152, 22],
    [360, 280, 32],
    [480, 400, 36],
    [360, 80, 24],
  ])('sizes center text from the diameter %s and available hole %s', (diameter, hole, expected) =>
    expect(getRadialCenterFontSize(diameter, hole)).toBe(expected)
  );
});

describe('minimum radial segment size', () => {
  it.each([60, 120, 240])('keeps the visible length target at radius %s', (radius) => {
    const strokeWidth = 2;
    const angle = getMinimumRadialSegmentAngle(radius, strokeWidth);
    expect(((angle * Math.PI) / 180) * radius - strokeWidth).toBeCloseTo(
      radialChartLayout.minimumSegmentLength
    );
  });
});
