import { act } from 'react';
import { createInstance } from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Modal as MantineModal, MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { label as trLabel } from '@/_i18n/Tr/_label';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { HostedModalStackProvider } from '@/components/modal-host/HostedModalStackContext';
import type { SavedUserFormFilter } from '@/components/request-filter/_types';
import { Modal_RequestList_SavedFilterDeleteBlocked } from './Modal_RequestList_SavedFilterDeleteBlocked';

const CurrentLocation = () => {
  const location = useLocation();
  return <output>{location.pathname + location.search}</output>;
};

describe('Modal_RequestList_SavedFilterDeleteBlocked', () => {
  let container: HTMLDivElement;
  let root: Root;
  const i18n = createInstance();
  const item: SavedUserFormFilter = {
    Id: 'filter-1',
    Name: 'Tamamlananlar',
    UserDashboardGraphics: [
      { Id: 'graphic-1', Name: 'Talep Dağılımı' },
      { Id: 'graphic-2', Name: 'Tamamlanan Talepler' },
    ],
  };

  beforeEach(async () => {
    useModalStore.setState({ currentModals: [] });
    await i18n.init({ lng: 'tr', resources: { tr: { translation: trLabel } } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    useModalStore.setState({ currentModals: [] });
    container.remove();
  });

  const renderModal = async (filter = item) => {
    useModalStore.getState().openModal('RequestListSavedFilterDeleteBlocked', { item: filter });
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/app/filters-and-graphs?view=filters']}>
            <MantineProvider env="test" theme={theme}>
              <CurrentLocation />
              <MantineModal.Stack>
                <HostedModalStackProvider modalType="RequestListSavedFilterDeleteBlocked">
                  <Modal_RequestList_SavedFilterDeleteBlocked />
                </HostedModalStackProvider>
              </MantineModal.Stack>
            </MantineProvider>
          </MemoryRouter>
        </I18nextProvider>
      );
    });
  };

  const button = (label: string) => {
    const result = Array.from(document.querySelectorAll('button')).find(
      (element) => element.textContent === label
    );
    expect(result).toBeDefined();
    return result!;
  };

  it('explains the dependency, lists chart names and has no destructive action', async () => {
    await renderModal();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toHaveAccessibleName('Filtre silinemiyor');
    expect(dialog).toHaveTextContent(
      '"Tamamlananlar" filtresi aşağıdaki grafiklerde kullanılıyor.'
    );
    expect(dialog).toHaveTextContent(
      'Filtreyi silebilmek için önce bu grafiklerdeki filtre bağlantısını kaldırın veya başka bir filtre seçin.'
    );
    const list = dialog?.querySelector('ul');
    expect(list).toHaveAttribute('aria-label', 'Bu filtreyi kullanan grafikler');
    expect(Array.from(list!.querySelectorAll('li'), (element) => element.textContent)).toEqual([
      'Talep Dağılımı',
      'Tamamlanan Talepler',
    ]);
    expect(dialog?.querySelector('.mantine-Badge-root')).toHaveTextContent('2');
    expect(
      Array.from(dialog!.querySelectorAll('button'), (element) => element.textContent)
    ).not.toContain('Sil');
    expect(useModalStore.getState().isModalOpen('RequestListSavedFilterDeleteConfirm')).toBe(false);
  });

  it('keeps unnamed dependencies visible and renders the full list in the scroll area', async () => {
    await renderModal({
      ...item,
      UserDashboardGraphics: [
        { Id: 'unnamed', Name: null },
        { Name: '   ' },
        ...Array.from({ length: 30 }, (_, index) => ({
          Id: `chart-${index}`,
          Name: `Grafik ${index}`,
        })),
      ],
    });
    const list = document.querySelector('.mantine-ScrollArea-viewport ul');
    expect(list?.querySelectorAll('li')).toHaveLength(32);
    expect(list).toHaveTextContent('Adsız grafik');
    expect(list).toHaveTextContent('Grafik 29');
  });

  it.each([2, 32])(
    'scrolls only the chart list while keeping guidance and actions outside (%s charts)',
    async (count) => {
      await renderModal({
        ...item,
        UserDashboardGraphics: Array.from({ length: count }, (_, index) => ({
          Id: `chart-${index}`,
          Name: `Grafik ${index}`,
        })),
      });
      const dialog = document.querySelector('[role="dialog"]')!;
      const viewports = dialog.querySelectorAll('.mantine-ScrollArea-viewport');
      expect(viewports).toHaveLength(1);
      const viewport = viewports[0];
      expect(viewport.querySelectorAll('li')).toHaveLength(count);
      expect(
        viewport.closest('[data-testid="saved-filter-dependent-graphics-content"]')
      ).toHaveAttribute('data-with-border');
      expect(viewport.contains(dialog.querySelector('[role="alert"]'))).toBe(false);
      expect(viewport.contains(dialog.querySelector('h3'))).toBe(false);
      expect(viewport.contains(dialog.querySelector('.mantine-Badge-root'))).toBe(false);
      expect(viewport.contains(button('Kapat'))).toBe(false);
      expect(viewport.contains(button('Grafiklerime Git'))).toBe(false);
    }
  );

  it('closes without navigating when dismissed', async () => {
    await renderModal();
    await act(async () => button('Kapat').click());
    expect(useModalStore.getState().isModalOpen('RequestListSavedFilterDeleteBlocked')).toBe(false);
    expect(container.querySelector('output')).toHaveTextContent(
      '/app/filters-and-graphs?view=filters'
    );
  });

  it('closes and navigates to My Charts for dependency management', async () => {
    await renderModal();
    await act(async () => button('Grafiklerime Git').click());
    expect(useModalStore.getState().currentModals).toEqual([]);
    expect(container.querySelector('output')).toHaveTextContent(
      '/app/filters-and-graphs?view=graphics'
    );
  });
});
