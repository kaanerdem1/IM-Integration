import { radialChartLayout } from '../chartTheme';

export const getRadialRingThickness = (diameter: number, depth = 1) =>
  Math.round(
    Math.max(
      radialChartLayout.minimumThickness,
      Math.min(
        diameter *
          (depth > 1
            ? radialChartLayout.nestedThicknessRatio
            : radialChartLayout.singleThicknessRatio),
        depth > 1
          ? radialChartLayout.nestedMaximumThickness
          : radialChartLayout.singleMaximumThickness
      )
    )
  );

export const getRadialCenterFontSize = (diameter: number, innerDiameter: number) =>
  Math.round(
    Math.max(
      radialChartLayout.centerMinimumFontSize,
      Math.min(
        diameter * radialChartLayout.centerFontRatio,
        innerDiameter * radialChartLayout.centerFontToHoleRatio,
        radialChartLayout.centerMaximumFontSize
      )
    )
  );

// Include the separator stroke so the visible arc retains its minimum length.
export const getMinimumRadialSegmentAngle = (radius: number, strokeWidth: number) =>
  ((radialChartLayout.minimumSegmentLength + strokeWidth) / Math.max(1, radius)) * (180 / Math.PI);
