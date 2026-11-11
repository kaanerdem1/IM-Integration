import { Children, type ReactElement, type ReactNode } from 'react';
import type { BarShapeProps } from 'recharts';
import { describe, expect, it } from 'vitest';
import { getRequestDistributionBarProps } from './barProps';

type BarShapeElement = ReactElement<{ children?: ReactNode }>;

const createShapeProps = (overrides: Partial<BarShapeProps> = {}) =>
  ({
    background: { height: 100, width: 30, x: 10, y: 0 },
    height: 4,
    payload: { primaryMetric: 'Birim A', series_0: 1 },
    width: 30,
    x: 10,
    y: 80,
    ...overrides,
  }) as BarShapeProps;

const orderByPrimaryMetric = new Map([['Birim A', { seriesNames: ['series_0'] }]]);

describe('request distribution bar props', () => {
  it('keeps small stacked segments at the configured minimum size', () => {
    const barProps = getRequestDistributionBarProps({
      layout: 'vertical-columns',
      orderByPrimaryMetric,
      stacked: true,
    })({ name: 'series_0' });
    const shape = barProps.shape as (props: BarShapeProps) => BarShapeElement;
    const renderedShape = shape(createShapeProps());
    const children = Children.toArray(
      renderedShape.props.children
    ) as ReactElement<BarShapeProps>[];

    expect(barProps.minPointSize).toBe(0);
    expect(children).toHaveLength(2);
    expect(children[0].props).toMatchObject({ height: 20, width: 30, x: 10, y: 80 });
  });

  it.each(['horizontal-bars', 'horizontal-rows'] as const)(
    'uses label-aware minimum widths for unstacked %s',
    (layout) => {
      const { minPointSize } = getRequestDistributionBarProps({
        layout,
        orderByPrimaryMetric,
        stacked: false,
      })({ name: 'series_0' });

      expect(typeof minPointSize).toBe('function');

      if (typeof minPointSize === 'function') {
        expect(minPointSize(26)).toBe(22);
        expect(minPointSize(149)).toBe(29);
        expect(minPointSize(0)).toBe(0);
        expect(minPointSize(undefined)).toBe(0);
      }
    }
  );

  it('renders a value label when the segment has enough room', () => {
    const barProps = getRequestDistributionBarProps({
      layout: 'vertical-columns',
      orderByPrimaryMetric,
      stacked: true,
    })({ name: 'series_0' });
    const shape = barProps.shape as (props: BarShapeProps) => BarShapeElement;
    const renderedShape = shape(createShapeProps({ height: 24, y: 60 }));

    expect(Children.toArray(renderedShape.props.children)).toHaveLength(2);
  });

  it.each([72, 50])(
    'fits a horizontal stack in %s pixels and labels every segment with room',
    (plotWidth) => {
      const payload = {
        primaryMetric: 'Birim A',
        series_0: 70,
        series_1: 1,
        series_2: 1,
        series_3: 0,
      };
      const seriesNames = ['series_0', 'series_1', 'series_2', 'series_3'];
      const getBarProps = getRequestDistributionBarProps({
        layout: 'horizontal-bars',
        orderByPrimaryMetric: new Map([['Birim A', { seriesNames }]]),
        stacked: true,
      });
      let nextX = 10;
      seriesNames.slice(0, 3).forEach((name, index) => {
        const barProps = getBarProps({ name });
        const shape = barProps.shape as (props: BarShapeProps) => BarShapeElement;
        const rendered = shape(
          createShapeProps({
            payload,
            width: index === 0 ? 70 : 1,
            height: 24,
            background: { x: 10, y: 0, width: plotWidth, height: 24 },
          })
        );
        const children = Children.toArray(rendered.props.children) as ReactElement<BarShapeProps>[];
        expect(children).toHaveLength(plotWidth === 72 || index === 0 ? 2 : 1);
        const rectangle = children[0].props;
        expect(rectangle).toMatchObject({
          x: nextX,
          width: plotWidth === 72 ? (index === 0 ? 32 : 20) : index === 0 ? 38 : 6,
          height: 24,
        });
        expect(rectangle.radius).toBe(plotWidth === 72 || index === 0 ? 10 : 3);
        nextX += rectangle.width;
      });
      expect(nextX).toBe(10 + plotWidth);
      const zeroShape = getBarProps({ name: 'series_3' }).shape as (
        props: BarShapeProps
      ) => ReactNode;
      expect(zeroShape(createShapeProps({ payload }))).toBeNull();
    }
  );

  it.each(['vertical-columns', 'horizontal-rows', 'vertical-slots'] as const)(
    'uses the same rounded shape and fit-based value labels for %s charts',
    (layout) => {
      const barProps = getRequestDistributionBarProps({
        layout,
        orderByPrimaryMetric,
        stacked: layout === 'vertical-columns',
      })({ name: 'series_0' });
      const shape = barProps.shape as (props: BarShapeProps) => BarShapeElement;
      const renderedShape = shape(createShapeProps({ height: 2, width: 3 }));
      const children = Children.toArray(
        renderedShape.props.children
      ) as ReactElement<BarShapeProps>[];

      expect(typeof barProps.minPointSize).toBe(
        layout === 'vertical-columns' ? 'number' : 'function'
      );
      expect(children).toHaveLength(1);
      expect(children[0].props).toMatchObject({
        height: layout === 'vertical-columns' ? 20 : 2,
        width: 3,
        x: 10,
        y: 80,
        radius: layout === 'vertical-columns' ? 1.5 : 1,
      });
      expect(children[0].props.strokeWidth).toBeCloseTo(layout === 'vertical-columns' ? 1 : 2 / 3);

      const largeShape = shape(createShapeProps({ height: 24, width: 120 }));
      const largeChildren = Children.toArray(
        largeShape.props.children
      ) as ReactElement<BarShapeProps>[];
      expect(largeChildren).toHaveLength(2);
      expect(largeChildren[0].props).toMatchObject({ radius: 10, strokeWidth: 3 });
    }
  );
});
