import { act } from 'react';
import { ErrorListener } from '.';
import { useErrorStore } from '@shared/store/error/useErrorStore';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { messageMock, useMessageMock } = vi.hoisted(() => {
  const messageMock = vi.fn();

  return {
    messageMock,
    useMessageMock: vi.fn(() => ({ message: messageMock })),
  };
});

vi.mock('@/_hooks/useMessage', () => ({
  useMessage: useMessageMock,
}));

describe('ErrorListener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    messageMock.mockClear();
    useMessageMock.mockClear();
    useErrorStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('processes queued errors in separate timer turns', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<ErrorListener />));
    act(() => {
      useErrorStore.getState().pushError('API error', 'api');
      useErrorStore.getState().pushError('Manual warning', 'manual');
    });

    expect(messageMock).not.toHaveBeenCalled();
    expect(useErrorStore.getState().queue).toHaveLength(2);

    await act(async () => vi.runAllTimersAsync());

    expect(messageMock).toHaveBeenCalledTimes(2);
    expect(messageMock).toHaveBeenCalledWith('API error', 'error', undefined);
    expect(messageMock).toHaveBeenCalledWith('Manual warning', 'warning', undefined);
    expect(useErrorStore.getState().queue).toHaveLength(0);

    act(() => root.unmount());
  });

  it('does not rerender when an error is added behind the current queue head', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<ErrorListener />));
    act(() => useErrorStore.getState().pushError('High priority error', 'api', 10));
    const renderCountWithHead = useMessageMock.mock.calls.length;

    act(() => useErrorStore.getState().pushError('Low priority error', 'api', 0));

    expect(useMessageMock).toHaveBeenCalledTimes(renderCountWithHead);

    act(() => root.unmount());
  });

  it('passes the service title and item boundaries to the notification', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const details = {
      title: 'Model Doğrulama Hatası',
      items: ['Birinci hata\n• Aynı hatanın açıklaması', 'İkinci hata'],
    };

    try {
      act(() => root.render(<ErrorListener />));
      act(() => useErrorStore.getState().pushError('Eski metin', 'api', 0, details));
      await act(async () => vi.runAllTimersAsync());

      expect(messageMock).toHaveBeenCalledExactlyOnceWith('Eski metin', 'error', details);
      expect(useErrorStore.getState().queue).toHaveLength(0);
    } finally {
      act(() => root.unmount());
    }
  });
});
