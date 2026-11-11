import { createContext, useContext } from 'react';
import type { GraphicSelection } from './interactions';

export const GraphicInteractionContext = createContext<
  (selection: GraphicSelection) => string | undefined
>(() => undefined);

export const useGraphicDisabledReason = () => useContext(GraphicInteractionContext);
