import { useMemo } from 'react';
import classes from './style.module.scss';
import { useTranslation } from 'react-i18next';
import { Box } from '@mantine/core';
import {
  ENTITY_PERMISSION_CODES,
  useEntityPermissionControl,
} from '@/_auth/role-management/entity';
import { getDashboardPoolSummaryItems } from '@/_helpers/dashboard/action';
import { useDashboardBreakdownQuery } from '@/_hooks/_modules/dashboard/useFilteredDashboardQueries';
import {
  FILTER_SELECTION_SCOPES,
  type SavedFilterScope,
} from '@/components/request-filter/_config/savedFilterScopes';
import { useSavedFilterSelection } from '@/components/request-filter/_hooks/useSavedFilterSelection';
import { SavedFilterMenu } from '@/components/request-filter/saved-filter-menu/SavedFilterMenu';
import { buildRequestListPath } from '@/pages/requests/list/_hooks/useOpenRequestList';
import { FormEnterFieldEnum } from '@/pages/requests/software-development/form/types';
import { LoaderOrNoData } from '../Nodata/LoaderOrNo';
import { getBreakdownPercent, type BreakdownItem } from './breakdown';
import { BreakdownRows } from './BreakdownRows';
import { DASHBOARD_POOL_COLORS, getDashboardSeriesColor } from './colors';
import { SectionCard } from './SectionCard';

type PoolBreakdownCardProps = {
  filterScope: SavedFilterScope;
  /** Kartın yetki kodu: ana sayfa (dashboard.requestPool) veya SLA (sla.pool) */
  entityPermissionCode:
    typeof ENTITY_PERMISSION_CODES.dashboard.requestPool | typeof ENTITY_PERMISSION_CODES.sla.pool;
};

/** Havuz Bilgilerine Göre Talepler — yığılmış çubuk + havuz satırları */
export const PoolBreakdownCard = ({
  entityPermissionCode,
  filterScope,
}: PoolBreakdownCardProps) => {
  const { t } = useTranslation();
  const { canViewEntity } = useEntityPermissionControl();
  const canViewPoolCard = canViewEntity(entityPermissionCode);
  const {
    pageFilter,
    savedFilter,
    menuProps,
    isPending: selectionPending,
    isError: selectionError,
  } = useSavedFilterSelection(filterScope);
  const {
    data: dashboardPoolData,
    isPending,
    isLoadingError,
  } = useDashboardBreakdownQuery(
    FormEnterFieldEnum.RequestPool,
    canViewPoolCard ? pageFilter : undefined
  );
  const showQueryState = filterScope === FILTER_SELECTION_SCOPES.sla.pool;
  const error =
    showQueryState && (selectionError || isLoadingError || Boolean(dashboardPoolData?.Error));
  const isPreparing =
    showQueryState && !error && (selectionPending || (pageFilter !== undefined && isPending));

  const items = useMemo<BreakdownItem[]>(
    () =>
      getDashboardPoolSummaryItems(dashboardPoolData?.Data, t).map(
        ({ count, filterLabel, order, title }, index) => ({
          color: getDashboardSeriesColor(DASHBOARD_POOL_COLORS, index),
          count,
          description: t(`label.home.dashboardPoolDescriptions.${order}`, { defaultValue: '' }),
          href:
            count > 0
              ? buildRequestListPath(
                  { ...savedFilter?.value, listRequestPool: [filterLabel] },
                  menuProps.selectedFilterIds
                )
              : undefined,
          label: title,
        })
      ),
    [dashboardPoolData?.Data, savedFilter, menuProps.selectedFilterIds, t]
  );

  if (!canViewPoolCard) {
    return null;
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const busiest = items.reduce<BreakdownItem | null>(
    (current, item) => (item.count > (current?.count ?? 0) ? item : current),
    null
  );

  return (
    <SectionCard
      action={<SavedFilterMenu {...menuProps} />}
      aria-busy={showQueryState ? isPreparing : undefined}
      size="sm"
      title={t('label.home.summaryPoolTitle')}
      description={
        isPreparing || error ? undefined : t('label.home.poolBreakdownSubtitle', { count: total })
      }
    >
      <LoaderOrNoData
        loading={isPreparing}
        hasData={!isPreparing && !error}
        text={t('message.commonError')}
      >
        <Box className={classes.stackedBar}>
          {items
            .filter((item) => item.count > 0)
            .map((item) => (
              <Box
                key={item.label}
                aria-label={`${item.label}: ${item.count}`}
                style={{ background: item.color, width: `${(item.count / total) * 100}%` }}
              />
            ))}
        </Box>

        <BreakdownRows items={items} total={total} />

        <Box className={classes.note}>
          {busiest
            ? t('label.home.poolConcentrationNote', {
                percent: getBreakdownPercent(busiest.count, total),
                pool: busiest.label,
              })
            : t('label.home.poolConcentrationEmpty')}
        </Box>
      </LoaderOrNoData>
    </SectionCard>
  );
};
