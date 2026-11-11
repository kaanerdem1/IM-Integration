import type { Ref } from 'react';
import { Box, Scroller, Tabs, type ScrollerProps, type TabsProps } from '@mantine/core';
import listClasses from '@/components/display/ListPage/style.module.scss';

const tabScrollerStyles: ScrollerProps['styles'] = {
  // Center short tab rows without clipping the first tab when the row overflows.
  content: { minWidth: '100%', width: 'max-content', justifyContent: 'center' },
  // Preserve the active underline below the header border and align the scroll controls.
  container: { paddingBottom: '3px' },
  control: { bottom: '3px', paddingBottom: '12px' },
  root: { marginBottom: '-3px' },
};

const modeTabsStyles: TabsProps['styles'] = {
  tab: {
    height: 'auto',
    paddingBlock: 'var(--mode-tab-padding-block)',
    paddingInline: 'var(--mode-tab-padding-inline)',
  },
};

type DrawerDetailTabsProps = Pick<TabsProps, 'children' | 'value' | 'onChange'> & {
  scrollerRef?: Ref<HTMLDivElement>;
};

export const DrawerDetailTabs = ({
  children,
  onChange,
  scrollerRef,
  value,
}: DrawerDetailTabsProps) => (
  <Box className={listClasses.listHeader}>
    <Box className={listClasses.modeTabsRow} miw={0} style={{ flex: '1 1 auto' }}>
      <Scroller ref={scrollerRef} styles={tabScrollerStyles}>
        <Tabs
          classNames={{
            root: listClasses.modeTabs,
            list: listClasses.modeTabsList,
            tab: listClasses.modeTab,
          }}
          color="cyan"
          mod={{ appTabs: false }}
          radius="sm"
          styles={modeTabsStyles}
          value={value}
          variant="default"
          onChange={onChange}
        >
          <Tabs.List justify="center">{children}</Tabs.List>
        </Tabs>
      </Scroller>
    </Box>
  </Box>
);
