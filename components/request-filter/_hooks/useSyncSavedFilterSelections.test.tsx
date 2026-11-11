import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import { useSavedFilterSelectionStore as store } from '../_store/useSavedFilterSelectionStore';
import { useSyncSavedFilterSelections } from './useSyncSavedFilterSelections';

const mocks = vi.hoisted(() => ({ catalog: vi.fn() }));
vi.mock('./useSavedRequestFilters', () => ({ useSavedRequestFilters: mocks.catalog }));
const userIdentity = 'id:test-user';
const Probe = () => {
  useSyncSavedFilterSelections();
  return <div>Application content</div>;
};

describe('non-blocking filter selection synchronization', () => {
  let container: HTMLDivElement;
  let root: Root;
  const response = {
    filters: [],
    userIdentity,
    isFetchedAfterMount: true,
    isError: false,
    isFetching: false,
  };

  beforeEach(() => {
    store.setState({ selectionsByUser: {} });
    useModalStore.setState({ currentModals: [] });
    mocks.catalog.mockReturnValue(response);
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    store.persist.clearStorage();
    vi.restoreAllMocks();
  });
  const render = () =>
    act(() =>
      root.render(
        <StrictMode>
          <Probe />
        </StrictMode>
      )
    );

  it('keeps the application available with no filters and writes defaults only once', () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    render();
    expect(container).toHaveTextContent('Application content');
    expect(useModalStore.getState().currentModals).toEqual([]);
    expect(store.getState().selectionsByUser[userIdentity]?.['home.pool']).toEqual({
      filterIds: [DEFAULT_REQUEST_FILTER_ID],
    });
    render();
    expect(writes).toHaveBeenCalledOnce();
  });

  it('persists the default for removed selections without opening creation', () => {
    store.getState().select(userIdentity, 'home.pool', 'deleted');
    render();
    expect(store.getState().selectionsByUser[userIdentity]?.['home.pool']).toEqual({
      filterIds: [DEFAULT_REQUEST_FILTER_ID],
      explicit: true,
    });
    expect(useModalStore.getState().currentModals).toEqual([]);
  });

  it.each([{ isError: true }, { isFetching: true }, { isFetchedAfterMount: false }])(
    'does not overwrite selections while the catalog is unresolved: %j',
    (state) => {
      store.getState().select(userIdentity, 'home.pool', 'saved');
      mocks.catalog.mockReturnValue({ ...response, ...state });
      render();
      expect(store.getState().selectionsByUser[userIdentity]?.['home.pool']?.filterIds).toEqual([
        'saved',
      ]);
      expect(useModalStore.getState().currentModals).toEqual([]);
    }
  );
});
