import { memo, useCallback } from 'react';
import { IconChartBar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, Group, Stack, Text } from '@mantine/core';
import type { AppChartLegendPosition } from '@/components/charts/chartTypes';
import { Content } from '@/components/display/Content';
import loadingClasses from '@/components/display/Nodata/_style.module.scss';
import { LoaderOrNoData } from '@/components/display/Nodata/LoaderOrNo';
import { useModalActions } from '@/components/modal-host/_hook/useModal';
import { useGraphicData } from '../_hooks/useGraphicData';
import { useOpenGraphicRequests } from '../_hooks/useOpenGraphicRequests';
import { RequestDistributionVisualization } from '../charts/Visualization';
import type { DashboardGraphicConfiguration } from '../types';

type DashboardGraphicPreviewProps = {
  configuration: DashboardGraphicConfiguration;
  legendPosition: AppChartLegendPosition;
};

const previewHeight = 440;

const DashboardGraphicPreviewContent = ({
  configuration,
  legendPosition,
}: DashboardGraphicPreviewProps) => {
  const { t } = useTranslation();
  const ready = Boolean(configuration.PrimaryFieldValue && configuration.GraphicType);
  const chart = useGraphicData(ready ? configuration : undefined);
  const { closeModal } = useModalActions();
  const closePreview = useCallback(() => closeModal('DashboardGraphic'), [closeModal]);
  const openGraphicRequests = useOpenGraphicRequests(chart, closePreview);
  const emptyText = t(
    !ready
      ? 'label.home.graphicPreviewEmpty'
      : chart.hasInvalidConfiguration
        ? 'label.home.graphicPreviewInvalid'
        : 'label.home.requestDistributionEmpty'
  );

  return (
    <Content
      data-testid="dashboard-graphic-preview"
      withBorder
      radius="lg"
      p="md"
      h="100%"
      miw={0}
      style={{ contain: 'inline-size' }}
    >
      <Stack component="section" aria-label={t('label.home.graphicPreview')} gap="md">
        <Box>
          <Group gap="xs" mb={4}>
            <IconChartBar aria-hidden size={18} stroke={1.7} />
            <Text fw={600} size="sm">
              {t('label.home.graphicPreview')}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {t('label.home.graphicPreviewDescription')}
          </Text>
        </Box>
        <Box
          className={loadingClasses.afterSpacing}
          pos="relative"
          miw={0}
          aria-busy={chart.isFetching}
        >
          {!chart.isError && (
            <LoaderOrNoData
              loading={chart.isFetching && !chart.hasInvalidConfiguration}
              hasData={chart.model.hasData && !chart.hasInvalidConfiguration}
              text={emptyText}
              icon={!ready ? IconChartBar : undefined}
              fallbackProps={{ mih: previewHeight, w: 'fit-content', maw: '100%', mx: 'auto' }}
            >
              {chart.chartType ? (
                <RequestDistributionVisualization
                  fitToContainer
                  onOpen={openGraphicRequests}
                  chartType={chart.chartType}
                  countLabel={t('label.home.requestCountAxis')}
                  legendLabel={t('label.home.requestDistributionLegend')}
                  legendPosition={legendPosition}
                  loading={chart.isFetching}
                  model={chart.model}
                  primaryFieldLabel={chart.primaryFieldLabel}
                  secondaryFieldLabel={chart.secondaryFieldLabel}
                  secondaryField={configuration.SecondaryFieldValue ?? null}
                  viewportHeight={previewHeight}
                />
              ) : null}
            </LoaderOrNoData>
          )}
        </Box>
      </Stack>
    </Content>
  );
};

export const DashboardGraphicPreview = memo(DashboardGraphicPreviewContent);
