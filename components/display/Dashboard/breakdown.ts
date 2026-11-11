export type BreakdownItem = {
  color: string;
  count: number;
  description?: string;
  href?: string;
  label: string;
};

export const getBreakdownPercent = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0;
