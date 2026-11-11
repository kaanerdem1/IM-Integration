import type { ReactNode } from 'react';
import type { SegmentedControlProps, TabsProps } from '@mantine/core';

export type ListPageTab<TValue extends string> = {
  icon?: ReactNode;
  label: ReactNode;
  rightSection?: ReactNode;
  value: TValue;
};

type ListPageHeaderControlProps<TValue extends string> = {
  tabs: ListPageTab<TValue>[];
  tabsTestId?: string;
  title?: never;
  value: NoInfer<TValue>;
  onChange: (value: NoInfer<TValue>) => void;
};

type ListPageHeaderTabsProps<TValue extends string> = ListPageHeaderControlProps<TValue> & {
  controlType?: 'tabs';
  tabsProps?: Omit<TabsProps, 'children' | 'value' | 'defaultValue' | 'onChange'>;
  segmentedProps?: never;
};

type ListPageHeaderSegmentedProps<TValue extends string> = ListPageHeaderControlProps<TValue> & {
  controlType: 'segmented';
  segmentedProps?: Omit<
    SegmentedControlProps<TValue>,
    'children' | 'data' | 'value' | 'defaultValue' | 'onChange'
  >;
  tabsProps?: never;
};

type ListPageHeaderTitleProps = {
  controlType?: never;
  tabsProps?: never;
  segmentedProps?: never;
  tabs?: never;
  tabsTestId?: never;
  /** Görünüm sekmesi olmayan sayfalarda sekme yerine gösterilen başlık (verilmezse satırda yalnızca aksiyonlar kalır) */
  title?: ReactNode;
  value?: never;
  onChange?: never;
};

export type ListPageHeaderProps<TValue extends string> = {
  /** Araç çubuğu (ikon butonlar, anahtarlar); varsayılan sağa, `actionsAlign="center"` ile satır ortasına */
  actions?: ReactNode;
  actionsAlign?: 'center' | 'end';
  className?: string;
  /** Görünüm kontrolünün veya başlığın yanında gösterilen kısa açıklama */
  description?: ReactNode;
} & (
  ListPageHeaderTabsProps<TValue> | ListPageHeaderSegmentedProps<TValue> | ListPageHeaderTitleProps
);
