import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComboboxItem } from '@mantine/core';
import { useSelectedOptions } from './useSelectedOptions';

describe('selected option cache', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onRender = vi.fn();

  function Probe({
    values,
    options,
  }: {
    values: string[];
    options: ReadonlyMap<string, ComboboxItem>;
  }) {
    onRender();
    const { selectedOptions } = useSelectedOptions(values, options);
    return <output>{selectedOptions.map((option) => option.label).join(',')}</output>;
  }

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
    onRender.mockClear();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = (values: string[], options: ReadonlyMap<string, ComboboxItem>) =>
    act(async () =>
      root.render(
        <StrictMode>
          <Probe values={values} options={options} />
        </StrictMode>
      )
    );

  it('looks up only selected values and reuses results on unrelated renders', async () => {
    const options = new Map(
      Array.from({ length: 1000 }, (_, index) => [
        String(index),
        { value: String(index), label: `Option ${index}` },
      ])
    );
    const getOption = vi.spyOn(options, 'get');
    const values = ['1', '2'];
    await render(values, options);
    // StrictMode calls the memo twice, but no effect-triggered render follows.
    expect(onRender).toHaveBeenCalledTimes(2);
    expect(getOption).toHaveBeenCalledTimes(values.length * 2);
    expect(container.textContent).toBe('Option 1,Option 2');

    getOption.mockClear();
    onRender.mockClear();
    await render(values, options);
    expect(onRender).toHaveBeenCalledTimes(2);
    expect(getOption).not.toHaveBeenCalled();
  });

  it('drops deselected metadata instead of accumulating search history', async () => {
    const options = new Map([
      ['1', { value: '1', label: 'One' }],
      ['2', { value: '2', label: 'Two' }],
    ]);
    const emptyOptions = new Map<string, ComboboxItem>();
    await render(['1', '2'], options);
    await render(['1', '2'], emptyOptions);
    expect(container.textContent).toBe('One,Two');
    await render(['1'], emptyOptions);
    expect(container.textContent).toBe('One');
    await render(['2'], emptyOptions);
    expect(container.textContent).toBe('');
  });
});
