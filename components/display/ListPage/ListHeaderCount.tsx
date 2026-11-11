import { memo } from 'react';
import { RollingNumber } from '@mantine/core';
import { useMounted } from '@mantine/hooks';

export const ListHeaderCount = memo(({ value }: { value: number }) => {
  // RollingNumber animates value changes, so cached counts need one initial transition from zero.
  const mounted = useMounted();

  return (
    <RollingNumber value={mounted ? value : 0} display="inline-flex" fz="inherit" fw={600} lh={1} />
  );
});

ListHeaderCount.displayName = 'ListHeaderCount';
