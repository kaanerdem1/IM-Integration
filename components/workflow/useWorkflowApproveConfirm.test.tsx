import { act, Profiler, StrictMode, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Modal } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { FormEnum } from '@/_common/forms';
import i18n from '@/_i18n/config';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { HostedModalStackProvider } from '@/components/modal-host/HostedModalStackContext';
import { Modal_Workflow_ApproveConfirm } from './modal/Modal_Workflow_ApproveConfirm';
import { useWorkflowApproveConfirm } from './useWorkflowApproveConfirm';

const Source = (props: Parameters<typeof useWorkflowApproveConfirm>[0]) => {
  const openConfirm = useWorkflowApproveConfirm(props);
  return (
    <button type="button" onClick={openConfirm}>
      Approve
    </button>
  );
};

describe('workflow approval confirmation', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let props: ComponentProps<typeof Source>;
  const approve = vi.fn();
  const sourceCommit = vi.fn();
  const render = (visible = true) =>
    act(() =>
      root.render(
        <StrictMode>
          <MantineProvider theme={theme} env="test">
            <form>
              <input defaultValue="draft" />
              {visible ? (
                <Profiler id="approval-source" onRender={sourceCommit}>
                  <Source {...props} />
                </Profiler>
              ) : null}
            </form>
            <Modal.Stack>
              <HostedModalStackProvider modalType="WorkflowApproveConfirm">
                <Modal_Workflow_ApproveConfirm />
              </HostedModalStackProvider>
            </Modal.Stack>
          </MantineProvider>
        </StrictMode>
      )
    );
  const open = () => act(() => container.querySelector('button')!.click());
  const click = (action: 'cancel' | 'confirm') =>
    act(() => document.getElementById(`workflow-approve-confirm-${action}-button`)!.click());
  const opened = () => useModalStore.getState().isModalOpen('WorkflowApproveConfirm');

  beforeEach(async () => {
    approve.mockReset();
    sourceCommit.mockReset();
    useModalStore.setState({ currentModals: [] });
    await i18n.changeLanguage('tr');
    props = {
      entity: { kind: 'request', number: 'YT-1', formCode: FormEnum.RequestForm },
      recordId: 'record-1',
      stepId: 'step-1',
      approverId: 'approver-1',
      enabled: true,
      onApprove: approve,
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

  it.each<ComponentProps<typeof Source>['entity']>([
    { kind: 'request', number: 'YT-1', formCode: FormEnum.RequestForm },
    { kind: 'request', number: 'OT-1', formCode: FormEnum.OperationalRequestForm },
    { kind: 'task', number: 'G-1' },
  ])('requires explicit confirmation for $number and ignores duplicate clicks', (entity) => {
    props.entity = entity;
    render();
    open();
    expect(approve).not.toHaveBeenCalled();
    expect(document.querySelector('[data-modal-info-band]')).toHaveTextContent(entity.number!);
    expect(document.querySelector('[role="dialog"]')).toHaveAccessibleName('Onayla');
    expect(document.querySelector('[data-testid="workflow-approve-confirm"]')).toHaveTextContent(
      'Bu iş akışı adımını onaylamak istiyor musunuz?'
    );
    click('cancel');
    expect(opened()).toBe(false);
    expect(approve).not.toHaveBeenCalled();
    open();
    act(() => {
      const button = document.getElementById('workflow-approve-confirm-confirm-button')!;
      button.click();
      button.click();
    });
    expect(approve).toHaveBeenCalledOnce();
    expect(opened()).toBe(false);
  });

  it.each([
    ['Planlama Tahmini', '“Planlama Tahmini” adımını onaylamak istiyor musunuz?'],
    ['  Analiz  ', '“Analiz” adımını onaylamak istiyor musunuz?'],
    [undefined, 'Bu iş akışı adımını onaylamak istiyor musunuz?'],
    ['', 'Bu iş akışı adımını onaylamak istiyor musunuz?'],
    ['   ', 'Bu iş akışı adımını onaylamak istiyor musunuz?'],
  ] as const)('uses the provided step name or generic text for %s', (stepName, description) => {
    props.stepName = stepName;
    render();
    open();
    expect(document.querySelector('[role="dialog"]')).toHaveAccessibleName('Onayla');
    expect(document.querySelector('[data-testid="workflow-approve-confirm"]')).toHaveTextContent(
      description
    );
    expect(approve).not.toHaveBeenCalled();
  });

  it.each(['recordId', 'stepId', 'approverId', 'enabled', 'unmount'] as const)(
    'closes an obsolete confirmation when %s changes',
    (field) => {
      render();
      open();
      if (field === 'enabled') {
        props.enabled = false;
      } else if (field !== 'unmount') {
        props[field] = 'changed';
      }
      render(field !== 'unmount');
      expect(opened()).toBe(false);
      expect(approve).not.toHaveBeenCalled();
    }
  );

  it('preserves the uncontrolled field and open confirmation on unrelated renders', () => {
    render();
    const input = container.querySelector('input')!;
    input.value = 'Unsaved text';
    open();
    const latestApprove = vi.fn();
    props = { ...props, entity: { ...props.entity }, onApprove: latestApprove };
    render();
    expect(opened()).toBe(true);
    expect(container.querySelector('input')).toBe(input);
    expect(input).toHaveValue('Unsaved text');
    click('confirm');
    expect(latestApprove).toHaveBeenCalledOnce();
    expect(approve).not.toHaveBeenCalled();
    expect(input).toHaveValue('Unsaved text');
  });

  it('does not open a confirmation for a disabled action', () => {
    props.enabled = false;
    render();
    open();
    expect(opened()).toBe(false);
    expect(approve).not.toHaveBeenCalled();
  });

  it('does not rerender the source when the confirmation opens or closes', () => {
    render();
    const commits = sourceCommit.mock.calls.length;
    expect(commits).toBeGreaterThan(0);
    open();
    expect(opened()).toBe(true);
    expect(sourceCommit).toHaveBeenCalledTimes(commits);
    click('cancel');
    expect(opened()).toBe(false);
    expect(sourceCommit).toHaveBeenCalledTimes(commits);
  });

  it('closes with Escape without approving', () => {
    render();
    open();
    act(() =>
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    );
    expect(opened()).toBe(false);
    expect(approve).not.toHaveBeenCalled();
  });

  it('does not close a replacement owned by another source on unmount', () => {
    render();
    open();
    const otherApprove = vi.fn();
    act(() =>
      useModalStore.getState().openModal('WorkflowApproveConfirm', {
        entity: { kind: 'task', number: 'G-2' },
        onConfirm: otherApprove,
      })
    );
    render(false);
    expect(opened()).toBe(true);
    click('confirm');
    expect(otherApprove).toHaveBeenCalledOnce();
    expect(approve).not.toHaveBeenCalled();
  });
});
