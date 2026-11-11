import { Pill } from '@mantine/core';
import type { ComboboxRenderPillInput } from '@mantine/core';
import { pillProps } from '@/_common/_props/pill';
import { getRequestNoOptionLabel } from '@/_helpers/mantine/requestNoOptions';

type RequestNoPillProps = ComboboxRenderPillInput<string> & {
  requestNo?: string;
};

export const RequestNoPill = ({
  disabled,
  onRemove,
  option,
  reorderProps,
  requestNo,
}: RequestNoPillProps) => (
  <Pill
    {...pillProps.formValue}
    {...reorderProps}
    disabled={disabled}
    withRemoveButton={!disabled}
    onRemove={onRemove}
  >
    {requestNo ||
      getRequestNoOptionLabel({
        label: option.label,
        value: String(option.value),
      })}
  </Pill>
);
