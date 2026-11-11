import { useCallback } from 'react';
import classes from '../style.module.scss';
import clsx from 'clsx';
import { Box, Group, SegmentedControl, Tabs } from '@mantine/core';
import type { ListPageHeaderProps } from './types';

export type { ListPageHeaderProps, ListPageTab } from './types';

// Tema sekmeleri hap stilinde (satır içi 34px/12px); liste sayfasında boşluklar stil dosyasındaki değişkenlerden gelir
const modeTabsStyles = {
  tab: {
    height: 'auto',
    paddingBlock: 'var(--mode-tab-padding-block)',
    paddingInline: 'var(--mode-tab-padding-inline)',
  },
};

// Liste sayfası yapışkan başlığı: görünüm kontrolü (ya da düz başlık) solda, araç çubuğu sağda
export const ListPageHeader = <TValue extends string>(props: ListPageHeaderProps<TValue>) => {
  const {
    actions,
    actionsAlign = 'end',
    className,
    description,
    tabs,
    tabsTestId,
    title,
    value,
    onChange,
  } = props;
  const handleChange = useCallback(
    (nextValue: string | null) => {
      if (nextValue === null || nextValue === value) {
        return;
      }

      const tab = tabs?.find((item) => item.value === nextValue);

      if (tab) {
        onChange?.(tab.value);
      }
    },
    [onChange, tabs, value]
  );

  if (!tabs) {
    return (
      <Box className={clsx(classes.listHeader, className)} data-actions-align={actionsAlign}>
        {title || description ? (
          <Group gap="sm" align="center" wrap="nowrap">
            {title ? <Box className={classes.listTitle}>{title}</Box> : null}
            {description}
          </Group>
        ) : null}
        {actions ? <Box className={classes.listActions}>{actions}</Box> : null}
      </Box>
    );
  }

  return (
    <Box className={clsx(classes.listHeader, className)} data-actions-align={actionsAlign}>
      <Group
        className={
          props.controlType === 'segmented'
            ? undefined
            : clsx(classes.modeTabsRow, classes.scrollableModeTabsRow)
        }
        gap="sm"
        align="center"
        wrap="nowrap"
      >
        {props.controlType === 'segmented' ? (
          <SegmentedControl<TValue>
            {...props.segmentedProps}
            data-testid={tabsTestId}
            data={tabs.map((tab) => ({
              value: tab.value,
              label:
                tab.icon || tab.rightSection ? (
                  <Group component="span" gap={6} justify="center" wrap="nowrap">
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.rightSection}
                  </Group>
                ) : (
                  tab.label
                ),
            }))}
            value={value}
            onChange={handleChange}
          />
        ) : (
          <Tabs
            classNames={{
              root: classes.modeTabs,
              list: classes.modeTabsList,
              tab: classes.modeTab,
            }}
            color="cyan"
            data-testid={tabsTestId}
            mod={{ appTabs: false }}
            radius="sm"
            styles={modeTabsStyles}
            variant="default"
            {...props.tabsProps}
            value={value}
            onChange={handleChange}
          >
            <Tabs.List>
              {tabs.map((tab) => (
                <Tabs.Tab
                  key={tab.value}
                  leftSection={tab.icon}
                  rightSection={tab.rightSection}
                  value={tab.value}
                >
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        )}
        {description}
      </Group>
      {actions ? <Box className={classes.listActions}>{actions}</Box> : null}
    </Box>
  );
};
