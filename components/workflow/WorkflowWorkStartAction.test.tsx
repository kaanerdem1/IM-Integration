import { act, StrictMode, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Modal } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { FormEnum } from '@/_common/forms';
import { TASK_NUMBER_BADGE_COLOR } from '@/_common/tasks/presentation';
import { getDate } from '@/_helpers/date';
import i18n from '@/_i18n/config';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { HostedModalStackProvider } from '@/components/modal-host/HostedModalStackContext';
import { Modal_Workflow_WorkStartConfirm } from './modal/Modal_Workflow_WorkStartConfirm';
import { WorkflowWorkStartAction } from './WorkflowWorkStartAction';

type Props = ComponentProps<typeof WorkflowWorkStartAction>;
const targetStartDate = Date.parse('2026-11-10T03:00:00+03:00') / 1000;

describe('manual work start confirmation', () => {
  let root: ReturnType<typeof createRoot>;
  let container: HTMLDivElement;
  let props: Props;
  const onStart = vi.fn();
  const render = (visible = true, secondAction?: Props) =>
    act(() =>
      root.render(
        <StrictMode>
          <MantineProvider theme={theme} env="test">
            {visible ? <WorkflowWorkStartAction key="first" {...props} /> : null}
            {secondAction ? <WorkflowWorkStartAction key="second" {...secondAction} /> : null}
            <Modal.Stack>
              <HostedModalStackProvider modalType="WorkflowWorkStartConfirm">
                <Modal_Workflow_WorkStartConfirm />
              </HostedModalStackProvider>
            </Modal.Stack>
          </MantineProvider>
        </StrictMode>
      )
    );
  const click = (id: string) => act(() => document.getElementById(id)!.click());
  const opened = () => useModalStore.getState().isModalOpen('WorkflowWorkStartConfirm');

  beforeEach(async () => {
    onStart.mockReset();
    useModalStore.setState({ currentModals: [] });
    await i18n.changeLanguage('tr');
    props = {
      entity: { kind: 'request', number: 'YT-1', formCode: FormEnum.RequestForm },
      nextStep: {
        Id: 'step',
        StepDefinationName: 'Analiz',
        Sla: { Id: 'sla', TargetStartDate: targetStartDate },
      },
      onStart,
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useModalStore.setState({ currentModals: [] });
  });

  it.each<Props['entity']>([
    { kind: 'request', number: 'YT-1', formCode: FormEnum.RequestForm },
    { kind: 'request', number: 'OT-1', formCode: FormEnum.OperationalRequestForm },
    { kind: 'task', number: 'GT-1' },
  ])('shows record and date without the step name before starting $number', (entity) => {
    props.entity = entity;
    render();
    click('workflow-button-startWork');
    expect(onStart).not.toHaveBeenCalled();
    const modal = document.querySelector('[data-testid="workflow-work-start-confirm"]')!;
    expect(modal).toHaveTextContent('Çalışmayı Manuel Başlat');
    expect(document.querySelector('[role="dialog"]')).toHaveAccessibleName(
      'Çalışmayı Manuel Başlat'
    );
    expect(modal.querySelector('[data-workflow-entity]')).toHaveTextContent(entity.number!);
    expect(modal.querySelector('[data-modal-info-band]')).toHaveTextContent(entity.number!);
    const plan = modal.querySelector('[data-testid="workflow-work-start-confirm-plan"]')!;
    expect(modal).not.toHaveTextContent('Analiz');
    expect(plan).toHaveTextContent(getDate(targetStartDate, 'd MMM yyyy'));
    expect(plan).not.toHaveTextContent(/\d{2}:\d{2}/);
    expect(plan.querySelector('time')).toHaveAttribute(
      'datetime',
      getDate(targetStartDate, 'yyyy-MM-dd')
    );
    const confirm = document.getElementById('workflow-work-start-confirm-confirm-button')!;
    if (entity.kind === 'task') {
      expect(confirm.style.getPropertyValue('--button-bg')).toBe(
        `var(--mantine-color-${TASK_NUMBER_BADGE_COLOR}-filled)`
      );
    }
    click('workflow-work-start-confirm-cancel-button');
    expect(opened()).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
    click('workflow-button-startWork');
    act(() => {
      const button = document.getElementById('workflow-work-start-confirm-confirm-button')!;
      button.click();
      button.click();
    });
    expect(onStart).toHaveBeenCalledOnce();
    expect(opened()).toBe(false);
  });

  it.each(['step', 'sla', 'date', 'record', 'disabled', 'unmount'] as const)(
    'cleans up the confirmation when %s changes',
    (change) => {
      render();
      click('workflow-button-startWork');
      expect(opened()).toBe(true);
      if (change === 'step') {
        props.nextStep = { ...props.nextStep, Id: 'new-step' };
      } else if (change === 'sla') {
        props.nextStep = { ...props.nextStep, Sla: { ...props.nextStep?.Sla, Id: 'new-sla' } };
      } else if (change === 'date') {
        props.nextStep = {
          ...props.nextStep,
          Sla: { ...props.nextStep?.Sla, TargetStartDate: targetStartDate + 86400 },
        };
      } else if (change === 'record') {
        props.entity = { kind: 'task', number: 'GT-2' };
      } else if (change === 'disabled') {
        props.disabled = true;
      }
      render(change !== 'unmount');
      expect(opened()).toBe(false);
      expect(onStart).not.toHaveBeenCalled();
    }
  );

  it('keeps an open confirmation during unrelated renders and uses the latest callback', () => {
    render();
    click('workflow-button-startWork');
    const latestStart = vi.fn();
    props.onStart = latestStart;
    props.nextStep = { ...props.nextStep };
    render();
    expect(opened()).toBe(true);
    click('workflow-work-start-confirm-confirm-button');
    expect(latestStart).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('keeps another record confirmation open when the first action unmounts', () => {
    const secondStart = vi.fn();
    const secondAction: Props = {
      ...props,
      entity: { kind: 'task', number: 'G-2' },
      onStart: secondStart,
    };
    render(true, secondAction);
    act(() =>
      container.querySelectorAll<HTMLButtonElement>('#workflow-button-startWork')[1].click()
    );
    render(false, secondAction);
    expect(opened()).toBe(true);
    expect(document.querySelector('[data-modal-info-band]')).toHaveTextContent('G-2');
    click('workflow-work-start-confirm-confirm-button');
    expect(secondStart).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });
});
