import { useCallback, useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import { create } from 'zustand';
import { useChartTooltipAnchor } from './ChartTooltipContext';

const useActiveChartTooltip = create<{ id: string | null }>(() => ({ id: null }));

const closeTooltip = (id: string) => {
  // A delayed close or unmount must not dismiss another chart's tooltip.
  useActiveChartTooltip.setState((state) => (state.id === id ? { id: null } : state));
};

export const useRetainedTooltip = <T>(active: boolean, value: T) => {
  const id = useId();
  const anchor = useChartTooltipAnchor();
  const visible = useActiveChartTooltip((state) => state.id === id);
  const lastValue = useRef(value);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Cache the last active payload without triggering another render on every pointer update.
  useEffect(() => {
    if (active) {
      lastValue.current = value;
    }
  }, [active, value]);
  useEffect(() => {
    if (!active) {
      return;
    }
    const activate = () => {
      useActiveChartTooltip.setState((state) => (state.id === id ? state : { id }));
    };
    activate();
    // Recharts can retain keyboard activation after leaving a chart; allow deliberate re-entry.
    const chart = anchor?.container.current;
    chart?.addEventListener('pointerenter', activate);
    chart?.addEventListener('focusin', activate);
    chart?.addEventListener('keydown', activate);
    return () => {
      chart?.removeEventListener('pointerenter', activate);
      chart?.removeEventListener('focusin', activate);
      chart?.removeEventListener('keydown', activate);
    };
  }, [active, anchor, id]);
  useEffect(() => () => closeTooltip(id), [id]);
  useEffect(() => {
    if (!visible) {
      setHovered(false);
      setFocused(false);
      return;
    }
    if (active || hovered || focused) {
      return;
    }
    const timeout = window.setTimeout(() => closeTooltip(id), 200);
    return () => window.clearTimeout(timeout);
  }, [active, visible, hovered, focused, id]);
  const onMouseEnter = useCallback(() => setHovered(true), []);
  const onMouseLeave = useCallback(() => setHovered(false), []);
  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    event.stopPropagation();
    setFocused(true);
  }, []);
  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocused(false);
    }
  }, []);
  return {
    value: active ? value : lastValue.current,
    visible,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  };
};
