export const filterInnerDropdownClassName = 'request-list-filter-inner-dropdown';
export const filterInnerDropdownProps = {
  classNames: { dropdown: filterInnerDropdownClassName },
  withinPortal: true,
  zIndex: 1000,
};

export type TimestampRangeValue = [number | null, number | null];

const toTimestampValue = (value?: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toTimestampRangeValue = (from?: string, to?: string): TimestampRangeValue => [
  toTimestampValue(from) ?? null,
  toTimestampValue(to) ?? null,
];

export const toTimestampRangeFilterValue = (value: TimestampRangeValue) => ({
  from: value[0] ? String(value[0]) : undefined,
  to: value[1] ? String(value[1]) : undefined,
});
