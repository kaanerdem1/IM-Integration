import { useMemo } from 'react';
import type { TooltipContentProps } from 'recharts';
import { Center } from '@mantine/core';
import type { RequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { isRecord } from '@/_helpers/object';
import { AppSunburstChart } from '@/components/charts/AppSunburstChart';
import { requestDistributionChartLayout, requestDistributionSunburstSize } from './config';
import type { OpenGraphicSelection } from './interactions';
import { GraphicSunburstTooltip } from './RadialTooltip';
import { useGraphicDisabledReason } from './useGraphicDisabledReason';
import { createRequestDistributionSunburstData, requestDistributionTooltipProps } from './utils';

type RequestDistributionSunburstChartProps = {
  onOpen?: OpenGraphicSelection;
  model: RequestDistributionChartModel;
  secondaryField: string | null;
  availableWidth?: number;
};

const requestDistributionSunburstChartProps = { ringPadding: 6 } as const;

const getRequestDistributionSunburstGap = (nodeCount: number) => {
  if (nodeCount > 40) {
    return 0.75;
  }

  if (nodeCount > 20) {
    return 1.25;
  }

  return 2;
};

export const RequestDistributionSunburstChart = ({
  onOpen,
  model,
  secondaryField,
  availableWidth,
}: RequestDistributionSunburstChartProps) => {
  const getDisabledReason = useGraphicDisabledReason();
  const size =
    availableWidth === undefined ? requestDistributionSunburstSize : Math.min(400, availableWidth);
  const data = useMemo(
    () => createRequestDistributionSunburstData(model, Boolean(secondaryField)),
    [model, secondaryField]
  );
  const total = useMemo(() => model.data.reduce((sum, item) => sum + item.total, 0), [model.data]);
  const nodeCount = useMemo(
    () => data.reduce((count, item) => count + 1 + (item.children?.length ?? 0), 0),
    [data]
  );

  return (
    <Center mih={requestDistributionChartLayout.minHeight} w="100%">
      <AppSunburstChart
        getItemDisabledReason={(item) => {
          const selection = item.selection;
          return isRecord(selection) && typeof selection.primaryMetric === 'string'
            ? getDisabledReason({
                primaryMetric: selection.primaryMetric,
                seriesName:
                  typeof selection.seriesName === 'string' ? selection.seriesName : undefined,
              })
            : undefined;
        }}
        onItemOpen={
          onOpen
            ? (item, event) => {
                const selection = item.selection;
                if (isRecord(selection) && typeof selection.primaryMetric === 'string') {
                  onOpen(
                    {
                      primaryMetric: selection.primaryMetric,
                      seriesName:
                        typeof selection.seriesName === 'string' ? selection.seriesName : undefined,
                    },
                    event
                  );
                }
              }
            : undefined
        }
        chartLabel={total.toLocaleString()}
        chartLabelTitle="Toplam"
        data={data}
        descendantRingOpacity={0.86}
        gap={getRequestDistributionSunburstGap(nodeCount)}
        innerRadius={size * 0.25}
        labelsType="value-percent"
        rootRingPosition="outer"
        size={size}
        sunburstChartProps={requestDistributionSunburstChartProps}
        tooltipProps={{
          ...requestDistributionTooltipProps,
          content: (props: TooltipContentProps<number, string>) => (
            <GraphicSunburstTooltip
              {...props}
              total={total}
              getDisabledReason={(segment) => {
                const selection = segment.data?.selection;
                return isRecord(selection) && typeof selection.primaryMetric === 'string'
                  ? getDisabledReason({
                      primaryMetric: selection.primaryMetric,
                      seriesName:
                        typeof selection.seriesName === 'string' ? selection.seriesName : undefined,
                    })
                  : undefined;
              }}
            />
          ),
        }}
        withLabels={availableWidth === undefined}
      />
    </Center>
  );
};
