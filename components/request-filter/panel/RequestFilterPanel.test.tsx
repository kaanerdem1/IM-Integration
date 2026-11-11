import { act, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal as MantineModal, MantineProvider, type SelectProps } from '@mantine/core';
import type { PagedRequest } from '@/_api/_core/api-gen/types';
import { IssueTypeEnum } from '@/_api/_core/api-gen/types';
import { theme } from '@/_assets/style/theme';
import { useEntityPermission } from '@/_auth/role-management/entity/useEntityPermission';
import { formLabelStyle } from '@/_common/_props/form-label';
import { createUnitTypeFilter, OrgUnitTypeEnum } from '@/_types';
import type { CustomMultiSelectProps } from '@/components/form/CustomMultiSelect';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { HostedModalStackProvider } from '@/components/modal-host/HostedModalStackContext';
import { ReportListFilterMenu } from '@/pages/reports/list/_components/ReportListFilterMenu';
import type { ReportListFilterValue } from '@/pages/reports/list/_config';
import {
  createRequestListUrlState,
  pickRequestListUrlParams,
  type RequestListFilterValue,
} from '@/pages/requests/list/_config';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import { parseSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import { requestListFilterConfigs } from '../_config/filterConfig';
import {
  RequestFilterScope,
  requestFilterScopeOptions,
  requestFilterScopeTooltipContent,
} from '../_config/requestFilterScope';
import { requestFilterModes, type SavedUserFormFilter } from '../_types';
import type { TimestampRangeValue } from '../fields/date-range/date-range-filter-utils';
import { getDateQuickRangeValue } from '../fields/date-range/dateQuickRange';
import { Modal_RequestFilter } from '../modal/Modal_RequestFilter';
import { RequestFilterButton } from './RequestFilterButton';

const mocks = vi.hoisted(() => ({
  unitList: vi.fn(),
  portfolioList: vi.fn(),
  userList: vi.fn(),
  issueSearch: vi.fn(),
  stepDefinitions: vi.fn(),
  recordPicker: vi.fn(),
  savedFilters: vi.fn(),
  select: vi.fn(),
  apply: vi.fn(),
  createSavedFilter: vi.fn(),
  message: vi.fn(),
  reset: vi.fn(),
  empty: { data: { Data: [] } },
  formAction: vi.fn(),
  t: vi.fn((key: string, _options?: Record<string, unknown>) => key),
  updateSavedFilter: vi.fn(),
}));

vi.mock('@/_auth/role-management/entity/useEntityPermission', () => ({
  useEntityPermission: vi.fn(() => true),
}));

vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Select: (props: SelectProps & { 'data-testid'?: string }) => {
      if (props['data-testid'] === 'request-filter-record-picker') {
        mocks.recordPicker(props);
      }
      return <actual.Select {...props} />;
    },
  };
});
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: mocks.t, i18n: { language: 'tr', resolvedLanguage: 'tr' } }),
}));
vi.mock('@/_hooks/useMessage', () => ({ useMessage: () => ({ message: mocks.message }) }));
vi.mock('@/_hooks/_modules/auth/useSession', () => ({
  useSession: () => ({ me: { UserId: 'user-1' } }),
}));
vi.mock('@/_api/hooks', () => ({
  QueryKeys: { UserFormFilterDetail: 'UserFormFilterDetail' },
  useUserPagination: mocks.userList,
  useIssueSearch: mocks.issueSearch,
  useUserFormFilterDetail: mocks.savedFilters,
  useUserFormFilterCreate: () => ({
    isPending: false,
    mutateAsync: mocks.createSavedFilter,
  }),
  useUserFormFilterDelete: () => ({ mutateAsync: vi.fn() }),
  useUserFormFilterUpdate: () => ({
    isPending: false,
    mutateAsync: mocks.updateSavedFilter,
  }),
  useUnitPagination: mocks.unitList,
  usePortfolioDefinitionAll: mocks.portfolioList,
  useUserSponsorandpo: () => ({ data: { Data: {} }, isFetching: false }),
  useIssueStepdefination: mocks.stepDefinitions,
  useFormTabDetail: mocks.formAction,
}));
vi.mock('@/components/form/DateTimestampInput', () => ({
  DatePickerTimestampInput: ({
    value,
    onChange,
    ...props
  }: {
    value: TimestampRangeValue;
    onChange: (value: TimestampRangeValue) => void;
    'data-testid'?: string;
  }) => (
    <>
      <output data-testid={props['data-testid']}>{JSON.stringify(value)}</output>
      <button type="button" data-testid="manual-date-range" onClick={() => onChange([100, 200])}>
        Manual dates
      </button>
      <button type="button" data-testid="clear-date-range" onClick={() => onChange([null, null])}>
        Clear dates
      </button>
    </>
  ),
}));
vi.mock('@/components/form/CustomMultiSelect', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/form/CustomMultiSelect')>();
  return {
    ...actual,
    CustomMultiSelect: (props: CustomMultiSelectProps) => {
      mocks.select(props);
      return <actual.CustomMultiSelect {...props} />;
    },
  };
});

const users = {
  data: {
    Data: [
      { Code: 'user-1', FirstName: 'Ayşe', LastName: 'Yılmaz' },
      { Code: 'user-2', FirstName: 'Mehmet', LastName: 'Demir' },
    ],
  },
};
const requestNoOptions = [{ value: 'legacy-id', label: 'REQ-1 - İlk talep' }];

function CurrentLocation() {
  const location = useLocation();
  return (
    <span data-testid="current-location">
      {location.pathname}
      {location.search}
    </span>
  );
}

function Harness({
  report,
  value,
  savedFilter,
  savedFilters,
}: {
  report: boolean;
  value: ReportListFilterValue;
  savedFilter?: SavedUserFormFilter;
  savedFilters?: SavedUserFormFilter[];
}) {
  const [applied, setApplied] = useState(value);
  useEffect(() => setApplied(value), [value]);
  // Exercise replacing options in an already open modal, without changing its instance.
  useEffect(() => {
    const state = useModalStore.getState();
    const options = state.getModalOption('RequestFilter');
    if (!report && options) {
      state.openModal('RequestFilter', { ...options, value: applied });
    }
  }, [applied, report]);
  const props = {
    hasActiveFilters: Object.keys(applied).length > 0,
    stepOptions: [],
    triggerTestId: 'filter-trigger',
    value: applied,
    onApply: (next: ReportListFilterValue) => {
      mocks.apply(next);
      setApplied(next);
    },
    onReset: () => {
      mocks.reset();
      setApplied({});
    },
  };

  return report ? (
    <ReportListFilterMenu {...props} />
  ) : (
    <>
      <RequestFilterButton
        {...props}
        requestNoOptions={requestNoOptions}
        savedFilter={savedFilter}
        savedFilters={savedFilters}
      />
      <MantineModal.Stack>
        <HostedModalStackProvider modalType="RequestFilter">
          <Modal_RequestFilter />
        </HostedModalStackProvider>
      </MantineModal.Stack>
    </>
  );
}

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeEach(() => {
  vi.mocked(useEntityPermission).mockReturnValue(true);
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
  useModalStore.setState({ currentModals: [] });
  mocks.unitList.mockReturnValue(mocks.empty);
  mocks.formAction.mockReturnValue({});
  mocks.stepDefinitions.mockReturnValue(mocks.empty);
  mocks.portfolioList.mockReturnValue(mocks.empty);
  mocks.userList.mockReturnValue(users);
  mocks.savedFilters.mockReturnValue(mocks.empty);
  mocks.createSavedFilter.mockResolvedValue({ Data: { Id: 'created-filter' } });
  mocks.updateSavedFilter.mockResolvedValue({ Data: { Id: 'updated-filter' } });
  mocks.issueSearch.mockReturnValue({
    data: { Data: [{ Id: 'issue-2', No: 'REQ-2', Subject: 'İkinci talep' }] },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  useModalStore.setState({ currentModals: [] });
  container.remove();
  client.clear();
  vi.useRealTimers();
});

const render = async (
  report: boolean,
  value: ReportListFilterValue,
  path = '/app/requests',
  savedFilter?: SavedUserFormFilter,
  savedFilters?: SavedUserFormFilter[]
) => {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <MantineProvider theme={theme} env="test">
            <Harness {...{ report, value, savedFilter, savedFilters }} />
            <CurrentLocation />
          </MantineProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  });
};
const click = async (testId: string) => {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(element).not.toBeNull();
  await act(async () => element!.click());
  // Let the menu's scheduled focus settle before simulating typing in a field.
  await act(async () => vi.advanceTimersByTime(0));
};
const selectScope = async (scope: RequestFilterScope) => {
  const radio = document.querySelector<HTMLInputElement>(
    `[data-testid="request-list-filter-scope"] input[value="${scope}"]`
  )!;
  expect(radio).not.toBeNull();
  await act(async () => radio.click());
};
const choose = async (label: string) => {
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((item) =>
    item.textContent?.includes(label)
  );
  expect(option).toBeDefined();
  await act(async () => option!.click());
};
const type = async (input: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  await act(async () => {
    const prototype =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const pills = () =>
  [...document.querySelectorAll('.mantine-Pill-label')].map((pill) => pill.textContent);

it('does not open an OR editor without the corresponding saved records', async () => {
  await act(async () =>
    root.render(
      <MantineProvider theme={theme} env="test">
        <RequestFilterButton
          triggerTestId="filter-trigger"
          value={{ listFilterGroups: [{ listIssueType: '1' }, { listIssueType: '2' }] }}
          onApply={mocks.apply}
          onReset={mocks.reset}
        />
      </MantineProvider>
    )
  );
  expect(container.querySelector('[data-testid="filter-trigger"]')).toHaveAttribute(
    'aria-disabled',
    'true'
  );
  await click('filter-trigger');
  expect(useModalStore.getState().currentModals).toHaveLength(0);
  expect(mocks.apply).not.toHaveBeenCalled();
});

it.each([true, false])(
  'keeps the active dot and shows the reset shortcut only when resettable (%s)',
  async (canReset) => {
    await act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <RequestFilterButton
            triggerTestId="filter-trigger"
            value={{ listCreatedQuickRange: 'last-year' }}
            canReset={canReset}
            onApply={mocks.apply}
            onReset={mocks.reset}
          />
        </MantineProvider>
      )
    );
    expect(container.querySelector('.mantine-Indicator-indicator')).not.toHaveAttribute(
      'data-disabled'
    );
    const shortcut = container.querySelector('[data-testid="request-list-filter-reset-shortcut"]');
    if (canReset) {
      expect(shortcut).toHaveAttribute('aria-label', 'label.requests.list.filters.clearFilters');
      expect(shortcut?.closest('[data-testid="filter-trigger"]')).toBeNull();
      await act(async () => shortcut!.dispatchEvent(new MouseEvent('mouseenter')));
      await act(async () => vi.advanceTimersByTime(300));
      const tooltip = document.querySelector('[role="tooltip"]');
      expect(tooltip?.querySelector('strong')).toHaveTextContent(
        'label.requests.list.filters.clearFilters'
      );
      expect(tooltip).toHaveTextContent('label.requests.list.filters.clearFiltersHint');
      await click('request-list-filter-reset-shortcut');
      expect(mocks.reset).toHaveBeenCalledOnce();
      expect(useModalStore.getState().currentModals).toHaveLength(0);
      expect(mocks.apply).not.toHaveBeenCalled();
    } else {
      expect(shortcut).toBeNull();
      await click('filter-trigger');
      expect(useModalStore.getState().getModalOption('RequestFilter')).toMatchObject({
        canReset: false,
      });
    }
  }
);

it('can clear an invalid selection without opening its editor', async () => {
  await render(false, { listFilterGroups: [] });
  await click('filter-trigger');
  expect(useModalStore.getState().currentModals).toHaveLength(0);
  // A malformed selection still has a URL selection to remove.
  await act(async () =>
    root.render(
      <MantineProvider theme={theme} env="test">
        <RequestFilterButton
          value={{ listFilterGroups: [] }}
          canReset
          onApply={mocks.apply}
          onReset={mocks.reset}
        />
      </MantineProvider>
    )
  );
  await click('request-list-filter-reset-shortcut');
  expect(mocks.reset).toHaveBeenCalledOnce();
  expect(mocks.apply).not.toHaveBeenCalled();
});

it('keeps an open modal connected to the latest Apply callback without resetting its options', async () => {
  const latestApply = vi.fn();
  const value = { listAssignedUser: ['user-1'] };
  const renderButton = async (onApply: (value: RequestListFilterValue) => void) => {
    await act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <RequestFilterButton
            triggerTestId="filter-trigger"
            value={value}
            onApply={onApply}
            onReset={mocks.reset}
          />
        </MantineProvider>
      )
    );
  };
  await renderButton(mocks.apply);
  await click('filter-trigger');
  const options = useModalStore.getState().getModalOption('RequestFilter');
  await renderButton(latestApply);
  expect(useModalStore.getState().getModalOption('RequestFilter')).toBe(options);
  expect(options?.mode).toBe(requestFilterModes.apply);
  if (options?.mode === requestFilterModes.apply) {
    await act(async () => options.onApply(value));
  }
  expect(latestApply).toHaveBeenCalledExactlyOnceWith(value);
  expect(mocks.apply).not.toHaveBeenCalled();
});

