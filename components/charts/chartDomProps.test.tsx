import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { AppBarChart } from './AppBarChart';
import { AppLineChart } from './AppLineChart';
import { AppSunburstChart } from './AppSunburstChart';
import { AppDonutChart } from './donut/AppDonutChart';

const data = [{ category: 'A', count: 1 }];
const series = [{ color: 'blue.6', name: 'count' }];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('chart DOM props', () => {
  it('keeps Mantine chart color props off native elements', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <MantineProvider theme={theme}>
            <AppBarChart
              barLabelColor="gray.9"
              cursorFill="gray.1"
              data={data}
              dataKey="category"
              h={200}
              series={series}
            />
            <AppLineChart
              data={data}
              dataKey="category"
              h={200}
              series={series}
              textColor="gray.7"
            />
            <AppDonutChart data={[{ color: 'blue.6', name: 'A', value: 1 }]} labelColor="gray.7" />
            <AppSunburstChart
              data={[
                {
                  children: [{ name: 'A.1', value: 1 }],
                  color: 'blue.6',
                  name: 'A',
                },
              ]}
              size={200}
              withLabels={false}
            />
          </MantineProvider>
        );
      });

      expect(
        container.querySelector('[barlabelcolor], [cursorfill], [labelcolor], [textcolor]')
      ).toBeNull();
      expect(consoleError.mock.calls.flat().join(' ')).not.toContain('does not recognize');
      expect(consoleWarn.mock.calls.flat().join(' ')).not.toContain('does not recognize');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
