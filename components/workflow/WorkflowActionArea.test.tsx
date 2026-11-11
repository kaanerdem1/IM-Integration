import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

import '@/_i18n/config';

import { WorkflowActionArea } from './WorkflowActionArea';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkflowActionArea', () => {
  it('uses the same assignment, action and timeline controls for workflow consumers', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onAction = vi.fn();
    const onOpenTimeline = vi.fn();

    try {
      act(() => {
        root.render(
          <MantineProvider env="test">
            <WorkflowActionArea
              actions={[
                {
                  id: 'complete-step',
                  label: 'Adımı Tamamla',
                  onClick: onAction,
                },
              ]}
              assignmentCard={{
                kind: 'person',
                subtitle: 'Altyapı Ekibi',
                title: 'Selin Acar',
              }}
              onOpenTimeline={onOpenTimeline}
            />
          </MantineProvider>
        );
      });

      expect(container.textContent).toContain('Selin Acar');
      expect(container.textContent).toContain('Altyapı Ekibi');

      const actionButton = container.querySelector<HTMLButtonElement>('#complete-step');
      const timelineButton = container.querySelector<HTMLButtonElement>(
        'button[aria-label="İş Akış Adımları"]'
      );

      act(() => actionButton?.click());
      act(() => timelineButton?.click());

      expect(onAction).toHaveBeenCalledOnce();
      expect(onOpenTimeline).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
    }
  });
});
