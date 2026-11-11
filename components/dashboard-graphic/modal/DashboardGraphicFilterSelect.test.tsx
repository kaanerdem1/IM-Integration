import { act } from 'react';
import classes from './DashboardGraphicFilterSelect.module.scss';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { UserFormFilterResponseDto } from '@/_api/_core/api-gen/types';
import { DEFAULT_REQUEST_FILTER_ID } from '@/components/request-filter/_config/defaultRequestFilter';
import * as savedFilterSerialization from '@/pages/requests/list/_utils/savedRequestListFilter';
import { createRequestDistributionSavedFilterOptions } from '../options';
import { DashboardGraphicFilterSelect } from './DashboardGraphicFilterSelect';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      ({
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
        'label.requests.list.filters.clearFilters': 'Filtreleri temizle',
        'label.requests.list.filters.combinedResults':
          'Seçilmiş filtrelerin sonuçları birleştirilerek gösterilir.',
        'label.home.savedFilterMenuTooltip': 'Filtre Seçimi',
        'label.home.savedFilterMenuSelected': 'Seçilen',
        'label.home.savedFilterMenuSelectedPlural': 'Seçilen Filtreler',
        'label.description': 'Açıklama',
      })[key] ?? key,
  }),
}));

const filter = {
  Id: 'filter-1',
  Name: 'Açık Talepler',
  Description: 'Açık talepler\nGünlük takip',
};
const defaultLabel = 'Tüm Talepler (Son 1 yıl)';
const menuOptions = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const separatedGroupSelector =
  '[role="option"] ~ [role="group"], [role="group"]:has([role="option"]) ~ [role="group"]';

