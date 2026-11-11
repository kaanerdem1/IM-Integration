import type {
  EntityLogCreateDto,
  GanttChartResponseIEnumerableIResponse,
  IssueAttachmentCreateDto,
  IssueAttachmentDto,
  IssueFlowRequest,
  IssueTaskResponseDto,
  IssueUrlDto,
  ReportIssuePaginationDto,
  ReportPaginationStepDefinationDto,
  SlaInformationDto,
  TemporaryApproverUserResponseDto,
  TestResponseDto,
} from '@/_api/_core/api-gen/types';
import { QueryKeys } from '@/_api/hooks/query-keys';
import type { WorkflowTimelineItemModel } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import type {
  DashboardGraphicModalOptions,
  SavedDashboardGraphic,
} from '@/components/dashboard-graphic/types';
import type { DocumentUploadModalOptions } from '@/components/document-upload/DocumentUploadModal';
import { DeleteOptions } from '@/components/modal-host/delete-modal-types';
import type {
  RequestFilterModalOptions,
  SavedUserFormFilter,
} from '@/components/request-filter/_types';
import type { WorkflowEntityReference } from '@/components/workflow/WorkflowEntityIdentity';
import type { RequestCreationKindSelectModalOptions } from '@/pages/requests/_shared/creation/requestCreationKind';
import type { RequestFormPermissionScope } from '@/pages/requests/_shared/types';
import type { TaskFilterModalOptions } from '@/pages/tasks/list/filter/model';

export type ModalOptionsMap = {
  DashboardGraphic: DashboardGraphicModalOptions;
  DashboardGraphicDeleteConfirm: { item: SavedDashboardGraphic };
  Delegation: void;
  DelegationDeactivateConfirm: { item: TemporaryApproverUserResponseDto };
  Delete: DeleteOptions;
  UploadCancel: void;
  DocumentUpload: DocumentUploadModalOptions;
  WorkflowGantt: Pick<IssueUrlDto, 'Id' | 'No'> &
    Pick<GanttChartResponseIEnumerableIResponse, 'Data'>;
  WorkflowStepHistory: {
    entity?: WorkflowEntityReference;
    stepName: string;
    items: (WorkflowTimelineItemModel & { returnTargetName?: string })[];
  };
  WorkflowWorkStartConfirm: {
    entity: WorkflowEntityReference;
    targetStartDate?: SlaInformationDto['TargetStartDate'];
    onConfirm: () => void;
  };
  WorkflowApproveConfirm: {
    entity: WorkflowEntityReference;
    stepName?: string;
    onConfirm: () => void;
  };
  DocumentAdd: Pick<IssueAttachmentCreateDto, 'Id' | 'IssueId'> & {
    AttachmentType?: IssueAttachmentDto['AttachmentType'];
    AttachmentValue?: IssueAttachmentDto['AttachmentValue'];
    RequestNo?: string;
    IsRelatedProcess?: boolean;
    RelatedIds?: IssueAttachmentDto['Id'][];
  };
  TestsScenarioAdd: {
    issueId: string;
    permissionScope?: RequestFormPermissionScope;
    readOnly?: boolean;
    scenarioItem?: TestResponseDto;
  };
  TestsScenarioDetail: {
    permissionScope?: RequestFormPermissionScope;
    readOnly?: boolean;
    readOnlyViewAll?: boolean;
    scenarioItem: TestResponseDto;
  };
  TestsScenarioActionMessage: {
    permissionScope?: RequestFormPermissionScope;
    readOnly?: boolean;
    scenarioItem: TestResponseDto;
    type: TestResponseDto['Action'];
  };
  CommentSendConfirm: {
    invalidate?: QueryKeys[];
    onSuccess?: () => void;
    payload: EntityLogCreateDto;
  };
  CommentUnsentConfirm: {
    onDiscard: () => void;
  };
  PlanningSaveConfirm: {
    onSuccess?: () => void;
  };
  MindMapUnsavedChangesConfirm: {
    onDiscard: () => void;
  };
  MindMapDeleteConfirm: {
    onConfirm: () => Promise<boolean>;
  };
  MindMapName: {
    initialName?: string;
    mode: 'rename' | 'save';
    onConfirm: (name: string) => Promise<boolean>;
  };
  MentionDeleteConfirm: {
    mentionIds: string[];
    onSuccess?: () => void;
  };
  RequestTakeOwnershipConfirm: {
    formCode?: string;
    issueId: string;
    onConfirm?: () => void;
    requestNo?: string;
    workflowId: string;
  };
  RequestDirtyCloseConfirm: {
    mode?: 'close' | 'tab-change';
    onCancel?: () => void;
    onConfirm: () => void;
  };
  RequestCreationKindSelect: RequestCreationKindSelectModalOptions;
  RequestDraftNotice: void;
  RequestReleaseToPoolConfirm: {
    formCode?: string;
    onConfirm: () => void;
    requestNo?: string | null;
  };
  RequestFilter: RequestFilterModalOptions;
  TaskFilter: TaskFilterModalOptions;
  RequestListSavedFilterDeleteBlocked: {
    item: SavedUserFormFilter;
  };
  RequestListSavedFilterDeleteConfirm: {
    item: SavedUserFormFilter;
  };
  ReportWorkflowDetails: {
    formCode?: string;
    latestWorkflowStep?: ReportPaginationStepDefinationDto['Name'];
    requestNo?: ReportIssuePaginationDto['No'];
    slaStatus?: ReportIssuePaginationDto['SLAStatus'];
  } & (
    | { issueId: NonNullable<ReportIssuePaginationDto['Id']>; issueTaskId?: never; taskNo?: never }
    | {
        issueTaskId: NonNullable<IssueTaskResponseDto['Id']>;
        taskNo?: IssueTaskResponseDto['No'];
        issueId?: never;
      }
  );
  WorkflowActionNote:
    | {
        action: 'cancel' | 'reject';
        formCode: string;
        requestNo?: string;
        onBeforeSubmit?: () => void;
        onFailure?: () => void;
        onSuccess?: () => void | Promise<void>;
        payload: Pick<IssueFlowRequest, 'ApproverId' | 'IssueId'>;
      }
    | {
        action: 'cancel' | 'reject';
        note: string;
      };
};
