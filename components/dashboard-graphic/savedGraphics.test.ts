import { describe, expect, it } from 'vitest';
import type { UserDashboardGraphicUpdateDto } from '@/_api/_core/api-gen/types';
import { DEFAULT_REQUEST_FILTER_ID } from '@/components/request-filter/_config/defaultRequestFilter';
import {
  createDashboardGraphicConfiguration,
  createDashboardGraphicOptions,
  getDashboardGraphicFormValues,
  hasDashboardGraphicChanges,
} from './savedGraphics';

describe('saved graphic preferences', () => {
  it.each([undefined, null, '', 'unsupported'])(
    'falls back to the existing legend placement for a legacy value: %s',
    (LegendPosition) => {
      const values = getDashboardGraphicFormValues({ LegendPosition });
      expect(values.LegendPosition).toBe('top');
    }
  );

  it.each(['top', 'right', 'bottom', 'left'] as const)(
    'retains the saved %s placement in the form and payload',
    (LegendPosition) => {
      const values = getDashboardGraphicFormValues({
        LegendPosition,
        UserFormFilterIds: null,
      });
      const payload = createDashboardGraphicConfiguration(
        values,
        {}
      ) satisfies UserDashboardGraphicUpdateDto;
      expect(payload).toMatchObject({
        LegendPosition,
        UserFormFilterIds: [],
      });
    }
  );

  it('compares saved legend placement with the fallback placement', () => {
    expect(hasDashboardGraphicChanges({}, { LegendPosition: 'top' })).toBe(false);
    expect(hasDashboardGraphicChanges({}, { LegendPosition: 'left' })).toBe(true);
  });

  it('chooses the first valid record without reordering saved options', () => {
    const result = createDashboardGraphicOptions([
      { Name: 'Missing ID' },
      { Id: 'first', Name: 'First' },
      { Id: 'second', Name: 'Second' },
    ]);
    expect(result.initialGraphicId).toBe('first');
    expect(result.graphicOptions.map((option) => option.value)).toEqual(['first', 'second']);
    expect(createDashboardGraphicOptions([{ Id: 'first' }]).initialGraphicId).toBe('first');
    expect(createDashboardGraphicOptions([]).initialGraphicId).toBeNull();
  });

  it('preserves multiple saved IDs through edit/save without persisting the built-in default', () => {
    const values = getDashboardGraphicFormValues({
      UserFormFilterIds: ['filter-2', DEFAULT_REQUEST_FILTER_ID, 'filter-1', 'filter-2'],
    });
    expect(values.UserFormFilterIds).toEqual(['filter-1', 'filter-2']);
    expect(createDashboardGraphicConfiguration(values, {}).UserFormFilterIds).toEqual([
      'filter-1',
      'filter-2',
    ]);
  });

  it.each([null, undefined, [], [DEFAULT_REQUEST_FILTER_ID]])(
    'normalizes %j to an explicit empty list for clearing saved associations',
    (UserFormFilterIds) => {
      const values = getDashboardGraphicFormValues({ UserFormFilterIds });
      expect(values.UserFormFilterIds).toEqual([]);
      expect(createDashboardGraphicConfiguration(values, {}).UserFormFilterIds).toEqual([]);
      expect(hasDashboardGraphicChanges({ UserFormFilterIds }, {})).toBe(false);
    }
  );

  it('compares selection membership, not array identity or order', () => {
    const saved = { UserFormFilterIds: ['filter-1', 'filter-2'] };
    expect(
      hasDashboardGraphicChanges({ UserFormFilterIds: ['filter-2', 'filter-1', 'filter-1'] }, saved)
    ).toBe(false);
    expect(hasDashboardGraphicChanges({ UserFormFilterIds: ['filter-1'] }, saved)).toBe(true);
    expect(hasDashboardGraphicChanges({ UserFormFilterIds: [] }, saved)).toBe(true);
  });
});
