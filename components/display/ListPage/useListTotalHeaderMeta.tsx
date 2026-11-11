import { useMemo, type ReactNode } from 'react';
import { useHeaderMeta } from '@/_root/layouts/header/components/Breadcrumbs/useBreadcrumbContext';
import { ListHeaderCount } from './ListHeaderCount';

type ListTotalHeaderMetaParams = {
  prefix: string;
  suffix: ReactNode;
  testId?: string;
  value: number;
};

// Toplam kayıt sayısını uygulama başlığında, sayfa başlığının altında animasyonlu sayaçla gösterir
export const useListTotalHeaderMeta = ({
  prefix,
  suffix,
  testId,
  value,
}: ListTotalHeaderMetaParams) => {
  const meta = useMemo(
    () => (
      <span data-testid={testId}>
        {prefix}
        <ListHeaderCount value={value} />
        {suffix}
      </span>
    ),
    [prefix, suffix, testId, value]
  );

  useHeaderMeta(meta);
};
