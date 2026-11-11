import { describe, expect, it } from 'vitest';
import {
  areFormValuesEqual,
  canAccessSequentialFormTab,
  getEarlierFormTab,
  getLaterFormTab,
} from './formTabFlow';

const tabs = ['task', 'technical', 'checklist', 'release'] as const;

describe('sequential form tab flow', () => {
  it('allows only the current and completed tabs before the form is finished', () => {
    expect(
      canAccessSequentialFormTab({
        allowedTab: 'technical',
        tabs,
        targetTab: 'task',
      })
    ).toBe(true);
    expect(
      canAccessSequentialFormTab({
        allowedTab: 'technical',
        tabs,
        targetTab: 'checklist',
      })
    ).toBe(false);
  });

  it('allows any registered tab after the workflow starts', () => {
    expect(
      canAccessSequentialFormTab({
        allowedTab: 'task',
        allowAllTabs: true,
        tabs,
        targetTab: 'technical',
      })
    ).toBe(true);
    expect(
      canAccessSequentialFormTab({
        allowedTab: 'task',
        allowAllTabs: true,
        tabs,
        targetTab: 'release',
      })
    ).toBe(true);
  });

  it('finds the earlier and later tab without form-specific knowledge', () => {
    expect(getEarlierFormTab(tabs, 'checklist', 'technical')).toBe('technical');
    expect(getLaterFormTab(tabs, 'task', 'release')).toBe('release');
  });
});

describe('areFormValuesEqual', () => {
  it('normalizes empty, numeric and unordered array values', () => {
    expect(areFormValuesEqual(undefined, null)).toBe(true);
    expect(areFormValuesEqual('', null)).toBe(true);
    expect(areFormValuesEqual('42', 42)).toBe(true);
    expect(areFormValuesEqual(['b', 'a'], ['a', 'b'])).toBe(true);
  });
});
