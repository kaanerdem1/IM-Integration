import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Pill, type ComboboxData } from '@mantine/core';
import { useForm } from '@mantine/form';
import { theme } from '@/_assets/style/theme';
import { CustomMultiSelect } from '../CustomMultiSelect';
import { CustomSelect } from '../CustomSelect';

const initialOption = { value: 'user-1', label: 'Ayşe Yılmaz' };
const remoteOption = { value: 'user-2', label: 'Mehmet Demir' };

function RemoteForm({
  multiple,
  controlled,
  keepSearch,
  data,
  onSubmit,
}: {
  multiple: boolean;
  controlled: boolean;
  keepSearch: boolean;
  data?: ComboboxData;
  onSubmit: (values: { user: string | null; users: string[] }) => void;
}) {
  const [query, setQuery] = useState('');
  const form = useForm({
    mode: controlled ? 'controlled' : 'uncontrolled',
    initialValues: { user: initialOption.value as string | null, users: [initialOption.value] },
  });
  // A cached first page replaces search results in the same event that selects an option.
  const options = data ?? [
    { group: 'Kullanıcılar', items: query ? [remoteOption] : [initialOption] },
  ];

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      {multiple ? (
        <CustomMultiSelect
          key={form.key('users')}
          {...form.getInputProps('users')}
          data={options}
          searchable
          clearable
          clearButtonProps={{ 'aria-label': 'Clear selection' }}
          clearSearchOnChange={!keepSearch}
          onSearch={setQuery}
          renderPill={({ option, onRemove, disabled }) => (
            <Pill withRemoveButton onRemove={onRemove} disabled={disabled || option.disabled}>
              {option.label}
            </Pill>
          )}
        />
      ) : (
        <CustomSelect
          key={form.key('user')}
          {...form.getInputProps('user')}
          data={options}
          searchable
          clearable
          clearButtonProps={{ 'aria-label': 'Clear selection' }}
          onSearch={setQuery}
        />
      )}
      <button type="submit">Submit</button>
      <button type="button" onClick={() => form.reset()}>
        Reset
      </button>
      <button
        type="button"
        onClick={() => {
          form.setFieldValue('user', initialOption.value);
          form.setFieldValue('users', [initialOption.value]);
        }}
      >
        External update
      </button>
      <output>{query}</output>
    </form>
  );
}

