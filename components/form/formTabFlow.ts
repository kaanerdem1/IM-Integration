import { normalizeArrayValue } from '@/_helpers/array';

export const getFormTabIndex = <TTab extends string>(tabs: readonly TTab[], tab: TTab) =>
  tabs.indexOf(tab);

export const getEarlierFormTab = <TTab extends string>(
  tabs: readonly TTab[],
  firstTab: TTab,
  secondTab: TTab
) => (getFormTabIndex(tabs, firstTab) <= getFormTabIndex(tabs, secondTab) ? firstTab : secondTab);

export const getLaterFormTab = <TTab extends string>(
  tabs: readonly TTab[],
  firstTab: TTab,
  secondTab: TTab
) => (getFormTabIndex(tabs, firstTab) >= getFormTabIndex(tabs, secondTab) ? firstTab : secondTab);

export const canAccessSequentialFormTab = <TTab extends string>({
  allowAllTabs = false,
  allowedTab,
  tabs,
  targetTab,
}: {
  allowAllTabs?: boolean;
  allowedTab: TTab;
  tabs: readonly TTab[];
  targetTab: TTab;
}) => {
  const targetTabIndex = getFormTabIndex(tabs, targetTab);
  const allowedTabIndex = getFormTabIndex(tabs, allowedTab);

  if (targetTabIndex < 0 || allowedTabIndex < 0) {
    return false;
  }

  return allowAllTabs || targetTabIndex <= allowedTabIndex;
};

const normalizeComparableFormValue = (value: unknown): unknown => {
  const normalizedValue = normalizeArrayValue(value);

  if (Array.isArray(normalizedValue) && normalizedValue.length === 0) {
    return null;
  }

  if (typeof normalizedValue === 'string') {
    if (normalizedValue === '') {
      return null;
    }

    const trimmedValue = normalizedValue.trim();

    if (!trimmedValue) {
      return normalizedValue;
    }

    const numericValue = Number(trimmedValue);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return normalizedValue;
};

export const areFormValuesEqual = (first: unknown, second: unknown) => {
  const normalizedFirst = normalizeComparableFormValue(first);
  const normalizedSecond = normalizeComparableFormValue(second);

  if (Array.isArray(normalizedFirst) || Array.isArray(normalizedSecond)) {
    return (
      Array.isArray(normalizedFirst) &&
      Array.isArray(normalizedSecond) &&
      normalizedFirst.length === normalizedSecond.length &&
      normalizedFirst.every((value, index) => value === normalizedSecond[index])
    );
  }

  if (
    normalizedFirst !== null &&
    normalizedSecond !== null &&
    typeof normalizedFirst === 'object' &&
    typeof normalizedSecond === 'object'
  ) {
    return JSON.stringify(normalizedFirst) === JSON.stringify(normalizedSecond);
  }

  return Object.is(normalizedFirst, normalizedSecond);
};
