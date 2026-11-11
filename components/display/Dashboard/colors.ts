// Dashboard dağılım kartlarının renkleri (tasarım: havuz ve tür sırasına göre)
export const DASHBOARD_POOL_COLORS = [
  'var(--mantine-color-teal-7)',
  'var(--mantine-color-indigo-5)',
  'var(--mantine-color-cyan-8)',
  '#E8A33D',
] as const;

export const DASHBOARD_REQUEST_TYPE_COLORS = [
  'var(--mantine-color-indigo-5)',
  'var(--mantine-color-cyan-5)',
  'var(--mantine-color-teal-7)',
  'var(--mantine-color-cyan-8)',
] as const;

export const getDashboardSeriesColor = (colors: readonly string[], index: number) =>
  colors[index % colors.length];
