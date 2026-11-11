import { useMemo } from 'react';
import { ComboboxItem } from '@mantine/core';
import { UIFieldDto } from '@/_api/_core/api-gen/types';
import { DynamicField, FieldComponentType, FieldDataType } from './type';

export type DynamicFieldKey<TFields extends Record<string, unknown>> = keyof TFields & string;

export type DynamicFieldMap<TFields extends Record<string, unknown>> = Partial<
  Record<DynamicFieldKey<TFields>, DynamicField>
>;

export const buildFieldMap = <TFields extends Record<string, unknown>>(
  fields: readonly DynamicField[]
) => {
  return fields.reduce<DynamicFieldMap<TFields>>((acc, field) => {
    if (!field.Value) {
      return acc;
    }

    acc[field.Value as DynamicFieldKey<TFields>] = field;
    return acc;
  }, {});
};

export const useFieldMap = <TFields extends Record<string, unknown>>(
  fields: readonly DynamicField[]
) => {
  return useMemo(() => buildFieldMap<TFields>(fields), [fields]);
};

export const getField = <TFields extends Record<string, unknown>>(
  fieldMap: DynamicFieldMap<TFields>,
  value: DynamicFieldKey<TFields>
) => {
  return fieldMap[value] as DynamicField;
};

export const getFieldByValue = <TFields extends Record<string, unknown>>(
  fields: DynamicField[],
  value: DynamicFieldKey<TFields>
) => {
  return fields.find((field) => field.Value === value) ?? null;
};

const EMPTY_FIELD_OPTIONS: ComboboxItem[] = [];
const fieldItemOptionsCache = new WeakMap<object[], ComboboxItem[]>();

export const mapFieldItemsToOptions = (field: Pick<DynamicField, 'Items'>): ComboboxItem[] => {
  const items = field?.Items;

  if (!items?.length) {
    return EMPTY_FIELD_OPTIONS;
  }

  const cachedOptions = fieldItemOptionsCache.get(items);

  if (cachedOptions) {
    return cachedOptions;
  }

  const options = items.map((item) => ({
    value: item.Id ?? '',
    label: item.Label ?? '',
  }));

  fieldItemOptionsCache.set(items, options);
  return options;
};

/** Converts a service field item Value such as true, false, "true", or 'false' into a boolean. */
export const parseBooleanFieldItemValue = (value: string | null | undefined) => {
  const normalizedValue = value
    ?.trim()
    .replace(/^['"]|['"]$/g, '')
    .trim()
    .toLocaleLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return null;
};

/** Returns the item id that represents the requested boolean state for checkbox fields. */
export const getBooleanFieldItemId = (
  field: Pick<DynamicField, 'Items'> | null | undefined,
  expectedValue: boolean
) =>
  field?.Items?.find((item) => parseBooleanFieldItemValue(item.Value) === expectedValue)?.Id ?? '';

export const getRuntimeFieldComponentType = (field: UIFieldDto | DynamicField) => {
  const componentType = field?.ComponentType;

  if (typeof componentType === 'number') {
    return componentType as FieldComponentType;
  }

  if (typeof componentType === 'string' && componentType in FieldComponentType) {
    return FieldComponentType[componentType as keyof typeof FieldComponentType];
  }

  return undefined;
};

export const getRuntimeFieldDataType = (field: UIFieldDto | DynamicField) => {
  const dataType = field?.DataType;

  if (typeof dataType === 'number') {
    return dataType as FieldDataType;
  }

  if (typeof dataType === 'string' && dataType in FieldDataType) {
    return FieldDataType[dataType as keyof typeof FieldDataType];
  }

  return undefined;
};

/** Extracts default item ids from the service field definition regardless of single or multi item shape. */
const getDefaultFieldItemIds = (field: DynamicField) => {
  const defaultFieldItem = field.DefaultFieldItem;

  if (!defaultFieldItem) {
    return [];
  }

  if (typeof defaultFieldItem === 'string') {
    return defaultFieldItem ? [defaultFieldItem] : [];
  }

  if (Array.isArray(defaultFieldItem)) {
    return (defaultFieldItem as Array<{ Id?: string | null }>)
      .map((item) => item?.Id ?? '')
      .filter((itemId): itemId is string => Boolean(itemId));
  }

  const defaultFieldItemObject = defaultFieldItem as { Id?: string | null };
  return defaultFieldItemObject.Id ? [defaultFieldItemObject.Id] : [];
};

/** Returns the initial form value derived from DefaultFieldItem for item-based fields. */
export const getDefaultFieldValue = (field: DynamicField) => {
  const defaultFieldItemIds = getDefaultFieldItemIds(field);

  if (defaultFieldItemIds.length === 0) {
    return undefined;
  }

  if (getRuntimeFieldComponentType(field) === FieldComponentType.MultiSelect) {
    return defaultFieldItemIds;
  }

  return defaultFieldItemIds[0];
};
