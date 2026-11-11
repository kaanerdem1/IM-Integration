import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { ChartTooltipScope } from './ChartTooltipScope';
import { ChartTooltipSurface } from './ChartTooltipSurface';

describe('ChartTooltipSurface', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      if (this.id === 'first-mark') {
        return new DOMRect(300, 200, 120, 20);
      }
      if (this.id === 'second-mark') {
        return new DOMRect(500, 300, 80, 20);
      }
      if (this.id === 'radial-chart') {
        return new DOMRect(100, 100, 500, 500);
      }
      if (this.id === 'outer-ring') {
        return new DOMRect(200, 200, 300, 300);
      }
      if (this.id === 'inner-ring') {
        return new DOMRect(230, 230, 240, 240);
      }
      if (this.classList.contains('recharts-pie-labels')) {
        return new DOMRect(100, 100, 500, 500);
      }
      if (this.id === 'sector-mark') {
        return new DOMRect(100, 100, 450, 250);
      }
      if (this.id === 'tiny-sector') {
        return new DOMRect(500, 200, 5, 15);
      }
      return new DOMRect(0, 0, 360, 80);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(360);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('positions on the first portal mount, retaining every row', () => {
    const chartRef = createRef<HTMLDivElement>();
    act(() =>
      root.render(
        <MantineProvider>
          <div ref={chartRef}>
            <ChartTooltipSurface containerRef={chartRef} coordinate={{ x: 300, y: 200 }}>
              {Array.from({ length: 64 }, (_, index) => (
                <div data-testid="unit" key={index}>
                  Birim {index + 1}
                </div>
              ))}
            </ChartTooltipSurface>
          </div>
        </MantineProvider>
      )
    );
    const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tooltip).toHaveAttribute('data-side', 'bottom');
    expect(tooltip.style.top).toBe('212px');
    expect(tooltip).toHaveTextContent('Birim 64');
    expect(tooltip.querySelectorAll('[data-testid="unit"]')).toHaveLength(64);
    expect(tooltip.querySelector('.mantine-ScrollArea-viewport')).toHaveAttribute('tabindex', '0');
  });

  it('tracks the rendered segment without rerenders and keeps it across the tooltip gap', () => {
    const onClick = vi.fn();
    const onAuxClick = vi.fn();
    let renders = 0;
    const Chart = () => {
      renders += 1;
      return (
        <ChartTooltipScope>
          <div>
            <svg>
              <g
                id="first-mark"
                className="recharts-bar-rectangle"
                onClick={onClick}
                onAuxClick={onAuxClick}
              >
                <rect />
              </g>
              <g id="second-mark" className="recharts-bar-rectangle">
                <rect />
              </g>
            </svg>
            <ChartTooltipSurface coordinate={{ x: 0, y: 0 }}>Birim listesi</ChartTooltipSurface>
          </div>
        </ChartTooltipScope>
      );
    };
    act(() =>
      root.render(
        <MantineProvider>
          <Chart />
        </MantineProvider>
      )
    );
    const first = container.querySelector('#first-mark')!;
    const second = container.querySelector('#second-mark')!;
    const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    const move = (target: Element) =>
      act(() => {
        target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      });
    move(first);
    expect(tooltip.style.top).toBe('232px');
    expect(first).toHaveAttribute('data-chart-tooltip-active');
    move(container.querySelector('svg')!);
    expect(tooltip.style.top).toBe('232px');
    for (let index = 0; index < 50; index += 1) {
      move(first);
    }
    move(second);
    expect(tooltip.style.top).toBe('332px');
    expect(first).not.toHaveAttribute('data-chart-tooltip-active');
    expect(second).toHaveAttribute('data-chart-tooltip-active');
    expect(renders).toBe(1);
    act(() => {
      first.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      first.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    });
    expect(onClick).toHaveBeenCalledOnce();
    expect(onAuxClick).toHaveBeenCalledOnce();
    act(() => root.render(null));
    expect(second).not.toHaveAttribute('data-chart-tooltip-active');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('anchors beside the active slice, accounting for its thickness without following the mouse', () => {
    act(() =>
      root.render(
        <MantineProvider>
          <ChartTooltipScope>
            <div id="radial-chart">
              <svg>
                <g className="recharts-layer recharts-pie">
                  <g id="outer-ring" className="recharts-layer">
                    <g id="sector-mark" className="recharts-pie-sector" tabIndex={0}>
                      <path
                        cx="250"
                        cy="250"
                        data-tooltip-x="400"
                        data-tooltip-y="240"
                        data-tooltip-radius="12"
                      />
                    </g>
                  </g>
                  <g className="recharts-layer recharts-pie-labels">
                    <text>28%</text>
                  </g>
                </g>
                <g className="recharts-layer recharts-pie">
                  <g id="inner-ring" className="recharts-layer">
                    <g id="tiny-sector" className="recharts-pie-sector" tabIndex={0}>
                      <path
                        cx="250"
                        cy="250"
                        data-tooltip-x="390"
                        data-tooltip-y="220"
                        data-tooltip-radius="12"
                      />
                    </g>
                  </g>
                </g>
              </svg>
              <ChartTooltipSurface anchorMode="radial" coordinate={{ x: 400, y: 240 }}>
                Halka detayı
              </ChartTooltipSurface>
            </div>
          </ChartTooltipScope>
        </MantineProvider>
      )
    );
    for (const path of container.querySelectorAll('path')) {
      Object.defineProperty(path, 'getScreenCTM', {
        value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 100, f: 100 }),
      });
    }
    const sector = container.querySelector('#sector-mark')!;
    const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    act(() =>
      sector.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 350, clientY: 180 })
      )
    );
    const top = tooltip.style.top;
    expect(tooltip).toHaveAttribute('data-side', 'right');
    expect(tooltip.style.left).toBe('524px');
    expect(sector).toHaveAttribute('data-chart-tooltip-active');
    act(() =>
      container
        .querySelector('svg')!
        .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 350, clientY: 190 }))
    );
    expect(tooltip.style.top).toBe(top);
    const tinySector = container.querySelector('#tiny-sector')!;
    act(() =>
      tinySector.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 502, clientY: 205 })
      )
    );
    expect(tooltip.style.left).toBe('514px');
    expect(Number.parseFloat(tooltip.style.top)).toBe(Number.parseFloat(top) - 20);
    expect(tinySector).toHaveAttribute('data-chart-tooltip-active');
    expect(sector).not.toHaveAttribute('data-chart-tooltip-active');
    act(() =>
      sector.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
    );
    expect(tooltip.style.left).toBe('514px');
    expect(Number.parseFloat(tooltip.style.top)).toBe(Number.parseFloat(top) - 20);
  });
});
