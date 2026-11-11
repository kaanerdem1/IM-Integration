import classes from './style.module.scss';
import { IconBellFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Box, Tooltip } from '@mantine/core';
import { useDashboardLateplanningsQuery } from '@/_hooks/_modules/dashboard/useFilteredDashboardQueries';
import type { SavedFilterScope } from '@/components/request-filter/_config/savedFilterScopes';
import { useSavedFilterSelection } from '@/components/request-filter/_hooks/useSavedFilterSelection';
import { SavedFilterMenu } from '@/components/request-filter/saved-filter-menu/SavedFilterMenu';
import { buildRequestListPath } from '@/pages/requests/list/_hooks/useOpenRequestList';

type LatePlanningBadgeProps = {
  filterScope: SavedFilterScope;
};

/** Planlanan tarihte başlatılamayan talepler — header ile kartlar arasında dikkat çekici rozet */
export const LatePlanningBadge = ({ filterScope }: LatePlanningBadgeProps) => {
  const { t } = useTranslation();
  const { pageFilter, menuProps } = useSavedFilterSelection(filterScope);
  const { data, isPending } = useDashboardLateplanningsQuery(pageFilter);
  const latePlanningCount = data?.Data?.Count;
  const issueIds = data?.Data?.IssueIds ?? [];
  const hasLateRequests = latePlanningCount !== undefined && latePlanningCount > 0;

  const label = isPending
    ? t('helper.loading')
    : hasLateRequests
      ? t('label.home.latePlanningBadge', { count: latePlanningCount })
      : latePlanningCount === 0
        ? t('label.home.latePlanningEmpty')
        : t('label.sla.latePlanningTitle');
  const content = (
    <>
      <IconBellFilled size={14} stroke={2} />
      {label}
    </>
  );

  return (
    <Box
      className={classes.alertBadge}
      data-tone={hasLateRequests ? 'danger' : 'neutral'}
      aria-busy={isPending}
    >
      <Tooltip label={t('label.sla.latePlanningTooltip')} maw={340} multiline withArrow>
        {hasLateRequests && issueIds.length > 0 ? (
          <Link
            to={buildRequestListPath({ listIssueId: issueIds }, menuProps.selectedFilterIds)}
            className={classes.alertBadgeLink}
            aria-label={label}
          >
            {content}
          </Link>
        ) : (
          <Box component="span" className={classes.alertBadgeLink}>
            {content}
          </Box>
        )}
      </Tooltip>
      <SavedFilterMenu
        {...menuProps}
        appearance="on-danger"
        actionIconProps={{ className: classes.alertBadgeFilter }}
        withChevron={false}
      />
    </Box>
  );
};
