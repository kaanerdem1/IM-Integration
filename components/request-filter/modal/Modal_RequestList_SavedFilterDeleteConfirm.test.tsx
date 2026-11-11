import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal as MantineModal, MantineProvider } from '@mantine/core';
import type { UserFormFilterResponseDto } from '@/_api/_core/api-gen/types';
import { QueryKeys } from '@/_api/hooks/query-keys';
import type { UserFormFilterDeleteResponse } from '@/_api/hooks/user-form-filter.hooks';
import { label as trLabel } from '@/_i18n/Tr/_label';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { HostedModalStackProvider } from '@/components/modal-host/HostedModalStackContext';
import { getSavedRequestFilterQueryKey } from '../_hooks/useSavedRequestFilterQuery';
import { Modal_RequestList_SavedFilterDeleteConfirm } from './Modal_RequestList_SavedFilterDeleteConfirm';

const mocks = vi.hoisted(() => ({
  deleteSavedFilter: vi.fn(),
  fetchSavedFilters: vi.fn(),
  message: vi.fn(),
}));

vi.mock('@/_api/_core/api-gen/user-form-filter', () => ({
  getUserFormFilter: () => ({
    deleteApiUserFormFilterId: mocks.deleteSavedFilter,
    getApiUserFormFilterScreen: mocks.fetchSavedFilters,
  }),
}));

vi.mock('@/_hooks/_modules/auth/useSession', () => ({
  useSession: () => ({ me: { UserId: 'test-user' } }),
}));

vi.mock('@/_api/hooks', async () => ({
  ...(await import('@/_api/hooks/user-form-filter.hooks')),
  ...(await import('@/_api/hooks/query-keys')),
}));

vi.mock('@/_hooks/useMessage', () => ({
  useMessage: () => ({ message: mocks.message }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name?: string }) =>
      ({
        'label.cancel': 'İptal',
        'label.data': 'Veri',
        'label.delete_': 'Sil',
        'label.requests.list.filters.savedFilterDeleted': 'Kayıtlı filtre silindi',
        'label.requests.list.filters.savedFilterDeleteDescription':
          'Silmek istediğinize emin misiniz?',
        'label.requests.list.filters.savedFilterDeleteImpact':
          trLabel.label.requests.list.filters.savedFilterDeleteImpact,
        'label.requests.list.filters.savedFilterDeleteImpactTitle':
          trLabel.label.requests.list.filters.savedFilterDeleteImpactTitle,
        'label.requests.list.filters.savedFilterDeleteTitle':
          trLabel.label.requests.list.filters.savedFilterDeleteTitle.replace(
            '{{name}}',
            values?.name ?? ''
          ),
      })[key] ?? key,
  }),
}));

