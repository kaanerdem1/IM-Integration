import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import { slaHistoryCounterStyle, slaStatusPresentations } from '@/_helpers/sla';
import { IssueSlaStatusEnum } from '@/_helpers/sla/status';
import i18n from '@/_i18n/config';
import { WorkflowSlaStatusBadge } from './WorkflowSlaStatusBadge';

describe('WorkflowSlaStatusBadge', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (props: ComponentProps<typeof WorkflowSlaStatusBadge>) =>
    act(async () => {
      // Presentational badges must not require a query provider or fetch history.
      root.render(
        <MantineProvider env="test">
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <WorkflowSlaStatusBadge {...props} />
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </MantineProvider>
      );
    });

  it.each([
    { status: IssueSlaStatusEnum.OnTheWay, label: 'Yolunda', key: 'onTrack' },
    { status: IssueSlaStatusEnum.Risky, label: 'Riskli', key: 'risky' },
    { status: IssueSlaStatusEnum.Surpassing, label: 'Aşan', key: 'exceeded' },
    { status: IssueSlaStatusEnum.Completed, label: 'Tamamlandı', key: 'completed' },
  ] as const)(
    'keeps $label informational without a history action',
    async ({ status, label, key }) => {
      await render({ status, lateStepCount: 12 });
      const badge = container.querySelector<HTMLElement>('[data-testid="workflow-sla-status"]')!;
      expect(badge).toHaveTextContent(label);
      expect(badge.style.backgroundColor).toBe(
        slaStatusPresentations[key].badgeProps.style.backgroundColor
      );
      expect(badge.style.color).toBe(slaStatusPresentations[key].badgeProps.style.color);
      expect(badge).toHaveAttribute('tabindex', '0');
      expect(container.querySelector('[data-testid="workflow-history-action"]')).toBeNull();
      expect(
        container.querySelector('[data-testid="workflow-history-late-step-count"]')
      ).toBeNull();

      await act(async () => badge.focus());
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(
        i18n.t(`label.sla.statusDescriptions.${key}`)
      );
      expect(document.querySelector('[data-testid="workflow-history-tooltip-action"]')).toBeNull();
    }
  );

  it('updates the counter and callback from props without replacing the focused button', async () => {
    const previousOpen = vi.fn();
    const currentOpen = vi.fn();
    await render({ status: 'onTrack', lateStepCount: 12, onOpenHistory: previousOpen });
    const button = container.querySelector<HTMLButtonElement>(
      '[data-testid="workflow-history-action"]'
    )!;
    await act(async () => button.focus());
    expect(button).toHaveAttribute('type', 'button');
    expect(
      button.querySelector('[data-testid="workflow-history-late-step-count"]')
    ).toHaveTextContent('12');

    await render({ status: 'risky', lateStepCount: 0, onOpenHistory: currentOpen });
    expect(container.querySelector('[data-testid="workflow-history-action"]')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.querySelector('[data-testid="workflow-history-late-step-count"]')).toBeNull();
    expect(button).toHaveAttribute(
      'aria-label',
      `Riskli. ${i18n.t('label.reports.list.workflowDetailsOpenHint')}`
    );

    await render({ status: 'exceeded', lateStepCount: 99, onOpenHistory: currentOpen });
    expect(container.querySelector('[data-testid="workflow-history-action"]')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(
      button.querySelector('[data-testid="workflow-history-late-step-count"]')
    ).toHaveTextContent('99');
    expect(button).toHaveAttribute(
      'aria-label',
      `Aşan. ${i18n.t('label.requests.list.lateStepCountTooltip', { count: 99 })} ${i18n.t('label.reports.list.workflowDetailsOpenHint')}`
    );
    await act(async () => button.click());
    expect(currentOpen).toHaveBeenCalledOnce();
    expect(previousOpen).not.toHaveBeenCalled();

    await render({ status: 'exceeded', lateStepCount: 99 });
    expect(container.querySelector('[data-testid="workflow-history-action"]')).toBeNull();
    expect(container.querySelector('[data-testid="workflow-history-late-step-count"]')).toBeNull();
    expect(container.querySelector('[data-testid="workflow-sla-status"]')).toHaveTextContent(
      'Aşan'
    );
  });

  it.each([0, 3])('separates information from the history action with count %s', async (count) => {
    await render({ status: 'exceeded', lateStepCount: count, onOpenHistory: vi.fn() });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="workflow-history-action"]')!.focus()
    );
    const tooltip = document.querySelector('[role="tooltip"]')!;
    const info = tooltip.querySelector('[data-testid="workflow-history-tooltip-info"]');
    const action = tooltip.querySelector<HTMLElement>(
      '[data-testid="workflow-history-tooltip-action"]'
    );
    expect(info).toHaveTextContent(i18n.t('label.sla.statusDescriptions.exceeded'));
    expect(action).toHaveTextContent(i18n.t('label.reports.list.workflowDetailsOpenHint'));
    expect(info).not.toContainElement(action);
    expect(info).not.toHaveTextContent(i18n.t('label.reports.list.workflowDetailsOpenHint'));
    expect(tooltip.querySelector('[role="separator"]')).not.toBeNull();
    if (count > 0) {
      expect(info).toHaveTextContent(i18n.t('label.requests.list.lateStepCountTooltip', { count }));
    } else {
      expect(info).not.toHaveTextContent('Geçmiş adımların');
    }
  });

  it.each(['onTrack', 'risky', 'exceeded', 'completed'] as const)(
    'keeps the historical counter in the same color for current status %s',
    async (status) => {
      await render({ status, lateStepCount: 2, onOpenHistory: vi.fn() });
      const indicator = container.querySelector<HTMLElement>('.mantine-Indicator-indicator')!;
      expect(indicator.style.backgroundColor).toBe(slaHistoryCounterStyle.backgroundColor);
      expect(indicator.style.color).toBe(slaHistoryCounterStyle.color);
    }
  );

  it('preserves an uncontrolled form across status updates and history clicks', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onOpenHistory = vi.fn();
    const renderForm = (status: IssueSlaStatusEnum) =>
      act(async () =>
        root.render(
          <MantineProvider env="test">
            <form onSubmit={onSubmit}>
              <input aria-label="Draft" defaultValue="initial" />
              <WorkflowSlaStatusBadge
                status={status}
                lateStepCount={3}
                onOpenHistory={onOpenHistory}
              />
            </form>
          </MantineProvider>
        )
      );
    await renderForm(IssueSlaStatusEnum.OnTheWay);
    const input = container.querySelector('input')!;
    input.value = 'unsaved draft';
    input.focus();
    input.setSelectionRange(3, 7);

    for (const status of [IssueSlaStatusEnum.Surpassing, IssueSlaStatusEnum.Completed]) {
      await renderForm(status);
      expect(container.querySelector('input')).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('unsaved draft');
      expect(input.selectionStart).toBe(3);
      expect(input.selectionEnd).toBe(7);
    }

    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="workflow-history-action"]')!.click()
    );
    expect(onOpenHistory).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input.value).toBe('unsaved draft');
  });

  it.each([null, undefined])(
    'renders nothing for absent status %s, even with history',
    async (status) => {
      const onOpenHistory = vi.fn();
      await render({ status, lateStepCount: 3 });
      expect(container.querySelector('td')).toBeEmptyDOMElement();
      await render({ status, lateStepCount: 3, onOpenHistory });
      expect(container.querySelector('td')).toBeEmptyDOMElement();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
      expect(onOpenHistory).not.toHaveBeenCalled();
    }
  );

  it('removes the badge, counter and tooltip when a visible status becomes null', async () => {
    await render({ status: 'exceeded', lateStepCount: 3, onOpenHistory: vi.fn() });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="workflow-history-action"]')!.focus()
    );
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    await render({ status: null, lateStepCount: 3, onOpenHistory: vi.fn() });
    expect(container.querySelector('td')).toBeEmptyDOMElement();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    await render({ status: IssueSlaStatusEnum.OnTheWay });
    expect(container.querySelector('[data-testid="workflow-sla-status"]')).toHaveTextContent(
      'Yolunda'
    );
  });

  it('preserves report labels but does not override an explicit null status', async () => {
    await render({ fallbackLabel: 'Başarılı' });
    expect(container.querySelector('[data-testid="workflow-sla-status"]')).toHaveTextContent(
      'Başarılı'
    );
    await render({ status: null, fallbackLabel: 'Başarılı', onOpenHistory: vi.fn() });
    expect(container.querySelector('td')).toBeEmptyDOMElement();
  });

  it('shows Completed in gray without hiding past breaches', async () => {
    const onOpenHistory = vi.fn();
    await render({ status: IssueSlaStatusEnum.Completed, lateStepCount: 3, onOpenHistory });
    const badge = container.querySelector<HTMLElement>('[data-testid="workflow-sla-status"]')!;
    expect(badge).toHaveTextContent('Tamamlandı');
    expect(badge.style.backgroundColor).toBe(
      slaStatusPresentations.completed.badgeProps.style.backgroundColor
    );
    expect(
      container.querySelector('[data-testid="workflow-history-late-step-count"]')
    ).toHaveTextContent('3');
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="workflow-history-action"]')!.click()
    );
    expect(onOpenHistory).toHaveBeenCalledOnce();
  });
});