describe('applicable request filter values', () => {
  it('hides the SLA field and option from stored criteria without SLA access', async () => {
    vi.mocked(useEntityPermission).mockReturnValue(false);
    await render(false, { listSlaStatus: ['2'], listNo: ['YT-1'] });
    await click('filter-trigger');
    expect(
      document.querySelector('[data-testid="request-list-filter-add-listSlaStatus"]')
    ).toBeNull();
    expect(
      document.querySelector('[data-testid="request-list-filter-listSlaStatus-field"]')
    ).toBeNull();
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ listNo: ['YT-1'], listSlaStatus: undefined })
    );
  });

  it('does not allow an invisible SLA-only draft to be saved or applied', async () => {
    vi.mocked(useEntityPermission).mockReturnValue(false);
    await render(false, { listSlaStatus: ['2'] });
    await click('filter-trigger');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
  });

  it('applies multiple SLA statuses including zero without controlling the input', async () => {
    await render(false, {});
    await click('filter-trigger');
    await click('request-list-filter-add-listSlaStatus');
    await click('request-list-filter-listSlaStatus-field');
    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-listSlaStatus-field"]'
    )!;
    const initialOptions = mocks.select.mock.calls.findLast(([props]) => props.id === input.id)![0]
      .data;
    await choose('label.sla.statusOnTrack');
    await choose('label.sla.statusCompleted');
    expect(document.querySelector('[data-testid="request-list-filter-listSlaStatus-field"]')).toBe(
      input
    );
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(input);
    for (const [props] of mocks.select.mock.calls.filter(([props]) => props.id === input.id)) {
      expect(props.data).toBe(initialOptions);
      expect(props.value).toBeUndefined();
      expect(props.searchValue).toBeUndefined();
    }
    expect(mocks.apply).not.toHaveBeenCalled();
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ listSlaStatus: ['0', '3'] })
    );
  });

  it('discards a canceled SLA draft and clears the applied SLA criterion explicitly', async () => {
    await render(false, { listSlaStatus: ['0'] });
    await click('filter-trigger');
    await click('request-list-filter-listSlaStatus-field');
    await choose('label.sla.statusExceeded');
    await act(async () => useModalStore.getState().closeModal('RequestFilter'));
    expect(mocks.apply).not.toHaveBeenCalled();
    await click('filter-trigger');
    expect(pills()).toEqual(['label.sla.statusOnTrack']);
    await click('request-list-filter-remove-listSlaStatus');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    await click('request-list-filter-clear-button');
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('clears fields without changing metadata, scope, applied filters or uncontrolled inputs', async () => {
    await render(false, { listIssueType: '1', listAssignedUser: ['user-1'], listStep: ['42'] });
    await click('filter-trigger');
    const name = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-name-input"]'
    )!;
    const description = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="request-list-filter-description-input"]'
    )!;
    await type(name, 'Yeni ad');
    await type(description, 'Açıklama');
    await selectScope(RequestFilterScope.Operational);
    await click('request-list-filter-clear-fields-button');
    expect(name).toBe(document.querySelector('[data-testid="request-list-filter-name-input"]'));
    expect(name).toHaveValue('Yeni ad');
    expect(description).toHaveValue('Açıklama');
    expect(
      document.querySelector('[data-testid="request-list-filter-scope"] input[value="2"]')
    ).toBeChecked();
    expect(
      document.querySelector('[data-testid="request-list-filter-clear-fields-button"]')
    ).toBeDisabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-clear-button"]')
    ).toBeEnabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(
      document.querySelector('[data-testid="request-list-filter-remove-listStep"]')
    ).toBeNull();
    expect(pills()).toEqual([]);
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    await click('request-list-filter-clear-button');
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it.each(['listAssignedUser', 'listNo', 'listCreatedFrom', 'listSlaStatus'])(
    'keeps Apply and Save disabled when %s is added without a value',
    async (key) => {
      await render(false, {});
      await click('filter-trigger');
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      await click(`request-list-filter-add-${key}`);
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      expect(
        document.querySelector('[data-testid="request-list-filter-save-button"]')
      ).toBeDisabled();
      await click('request-list-filter-apply-button');
      expect(mocks.apply).not.toHaveBeenCalled();
      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    }
  );

  it('disables Apply when the final selected request is deselected', async () => {
    await render(false, { listNo: ['REQ-1'] });
    await click('filter-trigger');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeEnabled();
    await click('request-list-filter-listNo-field');
    await choose('REQ-1');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it.each([requestFilterModes.create, requestFilterModes.edit])(
    'requires populated filter criteria to persist in %s mode, even with metadata',
    async (mode) => {
      await render(false, {});
      await act(async () => {
        useModalStore
          .getState()
          .openModal(
            'RequestFilter',
            mode === requestFilterModes.edit
              ? { mode, item: { Id: 'filter-1', Name: 'Liste' }, value: {} }
              : { mode }
          );
      });
      const buttonId =
        mode === requestFilterModes.edit
          ? 'request-list-filter-update-button'
          : 'request-list-filter-save-button';
      const button = document.querySelector(`[data-testid="${buttonId}"]`)!;
      expect(button).toBeDisabled();
      for (const scope of [
        RequestFilterScope.SoftwareDevelopment,
        RequestFilterScope.Operational,
      ]) {
        await selectScope(scope);
        expect(button).toBeDisabled();
      }
      await type(
        document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
        'Liste'
      );
      await type(
        document.querySelector<HTMLTextAreaElement>(
          '[data-testid="request-list-filter-description-input"]'
        )!,
        'Açıklama'
      );
      expect(button).toBeDisabled();
      await click('request-list-filter-add-listAssignedUser');
      expect(button).toBeDisabled();
      await click('request-list-filter-listAssignedUser-field');
      await choose('Ayşe Yılmaz');
      expect(button).toBeEnabled();
      await choose('Ayşe Yılmaz');
      expect(button).toBeDisabled();
      await click(buttonId);
      await act(async () => {
        button
          .closest('form')!
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      expect(mocks.createSavedFilter).not.toHaveBeenCalled();
      expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    }
  );

  it('disables Apply when the final date range is cleared', async () => {
    await render(false, { listCreatedQuickRange: 'last-year' });
    await click('filter-trigger');
    await click('clear-date-range');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    await click('request-list-filter-listCreatedFrom-field-quick-last-week');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeEnabled();
  });

  it.each([RequestFilterScope.SoftwareDevelopment, RequestFilterScope.Operational])(
    'requires a populated visible field in scope %s and preserves its Type on apply',
    async (scope) => {
      await render(false, { listIssueType: String(scope) });
      await click('filter-trigger');
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      expect(
        document.querySelector('[data-testid="request-list-filter-save-button"]')
      ).toBeDisabled();
      await selectScope(RequestFilterScope.Common);
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      await selectScope(scope);
      await click('request-list-filter-add-listAssignedUser');
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      await click('request-list-filter-listAssignedUser-field');
      await choose('Ayşe Yılmaz');
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeEnabled();
      expect(
        document.querySelector('[data-testid="request-list-filter-save-button"]')
      ).toBeEnabled();
      await click('request-list-filter-apply-button');
      expect(mocks.apply).toHaveBeenCalledWith(
        expect.objectContaining({ listIssueType: String(scope), listAssignedUser: ['user-1'] })
      );
      await click('filter-trigger');
      await click('request-list-filter-remove-listAssignedUser');
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      expect(
        document.querySelector('[data-testid="request-list-filter-save-button"]')
      ).toBeDisabled();
    }
  );

  it('does not count software-only draft values in Common or Operational', async () => {
    await render(false, { listIssueType: '1', listCurrentProjectEffortFrom: '0' });
    await click('filter-trigger');
    await selectScope(RequestFilterScope.Operational);
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
    await selectScope(RequestFilterScope.Common);
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeEnabled();
  });
});

describe('graphic breakdown filters', () => {
  const sizeId = '019d8ce4-3d90-707d-9479-3c2735f9133d';
  const sizeDefinition = {
    data: {
      Data: {
        Tab: { Fields: [{ Value: 'talep-boyutu', Items: [{ Id: sizeId, Label: 'XSmall' }] }] },
      },
    },
  };

  it('stores a manually selected request size as its option ID, while displaying its label', async () => {
    mocks.formAction.mockReturnValue(sizeDefinition);
    await render(false, {});
    await click('filter-trigger');
    await click('request-list-filter-add-listRequestSize');
    await click('request-list-filter-listRequestSize-field');
    await choose('XSmall');
    expect(pills()).toContain('XSmall');
    expect(pills()).not.toContain(sizeId);
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0].listRequestSize).toEqual([sizeId]);
    await click('filter-trigger');
    expect(pills()).toContain('XSmall');
  });

  it('upgrades an old saved size label after options load without resetting other fields', async () => {
    const initial: RequestListFilterValue = {
      listRequestSize: ['XSmall'],
      listCreatedQuickRange: 'last-year',
    };
    await render(false, initial);
    await click('filter-trigger');
    expect(pills()).toContain('XSmall');
    mocks.formAction.mockReturnValue(sizeDefinition);
    await render(false, initial);
    expect(pills()).toContain('XSmall');
    expect(pills()).not.toContain(sizeId);
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0]).toMatchObject({
      listRequestSize: [sizeId],
      listCreatedQuickRange: 'last-year',
    });
    expect(initial.listRequestSize).toEqual(['XSmall']);
  });

  describe.each([
    ['proje-lideri-is-birimi', 'listProjectLeaderUnit'],
    ['stepDefinationId', 'listStep'],
    ['yazilim-direktoru', 'listSoftwareDirector'],
    ['yazilim-birimi', 'listSoftwareUnit'],
    ['yazilim-portfoy', 'listPortfolio'],
    ['po-portfoy-yoneticisi', 'listPortfolioManager'],
    ['proje-sponsoru', 'listProjectSponsor'],
    ['uygulama', 'listApplication'],
    ['talep-havuzu', 'listRequestPool'],
    ['talep-boyutu', 'listRequestSize'],
    ['talep-turu', 'listRequestType'],
  ] as const)('%s maps to %s', (field, filterKey) => {
    it('renders, preserves and removes the matching form field', async () => {
      const label = 'Seçilen değer';
      const value = field === 'stepDefinationId' ? '42' : 'selected-id';
      const filters: RequestListFilterValue = {
        ...(filterKey === 'listStep' ? { listIssueType: '1' } : {}),
        listCreatedQuickRange: 'last-year',
        listBreakdowns: JSON.stringify([{ field, value, label: `Kırılım: ${label}` }]),
      };
      await render(false, filters);
      await click('filter-trigger');
      const input = document.querySelector(
        `[data-testid="request-list-filter-${filterKey}-field"]`
      );
      expect(input).not.toBeNull();
      expect(
        document.querySelector(`[data-testid="request-list-filter-add-${filterKey}"]`)
      ).toBeNull();
      if (filterKey === 'listSoftwareDirector') {
        expect(input).toHaveValue(label);
      } else {
        expect(pills()).toContain(label);
      }
      expect(document.body.textContent).not.toContain(`Kırılım: ${label}`);
      await click('request-list-filter-apply-button');
      expect(mocks.apply.mock.lastCall![0]).toMatchObject(filters);
      await click('filter-trigger');
      await click(`request-list-filter-remove-${filterKey}`);
      await click('request-list-filter-apply-button');
      expect(mocks.apply.mock.lastCall![0]).toMatchObject({
        listCreatedQuickRange: 'last-year',
        listBreakdowns: undefined,
        [filterKey]: undefined,
      });
    });
  });

  it('does not add an unspecified graph value to the size filter options', async () => {
    mocks.formAction.mockReturnValue(sizeDefinition);
    await render(false, {
      listRequestSize: [sizeId],
      listBreakdowns: JSON.stringify([
        { field: 'talep-boyutu', value: null, label: 'Talep Boyutu: Belirtilmemiş' },
      ]),
    });
    await click('filter-trigger');
    expect(pills()).toContain('XSmall');
    expect(pills()).not.toContain('Belirtilmemiş');
    await click('request-list-filter-listRequestSize-field');
    const options = Array.from(document.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent
    );
    expect(options).toContain('XSmall');
    expect(options.join(' ')).not.toContain('Belirtilmemiş');
    expect(options.join(' ')).not.toContain('requestDistributionUnspecifiedValue');
    expect(options.join(' ')).not.toContain('__request_filter_unspecified__');
  });

  const graphicFilters = {
    listCreatedFrom: '1759784400',
    listCreatedTo: '1791406799',
    listBreakdowns: JSON.stringify([
      { field: 'yazilim-direktoru', value: 'director-2', label: 'Direktörlük: 02 Bankacılık' },
      { field: 'talep-boyutu', value: 'size-xxl', label: 'Talep Boyutu: XXLarge' },
    ]),
  };
  it('renders graph selections in existing Select/MultiSelect fields without losing their ID predicates on Apply', async () => {
    await render(false, graphicFilters);
    await click('filter-trigger');
    expect(
      document.querySelector('[data-testid="request-list-filter-listSoftwareDirector-field"]')
    ).toHaveValue('02 Bankacılık');
    expect(
      document.querySelector('[data-testid="request-list-filter-listRequestSize-field"]')
    ).not.toBeNull();
    expect(pills()).toContain('XXLarge');
    expect(
      document.querySelector('[data-testid="request-list-filter-add-listSoftwareDirector"]')
    ).toBeNull();
    expect(
      document.querySelector('[data-testid="request-list-filter-add-listRequestSize"]')
    ).toBeNull();
    expect(document.body.textContent).not.toContain('Talep Boyutu: XXLarge');
    expect(document.body.textContent).not.toContain('Direktörlük: 02 Bankacılık');
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0]).toMatchObject(graphicFilters);
    await click('filter-trigger');
    expect(pills()).toContain('XXLarge');
    expect(
      document.querySelector('[data-testid="request-list-filter-listSoftwareDirector-field"]')
    ).toHaveValue('02 Bankacılık');
  });

  it('edits a graph-selected field using the normal options and clears only that field restriction', async () => {
    mocks.unitList.mockReturnValue({
      data: { Data: [{ Id: 'director-3', Name: '03 Bankacılık' }] },
    });
    await render(false, graphicFilters);
    await click('filter-trigger');
    await click('request-list-filter-listSoftwareDirector-field');
    await choose('03 Bankacılık');
    await click('request-list-filter-apply-button');
    const applied = mocks.apply.mock.lastCall![0];
    expect(applied.listSoftwareDirector).toEqual(['director-3']);
    expect(applied.listCreatedFrom).toBe(graphicFilters.listCreatedFrom);
    expect(JSON.parse(applied.listBreakdowns)).toEqual([
      JSON.parse(graphicFilters.listBreakdowns)[1],
    ]);
  });
});

