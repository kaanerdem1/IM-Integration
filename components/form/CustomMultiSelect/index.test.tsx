import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { CustomMultiSelect } from './index';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'tr-TR' }, t: (key: string) => key }),
}));

describe('CustomMultiSelect selection actions', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('excludes None from SelectAll while leaving it available as an individual option', () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <MantineProvider env="test">
          <CustomMultiSelect
            data={[
              { value: '__no-related-issue__', label: 'Yok' },
              { value: 'related-1', label: 'Talep 1' },
              { value: 'related-2', label: 'Talep 2' },
            ]}
            selectAllExcludedValues={['__no-related-issue__']}
            withSelectionActions
            onChange={onChange}
          />
        </MantineProvider>
      );
    });
    act(() => container.querySelector('input')?.click());
    const selectAll = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Tümünü Seç'
    );
    expect(selectAll).toBeDefined();
    act(() => selectAll?.click());

    expect(onChange).toHaveBeenCalledWith(['related-1', 'related-2']);
  });
});
