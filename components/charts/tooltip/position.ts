type Bounds = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
type Side = 'bottom' | 'top' | 'right' | 'left';

const padding = 12;
const gap = 12;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, Math.max(min, max)));

export const getChartTooltipPosition = (
  anchor: Bounds,
  width: number,
  height: number,
  viewport: { width: number; height: number },
  preferredSide?: Side
) => {
  const right = viewport.width - padding;
  const bottom = viewport.height - padding;
  // Keep long lists readable without turning a tooltip into a full-height panel.
  const preferredHeight = Math.min(height, 560, viewport.height * 0.7);
  const candidates: { side: Side; height: number }[] = [
    { side: 'bottom', height: Math.max(0, bottom - anchor.bottom - gap) },
    { side: 'top', height: Math.max(0, anchor.top - gap - padding) },
  ];

  if (right - anchor.right - gap >= width) {
    candidates.push({ side: 'right', height: bottom - padding });
  }
  if (anchor.left - gap - padding >= width) {
    candidates.push({ side: 'left', height: bottom - padding });
  }
  if (preferredSide) {
    candidates.sort((a, b) => Number(b.side === preferredSide) - Number(a.side === preferredSide));
  }

  // Prefer a side that fits everything; otherwise use the largest safe scrollable area.
  const chosen =
    candidates.find((candidate) => candidate.height >= preferredHeight) ??
    candidates.reduce((best, candidate) => (candidate.height > best.height ? candidate : best));
  const renderedHeight = Math.min(preferredHeight, chosen.height);
  const centerX = (anchor.left + anchor.right) / 2;
  const centerY = (anchor.top + anchor.bottom) / 2;
  const vertical = chosen.side === 'top' || chosen.side === 'bottom';
  const left = vertical
    ? clamp(centerX - width / 2, padding, right - width)
    : chosen.side === 'right'
      ? anchor.right + gap
      : anchor.left - gap - width;
  const top = vertical
    ? chosen.side === 'bottom'
      ? anchor.bottom + gap
      : anchor.top - gap - renderedHeight
    : clamp(centerY - renderedHeight / 2, padding, bottom - renderedHeight);

  return {
    left,
    top,
    maxHeight: chosen.height,
    side: chosen.side,
    arrow: vertical
      ? clamp(centerX - left, padding, width - padding)
      : clamp(centerY - top, padding, renderedHeight - padding),
  };
};
