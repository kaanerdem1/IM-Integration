import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageConstants } from '@/_common/_constants/storage-constants';
import { isRecord } from '@/_helpers/object';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import { savedFilterScopes, type SavedFilterScope } from '../_config/savedFilterScopes';
import {
  defaultSavedFilterIds,
  normalizeSavedFilterIds,
  toggleSavedFilterId,
} from '../_utils/savedFilterSelection';

type SavedFilterSelection = {
  filterIds: string[];
  /** Keeps a manually selected empty-result badge accessible after login. */
  explicit?: true;
};
type UserSelections = Partial<Record<SavedFilterScope, SavedFilterSelection>>;
type PersistedSelections = { selectionsByUser: Record<string, UserSelections> };
type SavedFilterSelectionState = PersistedSelections & {
  select: (
    userIdentity: string,
    scope: SavedFilterScope,
    filterId: string | readonly string[]
  ) => void;
  toggle: (userIdentity: string, scope: SavedFilterScope, filterId: string) => void;
  reconcile: (userIdentity: string, availableIds: readonly string[]) => void;
};

// IDs are canonical at the store boundary; equality needs no additional sorting.
const hasSameIds = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

const readSelections = (
  persisted: unknown,
  resetAutomaticSelections = false
): PersistedSelections['selectionsByUser'] => {
  if (!isRecord(persisted) || !isRecord(persisted.selectionsByUser)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(persisted.selectionsByUser).flatMap(([userIdentity, selections]) => {
      if (!userIdentity || !isRecord(selections)) {
        return [];
      }
      const valid: UserSelections = {};
      for (const scope of savedFilterScopes) {
        const selection = selections[scope];
        if (!isRecord(selection)) {
          continue;
        }
        const ids = Array.isArray(selection.filterIds)
          ? selection.filterIds
          : typeof selection.filterId === 'string' && selection.filterId
            ? [selection.filterId]
            : undefined;
        if (ids && ids.every((id) => typeof id === 'string' && id)) {
          valid[scope] = {
            filterIds:
              resetAutomaticSelections && selection.explicit !== true
                ? [...defaultSavedFilterIds]
                : normalizeSavedFilterIds(ids),
            ...(selection.explicit === true ? { explicit: true } : {}),
          };
        }
      }
      return [[userIdentity, valid]];
    })
  );
};

export const useSavedFilterSelectionStore = create<SavedFilterSelectionState>()(
  persist(
    (set, get) => ({
      selectionsByUser: {},
      select: (userIdentity, scope, filterId) => {
        const filterIds = normalizeSavedFilterIds(
          typeof filterId === 'string' ? [filterId] : filterId
        );
        const { selectionsByUser } = get();
        const current = selectionsByUser[userIdentity]?.[scope];
        // Guard before set: persist writes to storage even for an unchanged state.
        if (
          !userIdentity ||
          !filterId ||
          (current && hasSameIds(current.filterIds, filterIds) && current.explicit)
        ) {
          return;
        }
        set({
          selectionsByUser: {
            ...selectionsByUser,
            [userIdentity]: {
              ...selectionsByUser[userIdentity],
              [scope]: { filterIds, explicit: true },
            },
          },
        });
      },
      toggle: (userIdentity, scope, filterId) => {
        const current =
          get().selectionsByUser[userIdentity]?.[scope]?.filterIds ?? defaultSavedFilterIds;
        get().select(userIdentity, scope, toggleSavedFilterId(current, filterId));
      },
      reconcile: (userIdentity, availableIds) => {
        if (!userIdentity) {
          return;
        }
        const { selectionsByUser } = get();
        const current = selectionsByUser[userIdentity] ?? {};
        const available = new Set([DEFAULT_REQUEST_FILTER_ID, ...availableIds]);
        const next: UserSelections = {};
        let changed = false;
        // One pass over the catalog and fixed placements, including currently unmounted cards.
        for (const scope of savedFilterScopes) {
          const selection = current[scope];
          const ids = normalizeSavedFilterIds(
            selection?.filterIds.filter((id) => available.has(id)) ?? []
          );
          if (selection && hasSameIds(selection.filterIds, ids)) {
            next[scope] = selection;
          } else {
            next[scope] = { ...selection, filterIds: ids };
          }
          changed ||= next[scope] !== selection;
        }
        if (changed) {
          set({ selectionsByUser: { ...selectionsByUser, [userIdentity]: next } });
        }
      },
    }),
    {
      name: `${storageConstants.SavedFilterSelections}:${import.meta.env.MODE}:${import.meta.env.VITE_API_URL ?? ''}`,
      version: 3,
      migrate: (persisted, version) => ({
        selectionsByUser: readSelections(persisted, version < 2),
      }),
      partialize: ({ selectionsByUser }) => ({ selectionsByUser }),
      merge: (persisted, current) => ({ ...current, selectionsByUser: readSelections(persisted) }),
    }
  )
);
