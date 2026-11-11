import { act, StrictMode, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { getDate } from '@/_helpers/date';
import i18n from '@/_i18n/config';
import { WorkflowWorkStartButton } from './WorkflowWorkStartButton';

const target = new Date('2026-11-02T03:00:00+03:00').getTime();

describe('manual work start plan information', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const onStart = vi.fn();
  const render = (
    targetStartDate?: ComponentProps<typeof WorkflowWorkStartButton>['targetStartDate']
  ) =>
    act(() =>
      root.render(
        <StrictMode>
          <MantineProvider env="test" theme={theme}>
            <WorkflowWorkStartButton targetStartDate={targetStartDate} onClick={onStart} />
          </MantineProvider>
        </StrictMode>
      )
    );
  const info = () => container.querySelector('[data-testid="workflow-planned-start"]');

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T10:00:00+03:00'));
    onStart.mockClear();
    await i18n.changeLanguage('tr');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
    await i18n.changeLanguage('tr');
  });

  it.each([1, 1000])('shows only the planned date for timestamp unit %s', (divisor) => {
    render(target / divisor);
    expect(info()?.textContent).toBe(
      `Planlanan başlangıç tarihi: ${getDate(target, 'd MMM yyyy')}`
    );
    expect(info()?.querySelector('time')).toHaveAttribute(
      'datetime',
      getDate(target, 'yyyy-MM-dd')
    );
    expect(info()).not.toHaveTextContent(/\d{2}:\d{2}|kaldı|saat|dakika/);
    expect(container.querySelector('#workflow-button-startWork')).toHaveTextContent(
      'Manuel Başlat'
    );
    expect(onStart).not.toHaveBeenCalled();
  });

  it('updates from service data without creating timers or visibility listeners', () => {
    const listen = vi.spyOn(document, 'addEventListener');
    render(target / 1000);
    const nextDate = target + 86400_000;
    render(nextDate / 1000);
    expect(info()?.querySelector('time')).toHaveTextContent(getDate(nextDate, 'd MMM yyyy'));
    expect(vi.getTimerCount()).toBe(0);
    expect(listen.mock.calls.some(([event]) => event === 'visibilitychange')).toBe(false);
    act(() => vi.advanceTimersByTime(60_000));
    expect(info()?.querySelector('time')).toHaveTextContent(getDate(nextDate, 'd MMM yyyy'));
  });

  it.each([undefined, 0, Number.NaN, Infinity])('omits missing or invalid dates: %s', (date) => {
    render(date);
    expect(info()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('separates the plan and full-width start action from preceding history', () => {
    render(target / 1000);
    const section = container.querySelector('[data-testid="workflow-work-start-section"]')!;
    expect(section.firstElementChild).toHaveClass('mantine-Divider-root');
    expect(section.children[1]).toBe(info());
    expect(section.querySelector('button')).toHaveAttribute('data-block', 'true');
    expect(section.querySelector('button')).toHaveStyle({ alignSelf: 'center' });
  });

  it('preserves the uncontrolled form without submitting or ticking', () => {
    const formRender = vi.fn();
    const submit = vi.fn();
    const Form = () => {
      formRender();
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input defaultValue="Initial" />
          <WorkflowWorkStartButton targetStartDate={target / 1000} onClick={onStart} />
        </form>
      );
    };
    act(() =>
      root.render(
        <MantineProvider env="test" theme={theme}>
          <Form />
        </MantineProvider>
      )
    );
    const input = container.querySelector('input')!;
    input.value = 'Unsaved draft';
    act(() => vi.advanceTimersByTime(60_000));
    expect(vi.getTimerCount()).toBe(0);
    const button = container.querySelector<HTMLButtonElement>(
      '[data-testid="workflow-work-start"]'
    )!;
    expect(button).toHaveAttribute('type', 'button');
    act(() => button.click());
    expect(onStart).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
    expect(formRender).toHaveBeenCalledOnce();
    expect(container.querySelector('input')).toBe(input);
    expect(input).toHaveValue('Unsaved draft');
  });

  it('localizes the label and date when the language changes', async () => {
    render(target / 1000);
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(info()?.textContent).toBe(`Planned start date: ${getDate(target, 'd MMM yyyy')}`);
  });
});
