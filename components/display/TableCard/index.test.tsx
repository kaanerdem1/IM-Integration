import { act } from 'react';
import classes from './style.module.scss';
import { IconFiles, type TablerIcon } from '@tabler/icons-react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import { TableCard } from './index';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('TableCard fallback border', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (hasData: boolean, isLoading = false, fill = false, emptyIcon?: TablerIcon) => {
    act(() =>
      root.render(
        <MantineProvider env="test">
          <TableCard
            className="list-placement"
            emptyIcon={emptyIcon}
            emptyText="Görev bulunamadı"
            fill={fill}
            hasData={hasData}
            isLoading={isLoading}
          >
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>G-73</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </TableCard>
        </MantineProvider>
      )
    );
  };

  it('supports a document icon without changing the default, loading or populated states', () => {
    render(false);
    expect(container.querySelector('.tabler-icon-archive')).not.toBeNull();
    render(false, false, false, IconFiles);
    expect(container.querySelector('.tabler-icon-files')).not.toBeNull();
    expect(container.querySelector('.tabler-icon-x')).toBeNull();
    render(false, true, false, IconFiles);
    expect(container.querySelector('.tabler-icon-files')).toBeNull();
    expect(container.querySelector('.mantine-Loader-root')).not.toBeNull();
    render(true, false, false, IconFiles);
    expect(container.querySelector('.tabler-icon-files')).toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
  });

  it.each([false, true])(
    'removes only the border for loading and empty states (fill=%s)',
    (fill) => {
      for (const isLoading of [true, false]) {
        render(false, isLoading, fill);

        const card = container.querySelector(`.${classes.card}`);
        expect(card).toHaveStyle({ borderWidth: '0px' });
        expect(card).toHaveAttribute('data-empty');
        expect(card).toHaveClass('list-placement');
        expect(card?.classList.contains(classes.fill)).toBe(fill);
        expect(container.querySelector('table')).toBeNull();
        expect(container.querySelector('.mantine-Loader-root') !== null).toBe(isLoading);
        expect(container.textContent?.includes('Görev bulunamadı')).toBe(!isLoading);
      }
    }
  );

  it('restores the card border with data and keeps it during background loading', () => {
    render(false, true);

    for (const isLoading of [false, true]) {
      render(true, isLoading);

      const card = container.querySelector<HTMLElement>(`.${classes.card}`);
      expect(card?.style.border).toBe('');
      expect(card).not.toHaveAttribute('data-empty');
      expect(container.querySelector('table')).not.toBeNull();
      expect(
        container
          .querySelector<HTMLElement>('.mantine-TableScrollContainer-scrollContainer')
          ?.style.getPropertyValue('--table-min-width')
      ).toBe('100%');
      expect(container.querySelector('.mantine-Loader-root')).toBeNull();
    }

    render(false);
    expect(container.querySelector(`.${classes.card}`)).toHaveStyle({ borderWidth: '0px' });
  });

  it.each([false, true])('centers the empty message only in fill mode (fill=%s)', (fill) => {
    render(false, false, fill);

    const center = container.querySelector<HTMLElement>('.mantine-Center-root');
    const message = center?.querySelector<HTMLElement>(':scope > div');
    expect(center?.style.height).toBe(fill ? '100%' : '');
    expect(message?.style.width).toBe(fill ? 'auto' : '');
    expect(message?.textContent).toBe('Görev bulunamadı');
  });

  it.each([false, true])('bounds the scroll container only in fill mode (fill=%s)', (fill) => {
    render(true, false, fill);

    const scrollContainer = container.querySelector<HTMLElement>(
      '.mantine-TableScrollContainer-scrollContainer'
    );
    expect(scrollContainer?.style.flex).toBe(fill ? '1 1 0%' : '');
    expect(scrollContainer?.style.height).toBe(fill ? '0rem' : '');
    expect(scrollContainer?.style.minHeight).toBe(fill ? '0rem' : '');
  });
});