describe('DashboardGraphicFilterSelect', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChange = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const render = async (value: string[] = [], filters: UserFormFilterResponseDto[] = [filter]) => {
    await act(async () =>
      root.render(
        <MantineProvider env="test">
          <DashboardGraphicFilterSelect
            {...createRequestDistributionSavedFilterOptions(filters)}
            label="Filtrelerim"
            value={value}
            onChange={onChange}
          />
        </MantineProvider>
      )
    );
  };
  const input = () => container.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const selectedArea = () => container.querySelector('[data-testid="graphic-filter-select"]')!;
  const selectedLabels = () =>
    [...container.querySelectorAll('.mantine-Pill-label')].map((node) => node.textContent);
  const open = async () => act(async () => input().click());
  const hover = async (element: Element) =>
    act(async () => element.dispatchEvent(new MouseEvent('mouseenter')));

  it('shows the default as the first checked option, even without saved filters', async () => {
    await render([], []);
    expect(selectedLabels()).toEqual([defaultLabel]);
    expect(onChange).not.toHaveBeenCalled();
    await hover(selectedArea());
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Seçilen: Tüm Talepler (Son 1 yıl)'
    );
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Açıklama: Son 1 yılda oluşturulmuş talepler'
    );
    await open();
    expect(menuOptions()).toHaveLength(1);
    const option = menuOptions()[0];
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(option.querySelector('.tabler-icon-square-check-filled')).not.toBeNull();
    expect(option.querySelector('[data-truncate]:not([data-filter-name])')).toHaveTextContent(
      'Son 1 yılda oluşturulmuş talepler'
    );
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    await hover(option.querySelector('.mantine-Group-root')!);
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Son 1 yılda oluşturulmuş talepler'
    );
    await act(async () => option.click());
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows one-line descriptions and full tooltips without changing the selection on hover', async () => {
    const description = `Açık talepler\n${'Uzun açıklama '.repeat(30)}`.trim();
    await render([filter.Id], [{ ...filter, Description: description }]);
    expect(selectedLabels()).toEqual([filter.Name]);
    await hover(selectedArea());
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveTextContent('Filtre Seçimi');
    expect(tooltip).toHaveTextContent('Seçilen: Açık Talepler');
    expect(tooltip?.textContent).toContain(`Açıklama: ${description}`);
    expect(tooltip).not.toHaveTextContent(
      'Seçilmiş filtrelerin sonuçları birleştirilerek gösterilir.'
    );
    await open();
    const options = menuOptions();
    expect(document.querySelector('.mantine-ScrollArea-content')).toHaveStyle({ minWidth: '0px' });
    expect(options[0]).toHaveTextContent(defaultLabel);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    const subtitle = options[1].querySelector('[data-truncate]:not([data-filter-name])');
    expect(subtitle).toHaveAttribute('data-truncate', 'end');
    expect(subtitle?.textContent).toBe(description);
    await hover(options[1].querySelector('.mantine-Group-root')!);
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(description);
    expect(document.querySelector('[role="tooltip"]')).toHaveStyle({
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('maps the default option and clear action to an empty array while retaining saved IDs', async () => {
    await render();
    await open();
    await act(async () => menuOptions()[1].click());
    expect(onChange).toHaveBeenLastCalledWith([filter.Id]);
    await render([filter.Id]);
    await open();
    await act(async () => menuOptions()[0].click());
    expect(onChange).toHaveBeenLastCalledWith([]);
    await render([]);
    expect(selectedLabels()).toEqual([defaultLabel]);
    expect(container.querySelector('[aria-label="Filtreleri temizle"]')).toBeNull();
    await render([filter.Id]);
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Filtreleri temizle"]')!.click()
    );
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it.each([undefined, null, '', '  \n  '])(
    'omits empty descriptions from the options and selected tooltip: %j',
    async (Description) => {
      await render([filter.Id], [{ ...filter, Description }]);
      await hover(selectedArea());
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
        'Seçilen: Açık Talepler'
      );
      expect(document.querySelector('[role="tooltip"]')).not.toHaveTextContent('Açıklama:');
      await open();
      const option = menuOptions()[1];
      expect(option.querySelector('[data-truncate]:not([data-filter-name])')).toBeNull();
      await hover(option.querySelector('.mantine-Group-root')!);
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    }
  );

  it('updates the selected description from refreshed data without changing the filter', async () => {
    await render([filter.Id]);
    await hover(selectedArea());
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(filter.Description);
    await render([filter.Id], [{ ...filter, Description: 'Güncellenmiş açıklama' }]);
    expect(selectedLabels()).toEqual([filter.Name]);
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Açıklama: Güncellenmiş açıklama'
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the dropdown open for multiple selections and lists their descriptions in the tooltip', async () => {
    const second = { Id: 'filter-2', Name: 'Operasyonel', Description: 'Operasyonel açıklama' };
    await render([], [filter, second]);
    await open();
    await act(async () => menuOptions()[1].click());
    expect(onChange).toHaveBeenLastCalledWith(['filter-1']);
    await render(['filter-1'], [filter, second]);
    expect(menuOptions()).toHaveLength(3);
    await act(async () => menuOptions()[2].click());
    expect(onChange).toHaveBeenLastCalledWith(['filter-1', 'filter-2']);
    await render(['filter-1', 'filter-2'], [filter, second]);
    expect(selectedLabels()).toEqual([filter.Name, second.Name]);
    expect(
      menuOptions().filter((option) => option.getAttribute('aria-selected') === 'true')
    ).toHaveLength(2);
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    await act(async () =>
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    );
    await hover(selectedArea());
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Seçilen Filtreler');
    expect(document.querySelectorAll('[role="tooltip"] li')).toHaveLength(2);
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(second.Description);
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
      'Seçilmiş filtrelerin sonuçları birleştirilerek gösterilir.'
    );
    await open();
    await act(async () => menuOptions()[1].click());
    expect(onChange).toHaveBeenLastCalledWith(['filter-2']);
  });

  it('makes missing saved IDs visible and removable instead of resetting the selection', async () => {
    await render(['missing'], []);
    expect(selectedLabels()).toEqual(['missing']);
    await open();
    expect(menuOptions()[1]).toHaveTextContent('missing');
    await act(async () => menuOptions()[0].click());
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(onChange.mock.lastCall?.[0]).not.toContain(DEFAULT_REQUEST_FILTER_ID);
  });

  it('groups records by scope after the standalone default without changing selected pills', async () => {
    const operational = { Id: 'ot', Name: 'A Kapsam Kontrol', Filter: '{"listIssueType":"2"}' };
    const software = { Id: 'yt', Name: 'B Analiz', Filter: '{"listIssueType":"1"}' };
    const common = { Id: 'common', Name: 'C Oluşturduğum', Filter: '{"listIssueType":"-1"}' };
    const legacy = { Id: 'legacy', Name: 'D Eski filtre', Filter: '{}' };
    await render(['ot', 'common'], [operational, software, common, legacy]);
    expect(selectedLabels()).toEqual([common.Name, operational.Name]);
    await open();

    const labels = [...document.querySelectorAll<HTMLElement>('[data-saved-filter-scope]')];
    expect(labels.map((label) => label.getAttribute('data-saved-filter-scope'))).toEqual([
      '-1',
      '1',
      '2',
    ]);
    expect(labels[0]).toHaveTextContent('Ortak1 seçili2 filtre');
    expect(labels[1]).toHaveTextContent('Yazılım Talepleri1 filtre');
    expect(labels[2]).toHaveTextContent('Operasyonel Talepler1 seçili1 filtre');
    for (const label of labels) {
      const group = label.closest('[role="group"]')!;
      expect(group).toHaveClass(classes.group);
      expect(group.matches(separatedGroupSelector)).toBe(true);
      expect(label.closest('.mantine-MultiSelect-groupLabel')).toHaveClass(classes.groupLabel);
      const counters = label.lastElementChild as HTMLElement;
      expect(counters.style.marginLeft).toBe('auto');
      expect(counters.style.flexShrink).toBe('0');
    }
    expect(
      menuOptions().map((option) => option.querySelector('[data-filter-name]')?.textContent)
    ).toEqual([defaultLabel, common.Name, legacy.Name, software.Name, operational.Name]);
    expect(menuOptions()[0].closest('[role="group"]')).toBeNull();
    expect(menuOptions()[1].closest('[role="group"]')).toContainElement(labels[0]);
    expect(document.querySelectorAll('.mantine-ScrollArea-viewport')).toHaveLength(1);
    expect(document.querySelector('.mantine-Accordion-root')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => menuOptions()[3].click());
    expect(onChange).toHaveBeenLastCalledWith(['common', 'ot', 'yt']);
  });

  it.each([
    {
      scope: '-1',
      title: 'Ortak',
      description: 'Yazılım ve operasyonel taleplerin ortak özelliklerine göre filtreleme yapar.',
    },
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
  ])('explains $title groups without changing selection', async ({ scope, title, description }) => {
    await render([], [{ ...filter, Filter: JSON.stringify({ listIssueType: scope }) }]);
    await open();
    const label = document.querySelector(`[data-saved-filter-scope="${scope}"]`)!;
    expect(label.querySelector('.tabler-icon-info-circle')).not.toBeNull();
    await hover(label.firstElementChild!);
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip?.querySelector('strong')).toHaveTextContent(title);
    expect(tooltip).toHaveTextContent(description);
    expect(selectedLabels()).toEqual([defaultLabel]);
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it('reuses scope parsing while opening and selecting, but refreshes an updated catalog', async () => {
    const parseFilter = vi.spyOn(savedFilterSerialization, 'parseSavedRequestListFilter');
    const filters = [
      { Id: 'yt', Name: 'Yazılım filtrem', Filter: '{"listIssueType":"1"}' },
      { Id: 'ot', Name: 'Operasyonel filtrem', Filter: '{"listIssueType":"2"}' },
    ];
    let options = createRequestDistributionSavedFilterOptions(filters);
    const renderSelection = async (value: string[]) =>
      act(async () =>
        root.render(
          <MantineProvider env="test">
            <DashboardGraphicFilterSelect
              {...options}
              label="Filtrelerim"
              value={value}
              onChange={onChange}
            />
          </MantineProvider>
        )
      );

    await renderSelection(['yt']);
    expect(parseFilter).toHaveBeenCalledTimes(2);
    await open();
    await renderSelection(['yt', 'ot']);
    expect(parseFilter).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-saved-filter-scope="1"]')).toHaveTextContent('1 seçili');
    expect(document.querySelector('[data-saved-filter-scope="2"]')).toHaveTextContent('1 seçili');

    options = createRequestDistributionSavedFilterOptions([
      { ...filters[0], Filter: '{"listIssueType":"2"}' },
      filters[1],
    ]);
    await renderSelection(['yt', 'ot']);
    expect(parseFilter).toHaveBeenCalledTimes(4);
    expect(document.querySelector('[data-saved-filter-scope="1"]')).toBeNull();
    expect(document.querySelector('[data-saved-filter-scope="2"]')).toHaveTextContent('2 seçili');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('retains grouped search and keyboard selection across scopes', async () => {
    const operational = { Id: 'ot', Name: 'Kapsam Kontrol', Filter: '{"listIssueType":"2"}' };
    const software = { Id: 'yt', Name: 'Analiz', Filter: '{"listIssueType":"1"}' };
    await render([], [operational, software]);
    await open();
    expect(document.querySelector('[data-saved-filter-scope="-1"]')).toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input(),
        'Kapsam'
      );
      input().dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(menuOptions()).toHaveLength(1);
    expect(menuOptions()[0]).toHaveTextContent(operational.Name);
    expect(menuOptions()[0].closest('[role="group"]')).toHaveTextContent('Operasyonel Talepler');
    // Searching down to one group must not leave a leading separator.
    expect(menuOptions()[0].closest('[role="group"]')?.matches(separatedGroupSelector)).toBe(false);
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true })
      )
    );
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })
      )
    );
    expect(onChange).toHaveBeenLastCalledWith(['ot']);
  });
});
