import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { LIST_DEFAULT_SORT, LIST_SORT_OPTIONS, type ListSortOption } from './listSort';
import { ListSortMenu } from './ListSortMenu';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ListSortMenu', () => {
  it('only accepts translation keys that do not require interpolation values', () => {
    expectTypeOf<'label.requests.list.sort.createdDesc'>().toExtend<ListSortOption['labelKey']>();
    expectTypeOf<'message.required'>().not.toExtend<ListSortOption['labelKey']>();
    expectTypeOf<'label.create'>().not.toExtend<ListSortOption['labelKey']>();
    expectTypeOf<'unknown.translation'>().not.toExtend<ListSortOption['labelKey']>();
  });

  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const onChange = vi.fn();
  const render = async (value?: string) => {
    await act(async () =>
      root.render(
        <MantineProvider env="test">
          <ListSortMenu triggerTestId="list-sort" value={value} onChange={onChange} />
        </MantineProvider>
      )
    );
    await act(async () => container.querySelector<HTMLButtonElement>('button')?.click());
  };

  beforeEach(() => {
    onChange.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('uses an icon-only trigger and selects the default sort without emitting a change', async () => {
    await render();
    const trigger = container.querySelector('[data-testid="list-sort"]');
    expect(trigger).toHaveClass('mantine-ActionIcon-root');
    expect(trigger).toHaveAttribute('aria-label', 'label.sortBy');
    expect(trigger?.textContent).toBe('');
    expect(document.querySelector('[role="menu"]')).toHaveStyle({
      width: 'max-content',
    });
    const items = [...document.querySelectorAll('[role="menuitem"]')];
    expect(items.map((item) => item.textContent)).toEqual(
      LIST_SORT_OPTIONS.map((option) => option.labelKey)
    );
    expect(items[0]?.querySelector('.tabler-icon-check')).not.toBeNull();
    expect(document.querySelectorAll('[role="menuitem"] .tabler-icon-check')).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(LIST_SORT_OPTIONS)('emits the selected $value sort', async ({ value }) => {
    await render();
    const index = LIST_SORT_OPTIONS.findIndex((option) => option.value === value);
    const item = document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[index];
    await act(async () => item?.click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      value === LIST_DEFAULT_SORT ? undefined : value
    );
  });

  it('marks the sort provided by the page as selected', async () => {
    await render('updated-asc');
    const items = document.querySelectorAll('[role="menuitem"]');
    expect(items[3]?.querySelector('.tabler-icon-check')).not.toBeNull();
    expect(document.querySelectorAll('[role="menuitem"] .tabler-icon-check')).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
