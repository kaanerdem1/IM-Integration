import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createInstance } from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Modal, type ComboboxData } from '@mantine/core';
import type {
  UserDashboardGraphicCreateDto,
  UserDashboardGraphicResponseDto,
  UserDashboardGraphicUpdateDto,
} from '@/_api/_core/api-gen/types';
import { QueryKeys } from '@/_api/hooks/query-keys';
import { authEngine } from '@/_auth/engine';
import { formLabelStyle } from '@/_common/_props/form-label';
import { label as trLabels } from '@/_i18n/Tr/_label';
import { message as trMessages } from '@/_i18n/Tr/_message';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { DEFAULT_REQUEST_FILTER_ID } from '@/components/request-filter/_config/defaultRequestFilter';
import { useDashboardGraphicSelection } from '../_store/useDashboardGraphicSelection';
import type { DashboardGraphicModalOptions, DashboardGraphicWidgetDraft } from '../types';
import { Modal_DashboardGraphic } from './Modal_DashboardGraphic';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  message: vi.fn(),
  navigate: vi.fn(),
  fetchGraphic: vi.fn(),
  renderChart: vi.fn(),
  parametersError: false,
  filtersError: false,
  filters: { Data: [{ Id: 'filter-1', Name: 'Listem', Filter: '{"listNo":["REQ-1"]}' }] },
  parameters: {
    Data: {
      Items: [
        { Label: 'İş Birimi', Value: 'proje-lideri-is-birimi' },
        { Label: 'Talep Türü', Value: 'talep-turu' },
      ],
    },
  },
}));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/_api/_core/api-gen/user-dashboard-graphic', () => ({
  getUserDashboardGraphic: () => ({
    getApiUserDashboardGraphic: mocks.list,
    postApiUserDashboardGraphicCreate: mocks.create,
    putApiUserDashboardGraphicUpdate: mocks.update,
  }),
}));
vi.mock('@/_api/_core/api-gen/dashboard', () => ({
  getDashboard: () => ({ postApiDashboardGenericGraphics: mocks.fetchGraphic }),
}));
vi.mock('@/_api/hooks', async () => ({
  ...(await import('@/_api/hooks/dashboard.hooks')),
  ...(await import('@/_api/hooks/user-dashboard-graphic.hooks')),
  QueryKeys: (await import('@/_api/hooks/query-keys')).QueryKeys,
  useParameterDetail: () => ({
    data: mocks.parameters,
    isFetching: false,
    isPending: false,
    isError: mocks.parametersError,
  }),
}));
vi.mock('@/components/request-filter/_hooks/useSavedRequestFilterQuery', () => ({
  useSavedRequestFilterQuery: () => ({
    query: {
      data: mocks.filters,
      isFetching: false,
      isPending: false,
      isError: mocks.filtersError,
    },
  }),
}));
vi.mock('../charts/Visualization', () => ({
  RequestDistributionVisualization: ({
    chartType,
    legendPosition,
    model,
  }: {
    chartType: string;
    legendPosition: string;
    model: { data: { primaryMetric: string }[] };
  }) => {
    mocks.renderChart();
    return (
      <div data-testid="preview-chart" data-type={chartType} data-legend={legendPosition}>
        {model.data.map((item) => item.primaryMetric).join(',')}
      </div>
    );
  },
}));
vi.mock('@/_hooks/useMessage', () => ({ useMessage: () => ({ message: mocks.message }) }));
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  const SelectMock = ({
    id,
    data,
    value,
    defaultValue,
    variant,
    label,
    placeholder,
    withAsterisk,
    error,
    disabled,
    onChange,
    'data-path': path,
    'aria-label': ariaLabel,
  }: {
    id?: string;
    data: ComboboxData;
    value?: string | string[] | null;
    defaultValue?: string | null;
    variant?: string;
    label?: string;
    placeholder?: string;
    withAsterisk?: boolean;
    error?: ReactNode;
    disabled?: boolean;
    onChange: (value: string | string[] | null) => void;
    'data-path'?: string;
    'aria-label'?: string;
  }) => (
    <label>
      {label}
      {withAsterisk ? <span aria-hidden="true">*</span> : null}
      <select
        id={id}
        multiple={Array.isArray(value)}
        data-path={path}
        data-variant={variant}
        aria-label={ariaLabel}
        value={value === null ? '' : value}
        defaultValue={value === undefined ? (defaultValue ?? '') : undefined}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            Array.isArray(value)
              ? [...event.currentTarget.selectedOptions]
                  .map((option) => option.value)
                  .filter(Boolean)
              : event.currentTarget.value || null
          )
        }
      >
        <option value="">{placeholder}</option>
        {actual
          .getParsedComboboxData<string>(data)
          .flatMap((item) => ('group' in item ? item.items : [item]))
          .map((item) => (
            <option key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </option>
          ))}
      </select>
      {error ? <span>{error}</span> : null}
    </label>
  );
  return {
    ...actual,
    Select: SelectMock,
    MultiSelect: SelectMock,
  };
});

const firstGraphic: UserDashboardGraphicResponseDto = {
  Id: 'graphic-1',
  Name: 'Birim Grafiği',
  PrimaryFieldValue: 'proje-lideri-is-birimi',
  GraphicType: 'stacked-horizontal-bar',
};
const ModalHost = () => {
  const modals = useModalStore((state) => state.currentModals);
  return (
    <Modal.Stack>
      {modals.some((modal) => modal.type === 'DashboardGraphic') ? (
        <Modal_DashboardGraphic />
      ) : null}
    </Modal.Stack>
  );
};

