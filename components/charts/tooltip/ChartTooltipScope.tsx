import {
  cloneElement,
  useRef,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  type SyntheticEvent,
} from 'react';
import { useMergedRef } from '@mantine/hooks';
import { ChartTooltipContext } from './ChartTooltipContext';

// Capture the rendered mark, including custom minimum-size bars, without mousemove state.
const markSelector =
  '.recharts-bar-rectangle, .recharts-pie-sector, .recharts-dot, .recharts-active-dot, .recharts-scatter-symbol';

export const ChartTooltipScope = ({
  children,
}: {
  children: ReactElement<HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }>;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const element = useRef<Element>(null);
  const update = useRef<(() => void) | null>(null);
  const anchor = useRef({ container, element, update });
  const ref = useMergedRef(container, children.props.ref);
  const capture = (event: SyntheticEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && container.current?.contains(event.target)) {
      const next = event.target.closest(markSelector);
      // Keep the bar/sector anchor while the pointer crosses the gap to its tooltip.
      if (!next && element.current?.matches('.recharts-bar-rectangle, .recharts-pie-sector')) {
        return;
      }
      if (next !== element.current) {
        element.current = next;
        update.current?.();
      }
    }
  };

  return (
    <ChartTooltipContext value={anchor.current}>
      {cloneElement(children, {
        ref,
        onMouseOverCapture: (event) => {
          capture(event);
          children.props.onMouseOverCapture?.(event);
        },
        onMouseMoveCapture: (event) => {
          capture(event);
          children.props.onMouseMoveCapture?.(event);
        },
        onFocusCapture: (event) => {
          capture(event);
          children.props.onFocusCapture?.(event);
        },
      })}
    </ChartTooltipContext>
  );
};
