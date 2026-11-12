import { IconChevronRight } from '@tabler/icons-react';
import { Box, Text } from '@mantine/core';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';
import classes from './catalog.module.scss';

export const ImpactSummary = () => (
  <Box component="aside" className={classes.impact} data-testid="impact-summary">
    <div className={classes.impactHead}>
      <Text fw={700}>Etki özeti</Text>
      <ToolbarActionIcon label="Paneli daralt" icon={<IconChevronRight size={16} />} />
    </div>
    <div className={classes.metric}>
      <div className={classes.metricValue}>0</div>
      <div className={classes.metricLabel}>etkilenen servis</div>
    </div>
    <dl className={classes.split}>
      <div>
        <dt>DOĞRUDAN</dt>
        <dd>0</dd>
      </div>
      <div>
        <dt>DOLAYLI</dt>
        <dd>0</dd>
      </div>
    </dl>
    <div className={classes.path}>
      <p className={classes.pathTitle}>ANA ETKİ YOLU</p>
      <Text fw={600} fz="sm" mb={6}>
        Etki yolunu görün
      </Text>
      <p className={classes.emptyPath}>
        Haritada bir servisin üzerine gelin. Merkezden o servise giden yol burada listelenir.
      </p>
    </div>
  </Box>
);
