import { act, type ComponentProps, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { SlaInformationDto, WorkflowInformationDto } from '@/_api/_core/api-gen/types';
import { theme } from '@/_assets/style/theme';
import { WorkflowControls } from './WorkflowControls';
import { WorkflowTimeline } from './WorkflowTimeline';
import { WorkflowWorkStartButton } from './WorkflowWorkStartButton';

const mocks = vi.hoisted(() => ({ countdown: vi.fn(), slaCountdown: vi.fn(), tooltip: vi.fn() }));
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Tooltip: (props: ComponentProps<typeof actual.Tooltip>) => {
      mocks.tooltip(props);
      return <actual.Tooltip {...props} />;
    },
  };
});
vi.mock('@/_hooks/_modules/workflow/use-workflow-countdown', () => ({
  useWorkflowCountdown: mocks.countdown,
}));
vi.mock('@/_hooks/_modules/workflow/use-workflow-sla-countdown', () => ({
  useWorkflowSlaCountdown: mocks.slaCountdown,
}));
vi.mock('./cards', () => ({ CardContent: () => <span>Assigned user</span> }));

describe('workflow timer presentation', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const countdownHint =
    'Sayaç, işlem yapmak için kalan süreyi temsil eder. Süre dolunca kayıt otomatik olarak havuza bırakılır.';
  const startWorkHint =
    'Planlanan tarihten önce çalışmaya başlandığını bildirir. SLA süresi bu başlangıca göre hesaplanır.';
  const flowDetailData = {
    NextStep: {
      Sla: { TargetStartDate: 1_788_710_400, TargetEndDate: 1_788_969_600 },
    },
  } satisfies WorkflowInformationDto;
  const controls: ComponentProps<typeof WorkflowControls>['viewModel'] = {
    assignmentStartedAt: 1_788_710_400,
    isAssignedToCurrentUser: true,
    assignedCard: { kind: 'person', title: 'Assigned user', subtitle: 'Unit' },
    pendingApproversCard: null,
    statusCard: null,
    flowDetailData,
  };
  const timeline: ComponentProps<typeof WorkflowTimeline>['viewModel'] = {
    flowDetailData,
    timelineItems: [
      {
        key: 'current',
        date: '',
        stepDefinitionName: 'Current step',
        statusColor: 'gray',
        statusLabel: 'Pending',
        card: { kind: 'person', title: 'Assigned user', subtitle: 'Unit' },
      },
    ],
  };
  const render = (content: ReactNode) => {
    act(() =>
      root.render(
        <MantineProvider env="test" theme={theme}>
          {content}
        </MantineProvider>
      )
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countdown.mockReturnValue(3661);
    mocks.slaCountdown.mockImplementation(
      ({
        enabled,
        targetStartDate,
        targetEndDate,
      }: {
        enabled: boolean;
        targetStartDate?: number;
        targetEndDate?: number;
      }) =>
        enabled && targetStartDate && targetEndDate && targetEndDate > targetStartDate
          ? { slaCountdown: '03:00:00:00', slaCountdownColor: 'green' }
          : { slaCountdown: null, slaCountdownColor: null }
    );
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each([false, true])('always renders release as an icon (SLA enabled: %s)', (withSla) => {
    const onRelease = vi.fn();
    const onReject = vi.fn();
    render(
      <WorkflowControls
        viewModel={controls}
        disabled={false}
        onRelease={onRelease}
        onReject={onReject}
        withSla={withSla}
      />
    );
    const button = container.querySelector<HTMLButtonElement>('#workflow-button-unAssign');
    expect(button).not.toBeNull();
    expect(button?.classList.contains('mantine-ActionIcon-root')).toBe(true);
    expect(button?.textContent).toBe('');
    expect(button?.getAttribute('aria-label')).toBe('Havuza Bırak');
    expect(button?.querySelector('.tabler-icon-user-minus')).not.toBeNull();
    expect(button?.querySelector('.tabler-icon-arrow-back')).toBeNull();
    const rejectButton = container.querySelector<HTMLButtonElement>('#workflow-button-reject');
    expect(rejectButton?.querySelector('.tabler-icon-arrow-back')).not.toBeNull();
    expect(mocks.tooltip).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Havuza Bırak', position: 'bottom', withArrow: true })
    );
    act(() => button?.click());
    expect(onRelease).toHaveBeenCalledOnce();
    expect(onReject).not.toHaveBeenCalled();
    act(() => rejectButton?.click());
    expect(onReject).toHaveBeenCalledOnce();
    expect(onRelease).toHaveBeenCalledOnce();
  });

  it.each(['disabled', 'locked', 'releasing'] as const)(
    'keeps the release icon inactive while %s',
    (state) => {
      const onRelease = vi.fn();
      render(
        <WorkflowControls
          viewModel={controls}
          disabled={state === 'disabled'}
          locked={state === 'locked'}
          releasing={state === 'releasing'}
          onRelease={onRelease}
        />
      );
      const button = container.querySelector<HTMLButtonElement>('#workflow-button-unAssign');
      expect(button?.disabled).toBe(true);
      act(() => button?.click());
      expect(onRelease).not.toHaveBeenCalled();
    }
  );

  it('does not mount timers by default even when SLA data exists', () => {
    render(<WorkflowControls viewModel={controls} disabled={false} onApprove={vi.fn()} />);
    expect(container.querySelector('#workflow-button-approve')).not.toBeNull();
    expect(container.querySelector('.tabler-icon-clock')).toBeNull();
    expect(container.textContent).not.toContain('SLA:');
    expect(mocks.countdown).not.toHaveBeenCalled();
    expect(mocks.slaCountdown).not.toHaveBeenCalled();
  });

  it.each(['approve'] as const)(
    'explains the ownership deadline exactly while the %s countdown is visible',
    async (action) => {
      const renderAction = (withApprovalCountdown: boolean, isAssignedToCurrentUser = true) =>
        render(
          <WorkflowControls
            viewModel={{ ...controls, isAssignedToCurrentUser }}
            disabled={false}
            onApprove={vi.fn()}
            withApprovalCountdown={withApprovalCountdown}
          />
        );
      const hint = countdownHint;
      renderAction(true);
      const button = container.querySelector<HTMLButtonElement>(`#workflow-button-${action}`)!;
      expect(button).toHaveTextContent('01:01:01');
      expect(button).toHaveAttribute('aria-description', hint);
      await act(async () => button.dispatchEvent(new MouseEvent('mouseenter')));
      await vi.waitFor(() =>
        expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(hint)
      );

      mocks.countdown.mockReturnValue(0);
      renderAction(true);
      expect(button).toHaveTextContent('00:00:00');
      expect(button).toHaveAttribute('aria-description', hint);

      for (const [withCountdown, assigned] of [
        [false, true],
        [true, false],
      ]) {
        renderAction(withCountdown, assigned);
        const withoutCountdown = container.querySelector(`#workflow-button-${action}`)!;
        expect(withoutCountdown).not.toHaveTextContent('00:00:00');
        expect(withoutCountdown.getAttribute('aria-description') ?? '').not.toContain(
          countdownHint
        );
      }
    }
  );

  it('disables only approval and shows its reason on hover', async () => {
    const reason =
      'Bu iş akış adımının onaylanması için tamamlanması gereken görevler bulunmaktadır.';
    const hint = `${reason} ${countdownHint}`;
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onCancel = vi.fn();
    render(
      <WorkflowControls
        viewModel={controls}
        disabled={false}
        approveDisabledReason={reason}
        onApprove={onApprove}
        onReject={onReject}
        onCancel={onCancel}
        withApprovalCountdown
      />
    );

    const approve = container.querySelector<HTMLButtonElement>('#workflow-button-approve');
    const trigger = approve?.parentElement;
    expect(approve?.disabled).toBe(true);
    expect(approve?.getAttribute('aria-description')).toBe(hint);
    expect(container.querySelector<HTMLButtonElement>('#workflow-button-reject')?.disabled).toBe(
      false
    );
    expect(container.querySelector<HTMLButtonElement>('#workflow-button-cancel')?.disabled).toBe(
      false
    );
    expect(mocks.tooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        label: hint,
      })
    );
    act(() => approve?.click());
    expect(onApprove).not.toHaveBeenCalled();
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('mouseenter'));
    });
    await vi.waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(hint);
    });

    render(<WorkflowControls viewModel={controls} disabled={false} onApprove={onApprove} />);
    const enabledApprove = container.querySelector<HTMLButtonElement>('#workflow-button-approve');
    expect(enabledApprove?.disabled).toBe(false);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => enabledApprove?.click());
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it('preserves the general action lock when the approval reason is removed', () => {
    render(<WorkflowControls viewModel={controls} disabled onApprove={vi.fn()} />);
    expect(container.querySelector<HTMLButtonElement>('#workflow-button-approve')?.disabled).toBe(
      true
    );
  });

  it.each([false, true])(
    'keeps work start separate from workflow actions (disabled: %s)',
    async (disabled) => {
      const start = vi.fn();
      const approve = vi.fn();
      render(
        <>
          <WorkflowControls
            viewModel={controls}
            disabled={disabled}
            onApprove={approve}
            onCancel={vi.fn()}
            onReject={vi.fn()}
            withApprovalCountdown
          />
          <WorkflowWorkStartButton disabled={disabled} onClick={start} />
        </>
      );
      const button = container.querySelector<HTMLButtonElement>('#workflow-button-startWork')!;
      expect(button).toHaveTextContent('Manuel Başlat');
      expect(button).toHaveAttribute('data-block', 'true');
      expect(button).toHaveAttribute('aria-description', startWorkHint);
      expect(button).not.toHaveTextContent('01:01:01');
      expect(button.querySelector('.tabler-icon-clock')).toBeNull();
      expect(container.querySelector('#workflow-button-approve')).toHaveTextContent('01:01:01');
      for (const action of ['approve', 'reject', 'cancel', 'startWork']) {
        expect(
          container.querySelector<HTMLButtonElement>(`#workflow-button-${action}`)!.disabled
        ).toBe(disabled);
      }
      act(() => button.click());
      expect(start).toHaveBeenCalledTimes(disabled ? 0 : 1);
      expect(approve).not.toHaveBeenCalled();
      if (!disabled) {
        await act(async () => button.dispatchEvent(new MouseEvent('mouseenter')));
        await vi.waitFor(() =>
          expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(startWorkHint)
        );
      }
    }
  );

  it('does not mount an ownership countdown for the standalone work start button', () => {
    render(<WorkflowWorkStartButton onClick={vi.fn()} />);
    expect(mocks.countdown).not.toHaveBeenCalled();
    expect(container.querySelector('.tabler-icon-clock')).toBeNull();
    expect(container.querySelectorAll('.mantine-Divider-root')).toHaveLength(1);
  });

  it('shows the separate cancellation reason on hover', async () => {
    const approvalReason =
      'Bu iş akış adımının onaylanması için tamamlanması gereken görevler bulunmaktadır.';
    const reason =
      'Bu iş akış adımının iptal edilebilmesi için tamamlanması gereken görevler bulunmaktadır.';
    const onCancel = vi.fn();
    render(
      <WorkflowControls
        viewModel={controls}
        disabled={false}
        approveDisabledReason={approvalReason}
        cancelDisabledReason={reason}
        onApprove={vi.fn()}
        onCancel={onCancel}
        onReject={vi.fn()}
        onRelease={vi.fn()}
      />
    );
    const cancel = container.querySelector<HTMLButtonElement>('#workflow-button-cancel');
    expect(cancel).toBeDisabled();
    expect(cancel?.getAttribute('aria-description')).toBe(reason);
    expect(container.querySelector('#workflow-button-approve')).toBeDisabled();
    expect(container.querySelector('#workflow-button-approve')).toHaveAttribute(
      'aria-description',
      approvalReason
    );
    expect(container.querySelector('#workflow-button-reject')).toBeEnabled();
    expect(container.querySelector('#workflow-button-unAssign')).toBeEnabled();
    act(() => cancel?.click());
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => cancel?.parentElement?.dispatchEvent(new MouseEvent('mouseenter')));
    await vi.waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(reason)
    );

    render(<WorkflowControls viewModel={controls} disabled={false} onCancel={onCancel} />);
    const enabledCancel = container.querySelector<HTMLButtonElement>('#workflow-button-cancel');
    expect(enabledCancel).toBeEnabled();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => enabledCancel?.click());
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    'inherits the approval button color for its divider (disabled: %s)',
    (disabled) => {
      render(
        <WorkflowControls
          viewModel={controls}
          disabled={disabled}
          onApprove={vi.fn()}
          withApprovalCountdown
        />
      );
      const button = container.querySelector<HTMLButtonElement>('#workflow-button-approve');
      const divider = button?.querySelector<HTMLElement>('.mantine-Divider-root');
      expect(button?.disabled).toBe(disabled);
      expect(divider?.style.getPropertyValue('--divider-color')).toBe('currentColor');
    }
  );

  it('preserves the main issue assignment countdown and SLA', () => {
    render(
      <WorkflowControls
        viewModel={controls}
        disabled={false}
        onApprove={vi.fn()}
        withApprovalCountdown
        withSla
      />
    );
    expect(container.querySelector('#workflow-button-approve')?.textContent).toContain('01:01:01');
    expect(container.textContent).toContain('SLA: 03:00:00:00');
    expect(mocks.countdown).toHaveBeenCalledWith({
      assignmentStartedAt: 1_788_710_400,
      isAssigned: true,
    });
    expect(mocks.slaCountdown).toHaveBeenCalledWith({
      targetStartDate: 1_788_710_400,
      targetEndDate: 1_788_969_600,
      enabled: true,
    });
  });

  it('shows the approval countdown independently without mounting the SLA hook', () => {
    render(
      <WorkflowControls
        viewModel={{ ...controls, assignedCard: null }}
        disabled={false}
        onApprove={vi.fn()}
        withApprovalCountdown
      />
    );
    expect(container.querySelector('#workflow-button-approve')?.textContent).toContain('01:01:01');
    expect(mocks.countdown).toHaveBeenCalledWith({
      assignmentStartedAt: 1_788_710_400,
      isAssigned: true,
    });
    expect(container.textContent).not.toContain('SLA:');
    expect(mocks.slaCountdown).not.toHaveBeenCalled();
  });

  it('does not mount the approval countdown when no approval action is available', () => {
    render(
      <WorkflowControls
        viewModel={{ ...controls, isAssignedToCurrentUser: false }}
        disabled={false}
        withApprovalCountdown
      />
    );
    expect(container.querySelector('#workflow-button-approve')).toBeNull();
    expect(mocks.countdown).not.toHaveBeenCalled();
    expect(mocks.slaCountdown).not.toHaveBeenCalled();
  });

  it('can show SLA without mounting the approval countdown', () => {
    render(<WorkflowControls viewModel={controls} disabled={false} onApprove={vi.fn()} withSla />);
    expect(container.querySelector('#workflow-button-approve')).not.toBeNull();
    expect(container.querySelector('.tabler-icon-clock')).toBeNull();
    expect(container.textContent).toContain('SLA: 03:00:00:00');
    expect(mocks.countdown).not.toHaveBeenCalled();
  });

  it('does not calculate SLA when the timeline has not enabled it', () => {
    render(<WorkflowTimeline viewModel={timeline} onClose={vi.fn()} />);
    expect(container.textContent).toContain('Pending');
    expect(container.textContent).not.toContain('SLA:');
    expect(mocks.slaCountdown).not.toHaveBeenCalled();
  });

  it('preserves the main issue timeline SLA', () => {
    render(<WorkflowTimeline viewModel={timeline} onClose={vi.fn()} withSla />);
    expect(container.textContent).toContain('SLA: 03:00:00:00');
    expect(mocks.slaCountdown).toHaveBeenCalledWith({
      targetStartDate: 1_788_710_400,
      targetEndDate: 1_788_969_600,
      enabled: true,
    });
  });

  describe.each(['controls', 'timeline'] as const)('%s SLA source', (surface) => {
    const renderSla = (sla?: SlaInformationDto) => {
      const detail = { NextStep: { Sla: sla } } satisfies WorkflowInformationDto;
      render(
        surface === 'controls' ? (
          <WorkflowControls
            viewModel={{ ...controls, flowDetailData: detail }}
            disabled={false}
            withSla
          />
        ) : (
          <WorkflowTimeline
            viewModel={{ ...timeline, flowDetailData: detail }}
            onClose={vi.fn()}
            withSla
          />
        )
      );
    };

    it.each([
      undefined,
      { TargetStartDate: 1_788_710_400 },
      { TargetEndDate: 1_788_969_600 },
      { TargetStartDate: 1_788_710_400, TargetEndDate: 1_788_710_400 },
    ] satisfies (SlaInformationDto | undefined)[])(
      'does not show SLA when service dates are missing or invalid: %j',
      (sla) => {
        renderSla(sla);
        expect(mocks.slaCountdown).toHaveBeenCalledWith({
          targetStartDate: sla?.TargetStartDate,
          targetEndDate: sla?.TargetEndDate,
          enabled: true,
        });
        expect(container.textContent).not.toContain('SLA:');
      }
    );

    it('passes the exact server deadline without rounding', () => {
      renderSla({ TargetStartDate: 1_788_710_400, TargetEndDate: 1_788_883_045 });
      expect(mocks.slaCountdown).toHaveBeenCalledWith({
        targetStartDate: 1_788_710_400,
        targetEndDate: 1_788_883_045,
        enabled: true,
      });
    });

    it('passes both authoritative service dates to the SLA clock', () => {
      renderSla({ TargetStartDate: 1_788_710_400, TargetEndDate: 1_788_840_000 });
      expect(mocks.slaCountdown).toHaveBeenCalledWith({
        targetStartDate: 1_788_710_400,
        targetEndDate: 1_788_840_000,
        enabled: true,
      });
    });
  });
});
