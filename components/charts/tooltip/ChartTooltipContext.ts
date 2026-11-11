import { createContext, useContext, type RefObject } from 'react';

type ChartTooltipAnchor = {
  container: RefObject<HTMLDivElement | null>;
  element: RefObject<Element | null>;
  update: RefObject<(() => void) | null>;
};

export const ChartTooltipContext = createContext<ChartTooltipAnchor | null>(null);
export const useChartTooltipAnchor = () => useContext(ChartTooltipContext);
