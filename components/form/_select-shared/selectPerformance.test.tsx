import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, type OptionsFilter } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { CustomMultiSelect } from '../CustomMultiSelect';

describe('MultiSelect selection action work', () => {
  let container: HTMLDivElement;
  let root: Root;
  const data = Array.from({ length: 100 }, (_, index) => ({
    value: String(index),
    label: `Option ${index}`,
    disabled: index === 1,
  }));

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each([false, true])(
    'only scans all matching options when selection actions are enabled (%s)',
    async (withSelectionActions) => {
      const filter = vi.fn<OptionsFilter>(({ options, search, limit }) =>
        options
          .filter((option) => 'label' in option && option.label.includes(search))
          .slice(0, limit)
      );

      await act(async () =>
        root.render(
          <StrictMode>
            <MantineProvider theme={theme} env="test">
              <CustomMultiSelect
                data={data}
                filter={filter}
                limit={5}
                searchable
                withSelectionActions={withSelectionActions}
              />
            </MantineProvider>
          </StrictMode>
        )
      );
      const input = container.querySelector<HTMLInputElement>('input:not([type="hidden"])')!;
      await act(async () => input.focus());
      filter.mockClear();
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          input,
          'Option 1'
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(input.value).toBe('Option 1');
      expect(filter).toHaveBeenCalled();
      expect(filter.mock.calls.some(([input]) => input.limit === Infinity)).toBe(
        withSelectionActions
      );
    }
  );

  it('still selects every matching enabled option and clears the selection', async () => {
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <CustomMultiSelect
            data={data}
            limit={5}
            searchable
            withSelectionActions
            onChange={onChange}
            selectAllLabel="Select all"
            clearAllLabel="Clear all"
          />
        </MantineProvider>
      )
    );
    const input = container.querySelector<HTMLInputElement>('input:not([type="hidden"])')!;
    await act(async () => input.focus());
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        'Option 1'
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const button = (label: string) =>
      [...document.querySelectorAll('button')].find((item) => item.textContent === label)!;
    await act(async () => button('Select all').click());
    const expected = data.filter((item) => !item.disabled && item.label.includes('Option 1'));
    expect(onChange).toHaveBeenLastCalledWith(expected.map((item) => item.value));
    expect(
      [...container.querySelectorAll('.mantine-Pill-label')].map((item) => item.textContent)
    ).toEqual(expected.map((item) => item.label));
    await act(async () => button('Clear all').click());
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(container.querySelectorAll('.mantine-Pill-label')).toHaveLength(0);
  });
});