describe('relative date range filters', () => {
  it('uses the shared form field note after the software date quick-range buttons', async () => {
    await render(false, {
      listCreatedQuickRange: 'last-year',
      listIssueType: '1',
      listCurrentAnalysisApprovalFrom: '100',
      listCurrentAnalysisApprovalTo: '200',
    });
    await click('filter-trigger');

    const editor = document.querySelector('[data-testid="request-list-filter-editor-scroll"]')!;
    const descriptions = editor.querySelectorAll<HTMLElement>('[data-form-field-note="info"]');
    expect(descriptions).toHaveLength(1);
    const description = descriptions[0];
    expect(description).toHaveTextContent(
      'label.requests.list.filters.softwareOnlyFieldDescription'
    );
    expect(description.querySelector('.tabler-icon-info-circle')).toBeInTheDocument();
    const text = description.querySelector<HTMLElement>('.mantine-Text-root')!;
    expect(text).toHaveAttribute('data-size', 'xs');
    expect(description.style.lineHeight).toBe('1.35');
    expect(text.style.color).toBe('var(--mantine-color-gray-7)');
    expect(text.style.lineHeight).toBe('inherit');
    expect(text).not.toHaveStyle('font-weight: 600;');
    const quickRangeButton = editor.querySelector(
      '[data-testid="request-list-filter-listCurrentAnalysisApprovalFrom-field-quick-last-year"]'
    )!;
    expect(quickRangeButton).toBeVisible();
    expect(description.previousElementSibling?.contains(quickRangeButton)).toBe(true);
  });

  it.each([false, true])(
    'applies/restores presets and switches to manual dates (report: %s)',
    async (report) => {
      vi.setSystemTime(new Date(2026, 9, 5));
      const prefix = report ? 'report' : 'request';
      const fieldId = 'request-list-filter-listCreatedFrom-field';
      await render(report, { listCreatedQuickRange: 'last-year' });
      await click('filter-trigger');
      expect(document.querySelector(`[data-testid="${fieldId}-quick-last-year"]`)).toHaveAttribute(
        'data-variant',
        'filled'
      );
      expect(document.querySelector(`[data-testid="${fieldId}"]`)).toHaveTextContent(
        JSON.stringify(getDateQuickRangeValue('last-year'))
      );
      await click(`${fieldId}-quick-last-month`);
      expect(document.querySelector(`[data-testid="${fieldId}-quick-last-month"]`)).toHaveAttribute(
        'data-variant',
        'filled'
      );
      await click(`${prefix}-list-filter-apply-button`);
      const applied = mocks.apply.mock.lastCall![0];
      expect(applied).toMatchObject({ listCreatedQuickRange: 'last-month' });
      expect(applied.listCreatedFrom).toBeUndefined();
      expect(applied.listCreatedTo).toBeUndefined();

      vi.setSystemTime(new Date(2027, 2, 31));
      await click('filter-trigger');
      expect(document.querySelector(`[data-testid="${fieldId}"]`)).toHaveTextContent(
        JSON.stringify(getDateQuickRangeValue('last-month'))
      );
      await click('manual-date-range');
      expect(document.querySelector(`[data-testid="${fieldId}-quick-last-month"]`)).toHaveAttribute(
        'data-variant',
        'light'
      );
      await click(`${prefix}-list-filter-apply-button`);
      expect(mocks.apply.mock.lastCall![0]).toMatchObject({
        listCreatedFrom: '100',
        listCreatedTo: '200',
      });
      expect(mocks.apply.mock.lastCall![0].listCreatedQuickRange).toBeUndefined();
    }
  );

  it.each([false, true])(
    'removes the relative key with its range field (report: %s)',
    async (report) => {
      const prefix = report ? 'report' : 'request';
      await render(report, { listCreatedQuickRange: 'last-year' });
      await click('filter-trigger');
      await click(`${prefix}-list-filter-remove-listCreatedFrom`);
      if (report) {
        await click(`${prefix}-list-filter-apply-button`);
        expect(mocks.apply.mock.lastCall![0].listCreatedQuickRange).toBeUndefined();
      } else {
        expect(
          document.querySelector('[data-testid="request-list-filter-apply-button"]')
        ).toBeDisabled();
        expect(
          document.querySelector('[data-testid="request-list-filter-clear-button"]')
        ).toBeEnabled();
        await click('request-list-filter-clear-button');
        expect(mocks.reset).toHaveBeenCalledOnce();
        expect(mocks.apply).not.toHaveBeenCalled();
        expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
      }
    }
  );

  it('saves a quick-range key without resolved timestamps', async () => {
    await render(false, { listCreatedFrom: '100', listCreatedTo: '200' });
    await click('filter-trigger');
    await click('request-list-filter-listCreatedFrom-field-quick-last-year');
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Son yıl'
    );
    await click('request-list-filter-save-button');
    expect(JSON.parse(mocks.createSavedFilter.mock.lastCall![0].Filter)).toEqual({
      listCreatedQuickRange: 'last-year',
    });
  });
});

describe('project effort range filters', () => {
  const rangeInput = (key: string, boundary: 'from' | 'to') =>
    document.querySelector<HTMLInputElement>(
      `[data-testid="request-list-filter-${key}-field-${boundary}"]`
    )!;

  it.each([
    ['listEstimatedProjectEffortFrom', 'listEstimatedProjectEffortTo'],
    ['listCurrentProjectEffortFrom', 'listCurrentProjectEffortTo'],
  ] as const)(
    'adds, applies and restores the %s range without remounting inputs',
    async (fromKey, toKey) => {
      await render(false, {});
      await click('filter-trigger');
      await selectScope(RequestFilterScope.SoftwareDevelopment);
      await click(`request-list-filter-add-${fromKey}`);
      const from = rangeInput(fromKey, 'from');
      const to = rangeInput(fromKey, 'to');
      expect(from).toHaveClass('mantine-NumberInput-input');
      expect(to).toHaveClass('mantine-NumberInput-input');
      const label = document.querySelector<HTMLLabelElement>(`label[for="${from.id}"]`)!;
      expect(label.style.color).toBe(formLabelStyle.color);
      expect(label).toHaveStyle({
        fontSize: formLabelStyle.fontSize,
        fontWeight: formLabelStyle.fontWeight,
      });
      expect(label).toHaveAttribute('for', from.id);
      expect(from.closest('.mantine-Stack-root')).toHaveTextContent(
        'label.requests.list.filters.softwareOnlyFieldDescription'
      );
      await type(from, '100');
      await type(to, '350');
      expect(rangeInput(fromKey, 'from')).toBe(from);
      expect(rangeInput(fromKey, 'to')).toBe(to);
      expect(from).toHaveValue('100');
      expect(to).toHaveValue('350');

      await click('request-list-filter-apply-button');
      expect(mocks.apply).toHaveBeenLastCalledWith(
        expect.objectContaining({ [fromKey]: '100', [toKey]: '350' })
      );
      await click('filter-trigger');
      expect(rangeInput(fromKey, 'from')).toHaveValue('100');
      expect(rangeInput(fromKey, 'to')).toHaveValue('350');

      await click(`request-list-filter-remove-${fromKey}`);
      await selectScope(RequestFilterScope.SoftwareDevelopment);
      await click(`request-list-filter-add-${fromKey}`);
      expect(rangeInput(fromKey, 'from')).toHaveValue('');
      expect(rangeInput(fromKey, 'to')).toHaveValue('');
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      expect(
        document.querySelector('[data-testid="request-list-filter-save-button"]')
      ).toBeDisabled();
      await click('request-list-filter-apply-button');
      expect(mocks.apply).toHaveBeenCalledOnce();
      await click('request-list-filter-clear-button');
      expect(mocks.reset).toHaveBeenCalledOnce();
    }
  );

  it('validates range order before applying or saving and retains the entered values', async () => {
    await render(false, {
      listIssueType: '1',
      listEstimatedProjectEffortFrom: '350',
      listEstimatedProjectEffortTo: '100',
    });
    await click('filter-trigger');
    const fromKey = 'listEstimatedProjectEffortFrom';
    const from = rangeInput(fromKey, 'from');
    const to = rangeInput(fromKey, 'to');
    expect(document.body).toHaveTextContent('message.numberRangeOrder');
    expect(from).toHaveValue('350');
    expect(to).toHaveValue('100');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Efor filtresi'
    );
    await act(async () => {
      from.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();

    await type(from, '100');
    expect(document.body).not.toHaveTextContent('message.numberRangeOrder');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).not.toBeDisabled();
    await click('request-list-filter-save-button');
    const saved = JSON.parse(mocks.createSavedFilter.mock.lastCall![0].Filter);
    expect(saved).toMatchObject({
      listEstimatedProjectEffortFrom: '100',
      listEstimatedProjectEffortTo: '100',
    });
  });

  it('restores an upper-only range, preserves zero and allows clearing either bound', async () => {
    const key = 'listCurrentProjectEffortFrom';
    await render(false, { listIssueType: '1', listCurrentProjectEffortTo: '350' });
    await click('filter-trigger');
    expect(rangeInput(key, 'from')).toHaveValue('');
    expect(rangeInput(key, 'to')).toHaveValue('350');
    await type(rangeInput(key, 'from'), '0');
    await type(rangeInput(key, 'to'), '');
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenLastCalledWith(
      expect.objectContaining({
        listCurrentProjectEffortFrom: '0',
        listCurrentProjectEffortTo: undefined,
      })
    );
  });
});

describe('multiple saved filter editing', () => {
  const values: RequestListFilterValue[] = [
    { listIssueType: '1', listAssignedUser: ['user-1'], listStep: ['42'] },
    { listIssueType: '2', listAssignedUser: ['user-2'], listStep: ['84'] },
  ];
  const records: SavedUserFormFilter[] = [
    { Id: 'first', Name: 'YT filtresi', Description: 'YT açıklaması', Screen: 'requests-list' },
    { Id: 'second', Name: 'OT filtresi', Description: 'OT açıklaması', Screen: 'requests-list' },
  ];
  const field = (name: string) =>
    document.querySelector<HTMLInputElement>(`[data-testid="request-list-filter-${name}-input"]`)!;
  const switchRecord = async (label: string) => {
    await click('request-filter-record-picker');
    await choose(label);
  };
  const open = async () => {
    await render(
      false,
      { listFilterGroups: values, listSort: 'created-asc' },
      '/app/requests',
      undefined,
      records
    );
    await click('filter-trigger');
  };

  it('clears the full applied selection from any editor without modifying saved records', async () => {
    await open();
    await switchRecord('OT filtresi');
    await click('request-list-filter-clear-fields-button');
    expect(field('name')).toHaveValue('OT filtresi');
    expect(field('description')).toHaveValue('OT açıklaması');
    expect(
      document.querySelector('[data-testid="request-list-filter-scope"] input[value="2"]')
    ).toBeChecked();
    expect(mocks.reset).not.toHaveBeenCalled();
    await switchRecord('YT filtresi');
    expect(pills()).toContain('Ayşe Yılmaz');
    await click('request-list-filter-clear-button');
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it('shows the selection count in the header and explains the exact button labels below the actions', async () => {
    await open();
    const count = document.querySelector('[data-testid="request-filter-selection-count"]');
    expect(count).toHaveTextContent('label.requests.list.filters.multipleSelected');
    expect(count).toHaveStyle({ textTransform: 'none' });
    expect(count?.closest('.mantine-Modal-title')).not.toBeNull();
    const manage = document.querySelector('[data-testid="request-list-filter-manage-button"]');
    expect(manage?.nextElementSibling).toBe(count);
    expect(mocks.t).toHaveBeenCalledWith('label.requests.list.filters.multipleSelected', {
      count: records.length,
    });
    const hint = document.querySelector('[data-testid="request-filter-selection-actions-hint"]');
    const save = document.querySelector('[data-testid="request-list-filter-update-button"]')!;
    const apply = document.querySelector('[data-testid="request-list-filter-apply-button"]')!;
    expect(hint).toHaveTextContent('label.requests.list.filters.editingActionsHint');
    expect(mocks.t).toHaveBeenCalledWith('label.requests.list.filters.editingActionsHint', {
      save: save.textContent,
      apply: apply.textContent,
    });
    expect(save.parentElement?.nextElementSibling).toBe(hint);
    expect(apply.parentElement?.nextElementSibling).toBe(hint);

    await switchRecord('OT filtresi');
    expect(document.querySelector('[data-testid="request-filter-selection-count"]')).toBe(count);
    expect(
      document.querySelectorAll('[data-testid="request-filter-selection-actions-hint"]')
    ).toHaveLength(1);
  });

  it('does not show multiple-selection guidance for a single saved filter', async () => {
    await render(false, values[0], '/app/requests', records[0]);
    await click('filter-trigger');
    expect(document.querySelector('[data-testid="request-filter-selection-count"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="request-filter-selection-actions-hint"]')
    ).toBeNull();
  });

  it('keeps metadata uncontrolled and does not rerender the record picker for field edits', async () => {
    await open();
    const name = field('name');
    const description = field('description');
    await type(name, 'YT taslak');
    await type(description, 'Açıklama taslağı');
    const panelRenders = mocks.formAction.mock.calls.length;
    const pickerRenders = mocks.recordPicker.mock.calls.length;

    await type(name, 'YT taslak adı');
    await type(description, 'Açıklama taslağı devamı');
    expect(mocks.formAction).toHaveBeenCalledTimes(panelRenders);
    expect(field('name')).toBe(name);
    expect(field('description')).toBe(description);

    await click('request-list-filter-remove-listAssignedUser');
    expect(mocks.formAction.mock.calls.length).toBeGreaterThan(panelRenders);
    expect(mocks.recordPicker).toHaveBeenCalledTimes(pickerRenders);
    await switchRecord('OT filtresi');
    await switchRecord('YT filtresi');
    expect(field('name')).toHaveValue('YT taslak adı');
    expect(field('description')).toHaveValue('Açıklama taslağı devamı');
  });

  it('restores each record’s metadata, empty fields and scope without applying on switch', async () => {
    await open();
    expect(field('name')).toHaveValue('YT filtresi');
    expect(field('description')).toHaveValue('YT açıklaması');
    await type(field('name'), 'YT taslak adı');
    await type(field('description'), 'YT taslak açıklama');
    await click('request-list-filter-add-listUnit');
    await switchRecord('OT filtresi');
    expect(field('name')).toHaveValue('OT filtresi');
    expect(field('description')).toHaveValue('OT açıklaması');
    expect(
      document.querySelector('[data-testid="request-list-filter-scope"] input[value="2"]')
    ).toBeChecked();
    expect(
      document.querySelector('[data-testid="request-list-filter-remove-listUnit"]')
    ).toBeNull();
    expect(pills()).toContain('Mehmet Demir');
    await switchRecord('YT filtresi');
    expect(field('name')).toHaveValue('YT taslak adı');
    expect(field('description')).toHaveValue('YT taslak açıklama');
    expect(
      document.querySelector('[data-testid="request-list-filter-scope"] input[value="1"]')
    ).toBeChecked();
    expect(
      document.querySelector('[data-testid="request-list-filter-remove-listUnit"]')
    ).not.toBeNull();
    expect(pills()).toContain('Ayşe Yılmaz');
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
  });

  it('applies both drafts as separate OR branches and never persists metadata on Apply', async () => {
    await open();
    await type(field('name'), 'Kaydedilmeyen ad');
    await click('request-list-filter-remove-listAssignedUser');
    await switchRecord('OT filtresi');
    await click('request-list-filter-remove-listStep');
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith({
      listSort: 'created-asc',
      listFilterGroups: [
        expect.objectContaining({
          listIssueType: '1',
          listStep: ['42'],
          listAssignedUser: undefined,
        }),
        expect.objectContaining({
          listIssueType: '2',
          listAssignedUser: ['user-2'],
          listStep: undefined,
        }),
      ],
    });
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it('updates only the open record, stays open and preserves another record’s unsaved draft', async () => {
    await open();
    await type(field('name'), 'YT taslak adı');
    await switchRecord('OT filtresi');
    await type(field('name'), ' Güncel OT ');
    await type(field('description'), ' Güncel açıklama ');
    await click('request-list-filter-update-button');
    expect(mocks.updateSavedFilter).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        Id: 'second',
        Name: 'Güncel OT',
        Description: 'Güncel açıklama',
        Filter: JSON.stringify({
          listIssueType: '2',
          listAssignedUser: ['user-2'],
          listOperationalStep: ['84'],
        }),
      })
    );
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    expect(field('name')).toHaveValue('Güncel OT');
    await switchRecord('YT filtresi');
    expect(field('name')).toHaveValue('YT taslak adı');
    await switchRecord('Güncel OT');
    expect(field('description')).toHaveValue('Güncel açıklama');
  });

  it('keeps failures editable and prevents applying when another draft is empty', async () => {
    await open();
    mocks.updateSavedFilter.mockRejectedValueOnce(new Error('Network unavailable'));
    await type(field('name'), 'Başarısız taslak');
    await click('request-list-filter-update-button');
    expect(field('name')).toHaveValue('Başarısız taslak');
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    await click('request-list-filter-clear-fields-button');
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-testid="request-list-filter-update-button"]')
    ).toBeDisabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    await switchRecord('OT filtresi');
    expect(
      document.querySelector('[data-testid="request-list-filter-update-button"]')
    ).not.toBeDisabled();
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    expect(document.body).toHaveTextContent('label.requests.list.filters.otherDraftInvalid');
    await switchRecord('YT filtresi');
    await click('request-list-filter-add-listAssignedUser');
    const input = document.querySelector<HTMLInputElement>(
      '#request-list-filter-listAssignedUser'
    )!;
    await act(async () => input.focus());
    await choose('Ayşe Yılmaz');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).not.toBeDisabled();
  });
});

