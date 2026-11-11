import { act, type ReactNode } from 'react';
import { DatePickerTimestampInput, DateTimePickerTimestampInput } from '.';
import { fromZonedTime } from 'date-fns-tz';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { useForm } from '@mantine/form';

vi.mock('@/_api/hooks', () => ({
  useHolidayAll: () => ({ data: { Data: [] } }),
}));

describe('date picker timestamp submission', () => {
  let root: ReturnType<typeof createRoot>;
  let container: HTMLDivElement;
  const changed = vi.fn();
  const businessTime = (date: string, unit: 'seconds' | 'milliseconds' = 'seconds') => {
    const timestamp = fromZonedTime(date, 'Europe/Istanbul').getTime();

    return unit === 'seconds' ? timestamp / 1000 : timestamp;
  };
  const pickerProps = {
    defaultDate: new Date(2026, 10, 2),
    withHolidayRules: false,
    getDayProps: (date: string) => ({ 'aria-label': date }),
    popoverProps: { trapFocus: false, transitionProps: { duration: 0 } },
  };
  const render = async (content: ReactNode) => {
    await act(async () => root.render(<MantineProvider env="test">{content}</MantineProvider>));
    await act(async () => container.querySelector<HTMLElement>('[data-dates-input]')!.click());
  };
  const selectDay = (day: number) =>
    act(async () => {
      document.body
        .querySelector<HTMLButtonElement>(
          `[data-dates-dropdown] button[aria-label="2026-11-${String(day).padStart(2, '0')}"]`
        )!
        .click();
    });

  beforeEach(() => {
    changed.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each(['seconds', 'milliseconds'] as const)(
    'submits a single date at business start in %s',
    async (unit) => {
      await render(<DatePickerTimestampInput {...pickerProps} unit={unit} onChange={changed} />);
      await selectDay(2);
      expect(changed).toHaveBeenLastCalledWith(businessTime('2026-11-02T09:00:00', unit));
    }
  );

  it.each(['seconds', 'milliseconds'] as const)(
    'submits range endpoints at business start and end in %s',
    async (unit) => {
      await render(
        <DatePickerTimestampInput
          {...pickerProps}
          type="range"
          unit={unit}
          locale="en"
          valueFormat="D MMM YYYY"
          labelSeparator="to"
          onChange={changed}
        />
      );
      await selectDay(2);
      expect(changed).toHaveBeenLastCalledWith([businessTime('2026-11-02T09:00:00', unit), null]);
      await selectDay(3);
      expect(changed).toHaveBeenLastCalledWith([
        businessTime('2026-11-02T09:00:00', unit),
        businessTime('2026-11-03T18:00:00', unit),
      ]);
      expect(container.querySelector('[data-dates-input]')).toHaveTextContent(
        '2 Nov 2026 to 3 Nov 2026'
      );
    }
  );

  it.each([
    ['seconds', 'business'],
    ['milliseconds', 'business'],
    ['seconds', 'fullDay'],
    ['milliseconds', 'fullDay'],
  ] as const)('completes and clears a single-day %s range in %s mode', async (unit, mode) => {
    await render(
      <DatePickerTimestampInput
        {...pickerProps}
        type="range"
        unit={unit}
        rangeTimeMode={mode === 'fullDay' ? mode : undefined}
        locale="en"
        valueFormat="D MMM YYYY"
        labelSeparator="to"
        clearable
        clearButtonProps={{ 'aria-label': 'Clear date' }}
        onChange={changed}
      />
    );
    const expected =
      mode === 'business'
        ? [businessTime('2026-11-02T09:00:00', unit), businessTime('2026-11-02T18:00:00', unit)]
        : [new Date(2026, 10, 2).getTime(), new Date(2026, 10, 2, 23, 59, 59, 999).getTime()].map(
            (timestamp) => (unit === 'seconds' ? Math.floor(timestamp / 1000) : timestamp)
          );

    await selectDay(2);
    expect(changed).toHaveBeenLastCalledWith([expected[0], null]);
    expect(container.querySelector('[data-dates-input]')).toHaveTextContent('2 Nov 2026 to');
    await selectDay(2);
    expect(changed).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenLastCalledWith(expected);
    expect(container.querySelector('[data-dates-input]')!.textContent).toBe('2 Nov 2026');
    await act(async () =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Clear date"]')!.click()
    );
    expect(changed).toHaveBeenLastCalledWith([null, null]);
  });

  it('keeps an explicit value formatter and single-day opt-out', async () => {
    await render(
      <DatePickerTimestampInput
        {...pickerProps}
        type="range"
        allowSingleDateInRange={false}
        valueFormatter={() => 'Custom range'}
        onChange={changed}
      />
    );
    await selectDay(2);
    expect(container.querySelector('[data-dates-input]')).toHaveTextContent('Custom range');
    await selectDay(2);
    expect(changed).toHaveBeenLastCalledWith([null, null]);
  });

  it.each(['value', 'defaultValue'] as const)(
    'displays a saved Istanbul business-day range as one date using %s',
    async (prop) => {
      await render(
        <DatePickerTimestampInput
          {...pickerProps}
          {...{
            [prop]: [businessTime('2026-11-02T09:00:00'), businessTime('2026-11-02T18:00:00')],
          }}
          type="range"
          locale="en"
          valueFormat="D MMM YYYY"
          onChange={changed}
        />
      );
      expect(container.querySelector('[data-dates-input]')!.textContent).toBe('2 Nov 2026');
      expect(changed).not.toHaveBeenCalled();
    }
  );

  it('submits an explicitly configured end date at business end', async () => {
    await render(
      <DatePickerTimestampInput {...pickerProps} businessDayBoundary="end" onChange={changed} />
    );
    await selectDay(2);
    expect(changed).toHaveBeenLastCalledWith(businessTime('2026-11-02T18:00:00'));
  });

  it('keeps a selected time when a date-time field changes its day', async () => {
    await render(
      <DateTimePickerTimestampInput
        {...pickerProps}
        defaultValue={new Date(2026, 10, 2, 14, 35, 20).getTime() / 1000}
        withSeconds
        onChange={changed}
      />
    );
    await selectDay(3);
    expect(changed).toHaveBeenLastCalledWith(new Date(2026, 10, 3, 14, 35, 20).getTime() / 1000);
  });

  it.each(['default', 'range'] as const)(
    'preserves clearing behavior for %s dates',
    async (type) => {
      await render(
        <DatePickerTimestampInput
          {...pickerProps}
          type={type}
          clearable
          clearButtonProps={{ 'aria-label': 'Clear date' }}
          onChange={changed}
        />
      );
      await selectDay(2);
      if (type === 'range') {
        await selectDay(3);
      }
      await act(async () =>
        container.querySelector<HTMLButtonElement>('button[aria-label="Clear date"]')!.click()
      );
      expect(changed).toHaveBeenLastCalledWith(type === 'range' ? [null, null] : undefined);
    }
  );

  it('does not silently convert a saved timestamp before the user changes the date', async () => {
    await render(
      <DatePickerTimestampInput
        {...pickerProps}
        defaultValue={Date.UTC(2026, 10, 2) / 1000}
        onChange={changed}
      />
    );
    expect(changed).not.toHaveBeenCalled();
    await selectDay(3);
    expect(changed).toHaveBeenCalledExactlyOnceWith(businessTime('2026-11-03T09:00:00'));
  });

  it.each([
    ['default', 'business', 'start'],
    ['default', 'business', 'end'],
    ['range', 'business', 'start'],
    ['range', 'fullDay', 'start'],
  ] as const)(
    'keeps %s selection uncontrolled in %s mode (%s boundary) without rerendering the form or losing drafts',
    async (type, rangeTimeMode, businessDayBoundary) => {
      const hour = businessDayBoundary === 'end' ? '18' : '09';
      const start =
        rangeTimeMode === 'fullDay'
          ? new Date(2026, 10, 2).getTime() / 1000
          : businessTime(`2026-11-02T${hour}:00:00`);
      const end =
        rangeTimeMode === 'fullDay'
          ? new Date(2026, 10, 2, 23, 59, 59).getTime() / 1000
          : businessTime('2026-11-02T18:00:00');
      const formRendered = vi.fn();
      const Form = ({ revision = 0 }: { revision?: number }) => {
        formRendered();
        const form = useForm({
          mode: 'uncontrolled',
          initialValues: {
            date: undefined as number | [number | null, number | null] | undefined,
            description: 'Initial',
          },
          onValuesChange: changed,
        });
        return (
          <form data-revision={revision}>
            <input
              aria-label="Description"
              key={form.key('description')}
              {...form.getInputProps('description')}
            />
            <DatePickerTimestampInput
              {...pickerProps}
              {...(type === 'range' ? { type, rangeTimeMode } : { type, businessDayBoundary })}
              key={form.key('date')}
              {...form.getInputProps('date')}
            />
          </form>
        );
      };
      await render(<Form />);
      const input = container.querySelector<HTMLInputElement>('input[aria-label="Description"]')!;
      const picker = container.querySelector<HTMLElement>('[data-dates-input]')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          input,
          'Unsaved draft'
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await selectDay(2);
      expect(changed.mock.lastCall?.[0]).toEqual({
        date: type === 'range' ? [start, null] : start,
        description: 'Unsaved draft',
      });
      // Mantine rerenders when a field first becomes dirty; later edits should not.
      const dirtyRenderCount = formRendered.mock.calls.length;
      const selectionLabel = picker.textContent;
      const changeCount = changed.mock.calls.length;
      await act(async () =>
        root.render(
          <MantineProvider env="test">
            <Form revision={1} />
          </MantineProvider>
        )
      );
      expect(formRendered).toHaveBeenCalledTimes(dirtyRenderCount + 1);
      expect(changed).toHaveBeenCalledTimes(changeCount);
      expect(container.querySelector('[data-dates-input]')).toBe(picker);
      expect(picker.textContent).toBe(selectionLabel);

      if (type === 'default') {
        await act(async () => picker.click());
      }
      await selectDay(type === 'range' ? 2 : 3);
      expect(changed.mock.lastCall?.[0]).toEqual({
        date: type === 'range' ? [start, end] : businessTime(`2026-11-03T${hour}:00:00`),
        description: 'Unsaved draft',
      });
      expect(formRendered).toHaveBeenCalledTimes(dirtyRenderCount + 1);

      expect(container.querySelector('input[aria-label="Description"]')).toBe(input);
      expect(input).toHaveValue('Unsaved draft');
    }
  );
});
