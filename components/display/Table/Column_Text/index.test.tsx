import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import { TableCard } from '@/components/display/TableCard';
import { Column_Text } from './index';

describe('Column_Text tooltip', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const render = async (values: string[]) => {
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <TableCard hasData>
            <Table>
              <Table.Tbody>
                {values.map((value, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Column_Text title="Açıklama" value={value} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </TableCard>
        </MantineProvider>
      );
    });
    return [...container.querySelectorAll<HTMLElement>('[data-truncate]')];
  };

  it.each(['İzinli', 'Uzun açıklama. '.repeat(100), 'BoşluksuzMetin'.repeat(100)])(
    'limits tooltip width without assigning a fixed width (example %#)',
    async (value) => {
      const [preview] = await render([value]);
      await act(async () => preview.focus());

      const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]');
      const expectedStyle = document.createElement('div').style;
      expectedStyle.maxWidth = 'min(480px, calc(100vw - 32px))';
      expect(tooltip).not.toBeNull();
      expect(tooltip?.style.width).toBe('');
      expect(tooltip?.style.maxWidth).toBe(expectedStyle.maxWidth);
      expect(tooltip).toHaveTextContent('Açıklama');
      expect(tooltip).toHaveTextContent(value.trim());
      expect(tooltip?.querySelectorAll('.mantine-Text-root')[1]).toHaveStyle({
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      });
      expect(preview).toHaveStyle({ contain: 'inline-size', width: '100%' });
    }
  );

  it('closes the focused cell tooltip when another cell is hovered, without an exit trail', async () => {
    const [first, second] = await render(['İzinli', 'Toplantıda']);
    await act(async () => first.focus());
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

    await act(async () => {
      second.dispatchEvent(new MouseEvent('mouseenter', { relatedTarget: first }));
      await vi.advanceTimersByTimeAsync(300);
    });

    const tooltips = document.querySelectorAll('[role="tooltip"]');
    expect(document.activeElement).toBe(first);
    expect(tooltips).toHaveLength(1);
    expect(tooltips[0]).toHaveTextContent('Toplantıda');
    expect(tooltips[0]).toHaveAttribute('data-interactive');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});
