import { describe, expect, it } from 'vitest';
import {
  createRequestDistributionFieldOptions,
  createRequestDistributionSavedFilterOptions,
} from './options';

describe('request distribution options', () => {
  it('maps valid parameter items and removes duplicate values', () => {
    const { fieldOptionByValue, fieldOptions } = createRequestDistributionFieldOptions([
      { Label: 'Talep Türü', Value: 'talep-turu' },
      { Label: 'Yinelenen', Value: 'talep-turu' },
      { Label: 'Eksik değer', Value: null },
    ]);

    expect(fieldOptions).toEqual([{ label: 'Talep Türü', value: 'talep-turu' }]);
    expect(fieldOptionByValue.get('talep-turu')).toEqual({
      label: 'Talep Türü',
      value: 'talep-turu',
    });
  });

  it('maps valid saved filters and sorts them by name', () => {
    const secondFilter = { Id: '2', Name: 'Z Filtre', Filter: '{}' };
    const firstFilter = { Id: '1', Name: 'A Filtre', Filter: '{}' };
    const { savedFilterById, savedFilterOptions } = createRequestDistributionSavedFilterOptions([
      secondFilter,
      { Id: '', Name: 'Geçersiz' },
      firstFilter,
    ]);

    expect(savedFilterOptions).toEqual([
      { label: 'A Filtre', value: '1' },
      { label: 'Z Filtre', value: '2' },
    ]);
    expect(savedFilterById.get('2')).toEqual(secondFilter);
  });
});
