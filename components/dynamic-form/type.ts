import { ComboboxItem } from '@mantine/core';
import type {
  ComponentType as GeneratedComponentType,
  DataType as GeneratedDataType,
  ItemDto,
  UIFieldDto,
} from '@/_api/_core/api-gen/types';

export type FieldComponentType = (typeof FieldComponentType)[keyof typeof FieldComponentType];

export type FieldDataType = (typeof FieldDataType)[keyof typeof FieldDataType];

export const FieldComponentType = {
  Text: 0,
  TextArea: 1,
  Checkbox: 2,
  Select: 3,
  FileUpload: 4,
  MultiFileUpload: 5,
  MultiSelect: 6,
  Radio: 7,
  Button: 8,
  TextEditor: 9,
  Table: 10,
} as const satisfies Record<GeneratedComponentType, number>;

export const FieldDataType = {
  String: 0,
  Number: 1,
  Boolean: 2,
  Date: 3,
  Json: 4,
  File: 5,
  DateRange: 6,
} as const satisfies Record<GeneratedDataType, number>;

export type DynamicFieldItem = ItemDto;

export type DynamicField = Omit<UIFieldDto, 'ComponentType' | 'DataType'> & {
  ComponentType?: UIFieldDto['ComponentType'] | FieldComponentType;
  DataType?: UIFieldDto['DataType'] | FieldDataType;
};

export type DynamicFieldOption = ComboboxItem;

// For Form Type
export type DynamicFormValueType = string | string[] | null;
export type DynamicFormValues<TFieldCode extends string> = Record<
  `${TFieldCode}`,
  DynamicFormValueType
>;
