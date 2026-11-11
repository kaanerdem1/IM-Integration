import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Menu } from '@mantine/core';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import * as savedFilterSerialization from '@/pages/requests/list/_utils/savedRequestListFilter';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import { requestFilterModes } from '../_types';
import { SavedFilterMenu, type SavedFilterMenuProps } from './SavedFilterMenu';
import { SavedFilterMenuOptions } from './SavedFilterMenuOptions';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../_hooks/useSavedRequestFilterQuery', () => ({
  useSavedRequestFilterQuery: (...args: unknown[]) => ({ query: mocks.query(...args) }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      ({
        'label.description': 'Açıklama',
        'label.requests.list.filters.defaultFilter': 'Tüm Talepler (Son 1 yıl)',
        'label.requests.list.filters.defaultFilterDescription': 'Son 1 yılda oluşturulmuş talepler',
        'label.requests.list.filters.scopeCommon': 'Ortak',
        'label.requests.list.filters.scopeSoftwareDescription':
          'Yazılım geliştirme taleplerini filtrelemek için kullanılabilecek alanları gösterir.',
        'label.requests.list.filters.scopeOperational': 'Operasyonel',
        'label.requests.list.filters.scopeOperationalDescription':
          'Operasyonel talepleri filtrelemek için kullanılabilecek alanları gösterir.',
        'label.requests.list.filters.groupSoftwareRequests': 'Yazılım Talepleri',
        'label.requests.list.filters.groupOperationalRequests': 'Operasyonel Talepler',
        'label.requests.list.filters.groupSelectedCount': `${options?.count} seçili`,
        'label.requests.list.filters.groupFilterCount': `${options?.count} filtre`,
        'label.requests.list.filters.scopeCommonDescription':
          'Yazılım ve operasyonel taleplerin ortak özelliklerine göre filtreleme yapar.',
        'label.requests.list.filters.combinedResults':
          'Seçilmiş filtrelerin sonuçları birleştirilerek gösterilir.',
        'label.home.savedFilterMenuTitle': 'Bu alanda uygulanacak filtreleri seçiniz.',
        'label.home.savedFilterMenuTooltip': 'Filtre Seçimi',
        'label.home.savedFilterMenuSelected': 'Seçilen',
        'label.home.savedFilterMenuTrigger': 'Uygulanacak filtreleri seç',
        'label.root.filtersAndGraphs.addFilter': 'Filtre Ekle',
        'label.root.filtersAndGraphs.empty': 'Henüz kayıtlı filtreniz bulunmamaktadır.',
        'label.root.nav.savedListsLoading': 'Kayıtlı filtreler yükleniyor',
      })[key] ?? key,
  }),
}));

const savedMenuItems = () =>
  [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].slice(1);

