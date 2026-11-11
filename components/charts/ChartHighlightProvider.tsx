import { useState, type ReactNode } from 'react';
import { ChartHighlightStoreContext, createChartHighlightStore } from './chartHighlightStore';

export const ChartHighlightProvider = ({ children }: { children: ReactNode }) => {
  // Each chart gets an isolated store; hover updates notify only selector subscribers.
  const [store] = useState(createChartHighlightStore);

  return (
    <ChartHighlightStoreContext.Provider value={store}>
      {children}
    </ChartHighlightStoreContext.Provider>
  );
};
