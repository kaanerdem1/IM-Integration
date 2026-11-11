import { describe, expect, it } from 'vitest';
import { createRequestFilterValidationSchema } from './validation';

describe('request filter validation', () => {
  const schema = createRequestFilterValidationSchema('Filtre Adı alanı zorunludur');

  it.each(['', '   ', '\t\n'])('rejects empty or whitespace-only names: %j', async (Name) => {
    await expect(schema.validate({ Name, Description: '' })).rejects.toThrow(
      'Filtre Adı alanı zorunludur'
    );
  });

  it('trims a valid name', async () => {
    await expect(
      schema.validate({ Name: '  Bana atanan talepler  ', Description: '' })
    ).resolves.toEqual({
      Name: 'Bana atanan talepler',
      Description: '',
    });
  });

  it.each(['', '   ', '  Ekibin açık talepleri\nHaftalık takip  '])(
    'accepts an optional description and trims its surrounding whitespace: %j',
    async (Description) => {
      await expect(schema.validate({ Name: 'Listem', Description })).resolves.toEqual({
        Name: 'Listem',
        Description: Description.trim(),
      });
    }
  );
});
