import { FC } from 'react';
import { Group, GroupProps, Text } from '@mantine/core';
import { formLabelTextProps } from '@/_common/_props/form-label';

interface Props extends GroupProps {
  label: string;
  required?: boolean;
}

export const FormLabel: FC<Props> = ({ label, required, ...props }) => {
  return (
    <Group gap={5} mb="5px" {...props}>
      <Text {...formLabelTextProps}>{label}</Text>
      {required && (
        <Text fw={600} c="red.6" fz="12px" lh={1} h={10} tt="uppercase" lts={2}>
          *
        </Text>
      )}
    </Group>
  );
};