describe('saved filter editing from the request list', () => {
  const savedFilter: SavedUserFormFilter = {
    Id: 'selected-filter',
    Name: 'Seçili filtre',
    Description: 'Seçili filtrenin açıklaması',
    Screen: 'requests-list',
    Filter: JSON.stringify({ listAssignedUser: ['user-1'] }),
  };
  const value = { listAssignedUser: ['user-2'] };

  it('prefills metadata and updates the selected record with the current list criteria', async () => {
    await render(false, value, '/app/requests', savedFilter);
    await click('filter-trigger');
    const name = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-name-input"]'
    )!;
    const description = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="request-list-filter-description-input"]'
    )!;
    expect(name).toHaveValue(savedFilter.Name);
    expect(description).toHaveValue(savedFilter.Description);
    expect(pills()).toContain('Mehmet Demir');
    expect(document.querySelector('.mantine-Modal-title')).toHaveTextContent(
      'label.requests.list.filters.editTitle'
    );
    expect(document.querySelector('[data-testid="request-list-filter-save-button"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).not.toBeNull();
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();

    await type(name, ' Güncel ad ');
    await type(description, ' Güncel açıklama ');
    await click('request-list-filter-update-button');
    expect(mocks.updateSavedFilter).toHaveBeenCalledExactlyOnceWith({
      Id: savedFilter.Id,
      Name: 'Güncel ad',
      Description: 'Güncel açıklama',
      Filter: JSON.stringify(value),
      Screen: 'requests-list',
    });
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(mocks.apply).toHaveBeenCalledWith(expect.objectContaining(value));
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it('keeps the editor and its metadata when the update fails', async () => {
    mocks.updateSavedFilter.mockRejectedValueOnce(new Error('Network unavailable'));
    await render(false, value, '/app/requests', savedFilter);
    await click('filter-trigger');
    await click('request-list-filter-update-button');
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    expect(document.querySelector('[data-testid="request-list-filter-name-input"]')).toHaveValue(
      savedFilter.Name
    );
    expect(
      document.querySelector('[data-testid="request-list-filter-description-input"]')
    ).toHaveValue(savedFilter.Description);
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(mocks.message).not.toHaveBeenCalled();
  });

  it.each(['apply', 'clear'])('does not save metadata when using %s', async (action) => {
    await render(false, value, '/app/requests', savedFilter);
    await click('filter-trigger');
    await click(`request-list-filter-${action}-button`);
    expect(action === 'apply' ? mocks.apply : mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });
});

it('allows closing filter creation without saving even when there are no saved filters', async () => {
  await render(false, {});
  await act(async () =>
    useModalStore.getState().openModal('RequestFilter', { mode: requestFilterModes.create })
  );
  expect(document.querySelector('.mantine-Modal-close')).not.toBeNull();
  await act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  expect(mocks.createSavedFilter).not.toHaveBeenCalled();
});

it('keeps creation open after failures and closes immediately after a successful save', async () => {
  await render(false, {});
  await act(async () =>
    useModalStore.getState().openModal('RequestFilter', {
      mode: requestFilterModes.create,
      initialName: 'İlk filtre',
      value: { listAssignedUser: ['user-1'] },
    })
  );
  expect(document.querySelector('.mantine-Modal-close')).not.toBeNull();
  expect(
    document.querySelector('[data-testid="request-list-filter-manage-button"]')
  ).not.toBeNull();
  expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);

  mocks.createSavedFilter.mockRejectedValueOnce(new Error('Network unavailable'));
  await click('request-list-filter-save-button');
  expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
  expect(mocks.message).not.toHaveBeenCalled();

  mocks.createSavedFilter.mockResolvedValueOnce({ Data: false });
  await click('request-list-filter-save-button');
  expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
  expect(mocks.message).not.toHaveBeenCalled();

  mocks.createSavedFilter.mockResolvedValueOnce({ Error: { Message: 'Servis hatası' } });
  await click('request-list-filter-save-button');
  expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
  expect(mocks.message).not.toHaveBeenCalled();

  mocks.createSavedFilter.mockResolvedValueOnce({ Data: true });
  await click('request-list-filter-save-button');
  expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  expect(mocks.createSavedFilter).toHaveBeenCalledTimes(4);
});

describe.each([false, true])('included unit filter (report: %s)', (report) => {
  it('loads selected units by ID and applies IDs while displaying unit names', async () => {
    const selectedUnit = {
      Id: '8f1678b8-2ee8-4fc0-b6a2-a1b997bc01c1',
      Name: '04 Dijital',
      DisplayName: '04 Dijital Bankacılık',
    };
    const availableUnit = {
      Id: '190a0273-686c-43c8-87c7-3ba6043bc404',
      Name: '05 Bankacılık',
      DisplayName: '05 Bankacılık Birimi',
    };
    // The selected unit is outside the first page of search results.
    mocks.unitList.mockImplementation((request: PagedRequest) => ({
      data: { Data: request.Filter?.Field === 'Id' ? [selectedUnit] : [availableUnit] },
    }));

    await render(report, { listUnit: [selectedUnit.Id] });
    await click('filter-trigger');
    expect(mocks.unitList).toHaveBeenCalledWith(
      expect.objectContaining({
        Filter: expect.objectContaining({ Field: 'Id', Value: selectedUnit.Id }),
      }),
      { enabled: true }
    );
    expect(pills()).toEqual([selectedUnit.DisplayName]);

    const input = document.querySelector<HTMLInputElement>('#request-list-filter-listUnit')!;
    await act(async () => input.focus());
    await choose(availableUnit.DisplayName);
    expect(pills()).toEqual([selectedUnit.DisplayName, availableUnit.DisplayName]);
    await click(`${report ? 'report' : 'request'}-list-filter-apply-button`);
    expect(mocks.apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ listUnit: [selectedUnit.Id, availableUnit.Id] })
    );

    await click('filter-trigger');
    expect(pills()).toEqual([selectedUnit.DisplayName, availableUnit.DisplayName]);
  });
});

describe('portfolio filter', () => {
  const input = () =>
    document.querySelector<HTMLInputElement>('#request-list-filter-listPortfolio')!;

  beforeEach(() => {
    mocks.portfolioList.mockReturnValue({
      data: {
        Data: [
          { Id: 'portfolio-1', Name: 'Dijital Bankacılık' },
          { Id: 'portfolio-2', Name: 'Ödeme Sistemleri' },
          { Name: 'ID olmayan kayıt' },
        ],
      },
      isFetching: false,
    });
  });

  it.each([false, true])('applies multiple IDs and restores names (report: %s)', async (report) => {
    await render(report, { listPortfolio: ['portfolio-1'] });
    await click('filter-trigger');
    expect(mocks.portfolioList).toHaveBeenLastCalledWith({ enabled: true });
    expect(pills()).toEqual(['Dijital Bankacılık']);
    const options = mocks.select.mock.calls.find(([props]) => props.id === input().id)![0].data;
    expect(options).toEqual([
      { value: 'portfolio-1', label: 'Dijital Bankacılık' },
      { value: 'portfolio-2', label: 'Ödeme Sistemleri' },
    ]);
    await act(async () => input().click());
    await choose('Ödeme Sistemleri');
    expect(pills()).toEqual(['Dijital Bankacılık', 'Ödeme Sistemleri']);
    await click(`${report ? 'report' : 'request'}-list-filter-apply-button`);
    expect(mocks.apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ listPortfolio: ['portfolio-1', 'portfolio-2'] })
    );
    await click('filter-trigger');
    expect(pills()).toEqual(['Dijital Bankacılık', 'Ödeme Sistemleri']);
  });

  it('enables the catalog only for an active field and does not rebuild options on selection', async () => {
    await render(false, {});
    await click('filter-trigger');
    expect(mocks.portfolioList).toHaveBeenLastCalledWith({ enabled: false });
    await click('request-list-filter-add-listPortfolio');
    expect(mocks.portfolioList).toHaveBeenLastCalledWith({ enabled: true });
    const lastOptions = () =>
      mocks.select.mock.calls.filter(([props]) => props.id === input().id).at(-1)![0].data;
    const options = lastOptions();
    await act(async () => input().click());
    await choose('Dijital Bankacılık');
    expect(lastOptions()).toBe(options);
    await click('request-list-filter-remove-listPortfolio');
    expect(mocks.portfolioList).toHaveBeenLastCalledWith({ enabled: false });
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall?.[0].listPortfolio).toBeUndefined();
  });
});

describe('directorate filter', () => {
  const selectedDirector = { Id: 'director-1', DisplayName: 'Dijital Bankacılık Direktörlüğü' };
  const availableDirector = { Id: 'director-2', DisplayName: 'Teknoloji Direktörlüğü' };
  const input = () =>
    document.querySelector<HTMLInputElement>('#request-list-filter-listSoftwareDirector')!;

  beforeEach(() => {
    mocks.unitList.mockImplementation((request: PagedRequest) => ({
      data: { Data: request.Filter?.Field === 'Id' ? [selectedDirector] : [availableDirector] },
    }));
  });

  it('loads saved selection by ID, allows one directorate and clears the selection', async () => {
    await render(false, { listSoftwareDirector: [selectedDirector.Id] });
    await click('filter-trigger');
    expect(mocks.unitList).toHaveBeenCalledWith(
      expect.objectContaining({ Filter: createUnitTypeFilter(OrgUnitTypeEnum.Director) }),
      { enabled: true }
    );
    expect(mocks.unitList).toHaveBeenCalledWith(
      expect.objectContaining({
        Filter: expect.objectContaining({ Field: 'Id', Value: selectedDirector.Id }),
      }),
      { enabled: true }
    );
    expect(input().value).toBe(selectedDirector.DisplayName);
    await act(async () => input().click());
    await choose(availableDirector.DisplayName);
    expect(input().value).toBe(availableDirector.DisplayName);
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ listSoftwareDirector: [availableDirector.Id] })
    );

    await click('filter-trigger');
    expect(input().value).toBe(availableDirector.DisplayName);
    const clearButton = input().closest('.mantine-Select-root')!.querySelector('button');
    expect(clearButton).not.toBeNull();
    await act(async () => clearButton!.click());
    expect(input().value).toBe('');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    await click('request-list-filter-clear-button');
    expect(mocks.reset).toHaveBeenCalledOnce();
  });

  it('disables directorate lookup until activated and debounces search within the director type', async () => {
    await render(false, {});
    await click('filter-trigger');
    expect(mocks.unitList).toHaveBeenCalledWith(
      expect.objectContaining({ Filter: createUnitTypeFilter(OrgUnitTypeEnum.Director) }),
      { enabled: false }
    );
    await click('request-list-filter-add-listSoftwareDirector');
    expect(mocks.unitList).toHaveBeenCalledWith(
      expect.objectContaining({ Filter: createUnitTypeFilter(OrgUnitTypeEnum.Director) }),
      { enabled: true }
    );

    const originalInput = input();
    mocks.unitList.mockClear();
    for (const text of ['T', 'Tek', 'Teknoloji']) {
      await type(originalInput, text);
      expect(input().value).toBe(text);
    }
    await act(async () => vi.advanceTimersByTime(299));
    expect(mocks.unitList).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(mocks.unitList).toHaveBeenCalledWith(
      expect.objectContaining({
        Filter: expect.objectContaining({
          Logic: 'and',
          Filters: [
            createUnitTypeFilter(OrgUnitTypeEnum.Director),
            expect.objectContaining({
              Filters: expect.arrayContaining([
                expect.objectContaining({ Field: 'DisplayName', Value: 'Teknoloji' }),
              ]),
            }),
          ],
        }),
      }),
      { enabled: true }
    );
    expect(input()).toBe(originalInput);
  });
});

