import type { ReactNode, Ref } from 'react';
import { Box, Paper, ScrollArea } from '@mantine/core';
import classes from './ChartTooltipSurface.module.css';

export type ChartTooltipCardProps = {
  header?: ReactNode;
  children?: ReactNode;
  headerRef?: Ref<HTMLDivElement>;
  contentRef?: Ref<HTMLDivElement>;
};

export const ChartTooltipCard = ({
  header,
  children,
  headerRef,
  contentRef,
}: ChartTooltipCardProps) => (
  <Paper className={classes.card} radius="md" shadow="lg" withBorder>
    {header && (
      <Box ref={headerRef} className={classes.header}>
        {header}
      </Box>
    )}
    <ScrollArea.Autosize
      className={classes.scrollArea}
      scrollbars="y"
      scrollbarSize={6}
      offsetScrollbars="y"
      type="auto"
      overscrollBehavior="contain"
      viewportProps={{ tabIndex: 0 }}
    >
      <Box ref={contentRef} className={classes.content}>
        {children}
      </Box>
    </ScrollArea.Autosize>
  </Paper>
);