describe.each([
  { multiple: false, controlled: false, keepSearch: false },
  { multiple: false, controlled: true, keepSearch: false },
  { multiple: true, controlled: false, keepSearch: false },
  { multiple: true, controlled: true, keepSearch: false },
  { multiple: true, controlled: false, keepSearch: true },
  { multiple: true, controlled: true, keepSearch: true },
])('selection retention %j', (mode) => {
  let root: Root;
  let container: HTMLDivElement;
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onSubmit.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const render = async (data?: ComboboxData) => {
    await act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <RemoteForm {...mode} data={data} onSubmit={onSubmit} />
        </MantineProvider>
      )
    );
  };
  const input = () => container.querySelector<HTMLInputElement>('input:not([type="hidden"])')!;
  const labels = () =>
    mode.multiple
      ? [...container.querySelectorAll('.mantine-Pill-label')].map((pill) => pill.textContent)
      : input().value
        ? [input().value]
        : [];
  const button = async (label: string) => {
    const element = [...container.querySelectorAll('button')].find(
      (item) => item.textContent === label
    );
    expect(element).toBeDefined();
    await act(async () => element!.click());
  };
  const chooseRemoteOption = async () => {
    await act(async () => input().focus());
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input(),
        'Mehmet'
      );
      input().dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => vi.advanceTimersByTime(300));
    expect(container.querySelector('output')?.textContent).toBe('Mehmet');
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((item) =>
      item.textContent?.includes(remoteOption.label)
    );
    expect(option).toBeDefined();
    await act(async () => option!.click());
  };

  it('keeps labels and form values when selection and query reset happen together', async () => {
    await render();
    const originalInput = input();
    await chooseRemoteOption();
    expect(input()).toBe(originalInput);
    expect(container.querySelector('output')?.textContent).toBe(mode.keepSearch ? 'Mehmet' : '');
    if (mode.multiple) {
      expect(input()).toHaveAttribute('aria-expanded', 'true');
      expect(input().value).toBe(mode.keepSearch ? 'Mehmet' : '');
    }
    await act(async () => input().blur());
    expect(labels()).toEqual(
      mode.multiple ? [initialOption.label, remoteOption.label] : [remoteOption.label]
    );
    expect(container.querySelector('output')?.textContent).toBe('');
    await button('Submit');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining(mode.multiple ? { users: ['user-1', 'user-2'] } : { user: 'user-2' }),
      expect.anything()
    );
  });

  it('clears retained choices, resets the form and accepts external value updates', async () => {
    await render();
    await chooseRemoteOption();
    await act(async () => input().blur());
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Clear selection"]')!.click()
    );
    expect(labels()).toEqual([]);
    await button('Submit');
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining(mode.multiple ? { users: [] } : { user: null }),
      expect.anything()
    );
    await act(async () => input().focus());
    expect(
      [...document.querySelectorAll('[role="option"]')].some((item) =>
        item.textContent?.includes(remoteOption.label)
      )
    ).toBe(false);
    await button('Reset');
    await act(async () => input().blur());
    expect(labels()).toEqual([initialOption.label]);
    await chooseRemoteOption();
    await button('External update');
    await act(async () => input().blur());
    expect(labels()).toEqual([initialOption.label]);
    await button('Submit');
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining(mode.multiple ? { users: ['user-1'] } : { user: 'user-1' }),
      expect.anything()
    );
  });

  it('prefers updated service labels and disabled flags without duplicating a retained option', async () => {
    await render();
    await chooseRemoteOption();
    await act(async () => input().blur());
    const updatedOption = { ...remoteOption, label: 'Mehmet Demir Güncel', disabled: true };
    await render([{ group: 'Güncel kullanıcılar', items: [initialOption, updatedOption] }]);
    await act(async () => {
      input().focus();
      input().blur();
    });
    expect(labels()).toEqual(
      mode.multiple ? [initialOption.label, updatedOption.label] : [updatedOption.label]
    );
    await render([]);
    await act(async () => input().focus());
    const matchingOptions = [...document.querySelectorAll('[role="option"]')].filter((item) =>
      item.textContent?.includes(updatedOption.label)
    );
    if (mode.multiple) {
      expect(matchingOptions).toHaveLength(0);
    } else {
      expect(matchingOptions).toHaveLength(1);
      expect(matchingOptions[0]).toHaveAttribute('data-combobox-disabled');
    }
    expect(labels()).toEqual(
      mode.multiple ? [initialOption.label, updatedOption.label] : [updatedOption.label]
    );
  });
});

it.each([false, true])(
  'preserves a controlled selection when its parent rejects a change (multiple: %s)',
  async (multiple) => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onChange = vi.fn();
    function ControlledField() {
      const [data, setData] = useState([initialOption, remoteOption]);
      const handleChange = (value: string | string[] | null) => {
        onChange(value);
        setData([]);
      };
      return multiple ? (
        <CustomMultiSelect
          value={[initialOption.value]}
          data={data}
          searchable
          onChange={handleChange}
        />
      ) : (
        <CustomSelect value={initialOption.value} data={data} searchable onChange={handleChange} />
      );
    }
    try {
      await act(async () =>
        root.render(
          <MantineProvider theme={theme} env="test">
            <ControlledField />
          </MantineProvider>
        )
      );
      const input = container.querySelector<HTMLInputElement>('input:not([type="hidden"])')!;
      await act(async () => input.focus());
      const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((item) =>
        item.textContent?.includes(remoteOption.label)
      );
      expect(option).toBeDefined();
      await act(async () => option!.click());
      await act(async () => input.blur());
      expect(onChange).toHaveBeenCalledWith(multiple ? ['user-1', 'user-2'] : 'user-2');
      expect(
        multiple ? container.querySelector('.mantine-Pill-label')?.textContent : input.value
      ).toBe(initialOption.label);
      await act(async () => input.focus());
      expect(
        [...document.querySelectorAll('[role="option"]')].some((item) =>
          item.textContent?.includes(remoteOption.label)
        )
      ).toBe(false);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  }
);
