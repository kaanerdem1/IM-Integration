import { useCallback, useEffect, useRef } from 'react';
import { areFormValuesEqual } from '@/components/form/formTabFlow';

type BaseRecord = Record<string, unknown>;

export interface UseFormTabDirtyStateParams<TFormValues extends BaseRecord, TTab extends string> {
  enabled: boolean;
  // When false, this form does not mark its owning tab as having unsaved changes.
  affectTabAccess?: boolean;
  persistedValues: TFormValues;
  isComparableKey?: (params: {
    key: keyof TFormValues;
    persistedValues: TFormValues;
    values: TFormValues;
  }) => boolean;
  keys: readonly (keyof TFormValues)[];
  tab: TTab;
  markTabDirty: (tab: TTab) => void;
  clearDirtyTab: (tab: TTab) => void;
}

export const useFormTabDirtyState = <TFormValues extends BaseRecord, TTab extends string>({
  affectTabAccess = true,
  enabled,
  isComparableKey,
  persistedValues,
  keys,
  tab,
  markTabDirty,
  clearDirtyTab,
}: UseFormTabDirtyStateParams<TFormValues, TTab>) => {
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    hasUserInteractedRef.current = false;
  }, [enabled, persistedValues]);

  const handleValuesChange = useCallback(
    (values: TFormValues) => {
      if (!enabled || !affectTabAccess || !hasUserInteractedRef.current) {
        return;
      }

      const hasDifference = keys.some((key) => {
        if (
          isComparableKey &&
          !isComparableKey({
            key,
            persistedValues,
            values,
          })
        ) {
          return false;
        }

        return !areFormValuesEqual(values[key], persistedValues[key]);
      });

      if (hasDifference) {
        markTabDirty(tab);
        return;
      }

      clearDirtyTab(tab);
    },
    [
      affectTabAccess,
      clearDirtyTab,
      enabled,
      isComparableKey,
      keys,
      markTabDirty,
      persistedValues,
      tab,
    ]
  );

  return {
    registerUserInteraction: () => {
      hasUserInteractedRef.current = true;
    },
    resetDirtyTracking: () => {
      hasUserInteractedRef.current = false;
      if (affectTabAccess) {
        clearDirtyTab(tab);
      }
    },
    handleValuesChange,
  };
};
