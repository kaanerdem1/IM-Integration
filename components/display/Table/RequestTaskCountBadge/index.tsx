import type { TFunction } from 'i18next';
import { Anchor, Badge, Tooltip } from '@mantine/core';
import type { IssuePagination } from '@/_api/_core/api-gen/types';
import type { createPermissionControl } from '@/_auth/role-management/_permission/permissionControl';
import { ENTITY_PERMISSION_CODES } from '@/_auth/role-management/entity/entityPermissionCodes';
import { TASK_NUMBER_BADGE_COLOR } from '@/_common/tasks/presentation';
import type {
  OpenRequestParams,
  UseOpenRequestReturn,
} from '@/pages/requests/_shared/hooks/useOpenRequest';
import { getRequestFormDefinitionByIssueType } from '@/pages/requests/_shared/requestFormDefinition';

interface Props extends Pick<UseOpenRequestReturn, 'getRequestHref' | 'openRequest'> {
  row: IssuePagination;
  permissionControl: ReturnType<typeof createPermissionControl>;
  requestParams: OpenRequestParams;
  t: TFunction;
}

const clickableBadgeStyle = { cursor: 'pointer' };

export const renderRequestTaskCountBadge = ({
  row,
  permissionControl,
  requestParams,
  getRequestHref,
  openRequest,
  t,
}: Props) => {
  const taskCount = row.IssueTaskCount ?? 0;

  if (!row.Id || taskCount <= 0) {
    return null;
  }

  if (!permissionControl.canViewEntity(ENTITY_PERMISSION_CODES.navigation.tasks)) {
    return null;
  }

  const formDefinition = getRequestFormDefinitionByIssueType(row.Type);

  if (!formDefinition) {
    return null;
  }

  const taskRequestParams: OpenRequestParams = {
    ...requestParams,
    form: formDefinition.formCode,
    tab: formDefinition.tabs.Tasks,
  };
  const countLabel = t('label.requests.list.taskCount', { count: taskCount });
  const viewTasksLabel = t('label.requests.list.viewTasks');

  return (
    <Tooltip label={viewTasksLabel} events={{ hover: true, focus: true, touch: false }} withArrow>
      <Anchor
        href={getRequestHref(taskRequestParams)}
        aria-label={`${countLabel} — ${viewTasksLabel}`}
        underline="never"
        onClick={(event) => {
          event.stopPropagation();
          openRequest(taskRequestParams, event);
        }}
        onAuxClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Badge
          component="span"
          size="xs"
          color={TASK_NUMBER_BADGE_COLOR}
          variant="outline"
          tt="none"
          fw={500}
          style={clickableBadgeStyle}
        >
          {countLabel}
        </Badge>
      </Anchor>
    </Tooltip>
  );
};
