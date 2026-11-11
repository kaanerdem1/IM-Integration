import { act, memo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartTooltipScope } from './ChartTooltipScope';
import { useRetainedTooltip } from './useRetainedTooltip';

describe('retained chart tooltip', () => {
  let root: Root;
  let container: HTMLDivElement;
  const rendered = vi.fn();
  const Probe = ({ active, label }: { active: boolean; label: string }) => {
    const tooltip = useRetainedTooltip(active, { label });
    rendered();
    // Bound the regression test if an unstable payload causes a render loop.
    if (rendered.mock.calls.length > 20) {
      throw new Error('Tooltip payload caused a render loop');
    }
    return (
      <section data-label={label}>
        {tooltip.visible ? (
          <div
            role="tooltip"
            onMouseEnter={tooltip.onMouseEnter}
            onMouseLeave={tooltip.onMouseLeave}
            onFocus={tooltip.onFocus}
            onBlur={tooltip.onBlur}
          >
            <button type="button">{tooltip.value.label}</button>
          </div>
        ) : (
          'hidden'
        )}
      </section>
    );
  };
  const render = (active: boolean, label: string) =>
    act(() => root.render(<Probe active={active} label={label} />));

  beforeEach(() => {
    vi.useFakeTimers();
    rendered.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('accepts fresh payload objects without an effect-driven extra render', () => {
    render(true, 'First metric');
    rendered.mockClear();
    render(true, 'Next metric');
    expect(rendered).toHaveBeenCalledOnce();
    expect(container).toHaveTextContent('Next metric');
  });

  it('retains the latest active value during the leave delay and cancels stale timers', () => {
    render(true, 'First metric');
    render(true, 'Next metric');
    render(false, 'Empty payload');
    expect(container).toHaveTextContent('Next metric');
    act(() => vi.advanceTimersByTime(100));
    render(true, 'New metric');
    act(() => vi.advanceTimersByTime(200));
    expect(container).toHaveTextContent('New metric');
    render(false, 'Empty payload');
    act(() => vi.advanceTimersByTime(200));
    expect(container).toHaveTextContent('hidden');
  });

  it.each(['focus', 'hover'] as const)(
    'replaces a tooltip retained by %s without reviving it when the new tooltip closes',
    (interaction) => {
      const renderPair = (first: boolean, second: boolean) =>
        act(() =>
          root.render(
            <>
              <Probe active={first} label="First" />
              <Probe active={second} label="Second" />
            </>
          )
        );
      renderPair(true, false);
      const tooltip = container.querySelector('[role="tooltip"]')!;
      act(() => {
        if (interaction === 'focus') {
          tooltip.querySelector('button')!.focus();
        } else {
          tooltip.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
      });
      renderPair(false, false);
      act(() => vi.advanceTimersByTime(500));
      expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('First');

      renderPair(false, true);
      expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('Second');
      renderPair(false, false);
      act(() => vi.advanceTimersByTime(200));
      expect(container.querySelector('[role="tooltip"]')).toBeNull();

      rendered.mockClear();
      renderPair(true, false);
      renderPair(false, false);
      act(() => vi.advanceTimersByTime(200));
      expect(container.querySelector('[role="tooltip"]')).toBeNull();
    }
  );

  it('does not let stale active props or unmounts dismiss the latest tooltip', () => {
    const renderPair = (first: boolean | null, second: boolean) =>
      act(() =>
        root.render(
          <>
            {first !== null && <Probe key="first" active={first} label="First" />}
            <Probe key="second" active={second} label="Second" />
          </>
        )
      );
    renderPair(true, false);
    renderPair(true, true);
    expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('Second');
    renderPair(false, true);
    act(() => vi.advanceTimersByTime(200));
    renderPair(null, true);
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('Second');
    act(() => root.render(null));
    render(false, 'Inactive chart');
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('cancels the previous close delay without rerendering inactive tooltip subscribers', () => {
    const idleRendered = vi.fn();
    const IdleProbe = memo(() => {
      useRetainedTooltip(false, 'Idle');
      idleRendered();
      return null;
    });
    IdleProbe.displayName = 'IdleProbe';
    const renderPair = (first: boolean, second: boolean) =>
      act(() =>
        root.render(
          <>
            <Probe active={first} label="First" />
            <Probe active={second} label="Second" />
            <IdleProbe />
          </>
        )
      );
    renderPair(true, false);
    renderPair(false, false);
    act(() => vi.advanceTimersByTime(100));
    renderPair(false, true);
    act(() => vi.advanceTimersByTime(200));
    expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('Second');
    expect(idleRendered).toHaveBeenCalledOnce();
  });

  it('reactivates a previously active chart on pointer or keyboard re-entry', () => {
    act(() =>
      root.render(
        <>
          <ChartTooltipScope>
            <div data-chart="first" tabIndex={-1}>
              <Probe active label="First" />
            </div>
          </ChartTooltipScope>
          <ChartTooltipScope>
            <div data-chart="second" tabIndex={-1}>
              <Probe active label="Second" />
            </div>
          </ChartTooltipScope>
        </>
      )
    );
    const first = container.querySelector<HTMLElement>('[data-chart="first"]')!;
    const second = container.querySelector<HTMLElement>('[data-chart="second"]')!;
    act(() => first.dispatchEvent(new Event('pointerenter')));
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('First');
    act(() => second.focus());
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('Second');
    act(() => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent('First');
    rendered.mockClear();
    act(() => {
      for (let index = 0; index < 50; index += 1) {
        first.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      }
    });
    expect(rendered).not.toHaveBeenCalled();
  });
});
