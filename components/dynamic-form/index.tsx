import { ReactNode } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Checkbox,
  FileInput,
  Group,
  NumberInput,
  Radio,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import type {
  CheckboxProps,
  FileInputProps,
  NumberInputProps,
  RadioGroupProps,
  TextareaProps,
  TextInputProps,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useFieldPermissionContext } from '@/_auth/role-management/field/FieldPermissionContext';
import { CustomMultiSelect, CustomMultiSelectProps } from '../form/CustomMultiSelect';
import { CustomSelect, type CustomSelectProps } from '../form/CustomSelect';
import {
  DatePickerTimestampInput,
  RangeDatePickerTimestampInputProps,
  SingleDatePickerTimestampInputProps,
} from '../form/DateTimestampInput';
import {
  RichTextEditor as CustomRichTextEditor,
  RichTextEditorInputProps,
} from '../form/RichTextEditor';
import {
  getBooleanFieldItemId,
  getRuntimeFieldComponentType,
  getRuntimeFieldDataType,
  mapFieldItemsToOptions,
} from './action';
import { DynamicField, DynamicFieldOption, FieldComponentType, FieldDataType } from './type';

type DynamicTextareaProps = Omit<
  TextareaProps,
  'label' | 'required' | 'disabled' | 'value' | 'onChange' | 'error'
>;

type DynamicFieldRendererProps<TValues extends Record<string, any>> = {
  field: DynamicField;
  form: UseFormReturnType<TValues>;
  path?: string;
  disabled?: boolean;
  /** Servis zorunluluk bayrağından bağımsız olarak alanı zorunlu göster */
  required?: boolean;
  withError?: boolean;
  options?: DynamicFieldOption[];
  render?: (context: {
    field: DynamicField;
    path: string;
    form: UseFormReturnType<TValues>;
    disabled: boolean;
    options: DynamicFieldOption[];
  }) => ReactNode;
  textInputProps?: Omit<TextInputProps, 'label' | 'required' | 'disabled' | 'value' | 'error'>;
  numberInputProps?: Omit<
    NumberInputProps,
    'label' | 'required' | 'disabled' | 'value' | 'error' | 'onChange'
  >;
  textareaProps?: DynamicTextareaProps;
  richTextEditorProps?: RichTextEditorInputProps;
  selectProps?: Omit<
    CustomSelectProps,
    'label' | 'required' | 'disabled' | 'value' | 'error' | 'data'
  >;
  multiSelectProps?: Omit<
    CustomMultiSelectProps,
    'label' | 'required' | 'disabled' | 'value' | 'error' | 'data'
  >;
  radioGroupProps?: Omit<
    RadioGroupProps,
    'label' | 'required' | 'disabled' | 'value' | 'onChange' | 'error'
  >;
  checkboxProps?: Omit<
    CheckboxProps,
    'label' | 'required' | 'disabled' | 'value' | 'onChange' | 'error'
  >;
  fileInputProps?: Omit<FileInputProps<boolean>, 'label' | 'required' | 'disabled' | 'error'>;
  dateInputProps?: Omit<
    SingleDatePickerTimestampInputProps,
    | '__onPresetSelect'
    | 'allowDeselect'
    | 'label'
    | 'presets'
    | 'required'
    | 'disabled'
    | 'error'
    | 'type'
  >;
  dateRangeInputProps?: Pick<
    RangeDatePickerTimestampInputProps,
    'allowSingleDateInRange' | 'onChange'
  >;
};

function getFieldLabel(label: string, helperText?: string | null) {
  const trimmedHelperText = helperText?.trim();

  if (!trimmedHelperText) {
    return label;
  }

  return (
    <Box
      component="span"
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        gap: 4,
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
    >
      <Box component="span" style={{ lineHeight: 'inherit' }}>
        {label}
      </Box>
      <Tooltip label={trimmedHelperText} withArrow multiline maw={380} position="bottom">
        <Box
          component="span"
          aria-label={trimmedHelperText}
          style={{
            alignItems: 'center',
            color: 'var(--mantine-color-gray-6)',
            display: 'inline-flex',
            flex: '0 0 auto',
            fontSize: '14px',
            height: '14px',
            justifyContent: 'center',
            lineHeight: 0,
            width: '14px',
          }}
          tabIndex={0}
        >
          <IconInfoCircle size="14px" style={{ display: 'block' }} />
        </Box>
      </Tooltip>
    </Box>
  );
}

