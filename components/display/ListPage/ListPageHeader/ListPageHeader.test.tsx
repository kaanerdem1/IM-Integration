import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { ListPageHeader, type ListPageHeaderProps, type ListPageTab } from './index';

type TestView = 'list' | 'timeline';
type Props = ListPageHeaderProps<TestView>;

const tabs: ListPageTab<TestView>[] = [
  { value: 'list', label: 'Liste', icon: <span data-testid="list-icon" /> },
  { value: 'timeline', label: 'Zaman Çizelgesi', rightSection: <span>2</span> },
];

describe('ListPageHeader', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = async (props: Props) => {
    await act(async () => {
      root.render(
        <StrictMode>
          <MantineProvider env="test">
            <ListPageHeader {...props} />
          </MantineProvider>
        </StrictMode>
      );
    });
  };

  it('keeps tabs as the default and forwards tab-specific props', async () => {
    await render({ tabs, value: 'list', onChange, tabsProps: { loop: false, id: 'view-tabs' } });

    const buttons = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute('aria-selected', 'true');
    expect(container.querySelector('#view-tabs')).not.toBeNull();
    expect(container.querySelector('[data-testid="list-icon"]')).not.toBeNull();
    expect(buttons[1]).toHaveTextContent('Zaman Çizelgesi2');
    expect(container.querySelector('input[type="radio"]')).toBeNull();

    await act(async () => buttons[1].click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith('timeline');
  });

  it('renders segmented options and forwards segmented-specific props', async () => {
    const props: Props = {
      controlType: 'segmented',
      tabs,
      tabsTestId: 'view-control',
      value: 'list',
      onChange,
      segmentedProps: { size: 'xs', radius: 'xl', name: 'view', withItemsBorders: false },
      description: 'Açıklama',
      actions: <button type="button">Aksiyon</button>,
    };
    await render(props);

    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    expect(radios[0]).toHaveAttribute('name', 'view');
    expect(container.querySelector('[data-testid="view-control"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="list-icon"]')).not.toBeNull();
    expect(container.querySelector('[role="tab"]')).toBeNull();
    expect(container).toHaveTextContent('Zaman Çizelgesi2');
    expect(container).toHaveTextContent('Açıklama');
    expect(container).toHaveTextContent('Aksiyon');

    await act(async () => radios[1].click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith('timeline');

    await render({ ...props, value: 'timeline' });
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it('respects disabled segmented controls', async () => {
    await render({
      controlType: 'segmented',
      tabs,
      value: 'list',
      onChange,
      segmentedProps: { disabled: true },
    });

    const secondInput = container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1];
    expect(secondInput).toBeDisabled();
    await act(async () => secondInput.click());
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['tabs', 'segmented'] as const)(
    'does not emit changes or remount controls on parent renders in %s mode',
    async (controlType) => {
      const props = { controlType, tabs, value: 'list', onChange } satisfies Props;
      const selector = controlType === 'tabs' ? '[role="tab"]' : 'input[type="radio"]';
      await render(props);
      const controls = container.querySelectorAll<HTMLElement>(selector);

      await act(async () => controls[0].click());
      expect(onChange).not.toHaveBeenCalled();

      await render({ ...props, description: 'Güncellenen açıklama' });
      expect(container.querySelectorAll(selector)[0]).toBe(controls[0]);
      expect(container.querySelectorAll(selector)[1]).toBe(controls[1]);
      expect(onChange).not.toHaveBeenCalled();

      await act(async () => controls[1].click());
      expect(onChange).toHaveBeenCalledExactlyOnceWith('timeline');

      await render({ ...props, value: 'timeline' });
      onChange.mockClear();
      await act(async () => controls[1].click());
      expect(onChange).not.toHaveBeenCalled();
    }
  );

  it('preserves title-only and action-only headers', async () => {
    const actions = <button type="button">Aksiyon</button>;
    await render({ title: 'Başlık', description: 'Açıklama', actions });

    expect(container).toHaveTextContent('Başlık');
    expect(container).toHaveTextContent('Açıklama');
    expect(container).toHaveTextContent('Aksiyon');
    expect(container.querySelector('[role="tab"]')).toBeNull();
    expect(container.querySelector('input[type="radio"]')).toBeNull();

    await render({ actions, actionsAlign: 'center' });
    expect(container).not.toHaveTextContent('Başlık');
    expect(container).toHaveTextContent('Aksiyon');
    expect(container.querySelector('[data-actions-align]')).toHaveAttribute(
      'data-actions-align',
      'center'
    );
  });

  it('exposes only the native props of the selected control', () => {
    type TabsMode = Extract<Props, { controlType?: 'tabs' }>;
    type SegmentedMode = Extract<Props, { controlType: 'segmented' }>;
    type NativeTabsProps = NonNullable<TabsMode['tabsProps']>;
    type NativeSegmentedProps = NonNullable<SegmentedMode['segmentedProps']>;

    expectTypeOf<TabsMode['segmentedProps']>().toEqualTypeOf<undefined>();
    expectTypeOf<SegmentedMode['tabsProps']>().toEqualTypeOf<undefined>();
    expectTypeOf<NativeTabsProps>().toHaveProperty('activateTabWithKeyboard');
    expectTypeOf<NativeTabsProps>().not.toHaveProperty('withItemsBorders');
    expectTypeOf<NativeSegmentedProps>().toHaveProperty('withItemsBorders');
    expectTypeOf<NativeSegmentedProps>().not.toHaveProperty('activateTabWithKeyboard');
    expectTypeOf<NativeTabsProps>().not.toHaveProperty('value');
    expectTypeOf<NativeTabsProps>().not.toHaveProperty('onChange');
    expectTypeOf<NativeSegmentedProps>().not.toHaveProperty('data');
    expectTypeOf<NativeSegmentedProps>().not.toHaveProperty('value');
    expectTypeOf<NativeSegmentedProps>().not.toHaveProperty('onChange');
    expectTypeOf<SegmentedMode['title']>().toEqualTypeOf<undefined>();
    expectTypeOf<SegmentedMode['value']>().toEqualTypeOf<TestView>();
    expectTypeOf<Parameters<SegmentedMode['onChange']>[0]>().toEqualTypeOf<TestView>();
  });

  it('rejects mixed modes and values outside the declared options at compile time', () => {
    const missingMode = (
      // @ts-expect-error SegmentedControl props require the segmented mode.
      <ListPageHeader
        tabs={tabs}
        value="list"
        onChange={onChange}
        segmentedProps={{ size: 'xs' }}
      />
    );
    const mixedProps = (
      // @ts-expect-error Tabs props are not accepted in segmented mode.
      <ListPageHeader
        controlType="segmented"
        tabs={tabs}
        value="list"
        onChange={onChange}
        tabsProps={{ loop: false }}
      />
    );
    // @ts-expect-error Selection is inferred from tabs, not widened by value.
    const unknownValue = <ListPageHeader tabs={tabs} value="unknown" onChange={onChange} />;

    expect(missingMode).toBeDefined();
    expect(mixedProps).toBeDefined();
    expect(unknownValue).toBeDefined();
  });
});
