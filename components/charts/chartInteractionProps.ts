import type { KeyboardEvent, MouseEvent } from 'react';

export type ChartOpenEvent = KeyboardEvent<Element> | MouseEvent<Element>;

/** Keep pointer, keyboard and new-tab behavior identical for SVG and HTML chart targets. */
export const chartInteractionProps = <T>(
  onOpen: ((item: T, event: ChartOpenEvent) => void) | undefined,
  item: T,
  label?: string,
  disabledReason?: string
) =>
  disabledReason
    ? {
        role: 'link' as const,
        tabIndex: 0,
        'aria-label': label,
        'aria-disabled': true,
        'aria-description': disabledReason,
        style: { cursor: 'not-allowed' },
        onClick: preventChartOpen,
        onAuxClick: preventChartOpen,
        onKeyDown: (event: KeyboardEvent<Element>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            preventChartOpen(event);
          }
        },
      }
    : onOpen
      ? {
          role: 'link' as const,
          tabIndex: 0,
          'aria-label': label,
          style: { cursor: 'pointer' },
          onClick: (event: MouseEvent<Element>) => onOpen(item, event),
          onAuxClick: (event: MouseEvent<Element>) => {
            if (event.button === 1) {
              onOpen(item, event);
            }
          },
          onKeyDown: (event: KeyboardEvent<Element>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              onOpen(item, event);
            }
          },
        }
      : {};

const preventChartOpen = (event: ChartOpenEvent) => {
  event.preventDefault();
  event.stopPropagation();
};
