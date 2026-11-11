import { createContext, useContext } from 'react';
import type { ChartLabelPresentation } from '@/components/charts/chartLabelPresentation';

const plainLabel: Required<ChartLabelPresentation> = {
  formatLabel: (label) => label,
  renderTickLabel: (label) => label,
  renderTooltipLabel: (label) => label,
  getTooltipHeading: (label) => ({ label }),
};

export const GraphicLabelContext = createContext({
  primary: plainLabel,
  secondary: plainLabel,
  primaryFieldLabel: '',
  secondaryFieldLabel: '',
});
export const useGraphicLabels = () => useContext(GraphicLabelContext);
