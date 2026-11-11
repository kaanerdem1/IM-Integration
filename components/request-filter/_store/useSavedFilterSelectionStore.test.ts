import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import { FILTER_SELECTION_SCOPES, savedFilterScopes } from '../_config/savedFilterScopes';
import { useSavedFilterSelectionStore as store } from './useSavedFilterSelectionStore';

const storageKey = store.persist.getOptions().name!;
const user = 'id:user-a';
const otherUser = 'id:user-b';
const scope = FILTER_SELECTION_SCOPES.home.pool;
const otherScope = FILTER_SELECTION_SCOPES.sla.pool;
const persisted = () => JSON.parse(localStorage.getItem(storageKey)!).state.selectionsByUser;

beforeEach(() => {
  store.setState({ selectionsByUser: {} });
  store.persist.clearStorage();
});
afterEach(() => {
  vi.restoreAllMocks();
  store.persist.clearStorage();
});

describe('persisted filter selections', () => {
  it('isolates users and placements and persists only preference data in an environment-specific key', () => {
    store.getState().select(user, scope, 'filter-a');
    store.getState().select(user, otherScope, 'filter-b');
    store.getState().select(otherUser, scope, 'filter-c');
    expect(persisted()).toEqual({
      [user]: {
        [scope]: { filterIds: ['filter-a'], explicit: true },
        [otherScope]: { filterIds: ['filter-b'], explicit: true },
      },
      [otherUser]: { [scope]: { filterIds: ['filter-c'], explicit: true } },
    });
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKey)!).state)).toEqual([
      'selectionsByUser',
    ]);
    expect(storageKey).toBe(
      `im-saved-filter-selections:${import.meta.env.MODE}:${import.meta.env.VITE_API_URL ?? ''}`
    );
  });

  it('restores saved selections synchronously when a new store instance loads', async () => {
    store.getState().select(user, scope, 'filter-b');
    vi.resetModules();
    const { useSavedFilterSelectionStore: restored } =
      await import('./useSavedFilterSelectionStore');
    expect(restored.persist.hasHydrated()).toBe(true);
    expect(restored.getState().selectionsByUser[user]?.[scope]).toEqual({
      filterIds: ['filter-b'],
      explicit: true,
    });
  });

  it('persists automatic defaults for all placements without marking them as manual choices', () => {
    store.getState().reconcile(user, ['first', 'second']);
    expect(Object.keys(persisted()[user])).toHaveLength(savedFilterScopes.length);
    expect(persisted()[user][scope]).toEqual({ filterIds: [DEFAULT_REQUEST_FILTER_ID] });
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const initial = store.getState();
    store.getState().reconcile(user, ['new-first', 'first', 'second']);
    expect(store.getState()).toBe(initial);
    expect(write).not.toHaveBeenCalled();
  });

  it('writes the replacement for a deleted filter once, including unmounted placements', () => {
    store.getState().select(user, scope, 'deleted');
    store.getState().select(user, otherScope, 'deleted');
    store.getState().select(otherUser, scope, 'deleted');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    store.getState().reconcile(user, ['first', 'second']);
    expect(persisted()[user][scope]).toEqual({
      filterIds: [DEFAULT_REQUEST_FILTER_ID],
      explicit: true,
    });
    expect(persisted()[user][otherScope]).toEqual({
      filterIds: [DEFAULT_REQUEST_FILTER_ID],
      explicit: true,
    });
    expect(persisted()[otherUser][scope]).toEqual({ filterIds: ['deleted'], explicit: true });
    expect(write).toHaveBeenCalledOnce();
    store.getState().reconcile(user, ['first', 'second']);
    expect(write).toHaveBeenCalledOnce();
  });

  it('replaces deleted IDs with the built-in filter and retains it when a saved filter is added', () => {
    store.getState().select(user, scope, 'deleted');
    store.getState().select(otherUser, scope, 'retained');
    store.getState().reconcile(user, []);
    expect(persisted()[user][scope]).toEqual({
      filterIds: [DEFAULT_REQUEST_FILTER_ID],
      explicit: true,
    });
    expect(persisted()[otherUser][scope].filterIds).toEqual(['retained']);
    store.getState().reconcile(user, ['new-filter']);
    expect(persisted()[user][scope]).toEqual({
      filterIds: [DEFAULT_REQUEST_FILTER_ID],
      explicit: true,
    });
  });

  it('does not write or notify for repeated selections or an unknown user', () => {
    store.getState().select(user, scope, 'one');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.getState().select(user, scope, 'one');
    store.getState().select('', scope, 'one');
    store.getState().reconcile('', ['one']);
    expect(write).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('discards malformed persisted entries without replacing store actions', async () => {
    const select = store.getState().select;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        state: {
          select: 'invalid',
          selectionsByUser: {
            [user]: {
              [scope]: { filterId: 'one' },
              [otherScope]: { filterId: 42 },
              unknown: { filterId: 'two' },
            },
            [otherUser]: null,
          },
        },
      })
    );
    await store.persist.rehydrate();
    expect(store.getState().select).toBe(select);
    expect(store.getState().selectionsByUser).toEqual({
      [user]: { [scope]: { filterIds: ['one'] } },
    });
  });

  it('can persist a new selection after stored JSON is corrupt', async () => {
    localStorage.setItem(storageKey, 'invalid-json');
    await store.persist.rehydrate();
    expect(store.getState().selectionsByUser).toEqual({});
    store.getState().select(user, scope, 'one');
    expect(store.getState().selectionsByUser[user]?.[scope]?.filterIds).toEqual(['one']);
    expect(persisted()[user][scope]).toEqual({ filterIds: ['one'], explicit: true });
  });

  it('migrates old automatic first-filter choices to the built-in default, preserving manual choices', async () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        state: {
          selectionsByUser: {
            [user]: {
              [scope]: { filterId: 'old-first' },
              [otherScope]: { filterId: 'my-choice', explicit: true },
            },
          },
        },
      })
    );
    await store.persist.rehydrate();
    expect(persisted()[user][scope]).toEqual({ filterIds: [DEFAULT_REQUEST_FILTER_ID] });
    expect(persisted()[user][otherScope]).toEqual({ filterIds: ['my-choice'], explicit: true });
    expect(JSON.parse(localStorage.getItem(storageKey)!).version).toBe(3);
  });

  it('toggles multiple records, drops the default, and falls back after deselecting the last record', () => {
    store.getState().toggle(user, scope, 'b');
    store.getState().toggle(user, scope, 'a');
    expect(persisted()[user][scope].filterIds).toEqual(['a', 'b']);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    store.getState().select(user, scope, ['b', 'a', 'a']);
    expect(listener).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    store.getState().toggle(user, scope, 'a');
    expect(persisted()[user][scope].filterIds).toEqual(['b']);
    store.getState().toggle(user, scope, 'b');
    expect(persisted()[user][scope].filterIds).toEqual([DEFAULT_REQUEST_FILTER_ID]);
    unsubscribe();
  });

  it('removes only deleted records from a multiple selection', () => {
    store.getState().select(user, scope, ['a', 'b']);
    store.getState().reconcile(user, ['b', 'c']);
    expect(persisted()[user][scope].filterIds).toEqual(['b']);
  });
});
