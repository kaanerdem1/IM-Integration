import { useCallback, useEffect, useRef, useState } from 'react';
import type { IssueUrlDto } from '@/_api/_core/api-gen/types';
import { useIssueGanttchart } from '@/_api/hooks';
import { useModalActions } from '@/components/modal-host/_hook/useModal';

export type WorkflowGanttRequest = Pick<IssueUrlDto, 'No'> & {
  issueId: NonNullable<IssueUrlDto['Id']>;
};

export const useWorkflowGanttModal = () => {
  const { openModal } = useModalActions();
  const requestInProgressRef = useRef(false);
  const [request, setRequest] = useState<WorkflowGanttRequest | null>(null);
  const issueId = request?.issueId.trim() ?? '';
  const { data, isError, isFetching, isSuccess } = useIssueGanttchart(issueId, {
    enabled: Boolean(issueId),
    staleTime: 0,
  });

  useEffect(() => {
    if (!request || isFetching || (!isSuccess && !isError)) {
      return;
    }

    if (isSuccess && data?.Data?.length) {
      const normalizedNo = request.No?.trim();

      openModal('WorkflowGantt', {
        Id: request.issueId,
        ...(normalizedNo ? { No: normalizedNo } : {}),
        Data: data.Data,
      });
    }

    requestInProgressRef.current = false;
    setRequest(null);
  }, [data, isError, isFetching, isSuccess, openModal, request]);

  const openWorkflowGantt = useCallback((nextRequest: WorkflowGanttRequest) => {
    const normalizedIssueId = nextRequest.issueId.trim();

    if (!normalizedIssueId || requestInProgressRef.current) {
      return;
    }

    requestInProgressRef.current = true;
    setRequest({ ...nextRequest, issueId: normalizedIssueId });
  }, []);

  return {
    isFetching: request !== null,
    openWorkflowGantt,
  };
};
