import type { ReactNode } from 'react';
import classes from './_style/style.module.scss';
import { Box, Group } from '@mantine/core';

export const ModalInfoBand = ({ children }: { children: ReactNode }) => (
  <Box px="lg" py="sm" className={classes.infoBand} data-modal-info-band>
    <Group justify="center" gap="lg" className={classes.infoBandContent}>
      {children}
    </Group>
  </Box>
);
