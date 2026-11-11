import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

import '@/_i18n/config';

import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { WorkflowGanttButton } from './WorkflowGanttButton';

const { useIssueGanttchart } = vi.hoisted(() => ({
  useIssueGanttchart: vi.fn(),
}));

vi.mock('@/_api/hooks', () => ({
  useIssueGanttchart,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkflowGanttButton', () => {
  beforeEach(() => {
    useIssueGanttchart.mockReset();
    useIssueGanttchart.mockReturnValue({
      data: undefined,
      isError: false,
      isFetching: false,
      isSuccess: false,
    });
    useModalStore.getState().closeModal();
  });

  it('opens the workflow Gantt modal after planned data is loaded', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const responseData = [
      {
        StepDefinationId: 1,
        StepName: 'Talep Giriş',
        StartDate: 1785715200,
        EndDate: 1785801600,
        Order: 1,
      },
    ];
    useIssueGanttchart.mockImplementation((issueId: string) => ({
      data: issueId ? { StatusCode: 200, Data: responseData } : undefined,
      isError: false,
      isFetching: false,
      isSuccess: Boolean(issueId),
    }));

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <WorkflowGanttButton IssueId="issue-42" No=" YT-2486 " />
          </MantineProvider>
        );
      });

      const button = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Talep Zaman Çizelgesi"]'
      );

      if (!button) {
        throw new Error('Expected request timeline action');
      }

      await act(async () => button.click());

      expect(useModalStore.getState().getModalOption('WorkflowGantt')).toEqual({
        Id: 'issue-42',
        No: 'YT-2486',
        Data: responseData,
      });
      expect(useIssueGanttchart).toHaveBeenCalledWith('issue-42', {
        enabled: true,
        staleTime: 0,
      });
    } finally {
      act(() => root.unmount());
      useModalStore.getState().closeModal();
    }
  });

  it('does not open the modal when the request has no plan', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    useIssueGanttchart.mockImplementation((issueId: string) => ({
      data: issueId
        ? {
            StatusCode: 422,
            Data: null,
            Error: {
              Items: null,
              Message: 'Talebe ait bir plan bulunamamıştır.',
              Code: null,
            },
          }
        : undefined,
      isError: false,
      isFetching: false,
      isSuccess: Boolean(issueId),
    }));

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <WorkflowGanttButton IssueId="issue-42" />
          </MantineProvider>
        );
      });

      const button = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Talep Zaman Çizelgesi"]'
      );

      if (!button) {
        throw new Error('Expected request timeline action');
      }

      await act(async () => button.click());

      expect(useModalStore.getState().isModalOpen('WorkflowGantt')).toBe(false);
    } finally {
      act(() => root.unmount());
      useModalStore.getState().closeModal();
    }
  });

  it('does not open the modal with cached data when the latest request fails', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    useIssueGanttchart.mockImplementation((issueId: string) => ({
      data: issueId
        ? { StatusCode: 200, Data: [{ StepDefinationId: 1, StepName: 'Cached step' }] }
        : undefined,
      isError: Boolean(issueId),
      isFetching: false,
      isSuccess: false,
    }));

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <WorkflowGanttButton IssueId="issue-42" />
          </MantineProvider>
        );
      });

      const button = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Talep Zaman Çizelgesi"]'
      );

      if (!button) {
        throw new Error('Expected request timeline action');
      }

      await act(async () => button.click());

      expect(useModalStore.getState().isModalOpen('WorkflowGantt')).toBe(false);
    } finally {
      act(() => root.unmount());
      useModalStore.getState().closeModal();
    }
  });
});
