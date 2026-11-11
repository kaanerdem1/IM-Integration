import { useMemo, type ComponentType } from 'react';
import type { TablerIcon } from '@tabler/icons-react';
import type { ParseKeysWithoutVariables } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ListPage, ListPageBody } from './ListPage';
import { ListPageHeader, type ListPageTab } from './ListPageHeader';

export type ListPageTabDefinition<TValue extends string = string> = {
  actions?: ComponentType;
  component: ComponentType;
  icon?: TablerIcon;
  labelKey: ParseKeysWithoutVariables;
  value: TValue;
};

type TabbedListPageProps<TValue extends string> = {
  tabs: readonly [ListPageTabDefinition<TValue>, ...ListPageTabDefinition<TValue>[]];
  tabsTestId?: string;
  value: NoInfer<TValue>;
  onChange: (value: NoInfer<TValue>) => void;
};

export const TabbedListPage = <TValue extends string>({
  tabs,
  tabsTestId,
  value,
  onChange,
}: TabbedListPageProps<TValue>) => {
  const { t } = useTranslation();
  const headerTabs = useMemo<ListPageTab<TValue>[]>(
    () =>
      tabs.map(({ icon: Icon, labelKey, value: tabValue }) => ({
        icon: Icon ? <Icon size={15} stroke={1.8} /> : undefined,
        label: t(labelKey),
        value: tabValue,
      })),
    [tabs, t]
  );
  const activeTab = tabs.find((tab) => tab.value === value) ?? tabs[0];
  const Content = activeTab.component;
  const Actions = activeTab.actions;

  return (
    <ListPage>
      <ListPageHeader
        actions={Actions ? <Actions key={activeTab.value} /> : undefined}
        tabs={headerTabs}
        tabsTestId={tabsTestId}
        value={activeTab.value}
        onChange={onChange}
      />
      <ListPageBody>
        <Content key={activeTab.value} />
      </ListPageBody>
    </ListPage>
  );
};
