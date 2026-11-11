import { act, type ReactNode } from 'react';
import activityClasses from '../WorkflowStepProgress.module.scss';
import classes from './Modal_Workflow_StepHistory.module.scss';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { FormEnum } from '@/_common/forms';
import { WorkflowApproverStatusEnum } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import i18n from '@/_i18n/config';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import type { ModalOptionsMap } from '@/components/modal-host/definition';
import { Modal_Workflow_StepHistory } from './Modal_Workflow_StepHistory';

vi.mock('@/components/display/Modal/Modal', () => ({
  Modal: ({
    opened,
    title,
    children,
  }: {
    opened: boolean;
    title: ReactNode;
    children: ReactNode;
  }) =>
    opened ? (
      <section role="dialog">
        <h2>{title}</h2>
        {children}
      </section>
    ) : null,
}));

describe('Modal_Workflow_StepHistory', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const originalLanguage = i18n.language;
  const note =
    'Alfa test senaryolarında çalışma koşulları ve firma bazlı istisnalar eksik. Rapor filtreleri güncellenmeli, yetki kontrolleri doğrulanmalı ve test sonuçları eklenerek talep yine onaya gönderilmelidir.';
  const options: ModalOptionsMap['WorkflowStepHistory'] = {
    entity: { kind: 'request', number: 'YT-11873', formCode: FormEnum.RequestForm },
    stepName: 'Alfa Test',
    items: Array.from({ length: 5 }, (_, index) => ({
      key: `event-${index}`,
      card: { kind: 'person', title: `Onaycı ${index}`, subtitle: 'Test Birimi' },
      date: `${21 - index} Eki 2026`,
      stepDefinitionName: 'Alfa Test',
      statusColor: index === 0 ? 'red' : 'orange',
      statusLabel: index === 0 ? 'İptal Edildi' : 'İade Edildi',
      statusValue:
        index === 0 ? WorkflowApproverStatusEnum.Cancel : WorkflowApproverStatusEnum.Reject,
      returnTargetName: index === 0 ? undefined : 'Yazılım Geliştirme',
      note,
    })),
  };

  const render = () => {
    act(() =>
      root.render(
        <MantineProvider env="test" theme={theme}>
          <Modal_Workflow_StepHistory />
        </MantineProvider>
      )
    );
  };

  beforeEach(async () => {
    await i18n.changeLanguage('tr');
    useModalStore.setState({ currentModals: [] });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    act(() => root.unmount());
    container.remove();
    useModalStore.setState({ currentModals: [] });
    await i18n.changeLanguage(originalLanguage);
  });

  it.each(['tr', 'en'])(
    'reads every supplied item and full note without opening another modal (%s)',
    async (language) => {
      await i18n.changeLanguage(language);
      useModalStore.getState().openModal('WorkflowStepHistory', options);
      render();
      expect(container.querySelector('h2')?.textContent).toBe(
        language === 'tr' ? 'Önceki işlemler' : 'Previous activity'
      );
      expect(container.querySelector('[data-workflow-entity="request"]')?.textContent).toContain(
        'YT-11873'
      );
      expect(container.querySelector('[data-modal-info-band]')?.textContent).toContain('Alfa Test');
      expect(container.querySelector('[data-modal-info-band]')?.textContent).toContain(
        language === 'tr' ? 'İş Akışı Adımı' : 'Workflow Step'
      );
      const stepBadge = container.querySelector('[title="Alfa Test"]');
      expect(stepBadge?.textContent).toBe('Alfa Test');
      expect(stepBadge?.getAttribute('data-variant')).toBe('light');
      expect(stepBadge?.getAttribute('data-size')).toBe('xs');
      expect(stepBadge?.getAttribute('style')).toContain('--mantine-color-cyan-light');
      const summary = container.querySelector(`.${classes.summary}`);
      expect(summary?.textContent).toBe(
        language === 'tr' ? '5 işlem · Güncelden eskiye' : '5 activities · Newest to oldest'
      );
      const viewport = container.querySelector('.mantine-ScrollArea-viewport');
      expect(viewport).not.toBeNull();
      expect(viewport?.contains(summary)).toBe(false);
      expect(viewport?.querySelectorAll('[role="listitem"]')).toHaveLength(5);
      const items = Array.from(container.querySelectorAll('[role="listitem"]'));
      expect(items).toHaveLength(5);
      items.forEach((item, index) => {
        expect(item.textContent).toContain(`Onaycı ${index}`);
        expect(item.textContent).toContain(`${21 - index} Eki 2026`);
        expect(item.textContent?.match(/Test Birimi/g)).toHaveLength(1);
        expect(item.textContent).toContain(options.items[index].statusLabel);
        expect(item.querySelector(`.${activityClasses.historyEvent}`)?.textContent).toBe(
          `${options.items[index].statusLabel}${options.items[index].date}·Onaycı ${index} · Test Birimi`
        );
        expect(item.querySelector('.mantine-Timeline-itemBullet svg')).not.toBeNull();
        expect(item.querySelectorAll(`.${activityClasses.historyActor}`)).toHaveLength(1);
        expect(item.querySelector(`.${activityClasses.historyActor}`)?.textContent).toBe(
          `Onaycı ${index} · Test Birimi`
        );
        expect(item.textContent).toContain(note);
        expect(item.querySelector(`.${classes.note}`)?.textContent).toContain(note);
        expect(item.querySelector(`.${classes.note}`)?.hasAttribute('data-line-clamp')).toBe(false);
        expect(item.querySelector('button')).toBeNull();
      });
      expect(items[0].textContent).toContain(
        language === 'tr' ? 'İptal Nedeni' : 'Cancellation Reason'
      );
      expect(items[0].textContent).not.toContain('Yazılım Geliştirme');
      expect(items[1].textContent).toContain('Yazılım Geliştirme');
      expect(items[1].textContent).toContain(language === 'tr' ? 'İade Nedeni' : 'Return Reason');
      const close = container.querySelector<HTMLButtonElement>('button')!;
      expect(close.textContent).toBe(language === 'tr' ? 'Kapat' : 'Close');
      act(() => close.click());
      expect(useModalStore.getState().currentModals).toHaveLength(0);
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    }
  );

  it('renders nothing while closed and uses fresh items when opened again', () => {
    render();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    act(() => useModalStore.getState().openModal('WorkflowStepHistory', options));
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(5);
    act(() => useModalStore.getState().closeModal('WorkflowStepHistory'));
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    act(() =>
      useModalStore.getState().openModal('WorkflowStepHistory', {
        entity: { kind: 'task', number: 'GT-2026', parentRequestNo: 'YT-42' },
        stepName: 'Kapsam Kontrol',
        items: [
          {
            ...options.items[0],
            key: 'updated',
            card: { kind: 'person', title: 'Yeni onaycı', subtitle: 'Yeni Birim' },
            note: 'Yeni gerekçe',
          },
        ],
      })
    );
    expect(container.querySelector('h2')?.textContent).toBe('Önceki işlemler');
    expect(container.querySelector('[data-modal-info-band]')?.textContent).toContain(
      'Kapsam Kontrol'
    );
    const stepBadge = container.querySelector('[title="Kapsam Kontrol"]');
    expect(stepBadge?.textContent).toBe('Kapsam Kontrol');
    expect(stepBadge?.getAttribute('data-variant')).toBe('light');
    expect(stepBadge?.getAttribute('data-size')).toBe('xs');
    expect(stepBadge?.getAttribute('style')).toContain('--mantine-color-indigo-light');
    expect(container.querySelector('[data-workflow-entity="task"]')?.textContent).toContain(
      'GT-2026'
    );
    expect(container.querySelector('[data-modal-info-band]')?.textContent).toContain('YT-42');
    expect(container.textContent).not.toContain('YT-11873');
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(container.textContent).toContain('Yeni onaycı');
    expect(container.querySelector(`.${activityClasses.historyActor}`)?.textContent).toBe(
      'Yeni onaycı · Yeni Birim'
    );
    expect(container.textContent).toContain('Yeni gerekçe');
    expect(container.textContent).not.toContain(note);
    expect(useModalStore.getState().currentModals).toHaveLength(1);
  });

  it('omits empty and unrelated notes and renders a multiline reason as plain text', () => {
    const multilineNote = 'İlk kontrol eksik.\n\n<em>İkinci kontrol tekrar yapılmalı.</em>';
    useModalStore.getState().openModal('WorkflowStepHistory', {
      stepName: 'Alfa Test',
      items: [
        { ...options.items[1], key: 'with-note', note: multilineNote },
        { ...options.items[1], key: 'blank-note', note: ' \n ' },
        { ...options.items[0], key: 'missing-note', note: undefined },
        {
          ...options.items[1],
          key: 'approved',
          statusValue: WorkflowApproverStatusEnum.Approved,
          statusLabel: 'Onaylandı',
          statusColor: 'green',
          note: 'Onay kaydının notu',
        },
      ],
    });
    render();
    const items = Array.from(container.querySelectorAll('[role="listitem"]'));
    expect(items).toHaveLength(4);
    expect(items[0].textContent).toContain(multilineNote);
    expect(items[0].querySelector('em')).toBeNull();
    expect(items[1].textContent).not.toContain('İade Nedeni');
    expect(items[2].textContent).not.toContain('İptal Nedeni');
    expect(items[3].textContent).not.toContain('Onay kaydının notu');
    expect(items[3].textContent).not.toContain('İade Edilen Adım');
    expect(container.querySelectorAll('[role="listitem"] button')).toHaveLength(0);
  });
});
