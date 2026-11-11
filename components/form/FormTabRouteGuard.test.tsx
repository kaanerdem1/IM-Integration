import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useLocation, useNavigate, type BlockerFunction } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { HostedModalStackProvider } from '@/components/modal-host/HostedModalStackContext';
import { Modal_Request_DirtyCloseConfirm } from '@/pages/requests/_shared/modals/Modal_Request_DirtyCloseConfirm';
import { MemoryDataRouter } from '@/test/MemoryDataRouter';
import { FormTabRouteGuard } from './FormTabRouteGuard';

const shouldBlock: BlockerFunction = ({ currentLocation, nextLocation }) =>
  currentLocation.pathname !== nextLocation.pathname;

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output>{location.pathname}</output>
      <button type="button" id="change-tab" onClick={() => navigate('/next')}>
        Diğer sekme
      </button>
    </>
  );
};

describe('FormTabRouteGuard', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  const render = (onDiscard: () => boolean, mounted = true) =>
    act(async () => {
      root.render(
        <MantineProvider env="test">
          <MemoryDataRouter initialEntries={['/current']}>
            <Navigation />
            {mounted ? <FormTabRouteGuard shouldBlock={shouldBlock} onDiscard={onDiscard} /> : null}
            <HostedModalStackProvider modalType="RequestDirtyCloseConfirm">
              <Modal_Request_DirtyCloseConfirm />
            </HostedModalStackProvider>
          </MemoryDataRouter>
        </MantineProvider>
      );
    });
  const click = (id: string) =>
    act(async () => document.querySelector<HTMLButtonElement>(`#${id}`)!.click());

  beforeEach(() => {
    useModalStore.getState().closeModal();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useModalStore.getState().closeModal();
  });

  it.each([true, false])(
    'keeps an open confirmation stable and uses the latest discard check (allowed=%s)',
    async (allowed) => {
      const originalDiscard = vi.fn(() => !allowed);
      const latestDiscard = vi.fn(() => allowed);
      await render(originalDiscard);
      await click('change-tab');
      const options = useModalStore.getState().getModalOption('RequestDirtyCloseConfirm');
      const button = document.getElementById('request-dirty-close-confirm-confirm-button');
      expect(options?.mode).toBe('tab-change');
      expect(button).not.toBeNull();
      expect(container.querySelector('output')?.textContent).toBe('/current');

      await render(latestDiscard);
      expect(useModalStore.getState().getModalOption('RequestDirtyCloseConfirm')).toBe(options);
      expect(document.getElementById('request-dirty-close-confirm-confirm-button')).toBe(button);
      await click('request-dirty-close-confirm-confirm-button');
      expect(originalDiscard).not.toHaveBeenCalled();
      expect(latestDiscard).toHaveBeenCalledExactlyOnceWith();
      expect(container.querySelector('output')?.textContent).toBe(allowed ? '/next' : '/current');
      expect(useModalStore.getState().isModalOpen('RequestDirtyCloseConfirm')).toBe(false);
    }
  );

  it('cleans up its pending confirmation when the guard unmounts', async () => {
    const onDiscard = vi.fn(() => true);
    await render(onDiscard);
    await click('change-tab');
    expect(useModalStore.getState().isModalOpen('RequestDirtyCloseConfirm')).toBe(true);
    await render(onDiscard, false);
    expect(useModalStore.getState().isModalOpen('RequestDirtyCloseConfirm')).toBe(false);
    expect(container.querySelector('output')?.textContent).toBe('/current');
    expect(onDiscard).not.toHaveBeenCalled();
    await click('change-tab');
    expect(container.querySelector('output')?.textContent).toBe('/next');
  });
});
