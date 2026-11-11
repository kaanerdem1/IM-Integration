import type { ComponentType, LazyExoticComponent } from 'react';
import { lazyWithRetry } from '@/_root/lazyWithRetry';
import type { ModalState, ModalType } from '@/components/modal-host/core/type';

type LazyModalComponent = LazyExoticComponent<ComponentType>;

const Modal_Workflow_ActionNote = lazyWithRetry(() =>
  import('@/pages/requests/_shared/components/workflow-buttons/modal/Modal_Workflow_ActionNote').then(
    (module) => ({ default: module.Modal_Workflow_ActionNote })
  )
);
const Modal_Workflow_StepHistory = lazyWithRetry(() =>
  import('@/components/workflow/modal/Modal_Workflow_StepHistory').then((module) => ({
    default: module.Modal_Workflow_StepHistory,
  }))
);
const Modal_Workflow_WorkStartConfirm = lazyWithRetry(() =>
  import('@/components/workflow/modal/Modal_Workflow_WorkStartConfirm').then((module) => ({
    default: module.Modal_Workflow_WorkStartConfirm,
  }))
);
const Modal_Workflow_ApproveConfirm = lazyWithRetry(() =>
  import('@/components/workflow/modal/Modal_Workflow_ApproveConfirm').then((module) => ({
    default: module.Modal_Workflow_ApproveConfirm,
  }))
);
const Modal_Comment_SendConfirm = lazyWithRetry(() =>
  import('@/pages/requests/_shared/tabs/comments/modal/Modal_Comment_SendConfirm').then(
    (module) => ({ default: module.Modal_Comment_SendConfirm })
  )
);
const Modal_Comment_UnsentConfirm = lazyWithRetry(() =>
  import('@/pages/requests/_shared/tabs/comments/modal/Modal_Comment_UnsentConfirm').then(
    (module) => ({ default: module.Modal_Comment_UnsentConfirm })
  )
);
const Modal_Document_Add = lazyWithRetry(() =>
  import('@/pages/requests/_shared/tabs/documents/modal/Modal_Document_Add').then((module) => ({
    default: module.Modal_Document_Add,
  }))
);
const Modal_DocumentUpload = lazyWithRetry(() =>
  import('@/components/document-upload/Modal_DocumentUpload').then((module) => ({
    default: module.Modal_DocumentUpload,
  }))
);
const Modal_Planning_SaveConfirm = lazyWithRetry(() =>
  import('@/pages/requests/_shared/tabs/planning/modal/Modal_Planning_SaveConfirm').then(
    (module) => ({ default: module.Modal_Planning_SaveConfirm })
  )
);
const Modal_MindMap_UnsavedChangesConfirm = lazyWithRetry(() =>
  import('@/pages/requests/software-development/form/tabs/mind-map/modal/Modal_MindMap_UnsavedChangesConfirm').then(
    (module) => ({ default: module.Modal_MindMap_UnsavedChangesConfirm })
  )
);
const Modal_MindMap_DeleteConfirm = lazyWithRetry(() =>
  import('@/pages/requests/software-development/form/tabs/mind-map/modal/Modal_MindMap_DeleteConfirm').then(
    (module) => ({ default: module.Modal_MindMap_DeleteConfirm })
  )
);
const Modal_MindMap_Name = lazyWithRetry(() =>
  import('@/pages/requests/software-development/form/tabs/mind-map/modal/Modal_MindMap_Name').then(
    (module) => ({ default: module.Modal_MindMap_Name })
  )
);
const Modal_Mention_DeleteConfirm = lazyWithRetry(() =>
  import('@/pages/inbox/modal/Modal_Mention_DeleteConfirm').then((module) => ({
    default: module.Modal_Mention_DeleteConfirm,
  }))
);
const Modal_Request_TakeOwnershipConfirm = lazyWithRetry(() =>
  import('@/pages/requests/_shared/modals/Modal_Request_TakeOwnershipConfirm').then((module) => ({
    default: module.Modal_Request_TakeOwnershipConfirm,
  }))
);
const Modal_Request_DraftNotice = lazyWithRetry(() =>
  import('@/pages/requests/_shared/modals/Modal_Request_DraftNotice').then((module) => ({
    default: module.Modal_Request_DraftNotice,
  }))
);
const Modal_Request_CreationKindSelect = lazyWithRetry(() =>
  import('@/pages/requests/_shared/creation/Modal_Request_CreationKindSelect').then((module) => ({
    default: module.Modal_Request_CreationKindSelect,
  }))
);
const Modal_Request_DirtyCloseConfirm = lazyWithRetry(() =>
  import('@/pages/requests/_shared/modals/Modal_Request_DirtyCloseConfirm').then((module) => ({
    default: module.Modal_Request_DirtyCloseConfirm,
  }))
);
const Modal_Request_ReleaseToPoolConfirm = lazyWithRetry(() =>
  import('@/pages/requests/_shared/modals/Modal_Request_ReleaseToPoolConfirm').then((module) => ({
    default: module.Modal_Request_ReleaseToPoolConfirm,
  }))
);
const Modal_RequestFilter = lazyWithRetry(() =>
  import('@/components/request-filter/modal/Modal_RequestFilter').then((module) => ({
    default: module.Modal_RequestFilter,
  }))
);
const Modal_TaskFilter = lazyWithRetry(() =>
  import('@/pages/tasks/list/modal/Modal_TaskFilter').then((module) => ({
    default: module.Modal_TaskFilter,
  }))
);
const Modal_RequestList_SavedFilterDeleteBlocked = lazyWithRetry(() =>
  import('@/components/request-filter/modal/Modal_RequestList_SavedFilterDeleteBlocked').then(
    (module) => ({ default: module.Modal_RequestList_SavedFilterDeleteBlocked })
  )
);
const Modal_RequestList_SavedFilterDeleteConfirm = lazyWithRetry(() =>
  import('@/components/request-filter/modal/Modal_RequestList_SavedFilterDeleteConfirm').then(
    (module) => ({
      default: module.Modal_RequestList_SavedFilterDeleteConfirm,
    })
  )
);
const Modal_Report_WorkflowDetails = lazyWithRetry(() =>
  import('@/pages/reports/modal/workflow-details/Modal_Report_WorkflowDetails').then((module) => ({
    default: module.Modal_Report_WorkflowDetails,
  }))
);
const Modal_TestsScenario_ActionMessage = lazyWithRetry(() =>
  import('@/pages/requests/software-development/form/tabs/tests/modal/Modal_TestsScenario_ActionMessage').then(
    (module) => ({ default: module.Modal_TestsScenario_ActionMessage })
  )
);
const Modal_TestsScenario_Add = lazyWithRetry(() =>
  import('@/pages/requests/software-development/form/tabs/tests/modal/Modal_TestsScenario_Add').then(
    (module) => ({ default: module.Modal_TestsScenario_Add })
  )
);
const Modal_TestsScenario_Delete = lazyWithRetry(() =>
  import('@/pages/requests/software-development/form/tabs/tests/modal/Modal_TestsScenario_Delete').then(
    (module) => ({ default: module.Modal_TestsScenario_Delete })
  )
);
const Modal_TestsScenario_Detail = lazyWithRetry(() =>
  import('@/pages/requests/software-development/form/tabs/tests/modal/Modal_TestsScenario_Detail').then(
    (module) => ({ default: module.Modal_TestsScenario_Detail })
  )
);
const Modal_UploadCancel = lazyWithRetry(() =>
  import('@/components/upload/_modal/Modal_UploadCancel').then((module) => ({
    default: module.Modal_UploadCancel,
  }))
);
const Modal_Workflow_Gantt = lazyWithRetry(() =>
  import('@/components/workflow-gantt/modal/Modal_Workflow_Gantt').then((module) => ({
    default: module.Modal_Workflow_Gantt,
  }))
);
const Modal_Delegation = lazyWithRetry(() =>
  import('@/pages/delegation/modal/Modal_Delegation').then((module) => ({
    default: module.Modal_Delegation,
  }))
);
const Modal_Delegation_DeactivateConfirm = lazyWithRetry(() =>
  import('@/pages/delegation/modal/Modal_Delegation_DeactivateConfirm').then((module) => ({
    default: module.Modal_Delegation_DeactivateConfirm,
  }))
);

