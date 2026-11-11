import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { theme } from '@/_assets/style/theme';
import { CustomMultiSelect } from '../CustomMultiSelect';
import { CustomSelect } from '../CustomSelect';

const selectedOption = { label: 'Ayşe Yılmaz', value: 'user-1' };
const resultOption = { label: 'Mehmet Demir', value: 'user-2' };
type Option = typeof selectedOption;

function SearchForm({
  multiple,
  data,
  onSearch,
  onRender,
  onSubmit,
}: {
  multiple: boolean;
  data: Option[];
  onSearch: (text: string) => void;
  onRender: () => void;
  onSubmit: (values: { user: string | null; users: string[] }) => void;
}) {
  onRender();
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { user: 'user-1' as string | null, users: ['user-1'] },
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      {multiple ? (
        <CustomMultiSelect
          key={form.key('users')}
          {...form.getInputProps('users')}
          data={data}
          onSearch={(text) => onSearch(text)}
          searchable
          clearable
        />
      ) : (
        <CustomSelect
          key={form.key('user')}
          {...form.getInputProps('user')}
          data={data}
          onSearch={(text) => onSearch(text)}
          searchable
          clearable
        />
      )}
      <button type="submit">Submit</button>
      <button type="button" onClick={() => form.reset()}>
        Reset
      </button>
    </form>
  );
}

describe.each([false, true])('remote search (multiple: %s)', (multiple) => {
  let container: HTMLDivElement;
  let root: Root;
  const onSearch = vi.fn();
  const onRender = vi.fn();
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const render = async (data: Option[] = [selectedOption, resultOption]) => {
    await act(async () =>
      root.render(
        <StrictMode>
          <MantineProvider theme={theme} env="test">
            <SearchForm {...{ data, multiple, onSearch, onRender, onSubmit }} />
          </MantineProvider>
        </StrictMode>
      )
    );
  };
  const input = () => container.querySelector<HTMLInputElement>('input:not([type="hidden"])')!;
  const type = async (text: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input(),
        text
      );
      input().dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  it('renders fast typing immediately without rendering the form or searching until debounce ends', async () => {
    await render();
    await act(async () => input().focus());
    onRender.mockClear();
    onSearch.mockClear();
    for (const text of ['M', 'Me', 'Meh', 'Mehmet']) {
      await type(text);
      expect(input().value).toBe(text);
      expect(onRender).not.toHaveBeenCalled();
      expect(onSearch).not.toHaveBeenCalled();
    }
    await act(async () => vi.advanceTimersByTime(299));
    expect(onSearch).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('Mehmet');

    await render([resultOption]);
    expect(input().value).toBe('Mehmet');
    await type('Mehmet D');
    await render([]);
    expect(input().value).toBe('Mehmet D');
  });

  it('cancels pending text on selection and submits the uncontrolled selection', async () => {
    await render();
    await act(async () => input().focus());
    await type('Meh');
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((item) =>
      item.textContent?.includes('Mehmet Demir')
    );
    expect(option).toBeDefined();
    await act(async () => option!.click());
    await act(async () => vi.advanceTimersByTime(300));
    expect(onSearch).not.toHaveBeenCalledWith('Meh');
    expect(onSearch).not.toHaveBeenCalledWith('Mehmet Demir');
    await act(async () => container.querySelector<HTMLButtonElement>('[type="submit"]')!.click());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining(multiple ? { users: ['user-1', 'user-2'] } : { user: 'user-2' }),
      expect.anything()
    );
  });

  it('does not restart or repeat a pending query when the parent and callback change', async () => {
    await render();
    await type('Mehmet');
    await act(async () => vi.advanceTimersByTime(100));
    await render([resultOption]);
    await act(async () => vi.advanceTimersByTime(199));
    expect(onSearch).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('Mehmet');
    await render([resultOption]);
    await act(async () => vi.advanceTimersByTime(600));
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('Mehmet');
  });

  it('cancels a pending search on blur, clear and form reset', async () => {
    await render();
    await act(async () => input().focus());
    await type('Meh');
    await act(async () => input().blur());
    await act(async () => vi.advanceTimersByTime(300));
    expect(onSearch).not.toHaveBeenCalledWith('Meh');

    await type('Ayşe');
    await type('');
    await act(async () => vi.advanceTimersByTime(300));
    expect(onSearch).not.toHaveBeenCalledWith('Ayşe');

    await type('Silinecek');
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Reset')!
        .click()
    );
    await act(async () => vi.advanceTimersByTime(300));
    expect(onSearch).not.toHaveBeenCalledWith('Silinecek');
  });
});

it('resolves the initial Select label after asynchronous options arrive', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const render = (data: Option[]) =>
    act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <CustomSelect defaultValue="user-1" data={data} searchable />
        </MantineProvider>
      )
    );
  try {
    await render([]);
    expect(container.querySelector('input')?.value).toBe('');
    await render([selectedOption]);
    expect(container.querySelector('input')?.value).toBe('Ayşe Yılmaz');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
