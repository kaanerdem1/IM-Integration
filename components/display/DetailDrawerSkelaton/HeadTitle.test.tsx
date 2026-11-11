import { act } from 'react';
import classes from './style.module.scss';
import { IconClipboardCheck } from '@tabler/icons-react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { label as englishLabels } from '@/_i18n/En/_label';
import { label as turkishLabels } from '@/_i18n/Tr/_label';
import { DrawerDetailHeadTitle } from './HeadTitle';

describe('DrawerDetailHeadTitle', () => {
  it.each(['hover', 'focus'] as const)(
    'only opens the subject tooltip when clipped, measuring the current width on %s',
    async (interaction) => {
      vi.useFakeTimers();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      try {
        act(() =>
          root.render(
            <MantineProvider env="test">
              <DrawerDetailHeadTitle
                icon={IconClipboardCheck}
                title="YT-123"
                subject="Talep başlığı"
              />
            </MantineProvider>
          )
        );
        const title = container.querySelector<HTMLElement>('[data-testid="drawer-head-subject"]')!;
        let visibleWidth = 200;
        const measure = vi.fn(() => 200);
        Object.defineProperties(title, {
          clientWidth: { get: () => visibleWidth },
          scrollWidth: { get: measure },
        });
        expect(measure).not.toHaveBeenCalled();
        expect(title).not.toHaveAttribute('title');

        for (const width of [200, 100, 300]) {
          visibleWidth = width;
          act(() => {
            if (interaction === 'focus') {
              title.focus();
            } else {
              title.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              title.dispatchEvent(new MouseEvent('mouseenter'));
            }
          });
          await act(async () => vi.advanceTimersByTimeAsync(250));
          if (width < 200) {
            expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Talep başlığı');
          } else {
            expect(document.querySelector('[role="tooltip"]')).toBeNull();
          }
          act(() => {
            title.blur();
            title.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
            title.dispatchEvent(new MouseEvent('mouseleave'));
          });
          await act(async () => vi.advanceTimersByTimeAsync(250));
        }
        expect(measure).toHaveBeenCalledTimes(3);
      } finally {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
      }
    }
  );

  it('truncates the subject beside the number, keeps badges below, and exposes the full title on focus', async () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const subject = 'Kurumsal ödeme işlemlerinin analiz ve geliştirme çalışması';
    try {
      act(() =>
        root.render(
          <MantineProvider env="test">
            <DrawerDetailHeadTitle
              icon={IconClipboardCheck}
              title="G-678"
              subject={subject}
              badge={<span>Analiz</span>}
            />
          </MantineProvider>
        )
      );
      const title = container.querySelector<HTMLElement>('[data-testid="drawer-head-subject"]')!;
      Object.defineProperties(title, {
        clientWidth: { configurable: true, value: 100 },
        scrollWidth: { configurable: true, value: 200 },
      });
      expect(title).toHaveAttribute('data-truncate', 'end');
      expect(title.parentElement).toHaveClass(classes.headTitleRow);
      expect(title.parentElement).toHaveTextContent('G-678');
      expect(title.parentElement).not.toHaveTextContent('Analiz');
      expect(container.querySelector(`.${classes.headBadges}`)).toHaveTextContent('Analiz');

      act(() => title.focus());
      await act(async () => vi.advanceTimersByTimeAsync(200));
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(subject);
    } finally {
      act(() => root.unmount());
      container.remove();
      vi.useRealTimers();
    }
  });

  it.each([undefined, null, '', '   '])(
    'omits a blank subject (%s) and its separator',
    (subject) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      try {
        act(() =>
          root.render(
            <MantineProvider env="test">
              <DrawerDetailHeadTitle icon={IconClipboardCheck} title="YT-123" subject={subject} />
            </MantineProvider>
          )
        );
        expect(container.querySelector('[data-testid="drawer-head-subject"]')).toBeNull();
        expect(container.querySelector(`.${classes.headSubjectSeparator}`)).toBeNull();
        expect(container.querySelector(`.${classes.headBadges}`)).toBeNull();
        expect(container.querySelector(`.${classes.headTitleText}`)).toHaveTextContent('YT-123');
      } finally {
        act(() => root.unmount());
      }
    }
  );

  it.each([
    [turkishLabels.label.unit, 'Birim'],
    [englishLabels.label.unit, 'Unit'],
  ])(
    'shows the localized %s label and full unit value in its tooltip',
    async (label, expectedLabel) => {
      vi.useFakeTimers();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      const unitName =
        'Kurumsal Krediler Kullandırım ve Bireysel Krediler Teknoloji Geliştirme Birimi';
      try {
        act(() =>
          root.render(
            <MantineProvider env="test">
              <DrawerDetailHeadTitle
                icon={IconClipboardCheck}
                title="G-678"
                meta={[
                  { key: 'unit', label, text: unitName },
                  { key: 'createdAt', label: 'Oluşturulma Tarihi', text: '16 Eki 2026, 09:11' },
                ]}
              />
            </MantineProvider>
          )
        );
        const entries = container.querySelectorAll(`.${classes.headMetaEntry}`);
        expect(entries).toHaveLength(2);
        expect(entries[1]).toHaveTextContent('16 Eki 2026, 09:11');
        act(() =>
          entries[0]
            .querySelector(`.${classes.headMetaItem}`)!
            .dispatchEvent(new MouseEvent('mouseenter'))
        );
        await act(async () => vi.advanceTimersByTimeAsync(200));
        expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
          `${expectedLabel}: ${unitName}`
        );
        expect(document.querySelector('[role="tooltip"] strong')?.textContent).toBe(
          `${expectedLabel}:`
        );
      } finally {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
      }
    }
  );

  it.each([
    [undefined, 'cyan'],
    ['blue', 'blue'],
  ])(
    'uses icon color %s without changing the default request presentation',
    (iconColor, expectedColor) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      try {
        act(() =>
          root.render(
            <MantineProvider env="test">
              <DrawerDetailHeadTitle
                icon={IconClipboardCheck}
                iconColor={iconColor}
                title="G-365"
                meta={[{ key: 'creator', text: 'Oluşturan' }]}
              />
            </MantineProvider>
          )
        );
        const icon = container.querySelector<HTMLElement>('.mantine-ThemeIcon-root');
        expect(icon?.style.background).toBe(`var(--mantine-color-${expectedColor}-0)`);
        expect(icon?.style.color).toBe(`var(--mantine-color-${expectedColor}-8)`);
        expect(container.textContent).toContain('G-365');
        expect(container.textContent).toContain('Oluşturan');
      } finally {
        act(() => root.unmount());
      }
    }
  );
});
