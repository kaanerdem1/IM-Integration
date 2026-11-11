import { describe, expect, it } from 'vitest';
import type { ModalState, ModalType } from '@/components/modal-host/core/type';
import { modalRegistry, resolveActiveModalEntries } from './modal-registry';

const EXPECTED_MODAL_TYPES = [
  'CommentSendConfirm',
  'CommentUnsentConfirm',
  'DashboardGraphic',
  'DashboardGraphicDeleteConfirm',
  'Delegation',
  'DelegationDeactivateConfirm',
  'Delete',
  'DocumentAdd',
  'DocumentUpload',
  'MindMapDeleteConfirm',
  'MindMapName',
  'MindMapUnsavedChangesConfirm',
  'MentionDeleteConfirm',
  'PlanningSaveConfirm',
  'ReportWorkflowDetails',
  'RequestCreationKindSelect',
  'RequestDirtyCloseConfirm',
  'RequestDraftNotice',
  'RequestFilter',
  'RequestListSavedFilterDeleteBlocked',
  'RequestListSavedFilterDeleteConfirm',
  'RequestReleaseToPoolConfirm',
  'RequestTakeOwnershipConfirm',
  'TaskFilter',
  'TestsScenarioActionMessage',
  'TestsScenarioAdd',
  'TestsScenarioDetail',
  'UploadCancel',
  'WorkflowGantt',
  'WorkflowActionNote',
  'WorkflowStepHistory',
  'WorkflowWorkStartConfirm',
  'WorkflowApproveConfirm',
] as const satisfies readonly ModalType[];

describe('modal registry', () => {
  it('contains every hosted modal exactly once', () => {
    expect(Object.keys(modalRegistry)).toEqual(EXPECTED_MODAL_TYPES);
  });

  it('returns no entries for a closed stack and preserves nested modal order', () => {
    expect(resolveActiveModalEntries([])).toEqual([]);

    const entries = resolveActiveModalEntries([
      { type: 'RequestDraftNotice' },
      { type: 'RequestDirtyCloseConfirm', options: { onConfirm: () => undefined } },
    ] as ModalState[]);

    expect(entries.map((entry) => entry.type)).toEqual([
      'RequestDraftNotice',
      'RequestDirtyCloseConfirm',
    ]);
  });

  it('returns each modal type once when the stack contains duplicates', () => {
    const entries = resolveActiveModalEntries([
      { type: 'RequestDraftNotice' },
      { type: 'RequestDraftNotice' },
      { type: 'RequestDirtyCloseConfirm', options: { onConfirm: () => undefined } },
    ] as ModalState[]);

    expect(entries.map((entry) => entry.type)).toEqual([
      'RequestDraftNotice',
      'RequestDirtyCloseConfirm',
    ]);
  });
});
