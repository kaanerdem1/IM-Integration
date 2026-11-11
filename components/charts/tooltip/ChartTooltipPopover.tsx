import type { ReactElement, ReactNode } from 'react';
import { HoverCard } from '@mantine/core';
import classes from './ChartTooltipSurface.module.css';

// Native SVG/HTML targets share the same card and collision policy as Recharts tooltips.
export const ChartTooltipPopover = ({
  children,
  content,
}: {
  children: ReactElement;
  content: ReactNode;
}) => (
  <HoverCard
    interactive
    role="tooltip"
    floatingStrategy="fixed"
    preventPositionChangeWhenVisible={false}
    offset={12}
    position="bottom"
    width="min(400px, calc(100vw - 24px))"
    withArrow
    arrowSize={10}
    arrowRadius={1}
    classNames={{ dropdown: classes.popover, arrow: classes.popoverArrow }}
    transitionProps={{ duration: 0 }}
    middlewares={{
      flip: { padding: 12, fallbackPlacements: ['top', 'right', 'left'] },
      shift: { padding: 12, crossAxis: false },
      size: {
        padding: 12,
        apply: ({ availableHeight, elements }) => {
          elements.floating.style.setProperty('--chart-tooltip-height', `${availableHeight}px`);
        },
      },
    }}
  >
    <HoverCard.Target>{children}</HoverCard.Target>
    <HoverCard.Dropdown p={0}>{content}</HoverCard.Dropdown>
  </HoverCard>
);
