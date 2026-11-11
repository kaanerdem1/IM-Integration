import { Badge } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { DynamicFieldRenderer } from '@/components/dynamic-form';
import type { DynamicField } from '@/components/dynamic-form/type';

type CharacterCountedTextInputFieldProps<TValues extends Record<string, any>> = {
  autoFocus?: boolean;
  disabled: boolean;
  field: DynamicField;
  fieldCode: keyof TValues & string;
  form: UseFormReturnType<TValues>;
  maxLength: number;
  minLength: number;
};

export const CharacterCountedTextInputField = <TValues extends Record<string, any>>({
  autoFocus = false,
  disabled,
  field,
  fieldCode,
  form,
  maxLength,
  minLength,
}: CharacterCountedTextInputFieldProps<TValues>) => {
  const currentValue = form.useWatchValue(fieldCode);
  const characterCount = typeof currentValue === 'string' ? currentValue.length : 0;

  return (
    <DynamicFieldRenderer
      disabled={disabled}
      field={field}
      form={form}
      textInputProps={{
        autoFocus,
        maxLength,
        rightSection: (
          <Badge
            color={characterCount < minLength || characterCount > maxLength ? 'orange' : 'gray'}
            fw={600}
            radius="sm"
            size="sm"
            title={`${minLength}-${maxLength}`}
            tt="none"
            variant="light"
          >
            {characterCount}/{maxLength}
          </Badge>
        ),
        rightSectionWidth: 66,
        size: 'md',
      }}
    />
  );
};
