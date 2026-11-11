import {
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { Box, Portal } from '@mantine/core';
import { ChartTooltipCard } from './ChartTooltipCard';
import { useChartTooltipAnchor } from './ChartTooltipContext';
import { getChartTooltipPosition } from './position';
import { getRadialTooltipAnchor } from './radialAnchor';
import classes from './ChartTooltipSurface.module.css';

export type ChartTooltipSurfaceProps = Pick<
  HTMLAttributes<HTMLDivElement>,
  'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onKeyDown'
> & {
  children?: ReactNode;
  header?: ReactNode;
  coordinate?: { x: number; y: number };
  anchorMode?: 'mark' | 'radial';
  radialAnchor?: { itemId: string; index?: string };
  containerRef?: RefObject<HTMLDivElement | null>;
};

const PositionedChartTooltip = ({
  children,
  header,
  coordinate,
  anchorMode = 'mark',
  radialAnchor,
  container,
  anchor,
  ...events
}: ChartTooltipSurfaceProps & {
  container: RefObject<HTMLDivElement | null>;
  anchor: ReturnType<typeof useChartTooltipAnchor>;
}) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const radialItemId = radialAnchor?.itemId;
  const radialIndex = radialAnchor?.index;
  const x = coordinate?.x;
  const y = coordinate?.y;

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const content = contentRef.current;
    const chart = container?.current;
    if (!surface || !content || !chart) {
      return;
    }

    let highlightedMark: Element | null = null;
    const update = () => {
      const sector =
        anchorMode === 'radial' && radialItemId !== undefined && radialIndex !== undefined
          ? chart.querySelector<SVGGraphicsElement>(
              `[data-recharts-item-id="${CSS.escape(radialItemId)}"][data-recharts-item-index="${CSS.escape(radialIndex)}"]`
            )
          : null;
      const mark = sector ?? anchor?.element.current;
      if (mark !== highlightedMark) {
        highlightedMark?.removeAttribute('data-chart-tooltip-active');
        highlightedMark = mark ?? null;
        highlightedMark?.setAttribute('data-chart-tooltip-active', '');
      }
      const chartBounds = chart.getBoundingClientRect();
      const radial =
        anchorMode === 'radial'
          ? getRadialTooltipAnchor(
              sector ?? mark?.querySelector<SVGGraphicsElement>('[data-tooltip-x]') ?? null
            )
          : undefined;
      const bounds =
        radial?.bounds ??
        (anchorMode === 'mark' && mark?.isConnected
          ? mark.getBoundingClientRect()
          : x !== undefined && y !== undefined
            ? new DOMRect(chartBounds.left + x, chartBounds.top + y, 0, 0)
            : null);
      if (
        !bounds ||
        bounds.bottom < 0 ||
        bounds.top > window.innerHeight ||
        bounds.right < 0 ||
        bounds.left > window.innerWidth
      ) {
        surface.style.visibility = 'hidden';
        return;
      }

      const position = getChartTooltipPosition(
        bounds,
        surface.offsetWidth,
        content.getBoundingClientRect().height + (headerRef.current?.offsetHeight ?? 0) + 2,
        { width: window.innerWidth, height: window.innerHeight },
        radial?.preferredSide
      );
      surface.style.left = `${position.left}px`;
      surface.style.top = `${position.top}px`;
      surface.style.setProperty('--chart-tooltip-height', `${position.maxHeight}px`);
      surface.style.setProperty('--chart-tooltip-arrow', `${position.arrow}px`);
      surface.dataset.side = position.side;
      surface.style.visibility = position.maxHeight > 0 ? 'visible' : 'hidden';
    };

    update();
    if (anchor) {
      anchor.update.current = update;
    }
    const observer = new ResizeObserver(update);
    observer.observe(content);
    observer.observe(chart);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }
    window.addEventListener('resize', update);
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !surface.contains(event.target)) {
        update();
      }
    };
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', onScroll, true);
      highlightedMark?.removeAttribute('data-chart-tooltip-active');
      if (anchor) {
        anchor.update.current = null;
      }
    };
  }, [anchor, container, anchorMode, radialItemId, radialIndex, x, y]);

  return (
    <Box
      {...events}
      ref={surfaceRef}
      className={classes.surface}
      role="tooltip"
      onMouseMove={(event) => event.stopPropagation()}
      style={{ pointerEvents: 'auto' }}
    >
      <ChartTooltipCard header={header} headerRef={headerRef} contentRef={contentRef}>
        {children}
      </ChartTooltipCard>
      <Box aria-hidden className={classes.arrow} />
    </Box>
  );
};

export const ChartTooltipSurface = ({ containerRef, ...props }: ChartTooltipSurfaceProps) => {
  const anchor = useChartTooltipAnchor();
  const container = anchor?.container ?? containerRef;
  if (!container) {
    return <ChartTooltipCard header={props.header}>{props.children}</ChartTooltipCard>;
  }

  // Mount measurements inside the portal, after its DOM nodes have been attached.
  return (
    <Portal>
      <PositionedChartTooltip {...props} container={container} anchor={anchor} />
    </Portal>
  );
};
