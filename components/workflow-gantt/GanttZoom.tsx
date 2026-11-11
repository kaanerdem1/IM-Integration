import { useCallback } from 'react';
import type { RefObject } from 'react';
import classes from './style.module.scss';
import type { IApi } from '@svar-ui/react-gantt';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Tooltip } from '@mantine/core';

type Props = {
  apiRef: RefObject<IApi | null>;
  gridWidth: number;
  testId: string;
};

export const GanttZoom = ({ apiRef, gridWidth, testId }: Props) => {
  const { t } = useTranslation();
  const handleZoomOut = useCallback(() => {
    void apiRef.current?.exec('zoom-scale', { dir: -1 });
  }, [apiRef]);
  const handleZoomIn = useCallback(() => {
    void apiRef.current?.exec('zoom-scale', { dir: 1 });
  }, [apiRef]);

  return (
    <ActionIcon.Group
      className={classes.zoomControls}
      data-testid={testId}
      orientation="vertical"
      style={{ left: `calc(${gridWidth}px + 15px)` }}
    >
      <Tooltip label={t('label.requests.workflow.timeline.zoomIn')}>
        <ActionIcon
          aria-label={t('label.requests.workflow.timeline.zoomIn')}
          className={classes.zoomButton}
          onClick={handleZoomIn}
          size={26}
          variant="transparent"
        >
          <IconPlus size={14} stroke={2} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('label.requests.workflow.timeline.zoomOut')}>
        <ActionIcon
          aria-label={t('label.requests.workflow.timeline.zoomOut')}
          className={classes.zoomButton}
          onClick={handleZoomOut}
          size={26}
          variant="transparent"
        >
          <IconMinus size={14} stroke={2} />
        </ActionIcon>
      </Tooltip>
    </ActionIcon.Group>
  );
};