describe('SavedFilterMenu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useModalStore.setState({ currentModals: [] });
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.query.mockReturnValue({ data: { Data: [] }, isError: false, isFetching: false });
  });

  afterEach(() => {
    act(() => root.unmount());
    useModalStore.setState({ currentModals: [] });
    container.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const renderMenu = async (props?: SavedFilterMenuProps) => {
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <SavedFilterMenu {...props} />
        </MantineProvider>
      );
    });
  };

  const clickMenuTrigger = async () => {
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Uygulanacak filtreleri seç"]')
        ?.click();
    });
  };

  const flushMenuScroll = async () => {
    await act(async () => vi.advanceTimersToNextFrame());
  };

  const openMenu = async () => {
    await clickMenuTrigger();
    await flushMenuScroll();
  };

  it.each([
    { selectedFilterIds: [] },
    { selectedFilterIds: ['filter-1'] },
    { selectedFilterIds: ['filter-1', 'filter-2'] },
  ])(
    'always explains the combination in the menu, but only in multi-selection tooltips: $selectedFilterIds',
    async ({ selectedFilterIds }) => {
      mocks.query.mockReturnValue({
        data: {
          Data: [
            { Id: 'filter-1', Name: 'İptal edilen talepler', Filter: '{}' },
            { Id: 'filter-2', Name: 'Kurumsal Uygulamalar', Filter: '{}' },
          ],
        },
      });
      await renderMenu({ selectedFilterIds, tooltipProps: { opened: true } });
      const hint = 'Seçilmiş filtrelerin sonuçları birleştirilerek gösterilir.';
      const tooltip = document.querySelector('[role="tooltip"]');
      if (selectedFilterIds.length > 1) {
        expect(tooltip).toHaveTextContent(hint);
      } else {
        expect(tooltip).not.toHaveTextContent(hint);
      }
      await openMenu();
      expect(document.querySelector('.mantine-Menu-label')).toHaveTextContent(hint);
    }
  );

  it('opens the create-filter modal from the header without changing the selection', async () => {
    const onChange = vi.fn();
    mocks.query.mockReturnValue({
      data: { Data: [{ Id: 'filter-1', Name: 'Kayıtlı Filtre' }] },
    });
    await renderMenu({ selectedFilterIds: ['filter-1'], onChange });
    expect(useModalStore.getState().currentModals).toHaveLength(0);
    await openMenu();
    const button = document.querySelector<HTMLButtonElement>('[aria-label="Filtre Ekle"]')!;
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-variant', 'filled');
    expect(button.closest('.mantine-Menu-label')).not.toBeNull();
    expect(button.querySelector('.tabler-icon-filter-plus')).not.toBeNull();

    await act(async () => button.dispatchEvent(new MouseEvent('mouseenter')));
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Filtre Ekle');
    await act(async () => button.click());
    expect(useModalStore.getState().currentModals).toEqual([
      { type: 'RequestFilter', options: { mode: requestFilterModes.create } },
    ]);
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => useModalStore.getState().closeModal('RequestFilter'));
    await openMenu();
    expect(document.querySelector('[aria-current="true"]')).toHaveTextContent('Kayıtlı Filtre');
  });

  it('requests closing a controlled menu before creating a filter when the catalog is empty', async () => {
    const onOpenedChange = vi.fn();
    await renderMenu({ menuProps: { opened: true, onChange: onOpenedChange } });
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Filtre Ekle"]')!.click();
    });
    expect(onOpenedChange).toHaveBeenCalledWith(false);
    expect(useModalStore.getState().getModalOption('RequestFilter')).toEqual({
      mode: requestFilterModes.create,
    });
  });

  it.each(['default', 'inverse', 'on-danger'] as const)(
    'hides only the chevron when disabled in the %s appearance',
    async (appearance) => {
      await renderMenu({ appearance, withChevron: false });
      const trigger = container.querySelector('[aria-label="Uygulanacak filtreleri seç"]');

      expect(trigger?.querySelectorAll('svg')).toHaveLength(1);
      expect(trigger?.querySelector('.tabler-icon-settings')).toHaveAttribute(
        'width',
        appearance === 'on-danger' ? '12' : '15'
      );
      expect(trigger?.querySelector('[data-with-chevron]')).toBeNull();

      await openMenu();
      expect(document.querySelector('[role="menu"]')).not.toBeNull();
    }
  );

  it('pins the built-in option first and selects it even when saved filters exist', async () => {
    mocks.query.mockReturnValue({
      data: { Data: [{ Id: 'filter-1', Name: 'Kayıtlı Filtre' }] },
    });
    const onChange = vi.fn();
    await renderMenu({ onChange });
    await openMenu();
    const firstItem = document.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
    expect(firstItem).toHaveTextContent('Tüm Talepler (Son 1 yıl)');
    expect(firstItem).toHaveAttribute('aria-current', 'true');
    expect(firstItem.querySelector('[data-truncate]:not([data-filter-name])')).toHaveTextContent(
      'Son 1 yılda oluşturulmuş talepler'
    );
    await act(async () => firstItem.dispatchEvent(new MouseEvent('mouseenter')));
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Son 1 yılda oluşturulmuş talepler'
    );
    await act(async () => firstItem.click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      Id: DEFAULT_REQUEST_FILTER_ID,
      Name: 'Tüm Talepler (Son 1 yıl)',
      Description: 'Son 1 yılda oluşturulmuş talepler',
    });
  });

  it('keeps the default outside fixed scope groups and preserves multi-selection', async () => {
    const operational = { Id: 'ot', Name: 'A Operasyonel', Filter: '{"listIssueType":"2"}' };
    const software = { Id: 'yt', Name: 'B Yazılım', Filter: '{"listIssueType":"1"}' };
    const common = { Id: 'common', Name: 'C Ortak', Filter: '{"listIssueType":"-1"}' };
    const legacy = { Id: 'legacy', Name: 'D Eski filtre', Filter: '{}' };
    mocks.query.mockReturnValue({ data: { Data: [operational, software, common, legacy] } });
    await renderMenu();
    await openMenu();

    const labels = [...document.querySelectorAll('[data-saved-filter-scope]')];
    expect(labels.map((label) => label.getAttribute('data-saved-filter-scope'))).toEqual([
      '-1',
      '1',
      '2',
    ]);
    const groups = labels.map((label) => label.closest('[role="group"]')!);
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual([
      'Ortak',
      'Yazılım Talepleri',
      'Operasyonel Talepler',
    ]);
    expect(groups[0]).toHaveTextContent('2 filtre');
    expect(groups[0]).not.toHaveTextContent('seçili');
    expect(groups[0].querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    const allItems = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    expect(allItems.map((item) => item.getAttribute('aria-label'))).toEqual([
      'Tüm Talepler (Son 1 yıl)',
      common.Name,
      legacy.Name,
      software.Name,
      operational.Name,
    ]);
    expect(allItems[0].closest('[role="group"]')).toBeNull();
    expect(document.querySelector('.mantine-Accordion-root')).toBeNull();
    expect(document.querySelectorAll('.mantine-ScrollArea-viewport')).toHaveLength(1);
    expect(
      document.querySelector<HTMLElement>('[data-testid="saved-filter-menu-scroll"]')?.style
    ).toMatchObject({
      maxHeight: 'min(400px, 60dvh)',
    });

    await act(async () => allItems[1].click());
    await act(async () => allItems[4].click());
    expect(groups[0]).toHaveTextContent('1 seçili');
    expect(groups[2]).toHaveTextContent('1 seçili');
    expect(allItems[0]).not.toHaveAttribute('aria-current');
    expect(document.querySelector('[role="menu"]')).not.toBeNull();

    await act(async () => allItems[0].click());
    expect(document.querySelectorAll('[role="menuitem"][aria-current="true"]')).toHaveLength(1);
    expect(allItems[0]).toHaveAttribute('aria-current', 'true');
    expect(groups[0]).not.toHaveTextContent('seçili');
    expect(groups[2]).not.toHaveTextContent('seçili');
  });

  it('omits empty scope groups and explains the common group without selecting it', async () => {
    const onChange = vi.fn();
    await renderMenu({ onChange });
    await openMenu();
    expect(document.querySelectorAll('[data-saved-filter-scope]')).toHaveLength(0);

    mocks.query.mockReturnValue({
      data: { Data: [{ Id: 'legacy', Name: 'Eski filtre', Filter: '{}' }] },
    });
    await renderMenu({ onChange });
    const label = document.querySelector('[data-saved-filter-scope]')!;
    expect(document.querySelectorAll('[data-saved-filter-scope]')).toHaveLength(1);
    expect(label).toHaveAttribute('data-saved-filter-scope', '-1');
    await act(async () => label.firstElementChild!.dispatchEvent(new MouseEvent('mouseenter')));
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Yazılım ve operasyonel taleplerin ortak özelliklerine göre filtreleme yapar.'
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    {
      scope: '1',
      title: 'Yazılım Talepleri',
      description:
        'Yazılım geliştirme taleplerini filtrelemek için kullanılabilecek alanları gösterir.',
    },
    {
      scope: '2',
      title: 'Operasyonel',
      description: 'Operasyonel talepleri filtrelemek için kullanılabilecek alanları gösterir.',
    },
  ])('explains $title groups using shared scope help', async ({ scope, title, description }) => {
    const onChange = vi.fn();
    mocks.query.mockReturnValue({
      data: {
        Data: [{ Id: 'filter', Name: 'Filtre', Filter: JSON.stringify({ listIssueType: scope }) }],
      },
    });
    await renderMenu({ onChange });
    await openMenu();
    const label = document.querySelector(`[data-saved-filter-scope="${scope}"]`)!;
    expect(label.querySelector('.tabler-icon-info-circle')).not.toBeNull();
    await act(async () => label.firstElementChild!.dispatchEvent(new MouseEvent('mouseenter')));
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip?.querySelector('strong')).toHaveTextContent(title);
    expect(tooltip).toHaveTextContent(description);
    const texts = tooltip!.querySelectorAll<HTMLElement>('.mantine-Text-root');
    expect(texts).toHaveLength(2);
    for (const text of texts) {
      expect(text.style.getPropertyValue('--text-fz')).toBe('var(--mantine-font-size-xs)');
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('loads saved request filters and reports the selected record', async () => {
    const firstFilter = { Id: 'filter-1', Name: 'Açık Talepler', Filter: '{}' };
    const selectedFilter = {
      Id: 'filter-2',
      Name: 'Bana Atananlar',
      Filter: '{}',
      Description: 'Bana atanan açık talepler',
    };
    const onChange = vi.fn();
    mocks.query.mockReturnValue({
      data: { Data: [selectedFilter, firstFilter] },
      isError: false,
      isFetching: false,
    });

    await renderMenu({ onChange, selectedFilterIds: [selectedFilter.Id] });
    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Uygulanacak filtreleri seç"]'
    );
    expect(trigger?.querySelectorAll('svg')).toHaveLength(2);

    await clickMenuTrigger();

    const viewport = document.querySelector<HTMLElement>('.mantine-ScrollArea-viewport');
    const selectedItem = document.querySelector<HTMLElement>('[aria-current="true"]');
    expect(viewport).not.toBeNull();
    expect(selectedItem).not.toBeNull();
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 120 },
      scrollHeight: { configurable: true, value: 600 },
    });
    vi.spyOn(viewport!, 'getBoundingClientRect').mockReturnValue({
      bottom: 220,
      height: 120,
      left: 0,
      right: 320,
      top: 100,
      width: 320,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });
    vi.spyOn(selectedItem!, 'getBoundingClientRect').mockReturnValue({
      bottom: 412,
      height: 32,
      left: 0,
      right: 320,
      top: 380,
      width: 320,
      x: 0,
      y: 380,
      toJSON: () => ({}),
    });

    await flushMenuScroll();

    expect(mocks.query).toHaveBeenCalledWith({});
    expect(document.querySelector('[role="menu"]')?.textContent).toContain(
      'Bu alanda uygulanacak filtreleri seçiniz.'
    );
    expect(document.querySelector('[role="menu"]')?.textContent).toContain(
      'Seçilmiş filtrelerin sonuçları birleştirilerek gösterilir.'
    );
    const items = savedMenuItems();
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([
      'Açık Talepler',
      'Bana Atananlar',
    ]);
    expect(items[1]).toHaveTextContent(selectedFilter.Description);
    expect(items[1]).toHaveAttribute('aria-current', 'true');
    expect(viewport?.scrollTop).toBe(236);

    await act(async () => items[0]?.click());

    expect(onChange).toHaveBeenCalledExactlyOnceWith(firstFilter);
  });

  it('shows each description on hover with line breaks without changing selection', async () => {
    const filters = [
      { Id: 'filter-1', Name: 'Açık Talepler', Description: 'Açık talepler\nGünlük takip' },
      { Id: 'filter-2', Name: 'Bana Atananlar', Description: 'Bana atanan talepler' },
    ];
    const onChange = vi.fn();
    mocks.query.mockReturnValue({ data: { Data: filters }, isError: false, isFetching: false });
    await renderMenu({ selectedFilterIds: ['filter-1'], onChange });
    await openMenu();
    const items = savedMenuItems();

    expect(document.querySelector('.mantine-ScrollArea-content')).toHaveStyle({ minWidth: '0px' });
    for (const [index, filter] of filters.entries()) {
      const subtitle = items[index].querySelector('[data-truncate]:not([data-filter-name])');
      expect(subtitle?.textContent).toBe(filter.Description);
      expect(subtitle).toHaveAttribute('data-truncate', 'end');
      expect(items[index]).toHaveAccessibleName(filter.Name);
      await act(async () => {
        items[index].dispatchEvent(new MouseEvent('mouseenter'));
      });
      const tooltip = document.querySelector('[role="tooltip"]');
      expect(tooltip?.textContent).toBe(filter.Description);
      expect(tooltip).toHaveStyle({ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });
      expect(items[0]).toHaveAttribute('aria-current', 'true');
      expect(onChange).not.toHaveBeenCalled();
      await act(async () => {
        items[index].dispatchEvent(new MouseEvent('mouseleave'));
      });
    }

    await act(async () => items[1].click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(filters[1]);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it.each([undefined, null, '', '  \n  '])(
    'omits the subtitle and both description tooltips when the description is missing: %j',
    async (Description) => {
      mocks.query.mockReturnValue({
        data: { Data: [{ Id: 'filter-1', Name: 'Açık Talepler', Description }] },
        isError: false,
        isFetching: false,
      });
      await renderMenu({ selectedFilterIds: ['filter-1'], tooltipProps: { opened: true } });
      expect(document.querySelector('[role="tooltip"]')).not.toHaveTextContent('Açıklama:');
      await renderMenu({ selectedFilterIds: ['filter-1'] });
      await openMenu();
      expect(
        savedMenuItems()[0]?.querySelector('[data-truncate]:not([data-filter-name])')
      ).toBeNull();
      await act(async () => {
        savedMenuItems()[0]!.dispatchEvent(new MouseEvent('mouseenter'));
      });
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    }
  );

  it('keeps the built-in option available while loading and with no saved filters', async () => {
    mocks.query.mockReturnValue({ data: undefined, isError: false, isFetching: true });
    await renderMenu();
    await openMenu();
    expect(document.querySelector('[role="menu"]')?.textContent).toContain(
      'Kayıtlı filtreler yükleniyor'
    );

    mocks.query.mockReturnValue({ data: { Data: [] }, isError: false, isFetching: false });
    await renderMenu();
    expect(document.querySelector('[aria-current="true"]')).toHaveTextContent(
      'Tüm Talepler (Son 1 yıl)'
    );
    expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(1);
  });

  it('loads the default selection but does not mount the list while closed, even with keepMounted', async () => {
    await renderMenu({ menuProps: { keepMounted: true } });
    expect(mocks.query).toHaveBeenCalled();
    expect(document.querySelector('.mantine-ScrollArea-viewport')).toBeNull();

    await openMenu();
    expect(mocks.query).toHaveBeenCalled();

    await clickMenuTrigger();
    expect(document.querySelector('.mantine-ScrollArea-viewport')).toBeNull();
    mocks.query.mockClear();
    await renderMenu({ menuProps: { keepMounted: true } });
    expect(mocks.query).toHaveBeenCalled();
  });

  it.each([
    { data: undefined, isError: true },
    { data: { Error: { Message: 'Service error' } }, isError: false },
  ])(
    'does not replace service errors with local error or empty-list messages: %j',
    async (query) => {
      mocks.query.mockReturnValue({ ...query, isFetching: false });
      await renderMenu();
      await openMenu();
      expect(document.querySelector('[role="menu"]')).not.toHaveTextContent(
        'Henüz kayıtlı filtreniz bulunmamaktadır.'
      );
      expect(document.querySelector('[role="menuitem"]')).toHaveTextContent(
        'Tüm Talepler (Son 1 yıl)'
      );
    }
  );

  it('keeps cached filters selectable after a failed background refresh', async () => {
    const filter = { Id: 'filter-1', Name: 'Açık Talepler', Filter: '{}' };
    const onChange = vi.fn();
    mocks.query.mockReturnValue({ data: { Data: [filter] }, isError: true, isFetching: false });
    await renderMenu({ selectedFilterIds: [filter.Id], onChange });
    await openMenu();
    const item = savedMenuItems()[0];
    expect(item).toHaveTextContent(filter.Name);
    expect(item).toHaveAttribute('aria-current', 'true');
    await act(async () => item!.click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(filter);
  });

  it('reuses scope parsing on selection and loading changes, but refreshes an updated catalog', async () => {
    const parseFilter = vi.spyOn(savedFilterSerialization, 'parseSavedRequestListFilter');
    const onChange = vi.fn();
    let filters = [
      { Id: 'yt', Name: 'Yazılım filtrem', Filter: '{"listIssueType":"1"}' },
      { Id: 'ot', Name: 'Operasyonel filtrem', Filter: '{"listIssueType":"2"}' },
    ];
    const renderOptions = async (selectedFilterIds: string[], isFetching = false) =>
      act(async () =>
        root.render(
          <MantineProvider env="test">
            <Menu>
              <SavedFilterMenuOptions
                filters={filters}
                selectedFilterIds={selectedFilterIds}
                isFetching={isFetching}
                onChange={onChange}
              />
            </Menu>
          </MantineProvider>
        )
      );

    await renderOptions(['yt']);
    expect(parseFilter).toHaveBeenCalledTimes(2);
    await renderOptions(['yt', 'ot'], true);
    expect(parseFilter).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-saved-filter-scope="1"]')).toHaveTextContent('1 seçili');
    expect(document.querySelector('[data-saved-filter-scope="2"]')).toHaveTextContent('1 seçili');

    filters = [{ ...filters[0], Filter: '{"listIssueType":"2"}' }, filters[1]];
    await renderOptions(['yt', 'ot']);
    expect(parseFilter).toHaveBeenCalledTimes(4);
    expect(document.querySelector('[data-saved-filter-scope="1"]')).toBeNull();
    expect(document.querySelector('[data-saved-filter-scope="2"]')).toHaveTextContent('2 seçili');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps each selection locally without rendering the parent card again', async () => {
    const selectedFilter = { Id: 'filter-1', Name: 'Açık Talepler', Filter: '{}' };
    mocks.query.mockReturnValue({
      data: { Data: [selectedFilter] },
      isError: false,
      isFetching: false,
    });
    const renderCard = vi.fn();
    const Card = () => {
      renderCard();
      return <SavedFilterMenu />;
    };
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <Card />
        </MantineProvider>
      );
    });
    const initialRenders = renderCard.mock.calls.length;
    await openMenu();
    await act(async () => savedMenuItems()[0]?.click());

    expect(document.querySelector('[aria-current="true"]')).toHaveTextContent(selectedFilter.Name);
    expect(renderCard).toHaveBeenCalledTimes(initialRenders);
  });

  it('supports externally controlled opening and selection without changing the controlled value', async () => {
    const filters = [
      { Id: 'filter-1', Name: 'Açık Talepler', Filter: '{}' },
      { Id: 'filter-2', Name: 'Bana Atananlar', Filter: '{}' },
    ];
    mocks.query.mockReturnValue({ data: { Data: filters }, isError: false, isFetching: false });
    const onChange = vi.fn();
    const props = { menuProps: { opened: true, closeOnItemClick: false }, onChange };
    await renderMenu({ ...props, selectedFilterIds: ['filter-1'] });

    const items = savedMenuItems();
    await act(async () => items[1].click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(filters[1]);
    expect(items[0]).toHaveAttribute('aria-current', 'true');

    await renderMenu({ ...props, selectedFilterIds: ['filter-2'] });
    expect(document.querySelector('[aria-current="true"]')).toHaveTextContent('Bana Atananlar');
  });

  it('scrolls when the selected filter arrives after opening and cancels pending work on close', async () => {
    mocks.query.mockReturnValue({ data: undefined, isError: false, isFetching: true });
    const props = { selectedFilterIds: ['filter-1'], menuProps: { defaultOpened: true } };
    await renderMenu(props);
    await flushMenuScroll();

    mocks.query.mockReturnValue({
      data: { Data: [{ Id: 'filter-1', Name: 'Açık Talepler', Filter: '{}' }] },
      isError: false,
      isFetching: false,
    });
    await renderMenu(props);
    const viewport = document.querySelector<HTMLElement>('.mantine-ScrollArea-viewport')!;
    const selectedItem = document.querySelector<HTMLElement>('[aria-current="true"]')!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 120 },
      scrollHeight: { configurable: true, value: 600 },
    });
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 320, 120));
    vi.spyOn(selectedItem, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 380, 320, 32));
    await flushMenuScroll();
    expect(viewport.scrollTop).toBe(236);

    const cancelScroll = vi.spyOn(window, 'cancelAnimationFrame');
    const disconnectObserver = vi.spyOn(window.ResizeObserver.prototype, 'disconnect');
    await clickMenuTrigger();
    expect(cancelScroll).toHaveBeenCalled();
    expect(disconnectObserver).toHaveBeenCalled();
    expect(document.querySelector('.mantine-ScrollArea-viewport')).toBeNull();

    await clickMenuTrigger();
    const reopenedViewport = document.querySelector<HTMLElement>('.mantine-ScrollArea-viewport')!;
    Object.defineProperty(reopenedViewport, 'clientHeight', { value: 120 });
    const measurePendingScroll = vi.spyOn(reopenedViewport, 'getBoundingClientRect');
    await clickMenuTrigger();
    await flushMenuScroll();
    expect(measurePendingScroll).not.toHaveBeenCalled();
  });

  it('shows the built-in selection in the tooltip when no saved filter is selected', async () => {
    mocks.query.mockReturnValue({ data: { Data: [{ Id: null, Name: 'Geçersiz Filtre' }] } });
    await renderMenu({ tooltipProps: { opened: true } });
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Filtre Seçimi');
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Açıklama: Son 1 yılda oluşturulmuş talepler'
    );
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Tüm Talepler (Son 1 yıl)'
    );
    expect(mocks.query).toHaveBeenCalledWith({});
  });

  it('bolds the heading and selected label, keeps the value normal, and follows selection changes', async () => {
    mocks.query.mockReturnValue({
      data: {
        Data: [
          { Id: 'filter-1', Name: 'Filtre 1', Description: '  Birinci açıklama  ' },
          { Id: 'filter-2', Name: 'Filtre 2', Description: 'İkinci açıklama' },
        ],
      },
    });
    await renderMenu({ selectedFilterIds: ['filter-1'], tooltipProps: { opened: true } });
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveTextContent('Filtre Seçimi');
    expect(tooltip).toHaveTextContent('Seçilen: Filtre 1');
    expect(tooltip?.querySelector('.mantine-Stack-root > .mantine-Text-root')).toHaveStyle({
      fontWeight: 700,
    });
    expect(tooltip?.querySelector('strong')).toHaveTextContent('Seçilen:');
    expect(tooltip?.querySelector('strong')).toHaveStyle({ fontWeight: 700 });
    expect(tooltip?.querySelector('strong')?.parentElement).toHaveStyle({ fontWeight: 400 });
    expect(tooltip?.querySelector('strong')).not.toHaveTextContent('Filtre 1');
    expect(tooltip).toHaveTextContent('Açıklama: Birinci açıklama');
    expect(tooltip?.textContent?.indexOf('Açıklama:')).toBeGreaterThan(
      tooltip?.textContent?.indexOf('Seçilen:') ?? -1
    );
    expect(document.querySelector('[role="menu"]')).toBeNull();

    await renderMenu({ selectedFilterIds: ['filter-2'], tooltipProps: { opened: true } });
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Seçilen: Filtre 2');
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Açıklama: İkinci açıklama'
    );
    expect(document.querySelector('[role="tooltip"]')).not.toHaveTextContent('Birinci açıklama');

    await renderMenu({ selectedFilterIds: ['missing'], tooltipProps: { opened: true } });
    expect(document.querySelector('[role="tooltip"]')).not.toHaveTextContent(
      'Tüm Talepler (Son 1 yıl)'
    );
    expect(document.querySelector('[role="tooltip"]')).not.toHaveTextContent(
      'Açıklama: Son 1 yılda oluşturulmuş talepler'
    );
  });

  it('toggles left checkbox icons immediately without closing or adding form controls', async () => {
    const filters = [
      { Id: 'a', Name: 'Yazılım filtresi', Filter: '{}', Description: 'Yazılım açıklaması' },
      { Id: 'b', Name: 'Operasyonel filtre', Filter: '{}', Description: 'Operasyonel açıklaması' },
    ];
    mocks.query.mockReturnValue({ data: { Data: filters } });
    const onChange = vi.fn();
    await renderMenu({ onChange });
    await openMenu();
    for (const item of savedMenuItems()) {
      expect(item.querySelector('[data-position="left"] .tabler-icon-square')).toHaveAttribute(
        'width',
        '16'
      );
      expect(item.querySelector('[data-position="right"]')).toBeNull();
      expect(item.querySelector('[data-filter-name]')).toHaveAttribute('data-truncate', 'end');
      await act(async () => item.click());
    }
    expect(
      document.querySelectorAll('[role="menuitem"] .tabler-icon-square-check-filled')
    ).toHaveLength(2);
    expect(document.querySelectorAll('[role="menuitem"][aria-current="true"]')).toHaveLength(2);
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    expect(document.querySelector('[type="checkbox"]')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
    await renderMenu({ onChange, tooltipProps: { opened: true } });
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip?.querySelectorAll('li')).toHaveLength(2);
    expect(tooltip).toHaveTextContent('Yazılım açıklaması');
    expect(tooltip).toHaveTextContent('Operasyonel açıklaması');
    await renderMenu({ onChange });
    await act(async () => savedMenuItems()[0].click());
    expect(savedMenuItems()[0].querySelector('.tabler-icon-square')).not.toBeNull();
    expect(document.querySelectorAll('[role="menuitem"][aria-current="true"]')).toHaveLength(1);
    expect(savedMenuItems()[1]).toHaveAttribute('aria-current', 'true');
    await act(async () => savedMenuItems()[1].click());
    expect(document.querySelector('[role="menuitem"][aria-current="true"]')).toHaveTextContent(
      'Tüm Talepler'
    );
  });

  it.each(['mouseenter', 'focusin'])(
    'reveals a truncated option name on the first %s without adding a selection',
    async (eventType) => {
      const Name = 'Uzun kayıtlı filtre adı';
      mocks.query.mockReturnValue({ data: { Data: [{ Id: 'long', Name }] } });
      const onChange = vi.fn();
      await renderMenu({ onChange });
      await openMenu();
      const item = savedMenuItems()[0];
      const name = item.querySelector<HTMLElement>('[data-filter-name]')!;
      Object.defineProperties(name, {
        clientWidth: { value: 120, configurable: true },
        scrollWidth: { value: 240, configurable: true },
      });
      await act(async () => {
        if (eventType === 'mouseenter') {
          item.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
        item.dispatchEvent(
          eventType === 'mouseenter'
            ? new MouseEvent(eventType)
            : new FocusEvent(eventType, { bubbles: true })
        );
      });
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(Name);
      expect(onChange).not.toHaveBeenCalled();
    }
  );

  it('shows the locally selected filter in the tooltip after closing the menu', async () => {
    mocks.query.mockReturnValue({
      data: { Data: [{ Id: 'filter-1', Name: 'Filtre 1' }] },
      isError: false,
      isFetching: false,
    });
    await renderMenu();
    await openMenu();
    await act(async () => savedMenuItems()[0]?.click());
    await renderMenu({ tooltipProps: { opened: true } });
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Seçilen: Filtre 1');
  });
});
