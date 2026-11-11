import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

export type ChartHighlightKey = string;

type ChartHighlightState = {
  highlightedKey: ChartHighlightKey | null;
  setHighlightedKey: (key: ChartHighlightKey | null) => void;
};

export type ChartHighlightStore = StoreApi<ChartHighlightState>;

export const createChartHighlightStore = (): ChartHighlightStore =>
  createStore<ChartHighlightState>((set) => ({
    highlightedKey: null,
    setHighlightedKey: (highlightedKey) => {
      set((state) => (state.highlightedKey === highlightedKey ? state : { highlightedKey }));
    },
  }));

const fallbackChartHighlightStore = createStore<ChartHighlightState>(() => ({
  highlightedKey: null,
  setHighlightedKey: () => undefined,
}));

export const ChartHighlightStoreContext = createContext<ChartHighlightStore>(
  fallbackChartHighlightStore
);

const selectHighlightedKey = (state: ChartHighlightState) => state.highlightedKey;
const selectNoHighlightedKey = () => null;
const selectSetHighlightedKey = (state: ChartHighlightState) => state.setHighlightedKey;

export const useChartHighlightKey = (enabled = true) => {
  const store = useContext(ChartHighlightStoreContext);

  return useStore(store, enabled ? selectHighlightedKey : selectNoHighlightedKey);
};

export const useSetChartHighlightKey = () => {
  const store = useContext(ChartHighlightStoreContext);

  return useStore(store, selectSetHighlightedKey);
};

export const useHighlightedChartItem = <T extends { name: string }>(
  items: readonly T[],
  enabled = true
) => {
  const highlightedKey = useChartHighlightKey(enabled);

  if (!highlightedKey || !items.some((item) => item.name === highlightedKey)) {
    return null;
  }

  return highlightedKey;
};