describe('Modal_DashboardGraphic', () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let i18n: ReturnType<typeof createInstance>;

  beforeEach(async () => {
    i18n = createInstance();
    await i18n.init({
      lng: 'tr',
      fallbackLng: false,
      resources: structuredClone({ tr: { translation: { ...trLabels, ...trMessages } } }),
      react: { useSuspense: false },
    });
    vi.clearAllMocks();
    mocks.parametersError = false;
    mocks.filtersError = false;
    mocks.filters = { Data: [{ Id: 'filter-1', Name: 'Listem', Filter: '{"listNo":["REQ-1"]}' }] };
    mocks.list.mockReset().mockResolvedValue({ Data: [firstGraphic] });
    mocks.fetchGraphic
      .mockReset()
      .mockResolvedValue({ Data: [{ PrimaryMetric: 'Önizleme verisi', Count: 5 }] });
    mocks.create.mockReset().mockImplementation(async (input: UserDashboardGraphicCreateDto) => {
      const saved = { ...input, Id: 'created-id' };
      const previous = client.getQueryData<{ Data: UserDashboardGraphicResponseDto[] }>([
        QueryKeys.UserDashboardGraphicList,
      ]);
      mocks.list.mockResolvedValue({ Data: [...(previous?.Data ?? [firstGraphic]), saved] });
      return { Data: saved };
    });
    mocks.update.mockReset().mockImplementation(async (input: UserDashboardGraphicUpdateDto) => {
      return { Data: input };
    });
    useModalStore.setState({ currentModals: [] });
    useDashboardGraphicSelection.setState({ selectedId: null, draft: null });
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
    client.clear();
    useModalStore.setState({ currentModals: [] });
    container.remove();
  });
  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  };
  const render = async () => {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <I18nextProvider i18n={i18n}>
            <MantineProvider env="test">
              <ModalHost />
            </MantineProvider>
          </I18nextProvider>
        </QueryClientProvider>
      )
    );
    await flush();
    await flush();
  };
  const click = async (selector: string) => {
    const button = document.querySelector<HTMLButtonElement>(selector);
    expect(button, selector).not.toBeNull();
    await act(async () => button?.click());
    await flush();
  };
  const select = async (selector: string, value: string | string[]) => {
    const element = document.querySelector<HTMLSelectElement>(selector);
    expect(element, selector).not.toBeNull();
    await act(async () => {
      if (element) {
        if (Array.isArray(value)) {
          for (const option of element.options) {
            option.selected = value.includes(option.value);
          }
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await flush();
  };
  const submit = async () => {
    await act(async () =>
      document
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    await flush();
    await flush();
  };

  const cancel = () => click('[role="dialog"] button[data-variant="subtle"]');
  const setName = async (value: string) => {
    const input = document.querySelector<HTMLInputElement>('#dashboard-graphic-name');
    expect(input).not.toBeNull();
    await act(async () => {
      if (input) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          input,
          value
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  };
  const open = async (options: DashboardGraphicModalOptions) => {
    await act(async () => useModalStore.getState().openModal('DashboardGraphic', options));
    await flush();
  };
  const field = (name: string, value: string | string[]) =>
    select(`[role="dialog"] select[data-path="${name}"]`, value);
  const previewChart = () => document.querySelector('[data-testid="preview-chart"]');

  it('offers only a server-backed save for a new widget graphic', async () => {
    const onApply = vi.fn();
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply });
    expect(document.querySelector('#apply-dashboard-graphic')).toBeNull();
    expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(
      /^Kaydet ve Uygula$/
    );
    await submit();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('loads and links a saved chart without writing a duplicate graphic', async () => {
    const saved = {
      ...firstGraphic,
      Id: 'graphic-2',
      Name: 'Tür Grafiği',
      PrimaryFieldValue: 'talep-turu',
      SecondaryFieldValue: 'proje-lideri-is-birimi',
      UserFormFilterIds: ['filter-1'],
    };
    mocks.list.mockResolvedValue({ Data: [firstGraphic, saved] });
    const onApply = vi.fn();
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply });
    await select('#widget-saved-graphic', saved.Id);
    expect(document.querySelector('select[data-path="PrimaryFieldValue"]')).toHaveValue(
      'talep-turu'
    );
    expect(document.querySelector('select[data-path="SecondaryFieldValue"]')).toHaveValue(
      'proje-lideri-is-birimi'
    );
    expect(document.querySelector('select[data-path="UserFormFilterIds"]')).toHaveValue([
      'filter-1',
    ]);
    await submit();
    expect(onApply).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        PrimaryFieldValue: 'talep-turu',
        SecondaryFieldValue: 'proje-lideri-is-birimi',
        UserFormFilterIds: ['filter-1'],
      }),
      saved.Id
    );
    expect(client.getQueryData([QueryKeys.UserDashboardGraphicList])).toMatchObject({
      Data: [firstGraphic, saved],
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('restores the widget draft after Back and loads another saved chart directly', async () => {
    const other = { ...firstGraphic, Id: 'other', Name: 'Diğer grafik' };
    mocks.list.mockResolvedValue({ Data: [firstGraphic, other] });
    const onBack = vi.fn<(draft: DashboardGraphicWidgetDraft) => void>();
    const onApply = vi.fn();
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply, onBack });
    await select('#widget-saved-graphic', firstGraphic.Id!);
    await field('PrimaryFieldValue', 'talep-turu');
    await setName('Yeni taslak adı');
    await click('#back-widget-content');
    expect(onApply).not.toHaveBeenCalled();
    const draft = onBack.mock.calls[0][0];
    expect(draft.configuration.PrimaryFieldValue).toBe('talep-turu');
    expect(draft.baseline.PrimaryFieldValue).toBe('proje-lideri-is-birimi');
    expect(draft.sourceId).toBe(firstGraphic.Id);
    expect(draft.name).toBe('Yeni taslak adı');
    await open({ mode: 'widget', configuration: firstGraphic, draft, onApply, onBack });
    expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Yeni taslak adı');
    expect(document.querySelector('select[data-path="PrimaryFieldValue"]')).toHaveValue(
      'talep-turu'
    );
    await select('#widget-saved-graphic', other.Id);
    expect(document.querySelector('#widget-saved-graphic')).toHaveValue(other.Id);
    expect(document.querySelector('#dashboard-graphic-name')).toHaveValue(other.Name);
    expect(document.querySelector('select[data-path="PrimaryFieldValue"]')).toHaveValue(
      'proje-lideri-is-birimi'
    );
    expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(/^Uygula$/);
    await cancel();
    expect(onApply).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(['response', 'network'])(
    'blocks saving a widget graphic when the initial list fails (%s)',
    async (error) => {
      if (error === 'network') {
        mocks.list.mockRejectedValue(new Error('Unavailable'));
      } else {
        mocks.list.mockResolvedValue({ Error: { Message: 'Unavailable' } });
      }
      const onApply = vi.fn();
      await render();
      await open({ mode: 'widget', configuration: firstGraphic, onApply });
      expect(document.querySelector('#widget-saved-graphic')).toBeDisabled();
      expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
      await submit();
      expect(onApply).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    }
  );

  it('does not apply widget configuration when canceled', async () => {
    const onApply = vi.fn();
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply });
    await field('PrimaryFieldValue', 'talep-turu');
    await cancel();
    expect(onApply).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(false);
  });

  it('creates a saved chart from the widget and applies it without changing another selection', async () => {
    const onApply = vi.fn();
    useDashboardGraphicSelection.setState({ selectedId: 'other-graphic', draft: null });
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply });
    await setName('  Sütun grafiğim  ');
    await field('PrimaryFieldValue', 'talep-turu');
    await submit();
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        Name: 'Sütun grafiğim',
        PrimaryFieldValue: 'talep-turu',
      })
    );
    expect(mocks.update).not.toHaveBeenCalled();
    expect(onApply).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ PrimaryFieldValue: 'talep-turu' }),
      'created-id'
    );
    expect(onApply.mock.calls[0][0]).not.toHaveProperty('Name');
    expect(onApply.mock.calls[0][0]).not.toHaveProperty('Id');
    expect(useDashboardGraphicSelection.getState().selectedId).toBe('other-graphic');
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(false);
  });

  it('waits for the column after saving a chart and retries Apply without saving again', async () => {
    let finishApply!: (success: boolean) => void;
    const onApply = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            finishApply = resolve;
          })
      )
      .mockResolvedValueOnce(true);
    mocks.create.mockImplementationOnce(async (input: UserDashboardGraphicCreateDto) => {
      const saved = { ...input, Id: 'created-id' };
      mocks.list.mockResolvedValue({ Data: [firstGraphic, saved] });
      return { Data: saved };
    });
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply });
    await setName('Sütun grafiği');
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="preview-chart"]')).toHaveTextContent(
        'Önizleme verisi'
      )
    );
    const input = document.querySelector('#dashboard-graphic-name');
    const renders = mocks.renderChart.mock.calls.length;
    await submit();
    expect(onApply).toHaveBeenCalledOnce();
    expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
    expect(document.querySelector('#dashboard-graphic-name')).toBe(input);
    expect(mocks.renderChart).toHaveBeenCalledTimes(renders);
    await cancel();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);

    await act(async () => finishApply(false));
    expect(mocks.message).toHaveBeenCalledWith(
      trLabels.label.home.dashboard.graphicSavedApplyFailed,
      'error'
    );
    expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Sütun grafiği');
    await click('#save-dashboard-graphic');
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Object), 'created-id');
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(false);
  });

  it.each(['update', 'copy'] as const)(
    'reopens a widget source and performs an explicit %s',
    async (action) => {
      const saved = { ...firstGraphic, UserFormFilterIds: ['filter-1'] };
      const filterKey = [QueryKeys.UserFormFilterDetail, 'requests-list'];
      client.setQueryData(filterKey, mocks.filters);
      mocks.list.mockResolvedValue({ Data: [saved] });
      const onApply = vi.fn();
      const configuration = { ...firstGraphic, PrimaryFieldValue: 'talep-turu' };
      await render();
      await open({ mode: 'widget', configuration, sourceId: saved.Id!, onApply });
      expect(document.querySelector('#dashboard-graphic-name')).toHaveValue(saved.Name);
      expect(document.querySelector('select[data-path="PrimaryFieldValue"]')).toHaveValue(
        saved.PrimaryFieldValue
      );
      await field('PrimaryFieldValue', 'talep-turu');
      expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(
        /^Güncelle ve Uygula$/
      );
      expect(document.querySelector('#copy-dashboard-graphic')).toHaveTextContent(
        /^Farklı Kaydet ve Uygula$/
      );
      expect(document.querySelector('#copy-dashboard-graphic')).toHaveAttribute(
        'data-variant',
        'light'
      );
      if (action === 'copy') {
        // Let the modal's initial focus settle before checking validation's focus return.
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(document.querySelector('.mantine-Modal-close'))
        );
        await click('#copy-dashboard-graphic');
        expect(mocks.create).not.toHaveBeenCalled();
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(document.querySelector('#dashboard-graphic-name'))
        );
        act(() => document.querySelector<HTMLButtonElement>('#copy-dashboard-graphic')?.focus());
        await click('#copy-dashboard-graphic');
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(document.querySelector('#dashboard-graphic-name'))
        );
        await setName('Grafiğin kopyası');
        await click('#copy-dashboard-graphic');
        expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            Name: 'Grafiğin kopyası',
            PrimaryFieldValue: 'talep-turu',
          })
        );
        expect(mocks.update).not.toHaveBeenCalled();
      } else {
        await submit();
        expect(mocks.update).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            Id: saved.Id,
            Name: saved.Name,
            PrimaryFieldValue: 'talep-turu',
          })
        );
        expect(mocks.create).not.toHaveBeenCalled();
      }
      expect(onApply).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ PrimaryFieldValue: 'talep-turu' }),
        action === 'copy' ? 'created-id' : saved.Id
      );
      expect(client.getQueryState(filterKey)?.isInvalidated).toBe(action === 'copy');
    }
  );

  it.each(['link', 'update', 'copy'] as const)(
    'selects another chart in a linked column and performs %s',
    async (action) => {
      const other = { ...firstGraphic, Id: 'other-graphic', Name: 'Diğer grafik' };
      mocks.list.mockResolvedValue({ Data: [firstGraphic, other] });
      const onApply = vi.fn().mockResolvedValue(true);
      await render();
      await open({
        mode: 'widget',
        sourceId: firstGraphic.Id!,
        configuration: firstGraphic,
        onApply,
      });
      expect(document.querySelector('#widget-saved-graphic')).not.toBeDisabled();
      await select('#widget-saved-graphic', other.Id);
      expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(/^Uygula$/);
      expect(onApply).not.toHaveBeenCalled();
      if (action === 'copy') {
        await setName('Diğer grafiğin kopyası');
        await click('#copy-dashboard-graphic');
        expect(mocks.create).toHaveBeenCalledOnce();
        expect(mocks.update).not.toHaveBeenCalled();
        expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), 'created-id');
      } else {
        if (action === 'update') {
          await field('PrimaryFieldValue', 'talep-turu');
          expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(
            /^Güncelle ve Uygula$/
          );
        }
        await submit();
        expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), other.Id);
        expect(mocks.create).not.toHaveBeenCalled();
        if (action === 'update') {
          expect(mocks.update).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ Id: other.Id, PrimaryFieldValue: 'talep-turu' })
          );
        } else {
          expect(mocks.update).not.toHaveBeenCalled();
        }
      }
    }
  );

  it.each(['success', 'cancel', 'retry'] as const)(
    'creates and applies a copy in one action (%s)',
    async (action) => {
      const onApply =
        action === 'success'
          ? vi.fn().mockResolvedValue(true)
          : vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const onCancel = vi.fn();
      await render();
      await open({
        mode: 'widget',
        configuration: firstGraphic,
        sourceId: firstGraphic.Id!,
        onApply,
        onCancel,
      });
      await setName('Grafiğin kopyası');
      await click('#copy-dashboard-graphic');
      expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), 'created-id');
      expect(onCancel).not.toHaveBeenCalled();
      if (action !== 'success') {
        expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);
        expect(document.querySelector('#widget-saved-graphic')).toHaveValue('created-id');
        expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Grafiğin kopyası');
        expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(/^Uygula$/);
        expect(mocks.message).toHaveBeenCalledWith(
          trLabels.label.home.dashboard.graphicSavedApplyFailed,
          'error'
        );
        if (action === 'retry') {
          await submit();
          expect(onApply).toHaveBeenCalledTimes(2);
          expect(onApply).toHaveBeenLastCalledWith(expect.any(Object), 'created-id');
        } else {
          await cancel();
          expect(onApply).toHaveBeenCalledOnce();
          expect(onCancel).toHaveBeenCalledOnce();
        }
      }
      expect(mocks.create).toHaveBeenCalledOnce();
      expect(mocks.update).not.toHaveBeenCalled();
      expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(false);
    }
  );

  it.each([false, true])(
    'updates the primary action when saved values change and revert (linked: %s)',
    async (linked) => {
      await render();
      await open({
        mode: 'widget',
        configuration: firstGraphic,
        sourceId: linked ? firstGraphic.Id! : undefined,
        onApply: vi.fn(),
      });
      if (!linked) {
        await select('#widget-saved-graphic', firstGraphic.Id!);
      }
      const button = () => document.querySelector('#save-dashboard-graphic');
      expect(button()).toHaveTextContent(linked ? /^Güncelle ve Uygula$/ : /^Uygula$/);
      expect(button()?.hasAttribute('disabled')).toBe(linked);
      await setName('Güncel ad');
      expect(button()).toBeEnabled();
      expect(button()).toHaveTextContent(/^Güncelle ve Uygula$/);
      await setName(firstGraphic.Name!);
      expect(button()?.hasAttribute('disabled')).toBe(linked);
      expect(button()).toHaveTextContent(linked ? /^Güncelle ve Uygula$/ : /^Uygula$/);
      await field('PrimaryFieldValue', 'talep-turu');
      expect(button()).toBeEnabled();
      await field('PrimaryFieldValue', firstGraphic.PrimaryFieldValue!);
      expect(button()?.hasAttribute('disabled')).toBe(linked);
    }
  );

  it('restores saved draft changes and clears them when values return to the baseline', async () => {
    await render();
    await open({
      mode: 'widget',
      configuration: firstGraphic,
      sourceId: firstGraphic.Id!,
      onApply: vi.fn(),
      draft: {
        sourceId: firstGraphic.Id!,
        configuration: { ...firstGraphic, PrimaryFieldValue: 'talep-turu' },
        baseline: firstGraphic,
        name: firstGraphic.Name!,
      },
    });
    expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    await setName('Geçici ad');
    await setName(firstGraphic.Name!);
    expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    await field('PrimaryFieldValue', firstGraphic.PrimaryFieldValue!);
    expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
  });

  it.each([firstGraphic.Name, null, undefined])(
    'does not overwrite a renamed server record when reopening an unchanged draft (original name: %s)',
    async (originalName) => {
      mocks.list.mockResolvedValue({ Data: [{ ...firstGraphic, Name: 'Sunucudaki yeni ad' }] });
      await render();
      await open({
        mode: 'widget',
        configuration: firstGraphic,
        sourceId: firstGraphic.Id!,
        onApply: vi.fn(),
        draft: {
          sourceId: firstGraphic.Id!,
          configuration: firstGraphic,
          baseline: { ...firstGraphic, Name: originalName },
          name: originalName ?? '',
        },
      });
      expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
      await submit();
      expect(mocks.update).not.toHaveBeenCalled();
    }
  );

  it.each([false, true])(
    'does not write a chart for whitespace-only name changes (linked: %s)',
    async (linked) => {
      const onApply = vi.fn();
      await render();
      await open({
        mode: 'widget',
        configuration: firstGraphic,
        sourceId: linked ? firstGraphic.Id! : undefined,
        onApply,
      });
      if (!linked) {
        await select('#widget-saved-graphic', firstGraphic.Id!);
      }
      await setName(`  ${firstGraphic.Name}  `);
      await submit();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
      expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), firstGraphic.Id);
    }
  );

  it('creates a new linked chart and retries a failed replacement without creating another record', async () => {
    const onApply = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mocks.create.mockImplementationOnce(async (input: UserDashboardGraphicCreateDto) => {
      const saved = { ...input, Id: 'created-id' };
      mocks.list.mockResolvedValue({ Data: [firstGraphic, saved] });
      return { Data: saved };
    });
    await render();
    await open({
      mode: 'widget',
      sourceId: firstGraphic.Id!,
      configuration: firstGraphic,
      onApply,
    });
    await select('#widget-saved-graphic', '');
    await setName('Yeni sütun grafiği');
    await submit();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), 'created-id');
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);
    await submit();
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Object), 'created-id');
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(false);
  });

  it('does not relink when returning to the original chart and submitting unchanged', async () => {
    const other = { ...firstGraphic, Id: 'other-graphic', Name: 'Diğer grafik' };
    mocks.list.mockResolvedValue({ Data: [firstGraphic, other] });
    const onApply = vi.fn();
    await render();
    await open({
      mode: 'widget',
      sourceId: firstGraphic.Id!,
      configuration: firstGraphic,
      onApply,
    });
    await select('#widget-saved-graphic', other.Id);
    await select('#widget-saved-graphic', firstGraphic.Id!);
    expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(
      /^Güncelle ve Uygula$/
    );
    await submit();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('retries applying a saved update to the linked column after Back without updating twice', async () => {
    const onApply = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const onBack = vi.fn<(draft: DashboardGraphicWidgetDraft) => void>();
    const options = {
      mode: 'widget',
      configuration: firstGraphic,
      sourceId: firstGraphic.Id!,
      onApply,
      onBack,
    } as const;
    await render();
    await open(options);
    await field('PrimaryFieldValue', 'talep-turu');
    await submit();
    expect(onApply).toHaveBeenCalledOnce();
    await click('#back-widget-content');
    await open({ ...options, draft: onBack.mock.calls[0][0] });
    expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(/^Uygula$/);
    await submit();
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(onApply).toHaveBeenLastCalledWith(
      expect.objectContaining({ PrimaryFieldValue: 'talep-turu' }),
      firstGraphic.Id
    );
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(false);
  });

  it('allows replacing a deleted linked graphic without clearing the column', async () => {
    const other = { ...firstGraphic, Id: 'other-graphic', Name: 'Diğer grafik' };
    mocks.list.mockResolvedValue({ Data: [other] });
    const onApply = vi.fn().mockResolvedValue(true);
    await render();
    await open({
      mode: 'widget',
      sourceId: firstGraphic.Id!,
      configuration: firstGraphic,
      onApply,
    });
    expect(document.querySelector('#widget-saved-graphic')).not.toBeDisabled();
    expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
    await select('#widget-saved-graphic', other.Id);
    await submit();
    expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), other.Id);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('does not capture stale settings through Back while the linked chart is loading', async () => {
    let finish!: (value: { Data: UserDashboardGraphicResponseDto[] }) => void;
    mocks.list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const onBack = vi.fn();
    const onApply = vi.fn();
    await render();
    await open({
      mode: 'widget',
      sourceId: firstGraphic.Id!,
      configuration: { ...firstGraphic, PrimaryFieldValue: 'talep-turu' },
      onApply,
      onBack,
    });
    expect(document.querySelector('#back-widget-content')).toBeDisabled();
    await click('#back-widget-content');
    expect(onBack).not.toHaveBeenCalled();
    await act(async () => finish({ Data: [firstGraphic] }));
    await flush();
    expect(document.querySelector('#back-widget-content')).not.toBeDisabled();
    await click('#back-widget-content');
    expect(onBack).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        configuration: expect.objectContaining({
          PrimaryFieldValue: firstGraphic.PrimaryFieldValue,
        }),
        baseline: expect.objectContaining({ PrimaryFieldValue: firstGraphic.PrimaryFieldValue }),
      })
    );
    expect(mocks.update).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('does not write stale card settings when the linked graphic is submitted unchanged', async () => {
    const onApply = vi.fn();
    await render();
    await open({
      mode: 'widget',
      sourceId: firstGraphic.Id!,
      configuration: { ...firstGraphic, PrimaryFieldValue: 'talep-turu' },
      onApply,
    });
    expect(document.querySelector('select[data-path="PrimaryFieldValue"]')).toHaveValue(
      firstGraphic.PrimaryFieldValue
    );
    expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
    await submit();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);
  });

  it('keeps widget values and blocks duplicate saves and Back while saving fails', async () => {
    let finish!: (value: { Error: { Message: string } }) => void;
    mocks.create.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const onApply = vi.fn();
    const onBack = vi.fn();
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply, onBack });
    await setName('Korunacak taslak');
    await submit();
    await submit();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(document.querySelector('#back-widget-content')).toBeDisabled();
    expect(document.querySelector('#widget-saved-graphic')).toBeDisabled();
    await click('#back-widget-content');
    await cancel();
    expect(onBack).not.toHaveBeenCalled();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);
    await act(async () => finish({ Error: { Message: 'Kayıt başarısız' } }));
    await flush();
    expect(onApply).not.toHaveBeenCalled();
    expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Korunacak taslak');
    expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    expect(mocks.message).toHaveBeenCalledWith('Kayıt başarısız', 'error');
  });

  it.each(['save', 'copy'] as const)(
    'accepts only the first %s action when actions are clicked before validation finishes',
    async (firstAction) => {
      let finish!: (value: { Data: typeof firstGraphic }) => void;
      const pending = () =>
        new Promise((resolve) => {
          finish = resolve;
        });
      mocks.create.mockImplementation(pending);
      mocks.update.mockImplementation(pending);
      const onApply = vi.fn();
      await render();
      await open({
        mode: 'widget',
        configuration: firstGraphic,
        onApply,
      });
      await select('#widget-saved-graphic', firstGraphic.Id!);
      await setName('Grafik kopyası');
      const buttons = {
        save: document.querySelector<HTMLButtonElement>('#save-dashboard-graphic')!,
        copy: document.querySelector<HTMLButtonElement>('#copy-dashboard-graphic')!,
      };
      act(() => {
        buttons[firstAction].click();
        buttons.save.click();
        buttons.copy.click();
      });
      await flush();
      expect(mocks.create).toHaveBeenCalledTimes(firstAction === 'copy' ? 1 : 0);
      expect(mocks.update).toHaveBeenCalledTimes(firstAction === 'save' ? 1 : 0);
      expect(onApply).not.toHaveBeenCalled();
      const Id = firstAction === 'copy' ? 'created-id' : firstGraphic.Id;
      await act(async () => finish({ Data: { ...firstGraphic, Id, Name: 'Grafik kopyası' } }));
      await flush();
      expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), Id);
    }
  );

  it('blocks cancel, Back and source changes during validation, before mutation starts', async () => {
    mocks.create.mockImplementation(() => new Promise(() => {}));
    const onBack = vi.fn();
    const onCancel = vi.fn();
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply: vi.fn(), onBack, onCancel });
    await setName('Korunan grafik');
    const source = document.querySelector<HTMLSelectElement>('#widget-saved-graphic')!;
    act(() => {
      document.querySelector<HTMLButtonElement>('#save-dashboard-graphic')!.click();
      document.querySelector<HTMLButtonElement>('#back-widget-content')!.click();
      document
        .querySelector<HTMLButtonElement>('[role="dialog"] button[data-variant="subtle"]')
        ?.click();
      source.value = firstGraphic.Id!;
      source.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();
    expect(onBack).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Korunan grafik');
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);
  });

  it('refreshes dependent queries after saving without fetching the open chart picker again', async () => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const listKey = [QueryKeys.UserDashboardGraphicList];
    const accountListKey = [...listKey, 'current-user'];
    client.setQueryData(accountListKey, [firstGraphic]);
    mocks.create.mockResolvedValueOnce({ Error: { Message: 'Kayıt başarısız' } });
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply: vi.fn() });
    await setName('Grafiğim');
    await field('UserFormFilterIds', 'filter-1');
    await submit();
    expect(invalidate).not.toHaveBeenCalled();
    await submit();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [QueryKeys.UserFormFilterDetail] });
    expect(mocks.list).toHaveBeenCalledOnce();
    expect(client.getQueryData(listKey)).toMatchObject({
      Data: [firstGraphic, expect.objectContaining({ Id: 'created-id', Name: 'Grafiğim' })],
    });
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(accountListKey)?.isInvalidated).toBe(true);
  });

  it('refreshes the open chart picker when the save response only contains an ID', async () => {
    const saved = { ...firstGraphic, Id: 'created-id', Name: 'Sunucudaki ad' };
    mocks.create.mockImplementationOnce(async () => {
      mocks.list.mockResolvedValue({ Data: [firstGraphic, saved] });
      return { Data: { Id: saved.Id } };
    });
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply: vi.fn() });
    await setName('Grafiğim');
    await submit();
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(client.getQueryData([QueryKeys.UserDashboardGraphicList])).toMatchObject({
      Data: [firstGraphic, saved],
    });
  });

  it('does not cache or apply a chart whose save resolves after the account changes', async () => {
    let userId = 'account-a';
    vi.spyOn(authEngine, 'getSession').mockImplementation(() => ({
      jwt: 'test',
      me: { UserId: userId },
    }));
    let finish!: (result: { Data: UserDashboardGraphicResponseDto }) => void;
    mocks.create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const onApply = vi.fn();
    const listKey = [QueryKeys.UserDashboardGraphicList];
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, onApply });
    await setName('Eski hesabın grafiği');
    await submit();
    const newCatalog = { Data: [{ ...firstGraphic, Id: 'other-account-graphic' }] };
    userId = 'account-b';
    await act(async () => {
      client.setQueryData(listKey, newCatalog);
      finish({ Data: { ...firstGraphic, Id: 'old-account-graphic' } });
    });
    await flush();
    expect(client.getQueryData(listKey)).toEqual(newCatalog);
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(false);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('saves the validated snapshot even if an input event arrives before the pending render', async () => {
    await render();
    await open({
      mode: 'widget',
      configuration: firstGraphic,
      sourceId: firstGraphic.Id!,
      onApply: vi.fn(),
    });
    await setName('Doğrulanan kopya');
    const input = document.querySelector<HTMLInputElement>('#dashboard-graphic-name')!;
    act(() => {
      document.querySelector<HTMLButtonElement>('#copy-dashboard-graphic')!.click();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flush();
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ Name: 'Doğrulanan kopya' })
    );
  });

  it.each(['new', 'linked', 'copy'] as const)(
    'keeps name typing and list refreshes from rerendering the preview or fetching more data (%s)',
    async (mode) => {
      await render();
      await open({
        mode: 'widget',
        configuration: firstGraphic,
        sourceId: mode === 'new' ? undefined : firstGraphic.Id!,
        onApply: mode === 'copy' ? vi.fn().mockResolvedValueOnce(false) : vi.fn(),
      });
      if (mode === 'copy') {
        await setName('Grafiğin kopyası');
        await click('#copy-dashboard-graphic');
      }
      await vi.waitFor(() =>
        expect(document.querySelector('[data-testid="preview-chart"]')).toHaveTextContent(
          'Önizleme verisi'
        )
      );
      const input = document.querySelector('#dashboard-graphic-name');
      const renders = mocks.renderChart.mock.calls.length;
      const requests = mocks.fetchGraphic.mock.calls.length;
      await act(async () => {
        await client.invalidateQueries({ queryKey: [QueryKeys.UserDashboardGraphicList] });
      });
      await flush();
      expect(mocks.renderChart).toHaveBeenCalledTimes(renders);
      for (const name of ['G', 'Gr', 'Graf', 'Grafiğim']) {
        await setName(name);
      }
      expect(mocks.renderChart).toHaveBeenCalledTimes(renders);
      expect(mocks.fetchGraphic).toHaveBeenCalledTimes(requests);
      expect(document.querySelector('#dashboard-graphic-name')).toBe(input);
      await submit();
      expect(mode === 'new' ? mocks.create : mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ Name: 'Grafiğim' })
      );
    }
  );

  it.each(['network', 'response'])(
    'applies a successfully copied chart when the list refresh fails without saving again (%s)',
    async (error) => {
      const onApply = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const onBack = vi.fn<(draft: DashboardGraphicWidgetDraft) => void>();
      const options = {
        mode: 'widget',
        configuration: firstGraphic,
        sourceId: firstGraphic.Id!,
        onApply,
        onBack,
      } as const;
      await render();
      await open(options);
      mocks.create.mockImplementationOnce(async (input: UserDashboardGraphicCreateDto) => {
        if (error === 'network') {
          mocks.list.mockRejectedValue(new Error('Liste yenilenemedi'));
        } else {
          mocks.list.mockResolvedValue({ Error: { Message: 'Liste yenilenemedi' } });
        }
        return { Data: { ...input, Id: 'created-id' } };
      });
      await setName('Grafiğin kopyası');
      await click('#copy-dashboard-graphic');
      // A later catalog refresh can still fail while the saved copy is waiting to be applied.
      await act(async () =>
        client.invalidateQueries({ queryKey: [QueryKeys.UserDashboardGraphicList], exact: true })
      );
      await flush();
      expect(client.getQueryState([QueryKeys.UserDashboardGraphicList])?.status).toBe(
        error === 'network' ? 'error' : 'success'
      );
      if (error === 'response') {
        await click('#back-widget-content');
        await open({ ...options, draft: onBack.mock.calls[0][0] });
      }
      expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Grafiğin kopyası');
      expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(/^Uygula$/);
      expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
      expect(onApply).toHaveBeenCalledExactlyOnceWith(expect.any(Object), 'created-id');
      await submit();
      expect(onApply).toHaveBeenCalledTimes(2);
      expect(onApply).toHaveBeenLastCalledWith(expect.any(Object), 'created-id');
      expect(mocks.create).toHaveBeenCalledOnce();
      expect(mocks.update).not.toHaveBeenCalled();
      expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(false);
    }
  );

  it('does not overwrite an entered name when the saved chart list arrives later for a new widget', async () => {
    let finish!: (value: { Data: (typeof firstGraphic)[] }) => void;
    mocks.list.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const onApply = vi.fn();
    await render();
    await open({
      mode: 'widget',
      configuration: firstGraphic,
      onApply,
    });
    await setName('Benim adım');
    expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
    await act(async () => finish({ Data: [firstGraphic] }));
    await flush();
    expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Benim adım');
    expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(
      /^Kaydet ve Uygula$/
    );
  });

  it('blocks linking a deleted saved chart', async () => {
    const onApply = vi.fn();
    await render();
    await open({ mode: 'widget', configuration: firstGraphic, sourceId: 'deleted', onApply });
    expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
    await submit();
    expect(onApply).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('waits for the selected chart while a stale empty list is refreshing', async () => {
    mocks.list.mockImplementation(() => new Promise(() => {}));
    client.setQueryData([QueryKeys.UserDashboardGraphicList], { Data: [] });
    await client.invalidateQueries({ queryKey: [QueryKeys.UserDashboardGraphicList] });
    const onApply = vi.fn();
    await render();
    await open({
      mode: 'widget',
      configuration: firstGraphic,
      sourceId: firstGraphic.Id!,
      onApply,
    });
    expect(document.querySelector('#save-dashboard-graphic')).toBeDisabled();
    await submit();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('loads another saved chart from a linked column without applying it', async () => {
    const other = { ...firstGraphic, Id: 'other', Name: 'Diğer grafik' };
    mocks.list.mockResolvedValue({ Data: [firstGraphic, other] });
    const onApply = vi.fn();
    await render();
    await open({
      mode: 'widget',
      configuration: firstGraphic,
      sourceId: firstGraphic.Id!,
      onApply,
    });
    await select('#widget-saved-graphic', other.Id);
    expect(document.querySelector('#dashboard-graphic-name')).toHaveValue(other.Name);
    expect(onApply).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit', 'preview'] as const)(
    'keeps the built-in filter ID out of saved payloads in %s mode',
    async (mode) => {
      const item = { ...firstGraphic, Id: 'graphic-1' };
      await render();
      await open(
        mode === 'create'
          ? { mode }
          : mode === 'edit'
            ? { mode, item }
            : { mode, item, configuration: item }
      );
      expect(document.querySelector('select[data-path="UserFormFilterIds"]')).toHaveValue([
        DEFAULT_REQUEST_FILTER_ID,
      ]);
      await setName('Grafik');
      await field('UserFormFilterIds', 'filter-1');
      await field('UserFormFilterIds', DEFAULT_REQUEST_FILTER_ID);
      // Returning to the default reuses its preview cache instead of fetching it again.
      expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
      await submit();

      const save = mode === 'create' ? mocks.create : mocks.update;
      expect(save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ UserFormFilterIds: [] })
      );
      expect(JSON.stringify(save.mock.calls[0][0])).not.toContain(DEFAULT_REQUEST_FILTER_ID);
    }
  );

  it.each(['create', 'edit', 'preview'] as const)(
    'opens filter creation without submitting or resetting the chart in %s mode',
    async (mode) => {
      const item = { ...firstGraphic, Id: 'graphic-1' };
      await render();
      await open(
        mode === 'create'
          ? { mode }
          : mode === 'edit'
            ? { mode, item }
            : { mode, item, configuration: item }
      );
      await setName('Kaydedilmemiş grafik');
      await field('UserFormFilterIds', 'filter-1');
      const nameInput = document.querySelector('#dashboard-graphic-name');
      const previewRequests = mocks.fetchGraphic.mock.calls.length;
      const buttonSelector = `button[aria-label="${trLabels.label.root.filtersAndGraphs.addFilter}"]`;
      expect(document.querySelector(buttonSelector)).toHaveAttribute('type', 'button');

      await click(buttonSelector);

      expect(useModalStore.getState().currentModals.map((modal) => modal.type)).toEqual([
        'DashboardGraphic',
        'RequestFilter',
      ]);
      expect(useModalStore.getState().getModalOption('RequestFilter')).toEqual({ mode: 'create' });
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();

      await act(async () => useModalStore.getState().closeModal('RequestFilter'));
      await flush();

      expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);
      expect(document.querySelector('#dashboard-graphic-name')).toBe(nameInput);
      expect(nameInput).toHaveValue('Kaydedilmemiş grafik');
      expect(document.querySelector('select[data-path="UserFormFilterIds"]')).toHaveValue([
        'filter-1',
      ]);
      expect(mocks.fetchGraphic).toHaveBeenCalledTimes(previewRequests);
    }
  );

  it('aligns filter creation with the input top below its associated label', async () => {
    await render();
    await open({ mode: 'create' });
    const select = document.querySelector<HTMLSelectElement>(
      'select[data-path="UserFormFilterIds"]'
    )!;
    const button = document.querySelector(
      `button[aria-label="${trLabels.label.root.filtersAndGraphs.addFilter}"]`
    )!;
    const row = button.closest<HTMLElement>('.mantine-Group-root')!;
    const label = [...document.querySelectorAll('label')].find(
      (element) => element.htmlFor === select.id
    )!;

    expect(select.id).not.toBe('');
    expect(label).toHaveTextContent(trLabels.label.home.requestDistributionMyLists);
    expect(row).toContainElement(select);
    expect(row).not.toContainElement(label);
    expect(row.parentElement).toContainElement(label);
    expect(row.style.getPropertyValue('--group-align')).toBe('flex-start');
    expect(row.style.getPropertyValue('--group-wrap')).toBe('nowrap');
  });

  it('disables filter creation while saving the chart', async () => {
    let resolveCreate!: (response: { Data: UserDashboardGraphicResponseDto }) => void;
    mocks.create.mockImplementationOnce(() => new Promise((resolve) => (resolveCreate = resolve)));
    await render();
    await open({ mode: 'create' });
    await setName('Grafik');
    await submit();

    const buttonSelector = `button[aria-label="${trLabels.label.root.filtersAndGraphs.addFilter}"]`;
    expect(document.querySelector(buttonSelector)).toBeDisabled();
    await click(buttonSelector);
    expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);

    await act(async () => resolveCreate({ Data: { ...firstGraphic, Id: 'created-id' } }));
    await flush();
  });

  it('creates a chart without loading the saved list', async () => {
    await render();
    await open({ mode: 'create' });
    expect(document.querySelector('[role="dialog"] input[type="checkbox"]')).toBeNull();
    expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    await setName('İlk Grafiğim');
    await field('GraphicType', 'donut');
    await submit();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ Name: 'İlk Grafiğim', GraphicType: 'donut' })
    );
  });

  it.each(['create', 'edit', 'preview'] as const)(
    'automatically previews valid settings in %s mode without saving or applying',
    async (mode) => {
      await render();
      await open(
        mode === 'create'
          ? { mode }
          : mode === 'edit'
            ? { mode, item: { ...firstGraphic, Id: 'graphic-1' } }
            : {
                mode,
                item: { ...firstGraphic, Id: 'graphic-1' },
                configuration: firstGraphic,
              }
      );
      expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
      expect(previewChart()).toHaveTextContent('Önizleme verisi');
      expect(document.querySelector('select[data-path="LegendPosition"]')).toHaveValue('top');
      expect(
        document.querySelector('[data-testid="dashboard-graphic-preview"] section')
      ).toHaveAccessibleName(trLabels.label.home.graphicPreview);
      expect(
        document.querySelector(`button[aria-label="${trLabels.label.home.graphicPreview}"]`)
      ).toBeNull();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
      expect(useDashboardGraphicSelection.getState().draft).toBeNull();
      expect(useDashboardGraphicSelection.getState().selectedId).toBeNull();
    }
  );

  it.each(['create', 'edit', 'preview'] as const)(
    'sends legend position when saving in %s mode',
    async (mode) => {
      const item = { ...firstGraphic, Id: 'graphic-1', LegendPosition: 'left' };
      await render();
      await open(
        mode === 'create'
          ? { mode }
          : mode === 'edit'
            ? { mode, item }
            : { mode, item, configuration: item }
      );
      expect(document.querySelector('select[data-path="LegendPosition"]')).toHaveValue(
        mode === 'create' ? 'top' : 'left'
      );
      await setName('Grafik');
      await field('LegendPosition', 'bottom');
      expect(previewChart()).toHaveAttribute('data-legend', 'bottom');
      expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
      await submit();
      const save = mode === 'create' ? mocks.create : mocks.update;
      expect(save).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          Name: 'Grafik',
          LegendPosition: 'bottom',
        })
      );
    }
  );

  it.each(['create', 'edit'] as const)(
    'invalidates saved filter dependencies only once after saving a chart in %s mode',
    async (mode) => {
      const queryKey = [QueryKeys.UserFormFilterDetail, 'requests-list'];
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      client.setQueryData(queryKey, mocks.filters);
      await render();
      await open(
        mode === 'create'
          ? { mode }
          : { mode, item: { ...firstGraphic, Id: 'graphic-1', UserFormFilterIds: ['filter-1'] } }
      );
      await setName('Grafik');
      await field('UserFormFilterIds', mode === 'create' ? 'filter-1' : '');
      expect(client.getQueryState(queryKey)?.isInvalidated).toBe(false);
      expect(invalidate).not.toHaveBeenCalled();
      await submit();
      await render();
      expect(mode === 'create' ? mocks.create : mocks.update).toHaveBeenCalledOnce();
      expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true);
      expect(
        invalidate.mock.calls.filter(
          ([filters]) => filters?.queryKey?.[0] === QueryKeys.UserFormFilterDetail
        )
      ).toHaveLength(1);
    }
  );

  it.each(['create', 'edit'] as const)(
    'does not invalidate saved filters or repeat a failed chart save in %s mode',
    async (mode) => {
      const save = mode === 'create' ? mocks.create : mocks.update;
      save.mockRejectedValueOnce(new Error('save failed'));
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      await render();
      await open(
        mode === 'create' ? { mode } : { mode, item: { ...firstGraphic, Id: 'graphic-1' } }
      );
      await setName('Grafik');
      await submit();
      await render();

      expect(save).toHaveBeenCalledOnce();
      expect(invalidate).not.toHaveBeenCalled();
      expect(useModalStore.getState().isModalOpen('DashboardGraphic')).toBe(true);
    }
  );

  it.each(['edit', 'preview'] as const)(
    'saves a copy without changing the source in %s mode',
    async (mode) => {
      const item = {
        ...firstGraphic,
        Id: 'graphic-1',
        LegendPosition: 'right',
      };
      client.setQueryData([QueryKeys.UserDashboardGraphicList], { Data: [item] });
      await render();
      await open(mode === 'edit' ? { mode, item } : { mode, item, configuration: item });
      await setName('Kopya');
      await field('GraphicType', 'donut');
      await field('LegendPosition', 'bottom');
      await click('#copy-dashboard-graphic');
      expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          Name: 'Kopya',
          GraphicType: 'donut',
          LegendPosition: 'bottom',
        })
      );
      expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('Id');
      expect(mocks.update).not.toHaveBeenCalled();
      expect(client.getQueryData([QueryKeys.UserDashboardGraphicList])).toMatchObject({
        Data: [item, expect.objectContaining({ Id: 'created-id' })],
      });
    }
  );

  it('validates an empty legend position before saving or applying', async () => {
    const item = { ...firstGraphic, Id: 'graphic-1' };
    await render();
    await open({ mode: 'preview', item, configuration: item });
    await field('LegendPosition', '');
    await submit();
    await click('#apply-dashboard-graphic');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(useDashboardGraphicSelection.getState().draft).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(
      trMessages.message.required_
    );
  });

  it.each(['', '   '])('requires a non-blank name for Save and Save As (%j)', async (name) => {
    const item = { ...firstGraphic, Id: 'graphic-1' };
    await render();
    await open({ mode: 'preview', item, configuration: item });
    await setName(name);
    await submit();
    await click('#copy-dashboard-graphic');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(
      trMessages.message.required_
    );

    await click('#apply-dashboard-graphic');
    expect(useDashboardGraphicSelection.getState().draft).toMatchObject({
      PrimaryFieldValue: item.PrimaryFieldValue,
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ['PrimaryFieldValue', 'removed-field', trLabels.label.home.savedGraphicInvalid],
    ['SecondaryFieldValue', 'removed-field', trLabels.label.home.savedGraphicInvalid],
    ['SecondaryFieldValue', 'proje-lideri-is-birimi', trLabels.label.home.savedGraphicInvalid],
    [
      'UserFormFilterIds',
      'removed-filter',
      trLabels.label.requests.list.filters.savedFilterParseError,
    ],
  ])('rejects invalid %s (%s) for Save, Save As and Apply', async (name, value, error) => {
    const item = {
      ...firstGraphic,
      Id: 'graphic-1',
      [name]: name === 'UserFormFilterIds' ? [value] : value,
    };
    await render();
    await open({ mode: 'preview', item, configuration: item });
    await setName('Kopya');
    await submit();
    await click('#copy-dashboard-graphic');
    await click('#apply-dashboard-graphic');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(useDashboardGraphicSelection.getState().draft).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(error);
  });

  it.each(['create', 'edit', 'preview'] as const)(
    'preserves the form without adding a duplicate notification when create fails in %s mode',
    async (mode) => {
      mocks.create.mockRejectedValueOnce(new Error('Filtre bulunamadı.'));
      await render();
      await open(
        mode === 'create'
          ? { mode }
          : mode === 'edit'
            ? { mode, item: { ...firstGraphic, Id: 'graphic-1' } }
            : {
                mode,
                item: { ...firstGraphic, Id: 'graphic-1' },
                configuration: firstGraphic,
              }
      );
      await setName('Yeni Grafik');
      await field('UserFormFilterIds', 'filter-1');
      if (mode === 'create') {
        await submit();
      } else {
        await click('#copy-dashboard-graphic');
      }
      expect(mocks.create).toHaveBeenCalledTimes(1);
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.message).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Yeni Grafik');
      expect(document.querySelector('select[data-path="UserFormFilterIds"]')).toHaveValue([
        'filter-1',
      ]);
      expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    }
  );

  it.each(['edit', 'preview'] as const)(
    'preserves the form without adding a duplicate notification when update fails in %s mode',
    async (mode) => {
      mocks.update.mockRejectedValueOnce(new Error('Filtre bulunamadı.'));
      const item = { ...firstGraphic, Id: 'graphic-1' };
      await render();
      await open(mode === 'edit' ? { mode, item } : { mode, item, configuration: item });
      await setName('Güncellenen Grafik');
      await field('UserFormFilterIds', 'filter-1');
      await submit();

      expect(mocks.update).toHaveBeenCalledTimes(1);
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.message).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      expect(document.querySelector('#dashboard-graphic-name')).toHaveValue('Güncellenen Grafik');
      expect(document.querySelector('select[data-path="UserFormFilterIds"]')).toHaveValue([
        'filter-1',
      ]);
      expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    }
  );

  it('updates breakdowns and filters automatically but reuses data for type and name changes', async () => {
    await render();
    await open({ mode: 'create' });
    await field('SecondaryFieldValue', 'talep-turu');
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
    expect(mocks.fetchGraphic.mock.lastCall?.[0]).toHaveProperty(
      'SecondaryFieldValue',
      'talep-turu'
    );
    await field('UserFormFilterIds', 'filter-1');
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(3);
    expect(mocks.fetchGraphic.mock.lastCall?.[0]).toMatchObject({
      Filter: { Field: 'No', Operator: 'in', Value: ['REQ-1'] },
      All: true,
    });
    await field('GraphicType', 'donut');
    await setName('Ad değişikliği');
    expect(previewChart()).toHaveAttribute('data-type', 'donut');
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(3);
    await field('SecondaryFieldValue', '');
    await field('PrimaryFieldValue', 'talep-turu');
    expect(mocks.fetchGraphic.mock.lastCall?.[0]).toHaveProperty('PrimaryFieldValue', 'talep-turu');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('changes legend placement locally without another data request or home draft', async () => {
    await render();
    await open({
      mode: 'preview',
      item: { ...firstGraphic, Id: 'graphic-1' },
      configuration: firstGraphic,
    });
    await field('LegendPosition', 'bottom');
    expect(previewChart()).toHaveAttribute('data-legend', 'bottom');
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
    expect(useDashboardGraphicSelection.getState().draft).toBeNull();
  });

  it.each(['PrimaryFieldValue', 'GraphicType'])(
    'shows guidance instead of requesting data when %s is missing',
    async (fieldName) => {
      await render();
      await open({ mode: 'edit', item: { ...firstGraphic, Id: 'graphic-1', [fieldName]: null } });
      expect(mocks.fetchGraphic).not.toHaveBeenCalled();
      expect(previewChart()).toBeNull();
      expect(document.querySelector('[data-testid="dashboard-graphic-preview"]')).toHaveTextContent(
        trLabels.label.home.graphicPreviewEmpty
      );
    }
  );

  it('does not label a failed preview as empty and shows results after query recovery', async () => {
    mocks.fetchGraphic.mockRejectedValueOnce(new Error('preview failed'));
    mocks.fetchGraphic.mockResolvedValueOnce({ Data: [] });
    await render();
    await open({ mode: 'create' });
    const preview = document.querySelector('[data-testid="dashboard-graphic-preview"]');
    expect(previewChart()).toBeNull();
    expect(mocks.message).not.toHaveBeenCalled();
    expect(preview).not.toHaveTextContent(trLabels.label.home.requestDistributionEmpty);
    expect(preview?.querySelector('[aria-busy]')).toBeEmptyDOMElement();
    expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    await act(async () => client.invalidateQueries({ queryKey: ['dashboard-generic-graphics'] }));
    await flush();
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
    expect(preview).toHaveTextContent(trLabels.label.home.requestDistributionEmpty);
    expect(previewChart()).toBeNull();
    expect(preview?.querySelector('button')).toBeNull();
  });

  it.each(['success', 'error'])(
    'ignores late %s from a previous preview configuration',
    async (outcome) => {
      let finishPrevious: (() => void) | undefined;
      mocks.fetchGraphic.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finishPrevious = () => {
              if (outcome === 'error') {
                reject(new Error('old preview'));
              } else {
                resolve({ Data: [{ PrimaryMetric: 'Eski', Count: 1 }] });
              }
            };
          })
      );
      await render();
      await open({ mode: 'create' });
      expect(
        document.querySelector('[data-testid="dashboard-graphic-preview"] [aria-busy="true"]')
      ).not.toBeNull();
      await field('PrimaryFieldValue', 'talep-turu');
      expect(previewChart()).toHaveTextContent('Önizleme verisi');
      await act(async () => finishPrevious?.());
      await flush();
      expect(previewChart()).toHaveTextContent('Önizleme verisi');
      expect(
        document.querySelector('[data-testid="dashboard-graphic-preview"] [role="alert"]')
      ).toBeNull();
      expect(mocks.message).not.toHaveBeenCalled();
      expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
    }
  );

  it('uses the same outlined variant for every graphic form field', async () => {
    await render();
    await open({
      mode: 'preview',
      item: { ...firstGraphic, Id: 'graphic-1' },
      configuration: firstGraphic,
    });
    const fields = document.querySelectorAll('[role="dialog"] [data-path]:not([type="checkbox"])');
    expect(fields).toHaveLength(6);
    fields.forEach((field) => expect(field).toHaveAttribute('data-variant', 'default'));
  });

  it.each([
    ['preview', 'parametersError'],
    ['preview', 'filtersError'],
    ['create', 'parametersError'],
    ['create', 'filtersError'],
    ['edit', 'parametersError'],
    ['edit', 'filtersError'],
  ] as const)(
    'keeps invalid submission blocked without a local error message in %s mode on %s',
    async (mode, error) => {
      mocks[error] = true;
      await render();
      await open(
        mode === 'preview'
          ? {
              mode,
              item: { ...firstGraphic, Id: 'graphic-1' },
              configuration: firstGraphic,
            }
          : mode === 'edit'
            ? { mode, item: { ...firstGraphic, Id: 'graphic-1' } }
            : { mode }
      );
      const dialog = document.querySelector('[role="dialog"]')!;
      expect(dialog.querySelector('form .mantine-ScrollArea-viewport')).toHaveTextContent(/^$/);
      expect(dialog.querySelector('[data-path]')).toBeNull();
      expect(dialog.querySelector('#save-dashboard-graphic')).toBeNull();
      expect(dialog.querySelector('#apply-dashboard-graphic')).toBeNull();
      expect(dialog.querySelector('#copy-dashboard-graphic')).toBeNull();
      expect(mocks.fetchGraphic).not.toHaveBeenCalled();
      if (mode === 'preview') {
        expect(
          dialog.querySelector('[data-testid="dashboard-graphic-manage-button"]')
        ).toBeEnabled();
      }
      await submit();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
      await cancel();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    }
  );

  it('hides the form on an options error and restores the draft after recovery', async () => {
    await render();
    await open({
      mode: 'preview',
      item: { ...firstGraphic, Id: 'graphic-1' },
      configuration: firstGraphic,
    });
    await setName('Taslak Grafik');
    await field('GraphicType', 'line');
    mocks.filtersError = true;
    await render();
    expect(document.querySelector('[role="dialog"] [data-path]')).toBeNull();
    expect(document.querySelector('#save-dashboard-graphic')).toBeNull();
    await submit();
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.filtersError = false;
    await render();
    expect(document.querySelector<HTMLInputElement>('#dashboard-graphic-name')?.value).toBe(
      'Taslak Grafik'
    );
    expect(
      document.querySelector<HTMLSelectElement>('select[data-path="GraphicType"]')?.value
    ).toBe('line');
    expect(document.querySelector('#save-dashboard-graphic')).toBeEnabled();
    expect(document.querySelector('[role="dialog"] [role="alert"]')).toBeNull();
    expect(previewChart()).toHaveTextContent('Önizleme verisi');
  });

  it('renders short Turkish action labels without unresolved interpolation placeholders', async () => {
    await render();
    await open({
      mode: 'preview',
      item: { ...firstGraphic, Id: 'graphic-1' },
      configuration: firstGraphic,
    });
    expect(document.querySelector('#save-dashboard-graphic')?.textContent).toBe('Güncelle');
    expect(document.querySelector('#apply-dashboard-graphic')?.textContent).toBe('Uygula');
    expect(document.querySelector('#copy-dashboard-graphic')?.textContent).toBe('Farklı Kaydet');
    expect(
      document.querySelector('[data-testid="dashboard-graphic-manage-button"]')?.textContent
    ).toBe('Yönet');
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('{{');
    await act(async () => useModalStore.getState().closeModal('DashboardGraphic'));
    await open({ mode: 'edit', item: { ...firstGraphic, Id: 'graphic-1' } });
    expect(document.querySelector('#save-dashboard-graphic')).toHaveTextContent(/^Güncelle$/);
    expect(document.querySelector('#copy-dashboard-graphic')).toHaveTextContent(/^Farklı Kaydet$/);
    expect(document.querySelector('#apply-dashboard-graphic')).toBeNull();
    await act(async () => useModalStore.getState().closeModal('DashboardGraphic'));
    await open({ mode: 'create' });
    expect(document.querySelector('#save-dashboard-graphic')?.textContent).toBe('Kaydet');
    const filterSelect = document.querySelector<HTMLSelectElement>(
      'select[data-path="UserFormFilterIds"]'
    )!;
    expect(filterSelect).toHaveAttribute('aria-label', 'Filtrelerim');
    expect([...filterSelect.labels!].map((label) => label.textContent)).toContain('Filtrelerim');
    const filterLabel = document.querySelector<HTMLLabelElement>(
      `label[for="${filterSelect.id}"]`
    )!;
    expect(filterLabel.style.color).toBe(formLabelStyle.color);
    expect(filterLabel).toHaveStyle({
      fontSize: formLabelStyle.fontSize,
      fontWeight: formLabelStyle.fontWeight,
    });
    expect(document.querySelector('[role="dialog"] input[type="checkbox"]')).toBeNull();
  });

  it.each([undefined, null, ''])(
    'edits a list record using service-compatible empty values: %s',
    async (value) => {
      const item = {
        ...firstGraphic,
        Id: 'graphic-1',
        SecondaryFieldValue: value,
        UserFormFilterIds: value == null ? value : [],
      };
      await render();
      await open({ mode: 'edit', item });
      expect(document.querySelector('#apply-dashboard-graphic')).toBeNull();
      expect(document.querySelector('[data-testid="dashboard-graphic-manage-button"]')).toBeNull();
      expect(document.querySelector<HTMLInputElement>('#dashboard-graphic-name')?.value).toBe(
        item.Name
      );
      await setName('Yeni Ad');
      await field('GraphicType', 'line');
      await submit();
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: item.Id,
          Name: 'Yeni Ad',
          GraphicType: 'line',
          UserFormFilterIds: [],
          SecondaryFieldValue: null,
          SecondaryEmptyLabel: null,
        })
      );
      expect(JSON.stringify(mocks.update.mock.calls[0][0])).toContain('"UserFormFilterIds":[]');
      expect(mocks.create).not.toHaveBeenCalled();
      expect(useDashboardGraphicSelection.getState().selectedId).toBeNull();
    }
  );

  it('blocks invalid saved filters but allows clearing them to repair a record', async () => {
    const item = { ...firstGraphic, Id: 'graphic-1', UserFormFilterIds: ['missing-filter'] };
    await render();
    await open({ mode: 'edit', item });
    expect(mocks.fetchGraphic).not.toHaveBeenCalled();
    await submit();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(
      trLabels.label.requests.list.filters.savedFilterParseError
    );
    await field('UserFormFilterIds', '');
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
    await submit();
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it.each(['create', 'edit', 'preview'] as const)(
    'saves and restores multiple filters in %s mode',
    async (mode) => {
      mocks.filters.Data.push({ Id: 'filter-2', Name: 'Diğer', Filter: '{"listNo":["REQ-2"]}' });
      const item = {
        ...firstGraphic,
        Id: 'graphic-1',
        UserFormFilterIds: ['filter-1', 'filter-2'],
      };
      await render();
      await open(
        mode === 'create'
          ? { mode }
          : mode === 'edit'
            ? { mode, item }
            : { mode, item, configuration: item }
      );
      if (mode === 'create') {
        await field('UserFormFilterIds', ['filter-1', 'filter-2']);
      }
      expect(document.querySelector('select[data-path="UserFormFilterIds"]')).toHaveValue([
        'filter-1',
        'filter-2',
      ]);
      expect(mocks.fetchGraphic.mock.lastCall?.[0].Filter).toMatchObject({
        Logic: 'or',
        Filters: [
          expect.objectContaining({ Field: 'No', Value: ['REQ-1'] }),
          expect.objectContaining({ Field: 'No', Value: ['REQ-2'] }),
        ],
      });
      await setName('Çoklu Grafik');
      await submit();
      expect(mode === 'create' ? mocks.create : mocks.update).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ UserFormFilterIds: ['filter-1', 'filter-2'] })
      );
    }
  );

  it.each(['copy', 'apply'] as const)(
    'preserves all selected IDs when using %s',
    async (action) => {
      mocks.filters.Data.push({ Id: 'filter-2', Name: 'Diğer', Filter: '{"listNo":["REQ-2"]}' });
      const item = {
        ...firstGraphic,
        Id: 'graphic-1',
        UserFormFilterIds: ['filter-1', 'filter-2'],
      };
      await render();
      await open({ mode: 'preview', item, configuration: item });
      await setName('Kopya');
      await click(action === 'copy' ? '#copy-dashboard-graphic' : '#apply-dashboard-graphic');
      if (action === 'copy') {
        expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ UserFormFilterIds: ['filter-1', 'filter-2'], Name: 'Kopya' })
        );
      } else {
        expect(useDashboardGraphicSelection.getState().draft?.UserFormFilterIds).toEqual([
          'filter-1',
          'filter-2',
        ]);
        expect(mocks.create).not.toHaveBeenCalled();
      }
      expect(mocks.update).not.toHaveBeenCalled();
    }
  );

  it('blocks every save action when one selected filter is missing without discarding the valid selection', async () => {
    const item = { ...firstGraphic, Id: 'graphic-1', UserFormFilterIds: ['filter-1', 'missing'] };
    await render();
    await open({ mode: 'preview', item, configuration: item });
    expect(mocks.fetchGraphic).not.toHaveBeenCalled();
    await setName('Kopya');
    await submit();
    await click('#copy-dashboard-graphic');
    await click('#apply-dashboard-graphic');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(useDashboardGraphicSelection.getState().draft).toBeNull();
    expect(document.querySelector('select[data-path="UserFormFilterIds"]')).toHaveValue([
      'filter-1',
      'missing',
    ]);
    await field('UserFormFilterIds', ['filter-1']);
    await submit();
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ UserFormFilterIds: ['filter-1'] })
    );
  });
});
