import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ComboboxItem } from '@mantine/core';

/** Retains selection metadata, not search results or form values. */
export const useSelectedOptions = (
  values: readonly string[],
  options: ReadonlyMap<string, ComboboxItem>
) => {
  const retainedOptions = useRef(new Map<string, ComboboxItem>());
  const resolveOptions = useCallback(
    (selectedValues: readonly string[]) =>
      selectedValues.flatMap((value) => {
        const option = options.get(value) ?? retainedOptions.current.get(value);
        return option ? [option] : [];
      }),
    [options]
  );
  const selectedOptions = useMemo(() => resolveOptions(values), [resolveOptions, values]);

  useEffect(() => {
    retainedOptions.current = new Map(selectedOptions.map((option) => [option.value, option]));
  }, [selectedOptions]);

  const retainSelectedOptions = useCallback(
    (nextValues: readonly string[]) => {
      // Capture before onChange/onSearch can replace data in the same event.
      // Keep the current selection too, in case a controlled parent rejects the change.
      const pendingOptions = resolveOptions([...new Set([...values, ...nextValues])]);
      retainedOptions.current = new Map(pendingOptions.map((option) => [option.value, option]));
    },
    [resolveOptions, values]
  );

  return { selectedOptions, retainSelectedOptions };
};
