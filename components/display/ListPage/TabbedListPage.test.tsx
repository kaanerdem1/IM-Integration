import { act, useEffect, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { TabbedListPage, type ListPageTabDefinition } from './TabbedListPage';

const mocks = vi.hoisted(() => ({
  firstRender: vi.fn(),
  firstUnmount: vi.fn(),
  secondRender: vi.fn(),
  onChange: vi.fn(),
  t: (key: string) => key,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.t }) }));

const FirstContent = () => {
  mocks.firstRender();
  useEffect(() => () => mocks.firstUnmount(), []);
  return <div data-testid="first-content">İlk içerik</div>;
};
const SecondContent = () => {
  mocks.secondRender();
  return <div data-testid="second-content">İkinci içerik</div>;
};
const FirstActions = () => <button type="button">İlk aksiyon</button>;
const SecondActions = () => <button type="button">İkinci aksiyon</button>;

const tabs = [
  {
    actions: FirstActions,
    component: FirstContent,
    labelKey: 'label.root.filtersAndGraphs.filtersTab',
    value: 'first',
  },
  {
    actions: SecondActions,
    component: SecondContent,
    labelKey: 'label.root.filtersAndGraphs.name',
    value: 'second',
  },
] as const satisfies readonly ListPageTabDefinition[];
type TestView = (typeof tabs)[number]['value'];

describe('TabbedListPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = async (value: TestView) => {
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <TabbedListPage tabs={tabs} value={value} onChange={mocks.onChange} />
        </MantineProvider>
      );
    });
  };

  it('renders only the selected content and its actions', async () => {
    await render('first');

    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(container.querySelector('[data-testid="first-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="second-content"]')).toBeNull();
    expect(container.textContent).toContain('İlk aksiyon');
    expect(container.textContent).not.toContain('İkinci aksiyon');
    expect(mocks.firstRender).toHaveBeenCalled();
    expect(mocks.secondRender).not.toHaveBeenCalled();
  });

  it('switches the content and actions without keeping inactive tabs mounted', async () => {
    await render('first');
    const secondTab = container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1];
    await act(async () => secondTab.click());

    expect(mocks.onChange).toHaveBeenCalledWith('second');
    mocks.firstRender.mockClear();
    await render('second');

    expect(secondTab).toHaveAttribute('aria-selected', 'true');
    expect(container.querySelector('[data-testid="first-content"]')).toBeNull();
    expect(container.querySelector('[data-testid="second-content"]')).not.toBeNull();
    expect(container.textContent).not.toContain('İlk aksiyon');
    expect(container.textContent).toContain('İkinci aksiyon');
    expect(mocks.firstUnmount).toHaveBeenCalledTimes(1);
    expect(mocks.firstRender).not.toHaveBeenCalled();
    expect(mocks.secondRender).toHaveBeenCalled();
  });

  it('keeps the active content mounted across parent renders', async () => {
    await render('first');
    const content = container.querySelector('[data-testid="first-content"]');
    await render('first');

    expect(container.querySelector('[data-testid="first-content"]')).toBe(content);
    expect(mocks.firstUnmount).not.toHaveBeenCalled();
    expect(mocks.secondRender).not.toHaveBeenCalled();
  });

  it('supports a content tab without header actions', async () => {
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <TabbedListPage
            tabs={[{ ...tabs[0], actions: undefined }]}
            value="first"
            onChange={mocks.onChange}
          />
        </MantineProvider>
      );
    });

    expect(container.querySelector('[data-testid="first-content"]')).not.toBeNull();
    expect(container.textContent).not.toContain('İlk aksiyon');
  });

  it('requires content and limits the active value to defined tabs', () => {
    type Props = ComponentProps<typeof TabbedListPage<TestView>>;

    expectTypeOf<Props['value']>().toEqualTypeOf<'first' | 'second'>();
    expectTypeOf<Parameters<Props['onChange']>[0]>().toEqualTypeOf<TestView>();
    expectTypeOf<string>().not.toExtend<Props['value']>();
    expectTypeOf<'label.root.filtersAndGraphs.filtersTab'>().toExtend<
      ListPageTabDefinition['labelKey']
    >();
    expectTypeOf<'message.required'>().not.toExtend<ListPageTabDefinition['labelKey']>();
    expectTypeOf<'label.create'>().not.toExtend<ListPageTabDefinition['labelKey']>();
    expectTypeOf<{
      labelKey: 'label.root.filtersAndGraphs.filtersTab';
      value: 'first';
    }>().not.toExtend<ListPageTabDefinition<TestView>>();
    expectTypeOf<{
      component: typeof FirstContent;
      labelKey: 'unknown.translation';
      value: 'first';
    }>().not.toExtend<ListPageTabDefinition<TestView>>();
  });
});