export function DynamicFieldRenderer<TValues extends Record<string, any>>({
  field,
  form,
  path,
  disabled = false,
  required = false,
  withError = true,
  options,
  render,
  textInputProps,
  numberInputProps,
  textareaProps,
  richTextEditorProps,
  selectProps,
  multiSelectProps,
  radioGroupProps,
  checkboxProps,
  fileInputProps,
  dateInputProps,
  dateRangeInputProps,
}: DynamicFieldRendererProps<TValues>) {
  const { t } = useTranslation();
  const fieldLabel = getFieldLabel(field?.Label ?? '', field?.HelperText);
  const resolvedPath = path ?? field?.Value ?? '';
  const fieldPermission = useFieldPermissionContext(field?.Value);
  const withAsterisk = !disabled && (required || Boolean(fieldPermission?.required));
  const resolvedOptions = options ?? mapFieldItemsToOptions(field);
  const componentType = getRuntimeFieldComponentType(field);
  const dataType = getRuntimeFieldDataType(field);
  const fieldFormProps = form.getInputProps(resolvedPath, { withError });
  const currentFieldValue = form.getValues()[resolvedPath];

  if (render) {
    return (
      <>
        {render({
          field,
          path: resolvedPath,
          form,
          disabled,
          options: resolvedOptions,
        })}
      </>
    );
  }

  if (
    componentType === FieldComponentType.Text &&
    (dataType === FieldDataType.Date || dataType === FieldDataType.DateRange)
  ) {
    const commonDateProps = {
      unit: 'seconds' as const,
      label: fieldLabel,
      withAsterisk,
      disabled,
      clearable: true,
      ...fieldFormProps,
      ...dateInputProps,
    };

    if (dataType === FieldDataType.DateRange && dateRangeInputProps) {
      return (
        <DatePickerTimestampInput
          {...commonDateProps}
          {...dateRangeInputProps}
          key={form.key(resolvedPath)}
          type="range"
          value={fieldFormProps.value}
          defaultValue={fieldFormProps.defaultValue}
          onChange={dateRangeInputProps?.onChange ?? fieldFormProps.onChange}
        />
      );
    }

    return (
      <DatePickerTimestampInput
        {...commonDateProps}
        {...(dataType === FieldDataType.DateRange && { type: 'range' })}
        key={form.key(resolvedPath)}
      />
    );
  }

  if (componentType === FieldComponentType.Text && dataType === FieldDataType.Number) {
    return (
      <NumberInput
        key={form.key(resolvedPath)}
        label={fieldLabel}
        withAsterisk={withAsterisk}
        disabled={disabled}
        {...fieldFormProps}
        {...numberInputProps}
      />
    );
  }

  if (componentType === FieldComponentType.TextArea) {
    return (
      <Textarea
        key={form.key(resolvedPath)}
        label={fieldLabel}
        withAsterisk={withAsterisk}
        disabled={disabled}
        {...fieldFormProps}
        {...textareaProps}
      />
    );
  }

  if (componentType === FieldComponentType.TextEditor) {
    const richTextFormKey = form.key(resolvedPath);

    return (
      <CustomRichTextEditor
        key={richTextFormKey}
        {...richTextEditorProps}
        data-path={resolvedPath}
        defaultValue={fieldFormProps.defaultValue}
        disabled={disabled}
        editorKey={richTextFormKey}
        error={fieldFormProps.error}
        label={fieldLabel}
        onBlur={() => {
          fieldFormProps.onBlur?.();
        }}
        onChange={(nextValue) => {
          fieldFormProps.onChange(nextValue);
        }}
        value={fieldFormProps.value}
        withAsterisk={withAsterisk}
      />
    );
  }

  if (componentType === FieldComponentType.Select) {
    return (
      <CustomSelect
        key={form.key(resolvedPath)}
        label={fieldLabel}
        withAsterisk={withAsterisk}
        disabled={disabled}
        data={resolvedOptions}
        searchable
        clearable
        nothingFoundMessage={t('label.noResult')}
        {...fieldFormProps}
        {...selectProps}
        placeholder={disabled ? undefined : (selectProps?.placeholder ?? t('label.makeAChoice'))}
      />
    );
  }

  if (componentType === FieldComponentType.MultiSelect) {
    return (
      <CustomMultiSelect
        label={fieldLabel}
        withAsterisk={withAsterisk}
        disabled={disabled}
        data={resolvedOptions}
        selectAllLabel={t('label.selectAll')}
        clearAllLabel={t('label.clearAllSelection')}
        key={form.key(resolvedPath)}
        searchable
        clearable
        nothingFoundMessage={t('label.noResult')}
        {...fieldFormProps}
        {...multiSelectProps}
        placeholder={
          disabled ? undefined : (multiSelectProps?.placeholder ?? t('label.makeAChoice'))
        }
        withSelectionActions={multiSelectProps?.withSelectionActions}
      />
    );
  }

  if (
    componentType === FieldComponentType.FileUpload ||
    componentType === FieldComponentType.MultiFileUpload
  ) {
    return (
      <FileInput
        key={form.key(resolvedPath)}
        data-path={resolvedPath}
        label={fieldLabel}
        placeholder={t('label.makeAChoice')}
        withAsterisk={withAsterisk}
        disabled={disabled}
        error={fieldFormProps.error}
        multiple={componentType === FieldComponentType.MultiFileUpload}
        {...fileInputProps}
      />
    );
  }

  if (componentType === FieldComponentType.Checkbox) {
    const checkedValue = getBooleanFieldItemId(field, true);
    const uncheckedValue = getBooleanFieldItemId(field, false);

    return (
      <Checkbox
        size="xs"
        data-path={resolvedPath}
        label={fieldLabel}
        disabled={disabled}
        key={form.key(resolvedPath)}
        checked={Boolean(checkedValue) && currentFieldValue === checkedValue}
        error={fieldFormProps.error}
        onBlur={fieldFormProps.onBlur}
        onFocus={fieldFormProps.onFocus}
        onChange={(event) => {
          form.setFieldValue(
            resolvedPath,
            (event.currentTarget.checked ? checkedValue : uncheckedValue) as TValues[keyof TValues]
          );
        }}
        {...checkboxProps}
      />
    );
  }

  if (componentType === FieldComponentType.Radio) {
    return (
      <Radio.Group
        key={form.key(resolvedPath)}
        size="xs"
        errorProps={{ mt: 'xs' }}
        label={fieldLabel}
        withAsterisk={withAsterisk}
        disabled={disabled}
        {...fieldFormProps}
        {...radioGroupProps}
      >
        <Group mt="xs">
          {resolvedOptions.map((item) => (
            <Radio key={item.value} value={item.value} label={item.label} size="xs" />
          ))}
        </Group>
      </Radio.Group>
    );
  }

  if (componentType === FieldComponentType.Text || componentType === undefined) {
    return (
      <TextInput
        key={form.key(resolvedPath)}
        label={fieldLabel}
        withAsterisk={withAsterisk}
        disabled={disabled}
        {...fieldFormProps}
        {...textInputProps}
      />
    );
  }

  return null;
}
