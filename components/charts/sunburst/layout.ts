import { getThemeColor, type MantineColor, type MantineTheme } from '@mantine/core';
import type { ChartHighlightKey } from '../chartHighlightStore';
import { radialChartLayout } from '../chartTheme';

export interface AppSunburstChartData {
  [key: string]: unknown;
  children?: AppSunburstChartData[];
  color?: MantineColor;
  highlightKey?: ChartHighlightKey;
  name: string;
  value?: number;
}

type ResolvedSunburstNode = {
  data: AppSunburstChartData;
  children: ResolvedSunburstNode[];
  color: string;
  highlightKey?: ChartHighlightKey;
  key: string;
  name: string;
  value: number;
};

type SunburstRingSlot = {
  key: string;
  node: ResolvedSunburstNode | null;
  value: number;
  layoutValue: number;
};

export type SunburstRingSegment = {
  data?: AppSunburstChartData;
  color: string;
  highlightKey?: ChartHighlightKey;
  isPlaceholder: boolean;
  key: string;
  name: string;
  value: number;
  layoutValue: number;
};

export type SunburstRing = {
  segments: SunburstRingSegment[];
  visibleSegmentCount: number;
};

const getPositiveValue = (value: unknown) => {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
};

export const resolveSunburstNodes = (
  data: readonly AppSunburstChartData[],
  dataKey: string,
  theme: MantineTheme,
  parentColor?: MantineColor,
  parentHighlightKey?: ChartHighlightKey,
  parentKey = ''
): ResolvedSunburstNode[] => {
  const nodes: ResolvedSunburstNode[] = [];

  data.forEach((item, index) => {
    const key = parentKey ? `${parentKey}.${index.toString()}` : index.toString();
    const sourceColor = item.color ?? parentColor ?? 'gray.6';
    const highlightKey = item.highlightKey ?? parentHighlightKey;
    const children = resolveSunburstNodes(
      item.children ?? [],
      dataKey,
      theme,
      sourceColor,
      highlightKey,
      key
    );
    const childrenTotal = children.reduce((total, child) => total + child.value, 0);
    const value = children.length > 0 ? childrenTotal : getPositiveValue(item[dataKey]);

    if (value <= 0) {
      return;
    }

    nodes.push({
      data: item,
      children,
      color: getThemeColor(sourceColor, theme),
      highlightKey,
      key,
      name: item.name,
      value,
    });
  });

  return nodes;
};

export const getSunburstMetadata = (nodes: readonly ResolvedSunburstNode[]) => {
  const highlightKeys = new Set<ChartHighlightKey>();
  let depth = 0;

  const visit = (items: readonly ResolvedSunburstNode[], currentDepth: number) => {
    if (items.length === 0) {
      return;
    }

    depth = Math.max(depth, currentDepth);
    items.forEach((item) => {
      if (item.highlightKey) {
        highlightKeys.add(item.highlightKey);
      }

      visit(item.children, currentDepth + 1);
    });
  };

  visit(nodes, 1);
  return { depth, highlightKeys };
};

export const createSunburstRings = (
  nodes: readonly ResolvedSunburstNode[],
  depth: number,
  minimumSegmentRatio = 0
): SunburstRing[] => {
  const rings: SunburstRing[] = [];
  const layoutValues = new Map<string, number>();
  if (minimumSegmentRatio > 0) {
    let leafCount = 0;
    const countLeaves = (node: ResolvedSunburstNode) => {
      if (node.children.length) {
        node.children.forEach(countLeaves);
      } else {
        leafCount += 1;
      }
    };
    nodes.forEach(countLeaves);
    const total = nodes.reduce((sum, node) => sum + node.value, 0);
    const minimumRatio = Math.min(
      minimumSegmentRatio,
      radialChartLayout.minimumAngleBudgetRatio / Math.max(1, leafCount)
    );
    // Allocate once at the leaves, then sum upward. Independent minimum angles
    // per ring would break alignment between parent and child arcs.
    const assignLayoutValue = (node: ResolvedSunburstNode): number => {
      const value = node.children.length
        ? node.children.reduce((sum, child) => sum + assignLayoutValue(child), 0)
        : Math.max(total * minimumRatio, node.value);
      layoutValues.set(node.key, value);
      return value;
    };
    nodes.forEach(assignLayoutValue);
  }
  let slots: SunburstRingSlot[] = nodes.map((node) => ({
    key: node.key,
    node,
    value: node.value,
    layoutValue: layoutValues.get(node.key) ?? node.value,
  }));

  for (let depthIndex = 0; depthIndex < depth; depthIndex += 1) {
    let visibleSegmentCount = 0;
    const segments = slots.map<SunburstRingSegment>((slot) => {
      if (!slot.node) {
        return {
          color: 'transparent',
          isPlaceholder: true,
          key: slot.key,
          name: '',
          value: slot.value,
          layoutValue: slot.layoutValue,
        };
      }

      visibleSegmentCount += 1;
      return {
        color: slot.node.color,
        data: slot.node.data,
        highlightKey: slot.node.highlightKey,
        isPlaceholder: false,
        key: slot.key,
        name: slot.node.name,
        value: slot.value,
        layoutValue: slot.layoutValue,
      };
    });

    rings.push({ segments, visibleSegmentCount });

    if (depthIndex === depth - 1) {
      continue;
    }

    const nextSlots: SunburstRingSlot[] = [];

    slots.forEach((slot) => {
      if (slot.node?.children.length) {
        slot.node.children.forEach((child) => {
          nextSlots.push({
            key: child.key,
            node: child,
            value: child.value,
            layoutValue: layoutValues.get(child.key) ?? child.value,
          });
        });
        return;
      }

      nextSlots.push({
        key: `${slot.key}.placeholder`,
        node: null,
        value: slot.value,
        layoutValue: slot.layoutValue,
      });
    });

    slots = nextSlots;
  }

  return rings;
};
