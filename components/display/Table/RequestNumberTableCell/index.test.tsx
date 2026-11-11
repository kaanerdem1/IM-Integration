import { act, type MouseEvent as ReactMouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import classes from '@/components/display/Table/RequestTableCellLink/style.module.scss';
import { RequestNumberTableCell } from './index';

describe('RequestNumberTableCell', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const openRequest = vi.fn((event: ReactMouseEvent<HTMLAnchorElement>) => event.preventDefault());
  const openTask = vi.fn();
  const href = '/app/requests/OT-21/ozet';

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  const render = (requestNo: string | null = 'OT-21', requestHref = href) =>
    act(async () =>
      root.render(
        <MantineProvider env="test">
          <Table>
            <Table.Tbody>
              <Table.Tr onClick={openTask} onAuxClick={openTask} onKeyDown={openTask}>
                <RequestNumberTableCell
                  requestNo={requestNo}
                  href={requestHref}
                  onClick={openRequest}
                  miw={100}
                />
                <Table.Td>G-139</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </MantineProvider>
      )
    );

  it.each(['a', '.mantine-Badge-root'])(
    'opens only the request from the badge link: %s',
    async (selector) => {
      await render();
      const cell = container.querySelector('td')!;
      const link = cell.querySelector('a')!;
      expect(cell).not.toHaveClass(classes.cell);
      expect(cell).toHaveStyle({ cursor: 'default' });
      expect(link).not.toHaveClass(classes.link);
      expect(link).toHaveAttribute('href', href);
      expect(link).not.toHaveAttribute('tabindex', '-1');
      expect(cell.querySelectorAll('a')).toHaveLength(1);
      await act(async () => cell.querySelector<HTMLElement>(selector)!.click());
      expect(openRequest).toHaveBeenCalledOnce();
      expect(openTask).not.toHaveBeenCalled();
    }
  );

  it('does not open either drawer from the empty part of an available request cell', async () => {
    await render();
    const cell = container.querySelector('td')!;
    await act(async () => {
      cell.click();
      cell.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true }));
      cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(openRequest).not.toHaveBeenCalled();
    expect(openTask).not.toHaveBeenCalled();
  });

  it('isolates keyboard and auxiliary events without preventing native link behavior', async () => {
    await render();
    const link = container.querySelector('a')!;
    for (const event of [
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }),
    ]) {
      await act(async () => {
        link.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(false);
    }
    expect(openTask).not.toHaveBeenCalled();
    expect(openRequest).not.toHaveBeenCalled();
  });

  it.each([null, ''])(
    'does not fall through to the task row when the request number is %s',
    async (requestNo) => {
      await render(requestNo);
      const cell = container.querySelector('td')!;
      expect(cell).toHaveTextContent('-');
      expect(cell).toHaveStyle({ cursor: 'default' });
      expect(cell.querySelector('a')).toBeNull();
      await act(async () => {
        cell.click();
        cell.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true }));
      });
      expect(openRequest).not.toHaveBeenCalled();
      expect(openTask).not.toHaveBeenCalled();
    }
  );

  it('keeps an unavailable request cell inert while other cells still open the task', async () => {
    await render('OT-21', '');
    const cells = container.querySelectorAll('td');
    expect(cells[0]).toHaveStyle({ cursor: 'default' });
    expect(cells[0].querySelector('.mantine-Badge-root')).toHaveStyle({ cursor: 'default' });
    await act(async () => cells[0].click());
    expect(openTask).not.toHaveBeenCalled();
    await act(async () => cells[1].click());
    expect(openTask).toHaveBeenCalledOnce();
  });
});
