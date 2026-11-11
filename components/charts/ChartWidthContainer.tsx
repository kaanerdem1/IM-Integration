import { useMemo, type ReactNode } from 'react';
import { Box } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';

export const ChartWidthContainer = ({
  children,
  testId,
}: {
  children: (width: number) => ReactNode;
  testId?: string;
}) => {
  const { ref, width } = useElementSize<HTMLDivElement>();
  // Height-only observer notifications must not redraw the chart.
  // Wait for the first measurement instead of flashing the wrong label placement.
  const chart = useMemo(() => (width > 0 ? children(width) : null), [children, width]);
  return (
    <Box ref={ref} miw={0} data-testid={testId}>
      {chart}
    </Box>
  );
};
