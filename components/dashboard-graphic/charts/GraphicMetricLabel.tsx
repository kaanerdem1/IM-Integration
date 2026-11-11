import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, ScrollArea, Text } from '@mantine/core';
import { splitGraphicMetric } from '@/_helpers/dashboard/graphicMetrics';
import { chartTooltipRowPadding, chartTooltipTitleProps } from '@/components/charts/chartTheme';
import classes from '@/components/charts/tooltip/ChartTooltipSurface.module.css';

export const GraphicMetricLabel = memo(
  ({
    label,
    fieldLabel,
    context,
    detailsOnly = false,
  }: {
    label: string;
    fieldLabel: string;
    context?: 'title' | 'tick';
    detailsOnly?: boolean;
  }) => {
    const { t, i18n } = useTranslation();
    const values = splitGraphicMetric(label);
    const fieldCaption = context && !detailsOnly && (
      <Text
        component="span"
        display="block"
        size="10px"
        fw={600}
        c={context === 'tick' ? undefined : 'dimmed'}
        tt="uppercase"
        mb={6}
      >
        {fieldLabel}
      </Text>
    );
    if (values.length === 1) {
      return (
        <>
          {fieldCaption}
          <Text
            component="span"
            {...(context ? chartTooltipTitleProps : { inherit: true })}
            c={context === 'title' ? chartTooltipTitleProps.c : undefined}
            style={{ overflowWrap: 'anywhere', whiteSpace: 'normal' }}
          >
            {label}
          </Text>
        </>
      );
    }
    return (
      <Box style={{ whiteSpace: 'normal' }}>
        {fieldCaption}
        <Text
          component="span"
          display="block"
          size="xs"
          fw={400}
          c={context === 'tick' ? undefined : 'dimmed'}
          mb={6}
        >
          {t('label.home.chartTooltipCombinedMetrics', {
            count: values.length,
            field: fieldLabel.toLocaleLowerCase(i18n.resolvedLanguage ?? 'tr'),
          })}
        </Text>
        <ScrollArea.Autosize
          mah="min(160px, 30vh)"
          scrollbars="y"
          scrollbarSize={6}
          offsetScrollbars="y"
          type="auto"
          overscrollBehavior="contain"
          viewportProps={{
            role: 'list',
            'aria-label': fieldLabel,
            tabIndex: 0,
            style: { overflowWrap: 'anywhere' },
          }}
        >
          {values.map((value, index) => (
            <Text
              component="span"
              role="listitem"
              className={classes.valueRow}
              display="block"
              size="xs"
              fw={400}
              key={index}
              py={chartTooltipRowPadding}
            >
              {value}
            </Text>
          ))}
        </ScrollArea.Autosize>
      </Box>
    );
  }
);

GraphicMetricLabel.displayName = 'GraphicMetricLabel';
