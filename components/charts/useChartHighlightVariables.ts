import { useContext, useLayoutEffect, useMemo, type RefObject } from 'react';
import { ChartHighlightStoreContext } from './chartHighlightStore';

const dimmedVariable = '--chart-highlight';

// Hover changes presentation only: keep chart geometry and Recharts props stable.
export const useChartHighlightVariables = (
  containerRef: RefObject<HTMLDivElement | null>,
  series: readonly { name: string }[],
  enabled = true
) => {
  const store = useContext(ChartHighlightStoreContext);
  const variables = useMemo<ReadonlyMap<string, string>>(
    () =>
      new Map(
        enabled ? series.map((item, index) => [item.name, `--chart-highlight-${index}`]) : []
      ),
    [enabled, series]
  );

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!enabled || !container) {
      return;
    }

    let activeVariable: string | undefined;
    const update = () => {
      const key = store.getState().highlightedKey;
      const nextVariable = key === null ? undefined : variables.get(key);

      if (nextVariable === activeVariable) {
        return;
      }
      if (activeVariable) {
        container.style.removeProperty(activeVariable);
      }
      if (nextVariable) {
        container.style.setProperty(dimmedVariable, '0');
        container.style.setProperty(nextVariable, '1');
      } else {
        container.style.removeProperty(dimmedVariable);
      }
      activeVariable = nextVariable;
    };

    update();
    const unsubscribe = store.subscribe(update);
    return () => {
      unsubscribe();
      container.style.removeProperty(dimmedVariable);
      if (activeVariable) {
        container.style.removeProperty(activeVariable);
      }
    };
  }, [containerRef, enabled, store, variables]);

  return variables;
};

// A factor of 1 preserves the original opacity; 0 applies the existing dimmed value.
export const chartHighlightOpacity = (
  variable: string,
  opacity: string | number,
  dimmedOpacity: number
) =>
  `calc(${dimmedOpacity} + (${opacity} - ${dimmedOpacity}) * var(${variable}, var(${dimmedVariable}, 1)))`;
