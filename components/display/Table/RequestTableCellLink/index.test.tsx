import { act, type MouseEvent as ReactMouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import { RequestTableCellLink } from '@/components/display/Table/RequestTableCellLink';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RequestTableCellLink', () => {
  it('renders native links inside cells while keeping control cells unlinked', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onClick = vi.fn((event: ReactMouseEvent<Element>) => {
      event.preventDefault();
    });
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <RequestTableCellLink href="/app/requests/YT-1908/ozet" onClick={onClick}>
                    YT-1908
                  </RequestTableCellLink>
                  <RequestTableCellLink>Control</RequestTableCellLink>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </MantineProvider>
        );
      });

      const cells = container.querySelectorAll('td');
      const link = cells[0]?.querySelector('a');

      expect(link?.getAttribute('href')).toBe('/app/requests/YT-1908/ozet');
      expect(cells[1]?.querySelector('a')).toBeNull();

      act(() => {
        link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });

      expect(onClick).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('leaves modified and middle clicks to the browser without triggering row navigation', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onOpenRequest = vi.fn();
    const onRowClick = vi.fn();
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <Table>
              <Table.Tbody>
                <Table.Tr onClick={onRowClick}>
                  <RequestTableCellLink href="/app/requests/YT-1908/ozet" onClick={onOpenRequest}>
                    YT-1908
                  </RequestTableCellLink>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </MantineProvider>
        );
      });

      const link = container.querySelector('a');
      link?.addEventListener('click', (event) => {
        event.preventDefault();
      });

      act(() => {
        link?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
        );
        link?.dispatchEvent(
          new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })
        );
      });

      expect(onOpenRequest).not.toHaveBeenCalled();
      expect(onRowClick).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('inherits presentation props from the table cell', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <RequestTableCellLink href="/app/requests/YT-1908/ozet" c="red" fw={600}>
                    Metric
                  </RequestTableCellLink>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </MantineProvider>
        );
      });

      const cell = container.querySelector('td');
      const link = cell?.querySelector('a');

      expect(cell?.style.color).toBe('var(--mantine-color-red-text)');
      expect(cell?.style.fontWeight).toBe('600');
      expect(link?.style.color).toBe('inherit');
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
