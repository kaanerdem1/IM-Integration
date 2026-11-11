import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GraphicPoint } from './GraphicPoint';

describe('graphic point color', () => {
  it.each([false, true])(
    'retains its series fill when Recharts passes a white stroke (active: %s)',
    (active) => {
      const container = document.createElement('div');
      container.innerHTML = renderToStaticMarkup(
        <svg>
          <GraphicPoint
            active={active}
            color="#0C8599"
            fill="white"
            stroke="white"
            cx={100}
            cy={50}
            seriesName="series_0"
            payload={{ primaryMetric: 'Birim', series_0: 3, total: 3 }}
          />
        </svg>
      );
      const circles = container.querySelectorAll('circle');
      expect(circles[0]).toHaveAttribute('fill', 'transparent');
      expect(circles[1]).toHaveAttribute('fill', '#0C8599');
      expect(circles[1]).toHaveAttribute('r', active ? '5' : '3');
    }
  );
});
