import { useMemo, type ReactNode } from 'react';
import { formatGraphicMetricLabel } from '@/_helpers/dashboard/graphicMetrics';
import { GraphicMetricLabel } from './GraphicMetricLabel';
import { GraphicTickLabel } from './GraphicTickLabel';
import { GraphicLabelContext } from './useGraphicLabels';

const createPresentation = (fieldLabel: string) => ({
  formatLabel: (label: string) => formatGraphicMetricLabel(label, fieldLabel),
  renderTickLabel: (label: string) => <GraphicTickLabel label={label} fieldLabel={fieldLabel} />,
  renderTooltipLabel: (label: string, context?: 'title' | 'tick') => (
    <GraphicMetricLabel label={label} fieldLabel={fieldLabel} context={context} />
  ),
  getTooltipHeading: (label: string) => {
    const isCombined = label.includes('|');
    return {
      fieldLabel,
      label: isCombined ? undefined : label,
      labelDetails: isCombined ? (
        <GraphicMetricLabel label={label} fieldLabel={fieldLabel} detailsOnly />
      ) : undefined,
    };
  },
});

export const GraphicLabelProvider = ({
  primaryFieldLabel,
  secondaryFieldLabel,
  children,
}: {
  primaryFieldLabel: string;
  secondaryFieldLabel: string;
  children: ReactNode;
}) => {
  const value = useMemo(
    () => ({
      primaryFieldLabel,
      secondaryFieldLabel,
      primary: createPresentation(primaryFieldLabel),
      secondary: createPresentation(secondaryFieldLabel),
    }),
    [primaryFieldLabel, secondaryFieldLabel]
  );
  return <GraphicLabelContext value={value}>{children}</GraphicLabelContext>;
};
