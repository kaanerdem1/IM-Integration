import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getHorizontalChartLayout } from './horizontalChartLayout';
import { HorizontalChartTick } from './HorizontalChartTick';

describe('horizontal chart layout', () => {
  it('reserves sufficient plot space before keeping labels on the left', () => {
    expect(getHorizontalChartLayout(320).above).toBe(true);
    expect(getHorizontalChartLayout(422).above).toBe(true);
    expect(getHorizontalChartLayout(423).above).toBe(false);
    const wide = getHorizontalChartLayout(1200);
    expect(wide.above).toBe(false);
    expect(wide.labelWidth).toBe(160);
    expect(wide.axisWidth).toBe(172);
  });

  it('accounts for chart-specific mark and end-label space', () => {
    const bars = getHorizontalChartLayout(440);
    const lollipop = getHorizontalChartLayout(440, { markHeight: 16, rightMargin: 44 });
    expect(bars.above).toBe(false);
    expect(lollipop.above).toBe(true);
    expect(lollipop.rowHeight).toBe(42);
  });

  it('reserves space for all heatmap columns before moving labels to the left', () => {
    const options = { minPlotWidth: 414, rightMargin: 0 };
    expect(getHorizontalChartLayout(520, options).above).toBe(true);
    expect(getHorizontalChartLayout(650, options).above).toBe(false);
  });

  it.each([24, 16])('keeps a 4px label gap and 8px row gap for a %spx mark', (markHeight) => {
    const layout = getHorizontalChartLayout(320, { markHeight });
    const firstCenter = layout.margin.top + layout.rowHeight / 2;
    const markup = renderToStaticMarkup(
      <svg>
        <HorizontalChartTick layout={layout} x={4} y={firstCenter}>
          First
        </HorizontalChartTick>
        <HorizontalChartTick layout={layout} x={4} y={firstCenter + layout.rowHeight}>
          Next
        </HorizontalChartTick>
      </svg>
    );
    const container = document.createElement('div');
    container.innerHTML = markup;
    const [first, next] = container.querySelectorAll('foreignObject');
    const labelTop = Number(first.getAttribute('y'));
    const labelBottom = labelTop + Number(first.getAttribute('height'));
    const barTop = firstCenter - markHeight / 2;
    expect(labelTop).toBe(0);
    expect(barTop - labelBottom).toBe(4);
    expect(Number(next.getAttribute('y')) - (barTop + markHeight)).toBe(8);
    expect(first).toHaveAttribute('data-tick-placement', 'above');
  });
});
