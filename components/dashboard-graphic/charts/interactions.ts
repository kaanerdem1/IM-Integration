import type { ChartOpenEvent } from '@/components/charts/chartInteractionProps';

export { chartInteractionProps as graphicInteractionProps } from '@/components/charts/chartInteractionProps';

export type GraphicSelection = { primaryMetric?: string; seriesName?: string };
export type GraphicOpenEvent = ChartOpenEvent;
export type OpenGraphicSelection = (selection: GraphicSelection, event: GraphicOpenEvent) => void;