const Modal_DashboardGraphic_DeleteConfirm = lazyWithRetry(() =>
  import('@/components/dashboard-graphic/modal/Modal_DashboardGraphic_DeleteConfirm').then(
    (module) => ({
      default: module.Modal_DashboardGraphic_DeleteConfirm,
    })
  )
);
const Modal_DashboardGraphic = lazyWithRetry(() =>
  import('@/components/dashboard-graphic/modal/Modal_DashboardGraphic').then((module) => ({
    default: module.Modal_DashboardGraphic,
  }))
);

export const modalRegistry = {
  CommentSendConfirm: Modal_Comment_SendConfirm,
  CommentUnsentConfirm: Modal_Comment_UnsentConfirm,
  DashboardGraphic: Modal_DashboardGraphic,
  DashboardGraphicDeleteConfirm: Modal_DashboardGraphic_DeleteConfirm,
  Delegation: Modal_Delegation,
  DelegationDeactivateConfirm: Modal_Delegation_DeactivateConfirm,
  Delete: Modal_TestsScenario_Delete,
  DocumentAdd: Modal_Document_Add,
  DocumentUpload: Modal_DocumentUpload,
  MindMapDeleteConfirm: Modal_MindMap_DeleteConfirm,
  MindMapName: Modal_MindMap_Name,
  MindMapUnsavedChangesConfirm: Modal_MindMap_UnsavedChangesConfirm,
  MentionDeleteConfirm: Modal_Mention_DeleteConfirm,
  PlanningSaveConfirm: Modal_Planning_SaveConfirm,
  ReportWorkflowDetails: Modal_Report_WorkflowDetails,
  RequestCreationKindSelect: Modal_Request_CreationKindSelect,
  RequestDirtyCloseConfirm: Modal_Request_DirtyCloseConfirm,
  RequestDraftNotice: Modal_Request_DraftNotice,
  RequestFilter: Modal_RequestFilter,
  RequestListSavedFilterDeleteBlocked: Modal_RequestList_SavedFilterDeleteBlocked,
  RequestListSavedFilterDeleteConfirm: Modal_RequestList_SavedFilterDeleteConfirm,
  RequestReleaseToPoolConfirm: Modal_Request_ReleaseToPoolConfirm,
  RequestTakeOwnershipConfirm: Modal_Request_TakeOwnershipConfirm,
  TaskFilter: Modal_TaskFilter,
  TestsScenarioActionMessage: Modal_TestsScenario_ActionMessage,
  TestsScenarioAdd: Modal_TestsScenario_Add,
  TestsScenarioDetail: Modal_TestsScenario_Detail,
  UploadCancel: Modal_UploadCancel,
  WorkflowGantt: Modal_Workflow_Gantt,
  WorkflowActionNote: Modal_Workflow_ActionNote,
  WorkflowStepHistory: Modal_Workflow_StepHistory,
  WorkflowWorkStartConfirm: Modal_Workflow_WorkStartConfirm,
  WorkflowApproveConfirm: Modal_Workflow_ApproveConfirm,
} satisfies Record<ModalType, LazyModalComponent>;

export interface ActiveModalEntry {
  component: LazyModalComponent;
  key: string;
  type: ModalType;
}

export const resolveActiveModalEntries = (
  currentModals: readonly ModalState[]
): ActiveModalEntry[] => {
  const resolvedTypes = new Set<ModalType>();

  return currentModals.flatMap((modal) => {
    if (resolvedTypes.has(modal.type)) {
      return [];
    }

    resolvedTypes.add(modal.type);

    return [{ component: modalRegistry[modal.type], key: modal.type, type: modal.type }];
  });
};
