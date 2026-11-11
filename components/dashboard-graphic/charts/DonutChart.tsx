import type { TooltipContentProps } from 'recharts';
import { Center, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import {
  getRequestDistributionPrimaryLabel,
  type RequestDistributionChartModel,
} from '@/_helpers/dashboard/requestDistribution';
import { chartElementTooltipProps } from '@/components/charts/chartTheme';
import { AppDonutChart, type AppDonutChartProps } from '@/components/charts/donut/AppDonutChart';
import {
  requestDistributionChartLayout,
  requestDistributionDonutCardGap,
  requestDistributionDonutCardWidth,
  requestDistributionDonutMaxLabels,
  requestDistributionPrimaryRadialSize,
  requestDistributionSecondaryDonutMaxLabels,
} from './config';
import { graphicInteractionProps, type OpenGraphicSelection } from './interactions';
import { GraphicRadialTooltip } from './RadialTooltip';
import { useGraphicDisabledReason } from './useGraphicDisabledReason';
import { useGraphicLabels } from './useGraphicLabels';
import { requestDistributionTooltipProps } from './utils';

type RequestDistributionPrimaryDonutDatum = {
  color: string;
  name: string;
  value: number;
  label: string;
  primaryMetric: string;
};

type RequestDistributionDonutChartProps = {
  onOpen?: OpenGraphicSelection;
  model: RequestDistributionChartModel;
  primaryData: RequestDistributionPrimaryDonutDatum[];
  secondaryField: string | null;
  availableWidth?: number;
};

const requestDistributionDonutValueLabelProps = {
  labelColor: 'gray.8',
  labelsType: 'value-percent',
  pieProps: {
    nameKey: 'label',
    labelLine: {
      stroke: 'var(--mantine-color-gray-5)',
      strokeWidth: 1.25,
    },
  },
  withLabels: true,
  withLabelsLine: true,
} satisfies Partial<AppDonutChartProps>;

const requestDistributionSecondaryDonutSize = 200;
// Mantine reserves 80px around labeled donuts. Keep the same region when labels are hidden.
const requestDistributionSecondaryDonutChartHeight = requestDistributionSecondaryDonutSize + 80;

const tooltipProps = (
  data: { name: string; label: string; color: string; value: number }[],
  getDisabledReason: (name: string) => string | undefined,
  primary = false,
  primaryLabel?: string
) => ({
  ...requestDistributionTooltipProps,
  content: (props: TooltipContentProps<number, string>) => (
    <GraphicRadialTooltip
      {...props}
      items={data}
      primary={primary}
      primaryLabel={primaryLabel}
      getDisabledReason={getDisabledReason}
    />
  ),
});

export const RequestDistributionDonutChart = ({
  model,
  primaryData,
  secondaryField,
  onOpen,
  availableWidth,
}: RequestDistributionDonutChartProps) => {
  const getDisabledReason = useGraphicDisabledReason();
  const labels = useGraphicLabels();
  if (!secondaryField) {
    const totalRequestCount = model.data.reduce((sum, item) => sum + item.total, 0);
    const size =
      availableWidth === undefined
        ? requestDistributionPrimaryRadialSize
        : Math.min(400, availableWidth);

    return (
      <Group
        justify="center"
        mih={availableWidth === undefined ? requestDistributionChartLayout.minHeight : undefined}
        w="100%"
      >
        <AppDonutChart
          {...requestDistributionDonutValueLabelProps}
          chartLabelTitle="Toplam"
          chartLabel={
            <tspan pointerEvents="auto" {...graphicInteractionProps(onOpen, {}, 'Toplam')}>
              {totalRequestCount.toLocaleString()}
            </tspan>
          }
          data={primaryData}
          onItemOpen={
            onOpen ? (item, event) => onOpen({ primaryMetric: item.name }, event) : undefined
          }
          getItemDisabledReason={(item) => getDisabledReason({ primaryMetric: item.name })}
          maxLabels={requestDistributionDonutMaxLabels}
          size={size}
          withLabels={availableWidth === undefined}
          tooltipProps={tooltipProps(
            primaryData,
            (name) => getDisabledReason({ primaryMetric: name }),
            true
          )}
        />
      </Group>
    );
  }

  const size =
    availableWidth === undefined
      ? requestDistributionSecondaryDonutSize
      : Math.min(200, availableWidth - 32);
  return (
    <Group
      align="stretch"
      gap={requestDistributionDonutCardGap}
      justify={model.data.length === 1 ? 'center' : 'flex-start'}
      mih={requestDistributionChartLayout.minHeight}
      wrap="nowrap"
      w="100%"
      style={
        availableWidth === undefined
          ? undefined
          : {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            }
      }
    >
      {model.data
        .filter((item) => item.total > 0)
        .map((item) => {
          const disabledReason = getDisabledReason({ primaryMetric: item.primaryMetric });
          const donutData = model.series
            .map((series) => ({
              color: series.color,
              name: series.name,
              label: series.label,
              value: Number(item[series.name] ?? 0),
            }))
            .filter((series) => series.value > 0);

          return (
            <Paper
              key={item.primaryMetric}
              data-testid="graphic-donut-group"
              data-primary-metric={item.primaryMetric}
              bg="gray.0"
              miw={availableWidth === undefined ? requestDistributionDonutCardWidth : 0}
              p="sm"
              radius="md"
              w={availableWidth === undefined ? requestDistributionDonutCardWidth : '100%'}
              withBorder
            >
              <Stack align="center" gap="xs" h="100%">
                <Center
                  h={
                    availableWidth === undefined
                      ? requestDistributionSecondaryDonutChartHeight
                      : 216
                  }
                  w="100%"
                >
                  <AppDonutChart
                    {...requestDistributionDonutValueLabelProps}
                    chartLabelTitle="Toplam"
                    chartLabel={
                      <Tooltip
                        {...chartElementTooltipProps}
                        label={disabledReason}
                        disabled={!disabledReason}
                      >
                        <tspan
                          pointerEvents="auto"
                          {...graphicInteractionProps(
                            onOpen,
                            { primaryMetric: item.primaryMetric },
                            getRequestDistributionPrimaryLabel(item),
                            disabledReason
                          )}
                        >
                          {item.total.toLocaleString()}
                        </tspan>
                      </Tooltip>
                    }
                    data={donutData}
                    onItemOpen={
                      onOpen
                        ? (segment, event) =>
                            onOpen(
                              { primaryMetric: item.primaryMetric, seriesName: segment.name },
                              event
                            )
                        : undefined
                    }
                    getItemDisabledReason={(segment) =>
                      getDisabledReason({
                        primaryMetric: item.primaryMetric,
                        seriesName: segment.name,
                      })
                    }
                    maxLabels={requestDistributionSecondaryDonutMaxLabels}
                    size={size}
                    withLabels={availableWidth === undefined}
                    tooltipProps={tooltipProps(
                      donutData,
                      (name) =>
                        getDisabledReason({ primaryMetric: item.primaryMetric, seriesName: name }),
                      false,
                      getRequestDistributionPrimaryLabel(item)
                    )}
                  />
                </Center>
                <Tooltip
                  {...chartElementTooltipProps}
                  label={
                    disabledReason ??
                    labels.primary.renderTooltipLabel(
                      getRequestDistributionPrimaryLabel(item),
                      'tick'
                    )
                  }
                  interactive
                >
                  <Text
                    fw={650}
                    lh={1.35}
                    mt={availableWidth === undefined ? 'auto' : undefined}
                    size="sm"
                    ta="center"
                    w="100%"
                    {...graphicInteractionProps(
                      onOpen,
                      { primaryMetric: item.primaryMetric },
                      getRequestDistributionPrimaryLabel(item),
                      disabledReason
                    )}
                    style={{
                      overflowWrap: 'anywhere',
                      cursor: disabledReason ? 'not-allowed' : onOpen ? 'pointer' : undefined,
                    }}
                  >
                    {labels.primary.renderTickLabel(getRequestDistributionPrimaryLabel(item))} (
                    {item.total.toLocaleString()})
                  </Text>
                </Tooltip>
              </Stack>
            </Paper>
          );
        })}
    </Group>
  );
};
