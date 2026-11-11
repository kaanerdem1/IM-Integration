import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { ChartTooltipHeader } from './ChartTooltipHeader';

describe('ChartTooltipHeader hierarchy', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each([
    ['İş Birimi', 'Ödeme Sistemleri', '54 talep', undefined],
    ['Yazılım Direktörlüğü', '01 Bankacılık', '1 talep', undefined],
    ['İş Akışı Adımı', 'Yönetici Kontrol ve Onay', '647 talep', 'Aşan · 64 birim'],
    ['Birim', 'Proje Ofisi Müdürlüğü', '40 iade', 'Tekrarlanan iade oranı: 13%'],
    ['Havuz', 'Havuz-1', '120 talep', undefined],
  ])('keeps the field and total above the value: %s', (fieldLabel, title, total, summary) => {
    act(() =>
      root.render(
        <MantineProvider env="test">
          <ChartTooltipHeader
            fieldLabel={fieldLabel}
            title={title}
            total={total}
            summary={summary}
          />
        </MantineProvider>
      )
    );
    const field = Array.from(container.querySelectorAll('.mantine-Text-root')).find(
      (element) => element.textContent === fieldLabel
    )!;
    expect(field.parentElement).toHaveTextContent(total);
    expect(field.parentElement).not.toHaveTextContent(title);
    expect(container).toHaveTextContent(title);
    if (summary) {
      expect(field.parentElement).not.toHaveTextContent(summary);
      expect(container).toHaveTextContent(summary);
    }
    expect(
      Array.from(container.querySelectorAll('.mantine-Text-root')).filter(
        (element) => element.textContent === total
      )
    ).toHaveLength(1);
  });
});
