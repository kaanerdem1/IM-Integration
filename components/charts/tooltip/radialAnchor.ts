// SVG coordinates stay fixed for the active slice, independent of pointer movement
// and external percentage labels. The screen matrix also accounts for chart scaling.
export const getRadialTooltipAnchor = (sector: SVGGraphicsElement | null) => {
  if (!sector?.hasAttribute('data-tooltip-x')) {
    return undefined;
  }
  const matrix = sector.getScreenCTM();
  if (!matrix) {
    return undefined;
  }
  const x = Number(sector.getAttribute('data-tooltip-x'));
  const y = Number(sector.getAttribute('data-tooltip-y'));
  const radius = Number(sector.getAttribute('data-tooltip-radius'));
  const dx = x - Number(sector.getAttribute('cx'));
  const dy = y - Number(sector.getAttribute('cy'));
  const screenX = matrix.a * x + matrix.c * y + matrix.e;
  const screenY = matrix.b * x + matrix.d * y + matrix.f;
  const halfWidth = radius * Math.hypot(matrix.a, matrix.c);
  const halfHeight = radius * Math.hypot(matrix.b, matrix.d);
  const preferredSide =
    Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top';

  return {
    bounds: new DOMRect(screenX - halfWidth, screenY - halfHeight, halfWidth * 2, halfHeight * 2),
    preferredSide,
  } as const;
};
