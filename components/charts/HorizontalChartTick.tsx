import type { ReactNode } from 'react';
import { barChartLayout, horizontalChartLabelLayout } from './chartTheme';
import type { HorizontalChartLayout } from './horizontalChartLayout';

export const HorizontalChartTick = ({
  children,
  layout,
  x,
  y,
}: {
  children: ReactNode;
  layout: HorizontalChartLayout;
  x: number;
  y: number;
}) => (
  <foreignObject
    data-tick-placement={layout.above ? 'above' : 'left'}
    onFocus={(event) => event.stopPropagation()}
    x={layout.above ? x : x - layout.labelWidth - barChartLayout.tickLabelGap}
    y={
      layout.above
        ? y - layout.markHeight / 2 - horizontalChartLabelLayout.aboveGap - layout.labelHeight
        : y - layout.labelHeight / 2
    }
    width={layout.labelWidth}
    height={layout.labelHeight}
  >
    {children}
  </foreignObject>
);
