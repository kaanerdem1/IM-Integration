import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { ChartTooltipScope } from '@/components/charts/tooltip/ChartTooltipScope';
import { GraphicRadialTooltip, GraphicSunburstTooltip } from './RadialTooltip';

describe('radial tooltip retention', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      return this.id === 'radial-chart'
        ? new DOMRect(40, 30, 360, 360)
        : new DOMRect(0, 0, 360, 80);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(360);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it.each(['donut', 'sunburst'] as const)(
    'keeps the %s position while entering the tooltip',
    (type) => {
      const render = (active: boolean) =>
        act(() =>
          root.render(
            <MantineProvider>
              <ChartTooltipScope>
                <div id="radial-chart">
                  <svg>
                    {['another-ring', type].map((itemId) => (
                      <path
                        key={itemId}
                        ref={(element) => {
                          if (element) {
                            Object.defineProperty(element, 'getScreenCTM', {
                              configurable: true,
                              value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 40, f: 30 }),
                            });
                          }
                        }}
                        cx={180}
                        cy={180}
                        data-recharts-item-id={itemId}
                        data-recharts-item-index="0"
                        data-tooltip-x={itemId === type ? 300 : 60}
                        data-tooltip-y={180}
                        data-tooltip-radius={12}
                      />
                    ))}
                  </svg>
                  {type === 'donut' ? (
                    <GraphicRadialTooltip
                      active={active}
                      accessibilityLayer
                      activeIndex="0"
                      coordinate={active ? { x: 10, y: 10 } : { x: 0, y: 0 }}
                      payload={
                        active
                          ? [{ graphicalItemId: 'donut', payload: { name: 'a' }, value: 8 }]
                          : []
                      }
                      items={[{ name: 'a', label: 'Birim A', color: 'blue', value: 8 }]}
                      getDisabledReason={() => undefined}
                    />
                  ) : (
                    <GraphicSunburstTooltip
                      active={active}
                      accessibilityLayer
                      activeIndex="0"
                      coordinate={active ? { x: 10, y: 10 } : { x: 0, y: 0 }}
                      payload={
                        active
                          ? [
                              {
                                graphicalItemId: 'sunburst',
                                payload: { name: 'Birim A', value: 8, color: 'blue' },
                                value: 8,
                              },
                            ]
                          : []
                      }
                      total={8}
                      getDisabledReason={() => undefined}
                    />
                  )}
                </div>
              </ChartTooltipScope>
            </MantineProvider>
          )
        );
      render(true);
      const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      const position = { left: tooltip.style.left, top: tooltip.style.top };
      expect(tooltip).toHaveAttribute('data-side', 'right');
      expect(position.left).toBe('364px');
      expect(container.querySelector('[data-chart-tooltip-active]')).toHaveAttribute(
        'data-recharts-item-id',
        type
      );
      act(() => tooltip.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
      render(false);
      const retainedTooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect({ left: retainedTooltip.style.left, top: retainedTooltip.style.top }).toEqual(
        position
      );
      expect(tooltip).toHaveTextContent('Birim A');
    }
  );
});