it.each(['listCreatedBy', 'listUpdatedBy'] as const)(
  'resolves a saved %s user outside the initial search results',
  async (key) => {
    const selectedUser = {
      data: {
        Data: [
          { Code: 'off-page-user', FirstName: 'Aykut', LastName: 'Sezgin', UnitName: 'Yazılım' },
        ],
      },
    };
    mocks.userList.mockImplementation((request: PagedRequest, options: { enabled: boolean }) => {
      if (
        options.enabled &&
        request.Filter?.Field === 'Code' &&
        request.Filter.Value === 'off-page-user'
      ) {
        return selectedUser;
      }
      return mocks.empty;
    });
    await render(false, { [key]: ['off-page-user'] });
    await click('filter-trigger');
    expect(pills()).toEqual(['Aykut Sezgin']);
    expect(document.querySelector(`#request-list-filter-${key}`)).toHaveAttribute(
      'placeholder',
      'label.requests.list.filters.personSearchPlaceholder'
    );
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledWith({ [key]: ['off-page-user'] });
  }
);

describe.each([
  { name: 'request modal', report: false, key: 'listAssignedUser', fieldPrefix: 'request' },
  { name: 'request creator', report: false, key: 'listCreatedBy', fieldPrefix: 'request' },
  { name: 'request updater', report: false, key: 'listUpdatedBy', fieldPrefix: 'request' },
  { name: 'report', report: true, key: 'reportCreatedUser', fieldPrefix: 'report' },
  { name: 'report shared field', report: true, key: 'listAssignedUser', fieldPrefix: 'request' },
] as const)('$name uncontrolled filters', ({ report, key, fieldPrefix }) => {
  const prefix = report ? 'report' : 'request';
  const input = () =>
    document.querySelector<HTMLInputElement>(`#${fieldPrefix}-list-filter-${key}`)!;
  const initial = { [key]: ['user-1'] };

  it('keeps multiple selection open without remounting and applies the latest values', async () => {
    await render(report, initial);
    await click('filter-trigger');
    expect(pills()).toContain('Ayşe Yılmaz');
    const originalInput = input();
    await act(async () => originalInput.focus());
    await choose('Mehmet Demir');
    expect(input()).toBe(originalInput);
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(pills()).toEqual(['Ayşe Yılmaz', 'Mehmet Demir']);
    await choose('Ayşe Yılmaz');
    expect(input()).toBe(originalInput);
    expect(pills()).toEqual(['Mehmet Demir']);
    for (const [props] of mocks.select.mock.calls) {
      expect(props.value).toBeUndefined();
      expect(props.searchValue).toBeUndefined();
      expect(props.defaultValue).toBeDefined();
    }
    await click(`${prefix}-list-filter-apply-button`);
    expect(mocks.apply).toHaveBeenCalledWith(expect.objectContaining({ [key]: ['user-2'] }));
    await click('filter-trigger');
    expect(pills()).toEqual(['Mehmet Demir']);
  });

  it('renders rapid typing immediately and sends only debounced text to the service filter', async () => {
    await render(report, initial);
    await click('filter-trigger');
    const originalInput = input();
    await act(async () => originalInput.focus());
    mocks.userList.mockClear();
    for (const text of ['M', 'Me', 'Meh', 'Mehmet']) {
      await type(originalInput, text);
      expect(input().value).toBe(text);
      expect(mocks.userList).not.toHaveBeenCalled();
    }
    await act(async () => vi.advanceTimersByTime(299));
    expect(mocks.userList).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    const requests = mocks.userList.mock.calls
      .filter(([, options]) => options.enabled)
      .map(([request]) => JSON.stringify((request as PagedRequest).Filter));
    expect(requests.some((request) => request?.includes('Mehmet'))).toBe(true);
    expect(input()).toBe(originalInput);
    expect(input().value).toBe('Mehmet');

    // Equivalent external values and option refreshes must not reset an active input.
    mocks.userList.mockReturnValue(mocks.empty);
    await render(report, { [key]: ['user-1'] });
    expect(input()).toBe(originalInput);
    expect(input().value).toBe('Mehmet');
    expect(pills()).toEqual(['Ayşe Yılmaz']);

    await type(originalInput, 'Bekleyen');
    await render(report, { [key]: ['user-2'] });
    expect(input()).not.toBe(originalInput);
    expect(input().value).toBe('');
    mocks.userList.mockClear();
    await act(async () => vi.advanceTimersByTime(300));
    expect(mocks.userList).not.toHaveBeenCalled();
  });

  it('discards unapplied selections on reopen and synchronizes changed external values', async () => {
    await render(report, initial);
    await click('filter-trigger');
    await act(async () => input().focus());
    await choose('Mehmet Demir');
    if (report) {
      await click('filter-trigger');
    } else {
      await act(async () => useModalStore.getState().closeModal('RequestFilter'));
    }
    await click('filter-trigger');
    expect(pills()).toEqual(['Ayşe Yılmaz']);
    const originalInput = input();
    await render(report, { [key]: ['user-2'] });
    expect(input()).not.toBe(originalInput);
    expect(pills()).toEqual(['Mehmet Demir']);
  });

  it('clears selections when resetting and re-adding a field', async () => {
    mocks.savedFilters.mockReturnValue({
      data: {
        Data: [{ Id: 'saved', Name: 'Kayıtlı', Filter: JSON.stringify({ [key]: ['user-2'] }) }],
      },
    });
    await render(report, initial);
    await click('filter-trigger');
    if (report) {
      await click(`${prefix}-list-saved-filter-saved`);
      expect(mocks.apply).toHaveBeenCalledWith(expect.objectContaining({ [key]: ['user-2'] }));
      await click('filter-trigger');
    } else {
      await render(report, { [key]: ['user-2'] });
    }
    expect(pills()).toEqual(['Mehmet Demir']);
    await click(`${prefix}-list-filter-clear-button`);
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(pills()).toEqual([]);
    expect(input()).toBeNull();
    await click('filter-trigger');
    if (report) {
      await click('report-list-filter-add-select');
      await choose(key === 'reportCreatedUser' ? '.createdBy' : '.assignedUser');
    } else {
      await click(`request-list-filter-add-${key}`);
    }
    expect(input()).not.toBeNull();
    expect(pills()).toEqual([]);
    await click(`${prefix}-list-filter-apply-button`);
    if (report) {
      expect(mocks.apply).toHaveBeenLastCalledWith(expect.objectContaining({}));
      expect(mocks.apply.mock.lastCall?.[0][key]).toBeUndefined();
    } else {
      expect(
        document.querySelector('[data-testid="request-list-filter-apply-button"]')
      ).toBeDisabled();
      expect(mocks.apply).not.toHaveBeenCalled();
    }
  });
});

describe.each([false, true])('uncontrolled request-number filter (report: %s)', (report) => {
  it('retains selected request labels after searching, selection and applying', async () => {
    const prefix = report ? 'report' : 'request';
    const key = report ? 'reportNo' : 'listNo';
    await render(report, report ? { reportNo: ['REQ-1'] } : { listIssueId: ['legacy-id'] });
    await click('filter-trigger');
    const input = document.querySelector<HTMLInputElement>(`#${prefix}-list-filter-${key}`)!;
    expect(document.querySelector(`label[for="${input.id}"]`)).toHaveTextContent(
      report ? 'label.reports.list.filters.requestNo' : 'label.requests.list.filters.requestNo'
    );
    expect(input).toHaveAttribute(
      'placeholder',
      'label.requests.list.filters.requestSearchPlaceholder'
    );
    expect(pills()).toEqual(['REQ-1']);
    await act(async () => input.focus());
    await type(input, 'REQ-2');
    await act(async () => vi.advanceTimersByTime(300));
    expect(mocks.issueSearch).toHaveBeenCalledWith('REQ-2', 0, 20, { enabled: true });
    await choose('REQ-2 - İkinci talep');
    expect(document.querySelector(`#${prefix}-list-filter-${key}`)).toBe(input);
    expect(pills()).toEqual(['REQ-1', 'REQ-2']);
    await click(`${prefix}-list-filter-apply-button`);
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ [key]: ['REQ-1', 'REQ-2'] })
    );
    await click('filter-trigger');
    expect(pills()).toEqual(['REQ-1', 'REQ-2']);
    if (!report) {
      await act(async () =>
        document.querySelector<HTMLInputElement>(`#${prefix}-list-filter-${key}`)!.focus()
      );
      await choose('REQ-1');
      expect(pills()).toEqual(['REQ-2']);
      await click(`${prefix}-list-filter-apply-button`);
      expect(mocks.apply).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: ['REQ-2'] }));
    }
  });
});