describe('Modal_RequestList_SavedFilterDeleteConfirm', () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const filterQueryKey = getSavedRequestFilterQueryKey('id:test-user');
  const selectedFilter = { Id: 'filter-1', Name: 'Tamamlananlar' };
  const remainingFilter = { Id: 'filter-2', Name: 'Diğer' };

  beforeEach(() => {
    useModalStore.setState({ currentModals: [] });
    mocks.deleteSavedFilter.mockReset();
    mocks.deleteSavedFilter.mockResolvedValue({ Data: true });
    mocks.fetchSavedFilters.mockReset().mockResolvedValue({ Data: [] });
    mocks.message.mockReset();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(filterQueryKey, { Data: [selectedFilter] });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    useModalStore.setState({ currentModals: [] });
    container.remove();
  });

  const renderModal = async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MantineProvider env="test">
            <MantineModal.Stack>
              <HostedModalStackProvider modalType="RequestListSavedFilterDeleteConfirm">
                <Modal_RequestList_SavedFilterDeleteConfirm />
              </HostedModalStackProvider>
            </MantineModal.Stack>
          </MantineProvider>
        </QueryClientProvider>
      );
    });
  };

  const openModal = (graphics?: UserFormFilterResponseDto['UserDashboardGraphics']) => {
    useModalStore.getState().openModal('RequestListSavedFilterDeleteConfirm', {
      item: { Id: 'filter-1', Name: 'Tamamlananlar', UserDashboardGraphics: graphics },
    });
  };

  it('distinguishes the filter name with quotation marks in the confirmation', async () => {
    openModal();
    await renderModal();
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(
      '"Tamamlananlar" isimli kayıtlı filtreniz silinecektir.'
    );
  });

  it.each([[], [selectedFilter], [selectedFilter, remainingFilter]])(
    'explains the built-in fallback without forcing creation or fetching the catalog: %j',
    async (...filters) => {
      client.setQueryData(filterQueryKey, { Data: filters });
      openModal();
      await renderModal();
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toHaveTextContent(trLabel.label.requests.list.filters.savedFilterDeleteImpact);
      expect(dialog).not.toHaveTextContent('Son kayıtlı filtreniz');
      expect(dialog).not.toHaveTextContent('yeni bir filtre eklemelisiniz');
      expect(mocks.fetchSavedFilters).not.toHaveBeenCalled();
      expect(useModalStore.getState().isModalOpen('RequestFilter')).toBe(false);
      const cancel = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'İptal'
      );
      await act(async () => cancel!.click());
      expect(mocks.deleteSavedFilter).not.toHaveBeenCalled();
    }
  );

  it('never calls deletion when a filter with chart dependencies reaches confirmation', async () => {
    openModal([{ Id: 'graphic-1', Name: 'Tamamlanan Talepler' }]);
    await renderModal();
    const deleteButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Sil'
    );
    expect(deleteButton).toBeDefined();
    await act(async () => deleteButton!.click());

    expect(mocks.deleteSavedFilter).not.toHaveBeenCalled();
    expect(mocks.message).not.toHaveBeenCalled();
    expect(client.getQueryState(filterQueryKey)?.isInvalidated).toBe(false);
  });

  it('does not repeat a pending deletion or invalidate before it succeeds', async () => {
    const pending = Promise.withResolvers<UserFormFilterDeleteResponse>();
    mocks.deleteSavedFilter.mockReturnValueOnce(pending.promise);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    openModal();
    await renderModal();
    await renderModal();
    expect(mocks.deleteSavedFilter).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();

    const deleteButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Sil'
    )!;
    expect(deleteButton).toBeDefined();
    await act(async () => deleteButton.click());
    await renderModal();
    expect(deleteButton).toBeDisabled();
    await act(async () => deleteButton.click());
    expect(mocks.deleteSavedFilter).toHaveBeenCalledExactlyOnceWith('filter-1');
    expect(invalidate).not.toHaveBeenCalled();

    await act(async () => pending.resolve({ Data: true }));
    await renderModal();
    expect(mocks.deleteSavedFilter).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: [QueryKeys.UserFormFilterDetail],
    });
  });

  it.each([undefined, null, '', { StatusCode: 204 }, { Data: true }])(
    'accepts successful deletion without requiring a response body: %j',
    async (response) => {
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      mocks.deleteSavedFilter.mockResolvedValue(response);
      openModal();
      await renderModal();

      const deleteButton = Array.from(document.body.querySelectorAll('button')).find(
        (button) => button.textContent === 'Sil'
      );
      await act(async () => deleteButton?.click());

      expect(invalidate).toHaveBeenCalledWith({ queryKey: [QueryKeys.UserFormFilterDetail] });
      expect(mocks.deleteSavedFilter).toHaveBeenCalledExactlyOnceWith('filter-1');
      expect(mocks.message).toHaveBeenCalledExactlyOnceWith('Kayıtlı filtre silindi', 'success');
      expect(useModalStore.getState().isModalOpen('RequestListSavedFilterDeleteConfirm')).toBe(
        false
      );
    }
  );

  it.each([
    { Data: false, Error: { Message: 'Silme başarısız' } },
    { Error: { Message: 'Silme başarısız' } },
    { Data: false },
    { Error: { Message: '   ' } },
  ])(
    'keeps the modal open without a second notification for a failed response: %j',
    async (response) => {
      mocks.deleteSavedFilter.mockResolvedValue(response);
      openModal();
      await renderModal();

      const deleteButton = Array.from(document.body.querySelectorAll('button')).find(
        (button) => button.textContent === 'Sil'
      );
      await act(async () => deleteButton?.click());

      expect(mocks.message).not.toHaveBeenCalled();
      expect(useModalStore.getState().isModalOpen('RequestListSavedFilterDeleteConfirm')).toBe(
        true
      );
    }
  );

  it('does not close, notify success or invalidate queries when the HTTP request fails', async () => {
    mocks.deleteSavedFilter.mockRejectedValue(new Error('HTTP 500'));
    openModal();
    await renderModal();
    const deleteButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Sil'
    );
    await act(async () => deleteButton?.click());
    expect(mocks.deleteSavedFilter).toHaveBeenCalledOnce();
    expect(mocks.message).not.toHaveBeenCalled();
    expect(client.getQueryState(filterQueryKey)?.isInvalidated).toBe(false);
    expect(useModalStore.getState().isModalOpen('RequestListSavedFilterDeleteConfirm')).toBe(true);
  });
});
