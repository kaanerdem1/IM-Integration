import { Rectangle, type BarShapeProps } from 'recharts';
import {
  barChartBarProps,
  barChartMinimumSize,
  barChartMinimumVisibleSize,
  barChartValueLabel,
} from '../chartTheme';

type StackedBarLayout = {
  pixelsPerValue: number;
  plotSize: number;
  shapeBySeriesName: ReadonlyMap<string, { offset: number; size: number; minimum: number }>;
};

type MinimumStackedBarLayoutOptions = {
  orientation: 'horizontal' | 'vertical';
  getSeriesNames: (props: BarShapeProps) => readonly string[] | undefined;
  fitToPlot?: boolean;
};

const scalePrecision = 0.001;

const getLabelWidth = (label: string) =>
  label.length * barChartValueLabel.characterWidth + barChartValueLabel.horizontalPadding;

export const getMinimumBarSize = (value: number, orientation: 'horizontal' | 'vertical') => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return orientation === 'horizontal'
    ? Math.max(barChartMinimumSize, getLabelWidth(value.toLocaleString()))
    : barChartMinimumSize;
};

// Enlarge positive segments together so the next segment starts after the enlarged one.
// Cache per payload/scale: each row's layout is calculated once, including after resizing.
export const createMinimumStackedBarLayout = ({
  orientation,
  getSeriesNames,
  fitToPlot = false,
}: MinimumStackedBarLayoutOptions) => {
  const layoutByDatum = new WeakMap<object, StackedBarLayout>();

  return (props: BarShapeProps, seriesName: string): BarShapeProps => {
    const payload = props.payload;
    const value = Number(payload?.[seriesName] ?? 0);
    const seriesNames = getSeriesNames(props);
    const originalSize = Math.abs(orientation === 'vertical' ? props.height : props.width);
    const pixelsPerValue = originalSize / value;
    const plotSize = fitToPlot
      ? Math.abs(
          Number(
            (orientation === 'vertical' ? props.background?.height : props.background?.width) ?? 0
          )
        )
      : 0;

    if (
      !seriesNames ||
      !payload ||
      typeof payload !== 'object' ||
      !Number.isFinite(pixelsPerValue) ||
      pixelsPerValue <= 0
    ) {
      return props;
    }

    let layout = layoutByDatum.get(payload);

    if (
      !layout ||
      Math.abs(layout.pixelsPerValue - pixelsPerValue) > scalePrecision ||
      layout.plotSize !== plotSize
    ) {
      let offset = 0;
      let minimumTotal = 0;
      const shapeBySeriesName = new Map<
        string,
        { offset: number; size: number; minimum: number }
      >();

      seriesNames.forEach((name) => {
        const segmentValue = Number(payload[name] ?? 0);

        if (!Number.isFinite(segmentValue) || segmentValue <= 0) {
          return;
        }

        const minimum = getMinimumBarSize(segmentValue, orientation);
        const size = Math.max(segmentValue * pixelsPerValue, minimum);
        shapeBySeriesName.set(name, { offset, size, minimum });
        minimumTotal += minimum;
        offset += size;
      });
      if (fitToPlot && plotSize > 0 && minimumTotal > plotSize) {
        // Dense rows keep a small visible segment; labels are still shown wherever they fit.
        offset = 0;
        minimumTotal = 0;
        shapeBySeriesName.forEach((shape, name) => {
          shape.minimum = Math.min(shape.minimum, barChartMinimumVisibleSize);
          shape.size = Math.max(Number(payload[name]) * pixelsPerValue, shape.minimum);
          shape.offset = offset;
          minimumTotal += shape.minimum;
          offset += shape.size;
        });
      }
      if (fitToPlot && Number.isFinite(plotSize) && plotSize > 0 && offset > plotSize) {
        // Keep the minimums and shrink only the excess when the stack would leave the plot.
        const minimumScale = Math.min(1, plotSize / minimumTotal);
        const extraScale =
          offset > minimumTotal
            ? (plotSize - minimumTotal * minimumScale) / (offset - minimumTotal)
            : 0;
        offset = 0;
        shapeBySeriesName.forEach((shape) => {
          shape.size = shape.minimum * minimumScale + (shape.size - shape.minimum) * extraScale;
          shape.offset = offset;
          offset += shape.size;
        });
      }
      layout = { pixelsPerValue, plotSize, shapeBySeriesName };
      layoutByDatum.set(payload, layout);
    }

    const shape = layout.shapeBySeriesName.get(seriesName);

    if (!shape) {
      return props;
    }

    if (orientation === 'vertical') {
      const baseline = Number(props.background?.y ?? 0) + Number(props.background?.height ?? 0);
      return { ...props, height: shape.size, y: baseline - shape.offset - shape.size };
    }

    return { ...props, width: shape.size, x: Number(props.background?.x ?? 0) + shape.offset };
  };
};

export const renderBarWithValueLabel = (
  props: BarShapeProps,
  value: number,
  textColor = 'var(--mantine-color-white)'
) => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const width = Math.abs(props.width);
  const height = Math.abs(props.height);
  const label = value.toLocaleString();
  const hasLabelRoom = height >= barChartValueLabel.minHeight && width >= getLabelWidth(label);

  return (
    <g>
      <Rectangle
        {...props}
        radius={Math.min(Number(barChartBarProps.radius), width / 2, height / 2)}
        strokeWidth={Math.min(Number(barChartBarProps.strokeWidth), Math.min(width, height) / 3)}
      />
      {hasLabelRoom && (
        <text
          dominantBaseline="central"
          fill={textColor}
          fillOpacity={props.fillOpacity}
          fontSize={barChartValueLabel.fontSize}
          fontWeight={barChartValueLabel.fontWeight}
          pointerEvents="none"
          textAnchor="middle"
          x={props.x + props.width / 2}
          y={props.y + props.height / 2}
        >
          {label}
        </text>
      )}
    </g>
  );
};
