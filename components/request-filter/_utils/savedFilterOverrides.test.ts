import { describe, expect, it } from 'vitest';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import {
  getSavedFilterCriteriaKey,
  parseSavedFilterOverrides,
  resolveSavedFilterOverrides,
  serializeSavedFilterOverrides,
} from './savedFilterOverrides';

describe('temporary saved filter criteria', () => {
  const ids = ['ot', 'yt'];
  const saved: RequestListFilterValue[] = [
    { listIssueType: '2', listStep: ['84'] },
    { listIssueType: '1', listStep: ['42'], listCreatedQuickRange: 'last-month' },
  ];

  it('reuses saved criteria when no temporary overrides exist', () => {
    expect(resolveSavedFilterOverrides(ids, saved, {})).toBe(saved);
  });

  it('stores only changed records, preserving separate type-specific steps', () => {
    const applied = [{ ...saved[0], listStep: ['99', '85'] }, saved[1]];
    const raw = serializeSavedFilterOverrides(ids, saved, applied)!;
    expect(Object.keys(JSON.parse(raw))).toEqual(['ot']);
    expect(JSON.parse(JSON.parse(raw).ot.value)).toMatchObject({
      listDraft: true,
      listOperationalStep: ['85'],
    });
    expect(resolveSavedFilterOverrides(ids, saved, parseSavedFilterOverrides(raw)!)).toEqual([
      { ...applied[0], listStep: ['85', '99'] },
      applied[1],
    ]);
    expect(serializeSavedFilterOverrides(ids, saved, saved)).toBeUndefined();
  });

  it('uses the current saved record after its criteria change without affecting other overrides', () => {
    const applied = [
      { ...saved[0], listStep: ['85'] },
      { ...saved[1], listStep: ['43'] },
    ];
    const overrides = parseSavedFilterOverrides(
      serializeSavedFilterOverrides(ids, saved, applied)
    )!;
    const updated = [{ ...saved[0], listStep: ['86'] }, saved[1]];
    expect(resolveSavedFilterOverrides(ids, updated, overrides)).toEqual([updated[0], applied[1]]);
    expect(resolveSavedFilterOverrides(['yt'], [saved[1]], overrides)).toEqual([applied[1]]);
  });

  it('normalizes property order and omits undefined fields from revision keys', () => {
    expect(
      getSavedFilterCriteriaKey({
        listStep: ['42'],
        listIssueType: '1',
        listCreatedFrom: undefined,
      })
    ).toBe(getSavedFilterCriteriaKey({ listIssueType: '1', listStep: ['42'] }));
  });

  it.each([
    'invalid',
    '[]',
    'null',
    '{"yt":null}',
    '{"yt":{"source":1,"value":"{}"}}',
    '{"yt":{"source":"","value":"bad"}}',
  ])('rejects malformed overrides: %s', (raw) => {
    expect(parseSavedFilterOverrides(raw)).toBeNull();
  });

  it('treats inherited object property names as ordinary record IDs', () => {
    const values = [{ listNo: ['A'] }];
    const applied = [{ listNo: ['B'] }];
    const overrides = parseSavedFilterOverrides(
      serializeSavedFilterOverrides(['__proto__'], values, applied)
    )!;
    expect(resolveSavedFilterOverrides(['__proto__'], values, overrides)).toEqual(applied);
    expect(parseSavedFilterOverrides()).toEqual({});
  });
});
