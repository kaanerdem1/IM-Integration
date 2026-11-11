import { act, type ReactNode } from 'react';
import { IconClipboardList } from '@tabler/icons-react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { NoData } from './index';
import { LoaderOrNoData } from './LoaderOrNo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { value: string }) => {
      if (key === 'helper.noData') {
        return `${options?.value} bulunmamaktadır. Yeni Talep ekleyebilirsiniz.`;
      }
      return (
        {
          'entity.request': 'API Talebi',
          'helper.noData_': 'Veri bulunmamaktadır. Lütfen tekrar deneyin.',
        }[key] ?? key
      );
    },
  }),
}));

describe('NoData text casing', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (content: ReactNode) => {
    act(() => root.render(<MantineProvider env="test">{content}</MantineProvider>));
  };

  it('keeps supplied text unchanged, including sentence starts and acronyms', () => {
    const message = 'Grafik verileri yüklenemedi. API bağlantısını kontrol edin.';
    render(<NoData text={message} />);
    expect(container.querySelector('.mantine-Text-root')?.textContent).toBe(message);
  });

  it('keeps the translated default message unchanged', () => {
    render(<NoData />);
    expect(container.querySelector('.mantine-Text-root')?.textContent).toBe(
      'Veri bulunmamaktadır. Lütfen tekrar deneyin.'
    );
  });

  it('does not lowercase translated entity names or subsequent sentences', () => {
    render(<NoData entity="request" />);
    expect(container.querySelector('.mantine-Text-root')?.textContent).toBe(
      'API Talebi bulunmamaktadır. Yeni Talep ekleyebilirsiniz.'
    );
  });

  it.each([false, true])('preserves text with an optional empty-state action: %s', (withAction) => {
    const message =
      'Henüz kayıtlı grafiğiniz bulunmamaktadır. Size özel grafikler oluşturabilirsiniz.';
    render(
      <LoaderOrNoData
        loading={false}
        hasData={false}
        text={message}
        noDataAction={withAction ? <button type="button">Grafik Ekle</button> : undefined}
      />
    );
    expect(container.querySelector('.mantine-Text-root')?.textContent).toBe(message);
    expect(container.querySelector('button') !== null).toBe(withAction);
  });

  it('renders a contextual icon, description and action through the shared empty state', () => {
    const onCreate = vi.fn();
    render(
      <LoaderOrNoData
        loading={false}
        hasData={false}
        icon={IconClipboardList}
        text="Görev bulunmamaktadır."
        description="Yeni bir görev oluşturabilirsiniz."
        noDataAction={
          <button type="button" onClick={onCreate}>
            Görev oluştur
          </button>
        }
      />
    );
    expect(container.querySelector('.tabler-icon-clipboard-list')).not.toBeNull();
    expect(container.querySelector('.tabler-icon-x')).toBeNull();
    expect(container).toHaveTextContent('Görev bulunmamaktadır.');
    expect(container).toHaveTextContent('Yeni bir görev oluşturabilirsiniz.');
    act(() => container.querySelector('button')?.click());
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    'does not replace existing content on background loading: %s',
    (loading) => {
      render(
        <LoaderOrNoData loading={loading} hasData text="Boş liste" description="Açıklama">
          <span>Kayıt</span>
        </LoaderOrNoData>
      );
      expect(container.querySelector('span')?.textContent).toBe('Kayıt');
      expect(container.querySelector('.mantine-Text-root')).toBeNull();
      expect(container.querySelector('.mantine-Loader-root')).toBeNull();
    }
  );

  it('shows only the loader during initial loading, without empty text or actions', () => {
    render(
      <LoaderOrNoData
        loading
        hasData={false}
        text="Boş liste"
        description="Açıklama"
        noDataAction={<button type="button">Oluştur</button>}
      />
    );
    expect(container.querySelector('.mantine-Loader-root')).not.toBeNull();
    expect(container.querySelector('.mantine-Text-root')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('keeps the reserved area and grid placement while aligning its loader at the top', () => {
    render(
      <LoaderOrNoData
        loading
        hasData={false}
        fallbackProps={{ h: 420, style: { gridArea: 'content', display: 'grid' } }}
      />
    );
    const area = container.querySelector<HTMLElement>('[data-loading]')!;
    expect(area.style.height).toBe('calc(26.25rem * var(--mantine-scale))');
    expect(area.style.gridArea).toBe('content');
    expect(area.style.display).toBe('flex');
    expect(area.style.alignItems).toBe('flex-start');
    expect(area.style.justifySelf).toBe('stretch');
  });
});
