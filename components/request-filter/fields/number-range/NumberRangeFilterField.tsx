import { useTranslation } from 'react-i18next';
import { Group, Input, NumberInput } from '@mantine/core';
import { formLabelStyle } from '@/_common/_props/form-label';
import { getNonNegativeIntegerRangeError } from '@/_helpers/number/range';

type NumberRangeFilterFieldProps = {
  autoFocus?: boolean;
  fromValue?: string;
  inputId: string;
  label: string;
  testId: string;
  toValue?: string;
  onChange: (fromValue: string | undefined, toValue: string | undefined) => void;
};

export const NumberRangeFilterField = ({
  autoFocus,
  fromValue,
  inputId,
  label,
  testId,
  toValue,
  onChange,
}: NumberRangeFilterFieldProps) => {
  const { t } = useTranslation();
  const rangeError = getNonNegativeIntegerRangeError(fromValue, toValue);
  const error = rangeError
    ? t(rangeError === 'order' ? 'message.numberRangeOrder' : 'message.nonNegativeIntegerRange')
    : undefined;

  return (
    <Input.Wrapper
      id={inputId}
      label={label}
      size="xs"
      error={error}
      data-testid={testId}
      styles={{ label: formLabelStyle }}
    >
      <Group gap="xs" grow wrap="nowrap">
        <NumberInput
          autoFocus={autoFocus}
          id={inputId}
          aria-label={`${label} — ${t('label.requests.list.filters.rangeFrom')}`}
          data-testid={`${testId}-from`}
          placeholder={t('label.requests.list.filters.rangeFrom')}
          size="xs"
          min={0}
          max={Number.MAX_SAFE_INTEGER}
          allowNegative={false}
          allowDecimal={false}
          value={fromValue ?? ''}
          error={Boolean(error)}
          onChange={(next) => onChange(String(next) || undefined, toValue)}
        />
        <NumberInput
          id={`${inputId}-to`}
          aria-label={`${label} — ${t('label.requests.list.filters.rangeTo')}`}
          data-testid={`${testId}-to`}
          placeholder={t('label.requests.list.filters.rangeTo')}
          size="xs"
          min={0}
          max={Number.MAX_SAFE_INTEGER}
          allowNegative={false}
          allowDecimal={false}
          value={toValue ?? ''}
          error={Boolean(error)}
          onChange={(next) => onChange(fromValue, String(next) || undefined)}
        />
      </Group>
    </Input.Wrapper>
  );
};
