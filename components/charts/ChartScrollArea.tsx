import type { ReactNode, Ref } from 'react';
import { Box, ScrollArea, type BoxProps } from '@mantine/core';

type ChartScrollAreaProps = {
  children: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  minWidth: number;
  paddingX?: BoxProps['px'];
  paddingY?: BoxProps['py'];
};

export const ChartScrollArea = ({
  children,
  contentRef,
  minWidth,
  paddingX = 0,
  paddingY = 'sm',
}: ChartScrollAreaProps) => (
  <Box
    maw="100%"
    miw={0}
    w="100%"
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      overflow: 'hidden',
    }}
  >
    <ScrollArea
      offsetScrollbars="x"
      scrollbarSize={8}
      scrollbars="x"
      type="auto"
      maw="100%"
      miw="100%"
      w={0}
      viewportProps={{ style: { maxWidth: '100%', width: '100%' } }}
    >
      <Box miw={minWidth} px={paddingX} py={paddingY} w="100%">
        <Box ref={contentRef} w="100%">
          {children}
        </Box>
      </Box>
    </ScrollArea>
  </Box>
);
