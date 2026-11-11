import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import type { Sector } from 'recharts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { BreakdownItem } from './breakdown';
import { BreakdownDonut } from './BreakdownDonut';

type SectorProps = ComponentProps<typeof Sector>;
const mocks = vi.hoisted(() => ({ sectors: [] as SectorProps[] }));
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    Sector: (props: SectorProps) => {
      mocks.sectors.push(props);
      return <actual.Sector {...props} />;
    },
  };
});

describe('compact breakdown donut', () => {
  let root: Root;
  let container: HTMLDivElement;
  const items: BreakdownItem[] = [
    { label: 'Yasal', color: '#5a76ff', count: 12, href: '/app/requests?type=legal' },
    { label: 'Operasyonel/İş Birimi', color: '#1cb5cd', count: 973 },
    { label: 'Denetim/Güvenlik/Kalite', color: '#06a77e', count: 323 },
    { label: 'Sistem Zorunluluğu', color: '#0b879c', count: 98 },
  ];
  beforeEach(() => {
    mocks.sectors = [];
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => act(() => root.unmount()));
  const render = (data = items) =>
    act(() =>
      root.render(
        <MantineProvider env="test">
          <MemoryRouter>
            <BreakdownDonut items={data} centerLabel="talep" />
          </MemoryRouter>
        </MantineProvider>
      )
    );

  it('softens corners without changing the compact size, colors, total or row links', () => {
    const original = structuredClone(items);
    render();
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 112 112');
    expect(container.querySelector('circle')).toHaveAttribute('stroke-width', '14');
    expect(mocks.sectors).toHaveLength(4);
    mocks.sectors.forEach((sector, index) => {
      expect(sector.outerRadius! - sector.innerRadius!).toBe(14);
      expect(sector.fill).toBe(items[index].color);
      expect(Number(sector.cornerRadius)).toBeGreaterThan(0);
      expect(Number(sector.cornerRadius)).toBeLessThanOrEqual(3);
    });
    expect(Number(mocks.sectors[0].cornerRadius)).toBeLessThan(3);
    expect(mocks.sectors[1].cornerRadius).toBe(3);
    expect(container.textContent).toContain('1406talep');
    expect(container.textContent).toContain('%1');
    expect(container.textContent).toContain('%69');
    expect(container.querySelector('a')).toHaveAttribute('href', '/app/requests?type=legal');
    expect(items).toEqual(original);
  });

  it.each([
    [12, 973, 323, 98],
    [1, 1000000, 1],
    [1, 1, 1, 1],
    [0, 1, 0, 999],
  ])('keeps positive slices visible and separated within one turn for counts %j', (...counts) => {
    const data = counts.map((count, index) => ({
      label: `Group ${index}`,
      color: '#0b879c',
      count,
    }));
    render(data);
    const pixelsPerDegree = (2 * Math.PI * 44) / 360;
    const positiveCount = counts.filter((count) => count > 0).length;
    expect(mocks.sectors).toHaveLength(positiveCount);
    expect(mocks.sectors[0].startAngle).toBeCloseTo(0);
    let visibleLength = 0;
    mocks.sectors.forEach((sector, index) => {
      expect(sector.endAngle).toBeLessThan(sector.startAngle!);
      const length = (sector.startAngle! - sector.endAngle!) * pixelsPerDegree;
      expect(length).toBeGreaterThanOrEqual(3 - 1e-10);
      visibleLength += length;
      const nextStart = mocks.sectors[index + 1]?.startAngle ?? -360;
      expect((sector.endAngle! - nextStart) * pixelsPerDegree).toBeCloseTo(3);
    });
    expect(visibleLength + positiveCount * 3).toBeCloseTo(2 * Math.PI * 44);
    const paths = container.querySelectorAll('[data-testid="breakdown-donut-segment"]');
    expect(paths).toHaveLength(positiveCount);
    paths.forEach((path) => expect(path.getAttribute('d')).not.toMatch(/NaN|Infinity/));
  });

  it('preserves proportional angles when every slice already fits', () => {
    const counts = [10, 20, 30, 40];
    render(counts.map((count, index) => ({ label: `Group ${index}`, color: '#0b879c', count })));
    let offset = 0;
    const gapAngle = (3 / (2 * Math.PI * 44)) * 360;
    mocks.sectors.forEach((sector, index) => {
      expect(sector.startAngle).toBeCloseTo(-offset);
      offset += counts[index] * 3.6;
      expect(sector.endAngle).toBeCloseTo(-(offset - gapAngle));
    });
  });

  it('shows a single positive category as a complete ring without a separator', () => {
    render([{ label: 'Yasal', color: '#5a76ff', count: 1 }]);
    expect(mocks.sectors).toHaveLength(1);
    expect(mocks.sectors[0].startAngle).toBeCloseTo(0);
    expect(mocks.sectors[0].endAngle).toBeCloseTo(-360);
    expect(container.textContent).toContain('%100');
  });

  it('keeps the empty track and removes obsolete slices when the data changes', () => {
    render();
    mocks.sectors = [];
    render([{ label: 'Yasal', color: '#5a76ff', count: 0 }]);
    expect(mocks.sectors).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="breakdown-donut-segment"]')).toHaveLength(0);
    expect(container.querySelector('circle')).not.toBeNull();
    expect(container.textContent).toContain('0talep');
  });
});
