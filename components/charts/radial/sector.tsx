import { Sector, type PieSectorShapeProps } from 'recharts';

type AdaptiveRadialCornerRadiusOptions = {
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  requestedCornerRadius: number;
  startAngle: number;
};

export const getAdaptiveRadialCornerRadius = ({
  endAngle,
  innerRadius,
  outerRadius,
  requestedCornerRadius,
  startAngle,
}: AdaptiveRadialCornerRadiusOptions) => {
  const ringThickness = Math.max(0, outerRadius - innerRadius);
  const maximumCornerRadius = Math.min(Math.max(0, requestedCornerRadius), ringThickness / 2);
  const angle = Math.abs(endAngle - startAngle);

  if (maximumCornerRadius === 0 || angle === 0) {
    return 0;
  }

  if (angle >= 180) {
    return maximumCornerRadius;
  }

  const halfAngleSine = Math.sin((angle * Math.PI) / 360);

  if (halfAngleSine <= 0) {
    return 0;
  }

  const outerArcLimit = (halfAngleSine * outerRadius) / (1 + halfAngleSine);
  const innerArcLimit =
    innerRadius > 0 ? (halfAngleSine * innerRadius) / (1 - halfAngleSine) : maximumCornerRadius;

  return Math.max(0, Math.min(maximumCornerRadius, outerArcLimit * 0.95, innerArcLimit * 0.95));
};

export const renderAdaptiveRadialSector = (props: PieSectorShapeProps) => {
  const { key: _key, ...sectorProps } = props as PieSectorShapeProps & { key?: unknown };
  const angle = -((Number(props.startAngle) + Number(props.endAngle)) / 2) * (Math.PI / 180);
  const radius = (Number(props.innerRadius) + Number(props.outerRadius)) / 2;
  const cornerRadius = getAdaptiveRadialCornerRadius({
    endAngle: Number(sectorProps.endAngle),
    innerRadius: Number(sectorProps.innerRadius),
    outerRadius: Number(sectorProps.outerRadius),
    requestedCornerRadius: Number(sectorProps.cornerRadius ?? 0),
    startAngle: Number(sectorProps.startAngle),
  });

  return (
    <Sector
      {...sectorProps}
      data-tooltip-x={Number(props.cx) + radius * Math.cos(angle)}
      data-tooltip-y={Number(props.cy) + radius * Math.sin(angle)}
      data-tooltip-radius={(Number(props.outerRadius) - Number(props.innerRadius)) / 2}
      tabIndex={sectorProps.role === 'link' ? 0 : sectorProps.tabIndex}
      cornerRadius={cornerRadius}
      forceCornerRadius={cornerRadius > 0}
    />
  );
};
