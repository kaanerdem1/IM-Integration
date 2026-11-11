import { describe, expect, it } from 'vitest';
import { mapFieldItemsToOptions } from './action';

describe('mapFieldItemsToOptions', () => {
  it('reuses mapped options while the service item collection is unchanged', () => {
    const items = [
      { Id: '1', Label: 'Bir', Value: 'one' },
      { Id: '2', Label: 'Iki', Value: 'two' },
    ];

    const firstOptions = mapFieldItemsToOptions({ Items: items });
    const secondOptions = mapFieldItemsToOptions({ Items: items });

    expect(secondOptions).toBe(firstOptions);
    expect(secondOptions).toEqual([
      { label: 'Bir', value: '1' },
      { label: 'Iki', value: '2' },
    ]);
  });

  it('does not share cached options between different item collections', () => {
    const firstOptions = mapFieldItemsToOptions({ Items: [{ Id: '1', Label: 'Bir' }] });
    const secondOptions = mapFieldItemsToOptions({ Items: [{ Id: '2', Label: 'Iki' }] });

    expect(secondOptions).not.toBe(firstOptions);
  });
});
