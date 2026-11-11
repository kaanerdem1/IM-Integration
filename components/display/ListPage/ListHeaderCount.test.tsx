import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListHeaderCount } from './ListHeaderCount';

const mocks = vi.hoisted(() => ({ renderNumber: vi.fn() }));

vi.mock('@mantine/core', () => ({
  RollingNumber: ({ value }: { value: number }) => {
    mocks.renderNumber(value);
    return <span>{value}</span>;
  },
}));

describe('ListHeaderCount', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('initializes the animation once and skips renders when its value is unchanged', async () => {
    const render = (value: number) =>
      act(async () => root.render(<ListHeaderCount value={value} />));

    await render(88);
    expect(mocks.renderNumber.mock.calls).toEqual([[0], [88]]);

    await render(88);
    await render(88);
    expect(mocks.renderNumber).toHaveBeenCalledTimes(2);

    await render(87);
    expect(mocks.renderNumber.mock.calls).toEqual([[0], [88], [87]]);
    expect(container).toHaveTextContent('87');
  });
});
