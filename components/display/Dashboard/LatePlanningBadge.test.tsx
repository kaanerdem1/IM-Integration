import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

import '@/_i18n/config';

import { DEFAULT_REQUEST_FILTER_ID } from '@/components/request-filter/_config/defaultRequestFilter';
import type { SavedFilterScope } from '@/components/request-filter/_config/savedFilterScopes';
import { buildRequestListPath } from '@/pages/requests/list/_hooks/useOpenRequestList';
import { LatePlanningBadge } from './LatePlanningBadge';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  selection: vi.fn(),
  onChange: vi.fn(),
  filter: { Id: 'saved-filter', Name: 'Kayıtlı Filtre', Filter: '{}' },
}));

vi.mock('@/_hooks/_modules/dashboard/useFilteredDashboardQueries', () => ({
  useDashboardLateplanningsQuery: (...args: unknown[]) => mocks.query(...args),
}));
vi.mock('@/components/request-filter/_hooks/useSavedFilterSelection', () => ({
  useSavedFilterSelection: (...args: unknown[]) => mocks.selection(...args),
}));
vi.mock('@/components/request-filter/_hooks/useSavedRequestFilters', () => ({
  useSavedRequestFilters: () => ({ filters: [mocks.filter], isFetching: false }),
}));

describe('LatePlanningBadge', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.selection.mockReturnValue({
      pageFilter: {},
      menuProps: { selectedFilterIds: [DEFAULT_REQUEST_FILTER_ID], onChange: mocks.onChange },
    });
    mocks.query.mockReturnValue({ data: { Data: { Count: 0, IssueIds: [] } }, isPending: false });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderBadge = async (filterScope: SavedFilterScope = 'home.latePlanning') => {
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <MemoryRouter>
            <LatePlanningBadge filterScope={filterScope} />
          </MemoryRouter>
        </MantineProvider>
      );
    });
  };

  const selectSavedFilter = async () => {
    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Uygulanacak filtreleri seç"]'
    );
    expect(trigger).not.toBeNull();
    expect(trigger).not.toBeDisabled();
    expect(trigger?.querySelector('.tabler-icon-settings')).not.toBeNull();
    expect(trigger?.querySelector('.tabler-icon-chevron-down')).toBeNull();
    await act(async () => trigger!.click());
    const option = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
      (item) => item.textContent === mocks.filter.Name
    );
    expect(option).toBeDefined();
    await act(async () => option!.click());
    expect(mocks.onChange).toHaveBeenCalledExactlyOnceWith(mocks.filter);
  };

  it.each(['home.latePlanning', 'sla.latePlanning'] as const)(
    'keeps the empty badge and filter selection available in %s',
    async (scope) => {
      await renderBadge(scope);

      expect(mocks.selection).toHaveBeenCalledWith(scope);
      expect(container.querySelector('[data-tone="neutral"]')).toHaveTextContent(
        'Planlanan tarihte başlatılamayan talep yok.'
      );
      expect(container.querySelector('a')).toBeNull();
      expect(container.querySelector('.tabler-icon-bell-filled')).not.toBeNull();
      await selectSavedFilter();

      mocks.query.mockReturnValue({
        data: { Data: { Count: 2, IssueIds: ['one', 'two'] } },
        isPending: false,
      });
      await renderBadge(scope);
      expect(container.querySelector('[data-tone="danger"]')).toHaveTextContent(
        'Planlanan tarihte başlamayan 2 talep var'
      );
      expect(container.querySelector('a')).toHaveAttribute(
        'href',
        buildRequestListPath({ listIssueId: ['one', 'two'] }, DEFAULT_REQUEST_FILTER_ID)
      );

      mocks.query.mockReturnValue({ data: { Data: { Count: 0, IssueIds: [] } }, isPending: false });
      await renderBadge(scope);
      expect(container.querySelector('[data-tone="neutral"]')).toHaveTextContent('talep yok');
      expect(container.querySelector('a')).toBeNull();
      expect(container.querySelector('button')).not.toBeDisabled();
    }
  );

  it('shows loading instead of an empty result and still allows changing the filter', async () => {
    mocks.query.mockReturnValue({ data: undefined, isPending: true });
    await renderBadge();

    expect(container.querySelector('[data-tone="neutral"]')).toHaveAttribute('aria-busy', 'true');
    expect(container).toHaveTextContent('Yükleniyor..');
    expect(container).not.toHaveTextContent('talep yok');
    expect(container.querySelector('a')).toBeNull();
    await selectSavedFilter();
  });

  it('does not show an empty result or a custom error when the request fails', async () => {
    mocks.query.mockReturnValue({ data: undefined, isPending: false, isError: true });
    await renderBadge();

    expect(container.querySelector('[data-tone="neutral"]')).toHaveTextContent(
      'Planlanan Tarihte Başlatılamayan Talepler'
    );
    expect(container).not.toHaveTextContent('talep yok');
    expect(container).not.toHaveTextContent('Yükleniyor');
    expect(container.querySelector('a')).toBeNull();
    await selectSavedFilter();
  });

  it('preserves the current result during a background refresh', async () => {
    mocks.query.mockReturnValue({
      data: { Data: { Count: 1, IssueIds: ['one'] } },
      isPending: false,
      isFetching: true,
    });
    await renderBadge();

    expect(container.querySelector('[data-tone="danger"]')).toHaveTextContent(
      'Planlanan tarihte başlamayan 1 talep var'
    );
    expect(container).not.toHaveTextContent('Yükleniyor');
    expect(container.querySelector('a')).toHaveAttribute(
      'href',
      buildRequestListPath({ listIssueId: ['one'] }, DEFAULT_REQUEST_FILTER_ID)
    );
  });
});