describe('request filter modal modes', () => {
  it.each(['all', 'personal'] as const)(
    'ignores the legacy %s scope and applies criteria without a name',
    async (view) => {
      await render(false, { listAssignedUser: ['user-1'] }, `/app/requests?view=${view}`);
      await click('filter-trigger');
      expect(document.querySelector('[data-testid="request-list-filter-view-input"]')).toBeNull();
      await click('request-list-filter-apply-button');
      expect(mocks.apply).toHaveBeenCalledExactlyOnceWith({ listAssignedUser: ['user-1'] });
      expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    }
  );

  it('saves and applies criteria without storing a scope', async () => {
    await render(false, { listAssignedUser: ['user-1'] }, '/app/requests?view=all');
    await click('filter-trigger');
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Listem'
    );
    await click('request-list-filter-save-button');
    expect(mocks.createSavedFilter).toHaveBeenCalledExactlyOnceWith({
      Name: 'Listem',
      Description: '',
      Screen: 'requests-list',
      Filter: JSON.stringify({ listAssignedUser: ['user-1'] }),
    });
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith({ listAssignedUser: ['user-1'] });
  });

  it.each(['personal', 'all'] as const)(
    'removes the legacy %s scope when updating a saved filter',
    async (view) => {
      await render(false, {});
      const value = { listRequestPool: ['Pool A'] };
      await act(async () => {
        useModalStore.getState().openModal('RequestFilter', {
          mode: requestFilterModes.edit,
          item: {
            Id: 'filter-1',
            Name: 'Listem',
            Filter: JSON.stringify({ ...value, view }),
          },
          value,
        });
      });
      expect(document.querySelector('[data-testid="request-list-filter-view-input"]')).toBeNull();
      await click('request-list-filter-update-button');
      expect(mocks.updateSavedFilter).toHaveBeenCalledExactlyOnceWith({
        Id: 'filter-1',
        Name: 'Listem',
        Description: '',
        Screen: 'requests-list',
        Filter: JSON.stringify(value),
      });
      expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    }
  );

  it.each([
    '/app/filters-and-graphs',
    '/app/filters-and-graphs?view=filters',
    '/app/filters-and-graphs/?view=filters',
    '/app/filters-and-graphs?view=unknown',
  ])('hides management when the filters tab is already displayed at %s', async (path) => {
    await render(false, {}, path);

    for (const mode of [requestFilterModes.create, requestFilterModes.edit]) {
      await act(async () => {
        useModalStore
          .getState()
          .openModal(
            'RequestFilter',
            mode === requestFilterModes.edit
              ? { mode, item: { Id: 'filter-1', Name: 'Liste' }, value: {} }
              : { mode }
          );
      });

      expect(
        document.querySelector('[data-testid="request-list-filter-name-input"]')
      ).not.toBeNull();
      expect(
        document.querySelector('[data-testid="request-list-filter-manage-button"]')
      ).toBeNull();
    }
  });

  it('keeps management available on the charts tab', async () => {
    await render(false, {}, '/app/filters-and-graphs?view=graphics');
    await click('filter-trigger');
    await click('request-list-filter-manage-button');

    expect(container.querySelector('[data-testid="current-location"]')).toHaveTextContent(
      '/app/filters-and-graphs?view=filters'
    );
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it.each(Object.values(requestFilterModes))(
    'opens the filters management tab and closes the modal in %s mode',
    async (mode) => {
      await render(false, {});
      if (mode === requestFilterModes.apply) {
        await click('filter-trigger');
      } else {
        await act(async () => {
          useModalStore
            .getState()
            .openModal(
              'RequestFilter',
              mode === requestFilterModes.edit
                ? { mode, item: { Id: 'filter-1', Name: 'Liste' }, value: {} }
                : { mode }
            );
        });
      }

      const manageButton = document.querySelector<HTMLButtonElement>(
        '[data-testid="request-list-filter-manage-button"]'
      )!;
      expect(manageButton).toHaveTextContent('label.manage');
      expect(manageButton).toHaveAttribute(
        'aria-label',
        'label.requests.list.filters.manageFilters'
      );
      expect(manageButton.closest('.mantine-Modal-title')).not.toBeNull();
      expect(manageButton.querySelector('.tabler-icon-settings')).not.toBeNull();
      expect(document.querySelector('[data-testid^="request-list-saved-filter-"]')).toBeNull();
      expect(document.body).not.toHaveTextContent('label.requests.list.filters.savedFilters');
      expect(mocks.savedFilters).not.toHaveBeenCalled();
      expect(
        document.querySelector('[data-testid="request-list-filter-name-input"]')
      ).not.toBeNull();
      const nameLabel = document.querySelector('label[for="request-list-filter-name-input"]');
      const saveNote = document.querySelector('[data-testid="request-list-filter-save-note"]');
      expect(document.querySelector('#request-list-filter-name-input-description')).toBeNull();
      expect(nameLabel?.textContent?.includes('*')).toBe(mode !== requestFilterModes.apply);
      const nameGrid = document
        .querySelector('[data-testid="request-list-filter-name-input"]')
        ?.closest('.mantine-SimpleGrid-root');
      expect(nameGrid).toBeNull();
      expect(document.querySelector('[data-testid="request-list-filter-view-input"]')).toBeNull();
      if (mode === requestFilterModes.apply) {
        expect(saveNote).toHaveTextContent('label.requests.list.filters.savedFilterDetailsHint');
        expect(saveNote).toHaveAttribute('role', 'note');
        expect(saveNote?.closest('.mantine-TextInput-root')).toBeNull();
        expect(saveNote?.querySelector('.tabler-icon-info-circle')).not.toBeNull();
        expect(saveNote?.querySelector('.mantine-Alert-wrapper')).toHaveStyle({
          alignItems: 'center',
        });
        expect(saveNote?.querySelector('.mantine-Alert-icon')).toHaveStyle({ marginTop: '0px' });
        expect(
          saveNote!.compareDocumentPosition(nameLabel!) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
      } else {
        expect(saveNote).toBeNull();
      }
      expect(
        document.querySelector('[data-testid="request-list-filter-fields-scroll"]')
      ).not.toBeNull();
      const persistButton = document.querySelector(
        mode === requestFilterModes.edit
          ? '[data-testid="request-list-filter-update-button"]'
          : '[data-testid="request-list-filter-save-button"]'
      )!;
      expect(persistButton).toHaveAttribute('data-with-left-section', 'true');
      expect(persistButton).toHaveAttribute(
        'data-variant',
        mode === requestFilterModes.apply ? 'light' : 'filled'
      );
      expect(
        document.querySelectorAll('[data-testid="request-list-filter-apply-button"]')
      ).toHaveLength(mode === requestFilterModes.apply ? 1 : 0);

      await click('request-list-filter-manage-button');

      expect(container.querySelector('[data-testid="current-location"]')).toHaveTextContent(
        '/app/filters-and-graphs?view=filters'
      );
      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
      expect(mocks.createSavedFilter).not.toHaveBeenCalled();
      expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
      expect(mocks.apply).not.toHaveBeenCalled();
    }
  );

  it('saves directly from apply mode with a name outside the scrolling editor', async () => {
    await render(false, { listAssignedUser: ['user-1'] });
    await click('filter-trigger');

    const nameInput = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-name-input"]'
    )!;
    const saveButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="request-list-filter-save-button"]'
    )!;
    expect(nameInput).not.toBeNull();
    expect(nameInput.closest('[data-testid="request-list-filter-editor-scroll"]')).toBeNull();
    expect(saveButton).toBeEnabled();
    await click('request-list-filter-save-button');
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('#request-list-filter-name-input-error')).toHaveTextContent(
      'message.required'
    );
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    await type(nameInput, '   ');
    await click('request-list-filter-save-button');
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();

    await type(nameInput, '  Bana atanan talepler  ');
    const descriptionInput = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="request-list-filter-description-input"]'
    )!;
    await type(descriptionInput, 'Bana atanan açık talepler');
    expect(nameInput).not.toHaveAttribute('aria-invalid');
    expect(saveButton).toBeEnabled();
    await click('request-list-filter-save-button');

    expect(mocks.createSavedFilter).toHaveBeenCalledExactlyOnceWith({
      Filter: JSON.stringify({ listAssignedUser: ['user-1'] }),
      Name: 'Bana atanan talepler',
      Description: 'Bana atanan açık talepler',
      Screen: 'requests-list',
    });
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-testid="request-list-filter-save-name-input"]')
    ).toBeNull();
    expect(
      document.querySelector('[data-testid="request-list-filter-save-confirm-button"]')
    ).toBeNull();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    expect(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!
        .value
    ).toBe('');
    expect(document.querySelector('#request-list-filter-name-input-error')).toBeNull();
    expect(
      document.querySelector('[data-testid="request-list-filter-description-input"]')
    ).toHaveValue('');
    expect(saveButton).toBeEnabled();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(pills()).toEqual(['Ayşe Yılmaz']);

    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ listAssignedUser: ['user-1'] })
    );
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it.each([requestFilterModes.create, requestFilterModes.edit])(
    'validates the name before persisting in %s mode',
    async (mode) => {
      await render(false, {});
      const value = { listAssignedUser: ['user-1'] };
      await act(async () => {
        useModalStore
          .getState()
          .openModal(
            'RequestFilter',
            mode === requestFilterModes.edit
              ? { mode, item: { Id: 'filter-1', Name: 'Liste' }, value }
              : { mode, value }
          );
      });
      const nameInput = document.querySelector<HTMLInputElement>(
        '[data-testid="request-list-filter-name-input"]'
      )!;
      const buttonId =
        mode === requestFilterModes.edit
          ? 'request-list-filter-update-button'
          : 'request-list-filter-save-button';
      for (const name of ['', '   ']) {
        await type(nameInput, name);
        await click(buttonId);
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
        expect(document.querySelector('#request-list-filter-name-input-error')).toHaveTextContent(
          'message.required'
        );
        expect(mocks.createSavedFilter).not.toHaveBeenCalled();
        expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
        expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
        expect(pills()).toEqual(['Ayşe Yılmaz']);
      }

      await type(nameInput, '  Geçerli liste  ');
      await click(buttonId);
      const persist =
        mode === requestFilterModes.edit ? mocks.updateSavedFilter : mocks.createSavedFilter;
      expect(persist).toHaveBeenCalledExactlyOnceWith({
        ...(mode === requestFilterModes.edit ? { Id: 'filter-1' } : {}),
        Filter: JSON.stringify(value),
        Name: 'Geçerli liste',
        Description: '',
        Screen: 'requests-list',
      });
      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
    }
  );

  it('skips unchanged filter fields on name validation but renders updated options', async () => {
    const value = { listAssignedUser: ['user-1'] };
    await render(false, value);
    await click('filter-trigger');
    mocks.select.mockClear();

    await click('request-list-filter-save-button');
    expect(document.querySelector('#request-list-filter-name-input-error')).toHaveTextContent(
      'message.required'
    );
    expect(mocks.select).not.toHaveBeenCalled();

    const updatedUsers = {
      data: { Data: [{ Code: 'user-1', FirstName: 'Güncel', LastName: 'Kullanıcı' }] },
    };
    mocks.userList.mockReturnValue(updatedUsers);
    await render(false, value);
    expect(mocks.select).toHaveBeenCalled();
    expect(pills()).toEqual(['Güncel Kullanıcı']);

    mocks.select.mockClear();
    mocks.userList.mockReturnValue({ ...updatedUsers, isFetching: true });
    await render(false, value);
    expect(mocks.select).toHaveBeenLastCalledWith(expect.objectContaining({ loading: true }));
  });

  it('applies filters without validating the name after a failed save', async () => {
    await render(false, { listAssignedUser: ['user-1'] });
    await click('filter-trigger');
    await click('request-list-filter-save-button');
    expect(document.querySelector('#request-list-filter-name-input-error')).toHaveTextContent(
      'message.required'
    );

    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ listAssignedUser: ['user-1'] })
    );
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it('requires a filter value to save or apply, but does not require a name to apply', async () => {
    await render(false, {});
    await click('filter-trigger');

    const nameInput = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-name-input"]'
    )!;
    await type(nameInput, 'Boş liste');
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
    await click('request-list-filter-save-button');
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();

    await type(nameInput, '');
    await click('request-list-filter-add-listAssignedUser');
    await click('request-list-filter-listAssignedUser-field');
    await choose('Ayşe Yılmaz');
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeEnabled();
    await click('request-list-filter-apply-button');
    expect(mocks.apply).toHaveBeenCalledOnce();
  });

  it.each<RequestListFilterValue>([
    { listCreatedTo: '2026-09-18' },
    { listIssueId: ['legacy-id'] },
  ])('allows saving valid API filters not represented by a standalone field: %j', async (value) => {
    await render(false, value);
    await click('filter-trigger');
    const nameInput = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-name-input"]'
    )!;
    await type(nameInput, 'Liste');

    expect(document.querySelector('[data-testid="request-list-filter-save-button"]')).toBeEnabled();
    await click('request-list-filter-save-button');
    expect(mocks.createSavedFilter).toHaveBeenCalledExactlyOnceWith({
      Filter: JSON.stringify(value),
      Name: 'Liste',
      Screen: 'requests-list',
      Description: '',
    });
  });

  it('preserves the name, description and draft when saving from apply mode fails', async () => {
    mocks.createSavedFilter.mockResolvedValueOnce({ Data: null });
    await render(false, { listAssignedUser: ['user-1'] });
    await click('filter-trigger');
    const nameInput = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-name-input"]'
    )!;
    await type(nameInput, 'Bana atanan talepler');
    const descriptionInput = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="request-list-filter-description-input"]'
    )!;
    await type(descriptionInput, 'Kaydedilmemiş açıklama');
    await click('request-list-filter-save-button');

    expect(mocks.createSavedFilter).toHaveBeenCalledOnce();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
    expect(nameInput.value).toBe('Bana atanan talepler');
    expect(descriptionInput).toHaveValue('Kaydedilmemiş açıklama');
    expect(pills()).toEqual(['Ayşe Yılmaz']);
    expect(document.querySelector('[data-testid="request-list-filter-save-button"]')).toBeEnabled();
  });

  it('lists available fields with add buttons instead of the add select', async () => {
    await render(false, { listAssignedUser: ['user-1'] });
    await click('filter-trigger');

    expect(document.querySelector('[data-testid="request-list-filter-add-select"]')).toBeNull();
    expect(document.querySelector('#request-list-filter-fields-title')).toHaveTextContent(
      'label.requests.list.filters.fields'
    );
    const availableFields = document.querySelector(
      '[data-testid="request-list-filter-fields-scroll"]'
    )!;
    const editor = document.querySelector('[data-testid="request-list-filter-editor-scroll"]')!;
    expect(availableFields.querySelectorAll('li')).toHaveLength(
      requestListFilterConfigs.filter(({ scopes }) => scopes[0] === RequestFilterScope.Common)
        .length - 1
    );
    expect(
      availableFields.querySelector('[data-testid="request-list-filter-add-listAssignedUser"]')
    ).toBeNull();
    expect(availableFields.querySelectorAll('[data-scrollbars="y"]')).toHaveLength(1);
    expect(document.querySelector('.mantine-Accordion-root')).toBeNull();
    expect(editor.querySelector('[data-scrollbars="y"]')).not.toBeNull();
    expect(editor.querySelector('#request-list-filter-listAssignedUser')).not.toBeNull();
    expect(editor.contains(availableFields)).toBe(false);
    expect(editor.querySelector('[data-testid="request-list-filter-apply-button"]')).toBeNull();
  });

  it.each(requestFilterScopeOptions)(
    'shows delayed help for scope $value and preserves theme styling',
    async ({ value, labelKey }) => {
      const { titleKey, descriptionKey } = requestFilterScopeTooltipContent[value];
      await render(false, {});
      await click('filter-trigger');
      const control = document.querySelector<HTMLElement>(
        '[data-testid="request-list-filter-scope"]'
      )!;
      const target = control.querySelector<HTMLElement>(
        `[data-testid="request-list-filter-scope-option-${value}"]`
      )!;
      const radio = control.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;

      expect(Array.from(control.querySelectorAll('input')).map((input) => input.value)).toEqual([
        '1',
        '2',
        '-1',
      ]);

      expect(control.style.getPropertyValue('--sc-radius')).toBe('var(--mantine-radius-xl)');
      // jsdom does not resolve CSS variables in computed background shorthand styles.
      expect(control.style.getPropertyValue('background')).toBe('var(--mantine-color-gray-2)');
      expect(control.style.getPropertyValue('--sc-font-size')).toBe('var(--mantine-font-size-xs)');
      expect(control).toHaveAttribute('data-with-items-borders');
      expect(radio).toHaveAccessibleName(labelKey);
      await act(async () => target.dispatchEvent(new MouseEvent('mouseenter')));
      await act(async () => vi.advanceTimersByTime(299));
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
      await act(async () => vi.advanceTimersByTime(1));
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(descriptionKey);
      expect(
        document.querySelector('[role="tooltip"] [style*="font-weight: 700"]')
      ).toHaveTextContent(titleKey);
      const tooltipTexts = document.querySelectorAll<HTMLElement>(
        '[role="tooltip"] .mantine-Text-root'
      );
      expect(tooltipTexts).toHaveLength(2);
      for (const text of tooltipTexts) {
        expect(text.style.getPropertyValue('--text-fz')).toBe('var(--mantine-font-size-xs)');
      }
      expect(control.querySelector('input[value="-1"]')).toBeChecked();
      expect(mocks.apply).not.toHaveBeenCalled();

      await act(async () => target.click());
      expect(radio).toBeChecked();
    }
  );

  it('offers workflow step in both issue scopes but not in common', async () => {
    await render(false, {});
    await click('filter-trigger');
    expect(document.querySelector('[data-testid="request-list-filter-add-listStep"]')).toBeNull();
    for (const scope of [RequestFilterScope.SoftwareDevelopment, RequestFilterScope.Operational]) {
      await selectScope(scope);
      expect(
        document.querySelector('[data-testid="request-list-filter-add-listStep"]')
      ).not.toBeNull();
    }
  });

  it.each([
    { scope: RequestFilterScope.SoftwareDevelopment, key: 'listSoftwareStep' },
    { scope: RequestFilterScope.Operational, key: 'listOperationalStep' },
  ])('applies, saves and reopens draft plus multiple steps in $key', async ({ scope, key }) => {
    mocks.stepDefinitions.mockReturnValue({
      data: {
        Data: [
          { Id: 99, Key: 'Servisten Taslak', Order: 0 },
          { Id: 42, Key: 'Analiz', Order: 1 },
          { Id: 43, Key: 'Geliştirme', Order: 2 },
        ],
      },
    });
    await render(false, { listIssueType: String(scope) });
    await click('filter-trigger');
    await click('request-list-filter-add-listStep');
    await click('request-list-filter-listStep-field');
    await choose('Analiz');
    await choose('Geliştirme');
    await choose('label.statusDraft');
    const options = mocks.select.mock.calls.findLast(
      ([props]) => props['data-testid'] === 'request-list-filter-listStep-field'
    )![0].data;
    expect(options.filter((option: { value: string }) => option.value === '99')).toHaveLength(1);
    await selectScope(
      scope === RequestFilterScope.SoftwareDevelopment
        ? RequestFilterScope.Operational
        : RequestFilterScope.SoftwareDevelopment
    );
    expect(document.querySelector('[data-testid="request-list-filter-listStep-field"]')).toBeNull();
    await selectScope(scope);
    expect(pills()).toEqual(expect.arrayContaining(['Analiz', 'Geliştirme', 'label.statusDraft']));
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Taslak ve adımlar'
    );
    await click('request-list-filter-save-button');
    const saved = mocks.createSavedFilter.mock.lastCall![0].Filter;
    expect(JSON.parse(saved)).toEqual({
      listIssueType: String(scope),
      [key]: ['42', '43'],
      listDraft: true,
    });
    await click('request-list-filter-apply-button');
    const applied = mocks.apply.mock.lastCall![0];
    expect(applied.listStep).toEqual(['42', '43', '99']);
    expect(createRequestListUrlState(applied)).toMatchObject({
      listDraft: 'true',
      [key]: '["42","43"]',
    });
    expect(buildRequestListPageFilter(parseSavedRequestListFilter(saved)!.value)).toEqual(
      buildRequestListPageFilter(applied)
    );
    expect(
      buildRequestListPageFilter(applied)?.Filters?.filter(
        (item) => item.Field === 'StepDefinationId'
      )
    ).toEqual([expect.objectContaining({ Value: [42, 43, 99] })]);
    await click('filter-trigger');
    await click('request-list-filter-listStep-field');
    await choose('label.statusDraft');
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0].listStep).toEqual(['42', '43']);
    expect(createRequestListUrlState(mocks.apply.mock.lastCall![0]).listDraft).toBeUndefined();
  });

  it('keeps a shared draft shortcut visible, saveable and removable in Common', async () => {
    const value = pickRequestListUrlParams({
      listDraft: 'true',
      listCreatedQuickRange: 'last-year',
    });
    await render(false, value);
    await click('filter-trigger');
    expect(pills()).toContain('label.statusDraft');
    expect(document.querySelector('[data-testid="request-list-filter-add-listStep"]')).toBeNull();
    const options = mocks.select.mock.calls.findLast(
      ([props]) => props['data-testid'] === 'request-list-filter-listStep-field'
    )![0].data;
    expect(options).toEqual([{ value: '99', label: 'label.statusDraft' }]);
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(document.querySelector('[data-testid="request-list-filter-listStep-field"]')).toBeNull();
    await selectScope(RequestFilterScope.Common);
    expect(pills()).toContain('label.statusDraft');
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Tüm taslaklar'
    );
    await click('request-list-filter-save-button');
    const saved = mocks.createSavedFilter.mock.lastCall![0].Filter;
    expect(JSON.parse(saved)).toEqual({ listDraft: true, listCreatedQuickRange: 'last-year' });
    expect(parseSavedRequestListFilter(saved)?.value).toMatchObject({ listStep: ['99'] });
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0].listStep).toEqual(['99']);
    await click('filter-trigger');
    await click('request-list-filter-remove-listStep');
    await click('request-list-filter-apply-button');
    expect(createRequestListUrlState(mocks.apply.mock.lastCall![0]).listDraft).toBeUndefined();
    await click('filter-trigger');
    expect(document.querySelector('[data-testid="request-list-filter-listStep-field"]')).toBeNull();
  });

  it.each([
    [RequestFilterScope.SoftwareDevelopment, RequestFilterScope.Operational],
    [RequestFilterScope.Operational, RequestFilterScope.SoftwareDevelopment],
  ])('keeps an empty step field added only in scope %s, not %s', async (scope, otherScope) => {
    await render(false, { listIssueType: String(scope) });
    await click('filter-trigger');
    await click('request-list-filter-add-listStep');
    const getStep = () =>
      document.querySelector('[data-testid="request-list-filter-listStep-field"]');
    expect(getStep()).not.toBeNull();

    await selectScope(otherScope);
    expect(getStep()).toBeNull();
    expect(
      document.querySelector('[data-testid="request-list-filter-add-listStep"]')
    ).not.toBeNull();
    await selectScope(RequestFilterScope.Common);
    expect(getStep()).toBeNull();
    await selectScope(scope);
    expect(getStep()).not.toBeNull();
    await click('request-list-filter-remove-listStep');
    await selectScope(otherScope);
    await selectScope(scope);
    expect(getStep()).toBeNull();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="current-location"]')).toHaveTextContent(
      '/app/requests'
    );
  });

  it.each([RequestFilterScope.SoftwareDevelopment, RequestFilterScope.Operational])(
    'restores workflow step in scope %s after common hides it',
    async (scope) => {
      await render(false, { listIssueType: String(scope), listStep: ['42'] });
      await click('filter-trigger');
      const getStep = () =>
        document.querySelector('[data-testid="request-list-filter-listStep-field"]');
      expect(getStep()).not.toBeNull();
      const initialOptions = mocks.select.mock.calls.findLast(
        ([props]) => props['data-testid'] === 'request-list-filter-listStep-field'
      )![0].data;
      await selectScope(RequestFilterScope.Common);
      expect(getStep()).toBeNull();
      await selectScope(scope);
      expect(getStep()).not.toBeNull();
      expect(pills()).toContain('42');
      expect(
        mocks.select.mock.calls.findLast(
          ([props]) => props['data-testid'] === 'request-list-filter-listStep-field'
        )![0].data
      ).toEqual(initialOptions);
      expect(document.body.textContent).not.toContain(
        'label.requests.list.filters.softwareOnlyFieldDescription'
      );
      expect(document.body.textContent).not.toContain(
        'label.requests.list.filters.operationalOnlyFieldDescription'
      );
      await click('request-list-filter-apply-button');
      expect(mocks.apply).toHaveBeenCalledExactlyOnceWith({
        listIssueType: String(scope),
        listStep: ['42'],
      });
    }
  );

  it('does not apply or save a hidden workflow step from common', async () => {
    await render(false, {
      listIssueType: '1',
      listStep: ['42'],
      listCreatedQuickRange: 'last-year',
    });
    await click('filter-trigger');
    await selectScope(RequestFilterScope.Common);
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Ortak filtre'
    );
    await click('request-list-filter-save-button');
    expect(JSON.parse(mocks.createSavedFilter.mock.lastCall![0].Filter)).toEqual({
      listCreatedQuickRange: 'last-year',
    });
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0]).toEqual({ listCreatedQuickRange: 'last-year' });
  });

  it('loads steps by issue type and keeps YT/OT selections in separate drafts', async () => {
    const softwareSteps = {
      data: {
        Data: [
          { Id: 42, Key: 'Analiz', Order: 2 },
          { Id: 41, Key: 'Kapsam', Order: 1 },
        ],
      },
    };
    const operationalSteps = { data: { Data: [{ Id: 84, Key: 'Operasyon', Order: 1 }] } };
    mocks.stepDefinitions.mockImplementation((type) =>
      type === IssueTypeEnum.NUMBER_1 ? softwareSteps : operationalSteps
    );
    await render(false, { listIssueType: '1', listStep: ['42'] });
    await click('filter-trigger');
    const stepOptions = () =>
      mocks.select.mock.calls.findLast(
        ([props]) => props['data-testid'] === 'request-list-filter-listStep-field'
      )![0].data;
    expect(mocks.stepDefinitions).toHaveBeenLastCalledWith(IssueTypeEnum.NUMBER_1, {
      enabled: true,
      staleTime: 60_000,
    });
    expect(stepOptions()).toEqual([
      { value: '99', label: 'label.statusDraft' },
      { value: '41', label: 'Kapsam' },
      { value: '42', label: 'Analiz' },
    ]);
    expect(softwareSteps.data.Data.map(({ Id }) => Id)).toEqual([42, 41]);
    expect(pills()).toContain('Analiz');

    await selectScope(RequestFilterScope.Operational);
    expect(mocks.stepDefinitions).toHaveBeenLastCalledWith(IssueTypeEnum.NUMBER_2, {
      enabled: true,
      staleTime: 60_000,
    });
    expect(document.querySelector('[data-testid="request-list-filter-listStep-field"]')).toBeNull();
    await click('request-list-filter-add-listStep');
    expect(stepOptions()).toEqual([
      { value: '99', label: 'label.statusDraft' },
      { value: '84', label: 'Operasyon' },
    ]);
    expect(pills()).not.toContain('Analiz');
    await click('request-list-filter-listStep-field');
    await choose('Operasyon');
    expect(pills()).toContain('Operasyon');

    await selectScope(RequestFilterScope.Common);
    expect(mocks.stepDefinitions).toHaveBeenLastCalledWith(IssueTypeEnum.NUMBER_1, {
      enabled: false,
      staleTime: 60_000,
    });
    expect(document.querySelector('[data-testid="request-list-filter-listStep-field"]')).toBeNull();
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(pills()).toContain('Analiz');
    expect(pills()).not.toContain('Operasyon');
    await selectScope(RequestFilterScope.Operational);
    expect(pills()).toContain('Operasyon');
    expect(pills()).not.toContain('Analiz');
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Operasyon filtresi'
    );
    await click('request-list-filter-save-button');
    expect(JSON.parse(mocks.createSavedFilter.mock.lastCall![0].Filter)).toEqual({
      listIssueType: '2',
      listOperationalStep: ['84'],
    });
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0]).toEqual({ listIssueType: '2', listStep: ['84'] });
  });

  it("restores the other type's step field after removing it from the active type", async () => {
    await render(false, { listIssueType: '1', listStep: ['42'] });
    await click('filter-trigger');
    await selectScope(RequestFilterScope.Operational);
    await click('request-list-filter-add-listStep');
    await click('request-list-filter-remove-listStep');
    expect(document.querySelector('[data-testid="request-list-filter-listStep-field"]')).toBeNull();
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(
      document.querySelector('[data-testid="request-list-filter-listStep-field"]')
    ).not.toBeNull();
    expect(pills()).toContain('42');
    await click('request-list-filter-remove-listStep');
    await selectScope(RequestFilterScope.Operational);
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(document.querySelector('[data-testid="request-list-filter-listStep-field"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="request-list-filter-apply-button"]')
    ).toBeDisabled();
    await click('request-list-filter-apply-button');
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('preserves hidden scope drafts and shared input instances across segment changes', async () => {
    await render(false, {
      listIssueType: '1',
      listAssignedUser: ['user-1'],
      listCurrentProjectEffortFrom: '100',
      listCurrentProjectEffortTo: '350',
      listEstimatedAnalysisQuickRange: 'last-month',
    });
    await click('filter-trigger');
    const assigned = document.querySelector('#request-list-filter-listAssignedUser');
    const getEffort = () =>
      document.querySelector(
        '[data-testid="request-list-filter-listCurrentProjectEffortFrom-field-from"]'
      );
    expect(getEffort()).toHaveValue('100');
    await selectScope(RequestFilterScope.Operational);
    expect(getEffort()).toBeNull();
    expect(document.querySelector('#request-list-filter-listAssignedUser')).toBe(assigned);
    expect(pills()).toEqual(['Ayşe Yılmaz']);
    expect(
      document.querySelector('[data-testid="request-list-filter-add-listCurrentProjectEffortFrom"]')
    ).toBeNull();
    await selectScope(RequestFilterScope.Common);
    expect(getEffort()).toBeNull();
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(getEffort()).toHaveValue('100');
    expect(
      document.querySelector(
        '[data-testid="request-list-filter-listCurrentProjectEffortFrom-field-to"]'
      )
    ).toHaveValue('350');
    expect(
      document.querySelector(
        '[data-testid="request-list-filter-listEstimatedAnalysisFrom-field-quick-last-month"]'
      )
    ).toHaveAttribute('data-variant', 'filled');
    await selectScope(RequestFilterScope.Operational);
    await click('request-list-filter-apply-button');
    expect(mocks.apply.mock.lastCall![0]).toEqual({
      listIssueType: '2',
      listAssignedUser: ['user-1'],
      listWorkflowStatus: undefined,
    });
  });

  it.each([undefined, '-1'])(
    'opens missing/explicit common scope (%s) without showing software fields',
    async (listIssueType) => {
      await render(false, { listIssueType, listCurrentProjectEffortFrom: '100' });
      await click('filter-trigger');
      expect(
        document.querySelector('[data-testid="request-list-filter-scope"] input[value="-1"]')
      ).toBeChecked();
      expect(
        document.querySelector(
          '[data-testid="request-list-filter-listCurrentProjectEffortFrom-field-from"]'
        )
      ).toBeNull();
      await selectScope(RequestFilterScope.SoftwareDevelopment);
      expect(
        document.querySelector(
          '[data-testid="request-list-filter-listCurrentProjectEffortFrom-field-from"]'
        )
      ).toHaveValue('100');
    }
  );

  it.each(['1', '2', '-1'])(
    'saves and restores scope %s without persisting hidden fields',
    async (listIssueType) => {
      await render(false, {
        listIssueType: '1',
        listAssignedUser: ['user-1'],
        listEstimatedProjectEffortFrom: '100',
        listEstimatedProjectEffortTo: '350',
      });
      await click('filter-trigger');
      await selectScope(Number(listIssueType) as RequestFilterScope);
      await type(
        document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
        'Kapsam filtresi'
      );
      await click('request-list-filter-save-button');
      const payload = mocks.createSavedFilter.mock.lastCall![0];
      const parsed = parseSavedRequestListFilter(payload.Filter)!;
      expect(parsed.value.listIssueType).toBe(listIssueType === '-1' ? undefined : listIssueType);
      expect(parsed.value.listAssignedUser).toEqual(['user-1']);
      expect(parsed.value.listEstimatedProjectEffortFrom).toBe(
        listIssueType === '1' ? '100' : undefined
      );
      await act(async () => useModalStore.getState().closeModal('RequestFilter'));
      await act(async () =>
        useModalStore.getState().openModal('RequestFilter', {
          mode: requestFilterModes.edit,
          item: { Id: 'saved-scope', ...payload },
          value: parsed.value,
        })
      );
      expect(
        document.querySelector(
          `[data-testid="request-list-filter-scope"] input[value="${listIssueType}"]`
        )
      ).toBeChecked();
      expect(document.querySelector('[data-testid="request-list-filter-name-input"]')).toHaveValue(
        'Kapsam filtresi'
      );
    }
  );

  it('ignores hidden invalid ranges but still requires a visible populated field to save', async () => {
    await render(false, {
      listIssueType: '1',
      listEstimatedProjectEffortFrom: '350',
      listEstimatedProjectEffortTo: '100',
    });
    await click('filter-trigger');
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
    await selectScope(RequestFilterScope.Operational);
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
    await click('request-list-filter-add-listAssignedUser');
    await click('request-list-filter-listAssignedUser-field');
    await choose('Ayşe Yılmaz');
    expect(document.querySelector('[data-testid="request-list-filter-save-button"]')).toBeEnabled();
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Operasyonel'
    );
    await click('request-list-filter-save-button');
    expect(JSON.parse(mocks.createSavedFilter.mock.lastCall![0].Filter)).toEqual({
      listIssueType: '2',
      listAssignedUser: ['user-1'],
    });
    await click('request-list-filter-remove-listAssignedUser');
    await selectScope(RequestFilterScope.Common);
    expect(
      document.querySelector('[data-testid="request-list-filter-save-button"]')
    ).toBeDisabled();
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    expect(document.body).toHaveTextContent('message.numberRangeOrder');
  });

  it('adds a field only once and restores it to the available list when removed', async () => {
    await render(false, {});
    await act(async () => {
      useModalStore.getState().openModal('RequestFilter', { mode: requestFilterModes.create });
    });
    const addButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="request-list-filter-add-listAssignedUser"]'
    )!;
    expect(addButton).toHaveAttribute('aria-label');
    await act(async () => {
      addButton.click();
      addButton.click();
    });
    await act(async () => vi.advanceTimersByTime(0));
    const input = document.querySelector<HTMLInputElement>(
      '#request-list-filter-listAssignedUser'
    )!;
    expect(input).not.toBeNull();
    expect(document.querySelectorAll('#request-list-filter-listAssignedUser')).toHaveLength(1);
    expect(
      document.querySelector('[data-testid="request-list-filter-add-listAssignedUser"]')
    ).toBeNull();

    await act(async () => input.focus());
    await choose('Ayşe Yılmaz');
    await click('request-list-filter-remove-listAssignedUser');
    expect(document.querySelector('#request-list-filter-listAssignedUser')).toBeNull();
    await click('request-list-filter-add-listAssignedUser');
    expect(pills()).toEqual([]);
  });

  it('shows the empty available-fields state and restores entries after removal', async () => {
    await render(false, {});
    await act(async () => {
      useModalStore.getState().openModal('RequestFilter', { mode: requestFilterModes.create });
    });
    await selectScope(RequestFilterScope.SoftwareDevelopment);
    for (const { key } of requestListFilterConfigs) {
      await click(`request-list-filter-add-${key}`);
    }

    const availableFields = document.querySelector(
      '[data-testid="request-list-filter-fields-scroll"]'
    )!;
    expect(availableFields.querySelectorAll('button')).toHaveLength(0);
    expect(availableFields).toHaveTextContent('label.requests.list.filters.allAdded');

    await click('request-list-filter-remove-listNo');
    expect(availableFields.querySelectorAll('button')).toHaveLength(1);
    expect(availableFields).not.toHaveTextContent('label.requests.list.filters.allAdded');
  });

  it('preserves a new filter draft when another modal changes the stack', async () => {
    await render(false, {});
    await act(async () => {
      useModalStore.getState().openModal('RequestFilter', { mode: requestFilterModes.create });
    });
    await click('request-list-filter-add-listAssignedUser');
    const input = document.querySelector<HTMLInputElement>(
      '#request-list-filter-listAssignedUser'
    )!;
    await act(async () => input.focus());
    await choose('Ayşe Yılmaz');
    expect(pills()).toContain('Ayşe Yılmaz');

    await act(async () => {
      useModalStore.getState().openModal('RequestListSavedFilterDeleteConfirm', {
        item: { Id: 'filter-1', Name: 'Liste' },
      });
    });
    await act(async () => {
      useModalStore.getState().closeModal('RequestListSavedFilterDeleteConfirm');
    });

    expect(pills()).toContain('Ayşe Yılmaz');
    expect(document.querySelector('#request-list-filter-listAssignedUser')).toBe(input);
  });

  it.each([requestFilterModes.create, requestFilterModes.edit])(
    'does not close a reopened modal when a previous %s request completes',
    async (mode) => {
      const pendingSave = Promise.withResolvers<{ Data: { Id: string } }>();
      const persist =
        mode === requestFilterModes.edit ? mocks.updateSavedFilter : mocks.createSavedFilter;
      persist.mockReturnValueOnce(pendingSave.promise);
      await render(false, {});
      await act(async () => {
        useModalStore.getState().openModal(
          'RequestFilter',
          mode === requestFilterModes.edit
            ? {
                mode,
                item: { Id: 'filter-1', Name: 'İlk liste' },
                value: { listRequestPool: ['Pool A'] },
              }
            : { mode, value: { listRequestPool: ['Pool A'] } }
        );
      });
      const nameInput = document.querySelector<HTMLInputElement>(
        '[data-testid="request-list-filter-name-input"]'
      )!;
      await type(nameInput, 'İlk liste');
      await click(
        mode === requestFilterModes.edit
          ? 'request-list-filter-update-button'
          : 'request-list-filter-save-button'
      );
      expect(persist).toHaveBeenCalledTimes(1);

      await act(async () => useModalStore.getState().closeModal('RequestFilter'));
      await act(async () => {
        useModalStore.getState().openModal('RequestFilter', { mode: requestFilterModes.create });
      });
      const nextNameInput = document.querySelector<HTMLInputElement>(
        '[data-testid="request-list-filter-name-input"]'
      )!;
      await type(nextNameInput, 'Sonraki liste');
      await act(async () => pendingSave.resolve({ Data: { Id: 'filter-1' } }));

      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
      expect(nextNameInput.value).toBe('Sonraki liste');
    }
  );

  it.each([requestFilterModes.create, requestFilterModes.edit])(
    'clears only the draft fields and keeps the modal and name in %s mode',
    async (mode) => {
      await render(false, {});
      const value = { listAssignedUser: ['user-1'] };
      await act(async () => {
        useModalStore
          .getState()
          .openModal(
            'RequestFilter',
            mode === requestFilterModes.edit
              ? { mode, item: { Id: 'filter-1', Name: 'Liste' }, value }
              : { mode, value }
          );
      });
      const nameInput = document.querySelector<HTMLInputElement>(
        '[data-testid="request-list-filter-name-input"]'
      )!;
      await type(nameInput, 'Liste');
      expect(pills()).toEqual(['Ayşe Yılmaz']);
      expect(document.querySelector('[data-testid="request-list-filter-clear-button"]')).toBeNull();
      await click('request-list-filter-clear-fields-button');

      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(true);
      expect(nameInput.value).toBe('Liste');
      expect(document.querySelector('#request-list-filter-listAssignedUser')).toBeNull();
      expect(
        document.querySelector('[data-testid="request-list-filter-clear-fields-button"]')
      ).toBeDisabled();
      expect(mocks.reset).not.toHaveBeenCalled();
      expect(mocks.apply).not.toHaveBeenCalled();
      expect(mocks.createSavedFilter).not.toHaveBeenCalled();
      expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    }
  );

  it('saves a prefilled clone only after confirmation without storing a scope', async () => {
    await render(false, {});
    const value = {
      listAssignedUser: ['user-1'],
      listCreatedFrom: '2026-09-01',
      listSort: 'updated-desc',
    };
    await act(async () => {
      useModalStore.getState().openModal('RequestFilter', {
        mode: requestFilterModes.create,
        initialName: 'Tamamlananlar (Kopya)',
        initialDescription: 'Tamamlanan taleplerin takibi',
        value,
      });
    });
    expect(document.querySelector('[data-testid="request-list-filter-name-input"]')).toHaveValue(
      'Tamamlananlar (Kopya)'
    );
    expect(
      document.querySelector('[data-testid="request-list-filter-description-input"]')
    ).toHaveValue('Tamamlanan taleplerin takibi');
    expect(document.querySelector('[data-testid="request-list-filter-view-input"]')).toBeNull();
    expect(pills()).toEqual(['Ayşe Yılmaz']);
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="request-list-filter-update-button"]')).toBeNull();
    await click('request-list-filter-save-button');
    expect(mocks.createSavedFilter).toHaveBeenCalledExactlyOnceWith({
      Name: 'Tamamlananlar (Kopya)',
      Description: 'Tamamlanan taleplerin takibi',
      Filter: JSON.stringify(value),
      Screen: 'requests-list',
    });
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it('allows editing and cancelling a clone without changing the source or creating a record', async () => {
    await render(false, {});
    const value = { listAssignedUser: ['user-1'] };
    await act(async () => {
      useModalStore.getState().openModal('RequestFilter', {
        mode: requestFilterModes.create,
        initialName: 'Listem (Kopya)',
        value,
      });
    });
    await type(
      document.querySelector<HTMLInputElement>('[data-testid="request-list-filter-name-input"]')!,
      'Yeni filtre adı'
    );
    await act(async () =>
      document.querySelector<HTMLInputElement>('#request-list-filter-listAssignedUser')!.focus()
    );
    await choose('Mehmet Demir');
    expect(pills()).toEqual(['Ayşe Yılmaz', 'Mehmet Demir']);
    expect(value).toEqual({ listAssignedUser: ['user-1'] });
    await act(async () => useModalStore.getState().closeModal('RequestFilter'));
    expect(mocks.createSavedFilter).not.toHaveBeenCalled();
    expect(mocks.updateSavedFilter).not.toHaveBeenCalled();
    await act(async () =>
      useModalStore.getState().openModal('RequestFilter', { mode: requestFilterModes.create })
    );
    expect(document.querySelector('[data-testid="request-list-filter-name-input"]')).toHaveValue(
      ''
    );
    expect(pills()).toEqual([]);
  });

  it('creates a saved filter in create mode', async () => {
    await render(false, {});

    await act(async () => {
      useModalStore.getState().openModal('RequestFilter', {
        mode: 'create',
        value: { listRequestPool: ['Pool A'] },
      });
    });

    const nameInput = document.querySelector<HTMLInputElement>(
      '[data-testid="request-list-filter-name-input"]'
    )!;
    expect(nameInput.closest('[data-testid="request-list-filter-editor-scroll"]')).toBeNull();
    await type(nameInput, 'Yeni liste');
    const descriptionInput = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="request-list-filter-description-input"]'
    )!;
    expect(descriptionInput.tagName).toBe('TEXTAREA');
    expect(descriptionInput).toHaveAttribute('rows', '3');
    expect(descriptionInput).toHaveValue('');
    expect(descriptionInput).not.toBeRequired();
    expect(
      nameInput.compareDocumentPosition(descriptionInput) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    await type(descriptionInput, '  Havuz talepleri\nGünlük takip  ');
    await click('request-list-filter-save-button');

    expect(mocks.createSavedFilter).toHaveBeenCalledWith({
      Filter: JSON.stringify({ listRequestPool: ['Pool A'] }),
      Name: 'Yeni liste',
      Description: 'Havuz talepleri\nGünlük takip',
      Screen: 'requests-list',
    });
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
  });

  it.each(['Güncel açıklama', ''])(
    'prefills and updates a saved description to %j in edit mode',
    async (description) => {
      await render(false, {});

      await act(async () => {
        useModalStore.getState().openModal('RequestFilter', {
          item: {
            Id: 'filter-1',
            Name: 'Eski liste adı',
            Description: 'Eski açıklama',
            Screen: 'requests-list',
            Filter: JSON.stringify({ listRequestPool: ['Pool A'] }),
          },
          mode: 'edit',
          value: { listRequestPool: ['Pool A'] },
        });
      });

      const nameInput = document.querySelector<HTMLInputElement>(
        '[data-testid="request-list-filter-name-input"]'
      )!;
      expect(nameInput.value).toBe('Eski liste adı');
      expect(nameInput.closest('[data-testid="request-list-filter-editor-scroll"]')).toBeNull();
      expect(document.querySelector('[data-testid="request-list-filter-apply-button"]')).toBeNull();

      await type(nameInput, 'Güncel liste adı');
      const descriptionInput = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="request-list-filter-description-input"]'
      )!;
      expect(descriptionInput).toHaveValue('Eski açıklama');
      await type(descriptionInput, description);
      await click('request-list-filter-update-button');

      expect(mocks.updateSavedFilter).toHaveBeenCalledWith({
        Filter: JSON.stringify({ listRequestPool: ['Pool A'] }),
        Id: 'filter-1',
        Name: 'Güncel liste adı',
        Description: description,
        Screen: 'requests-list',
      });
      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
    }
  );
});
