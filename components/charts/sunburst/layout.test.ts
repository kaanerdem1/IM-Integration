import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from '@mantine/core';
import { createSunburstRings, resolveSunburstNodes } from './layout';

describe('sunburst minimum visible proportions', () => {
  it('enlarges only tiny leaves and keeps parents aligned with their children', () => {
    const nodes = resolveSunburstNodes(
      [
        {
          name: 'A',
          children: [
            { name: 'A1', value: 900 },
            { name: 'A2', value: 1 },
          ],
        },
        {
          name: 'B',
          children: [
            { name: 'B1', value: 90 },
            { name: 'B2', value: 9 },
          ],
        },
      ],
      'value',
      DEFAULT_THEME
    );
    const [parents, children] = createSunburstRings(nodes, 2, 0.01);
    expect(children.segments.map((segment) => segment.value)).toEqual([900, 1, 90, 9]);
    expect(children.segments.map((segment) => segment.layoutValue)).toEqual([900, 10, 90, 10]);
    expect(parents.segments.map((segment) => segment.layoutValue)).toEqual([910, 100]);
    expect(parents.segments.map((segment) => segment.value)).toEqual([901, 99]);
    // The relative proportion between already-readable leaves is unchanged.
    expect(children.segments[0].layoutValue / children.segments[2].layoutValue).toBe(10);
    expect(parents.segments.reduce((sum, segment) => sum + segment.layoutValue, 0)).toBe(
      children.segments.reduce((sum, segment) => sum + segment.layoutValue, 0)
    );
  });

  it('leaves readable proportions untouched and aligns missing-depth placeholders', () => {
    const nodes = resolveSunburstNodes(
      [
        {
          name: 'A',
          children: [
            { name: 'A1', value: 60 },
            { name: 'A2', value: 30 },
          ],
        },
        { name: 'B', value: 10 },
        { name: 'Zero', value: 0 },
      ],
      'value',
      DEFAULT_THEME
    );
    const [parents, children] = createSunburstRings(nodes, 2, 0.01);
    expect(parents.segments.map((segment) => segment.layoutValue)).toEqual([90, 10]);
    expect(children.segments.map((segment) => segment.layoutValue)).toEqual([60, 30, 10]);
    expect(children.segments[2]).toMatchObject({ isPlaceholder: true, value: 10 });
  });

  it('caps the minimum allocation for dense rings instead of allowing overlap', () => {
    const nodes = resolveSunburstNodes(
      [
        { name: 'Large', value: 1000 },
        ...Array.from({ length: 99 }, (_, index) => ({ name: String(index), value: 1 })),
      ],
      'value',
      DEFAULT_THEME
    );
    const [ring] = createSunburstRings(nodes, 1, 0.1);
    expect(ring.segments).toHaveLength(100);
    expect(ring.segments[0].layoutValue).toBe(1000);
    expect(ring.segments[1].layoutValue).toBeCloseTo(1099 * 0.004);
    expect(ring.segments.every((segment) => segment.layoutValue > 0)).toBe(true);
  });
});
