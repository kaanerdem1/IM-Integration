import { create } from 'zustand';
import type { DashboardGraphicConfiguration } from '../types';

type DashboardGraphicSelection = {
  selectedId: string | null;
  draft: DashboardGraphicConfiguration | null;
  selectGraphic: (id: string | null) => void;
  previewGraphic: (configuration: DashboardGraphicConfiguration, sourceId: string) => void;
};

export const useDashboardGraphicSelection = create<DashboardGraphicSelection>((set) => ({
  selectedId: null,
  draft: null,
  selectGraphic: (selectedId) => set({ selectedId, draft: null }),
  previewGraphic: (draft, selectedId) => set({ selectedId, draft }),
}));
