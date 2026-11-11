import { Badge, type BadgeProps } from '@mantine/core';
import { TASK_NUMBER_BADGE_COLOR } from '@/_common/tasks/presentation';

type Props = {
  taskNo?: string | null;
  style?: BadgeProps['style'];
};

export const TaskNumberBadge = ({ taskNo, style }: Props) => (
  <Badge
    color={TASK_NUMBER_BADGE_COLOR}
    variant="outline"
    size="xs"
    tt="none"
    fw={600}
    style={style}
  >
    {taskNo || '-'}
  </Badge>
);
