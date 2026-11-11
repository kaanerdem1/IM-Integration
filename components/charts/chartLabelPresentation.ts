import type { ReactNode } from 'react';

export type ChartLabelPresentation = {
  formatLabel?: (label: string) => string;
  renderTickLabel?: (label: string) => ReactNode;
  renderTooltipLabel?: (label: string, context?: 'title' | 'tick') => ReactNode;
  getTooltipHeading?: (label: string) => {
    fieldLabel?: ReactNode;
    label: ReactNode;
    labelDetails?: ReactNode;
  };
};
