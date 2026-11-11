import type { ReactNode } from 'react';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { Flex, Group, Text } from '@mantine/core';

type FormFieldNoteProps = {
  children: ReactNode;
  /** info: nötr bilgi notu, warning: dikkat çekmesi gereken uyarı */
  tone?: 'info' | 'warning';
};

/** Alanın hemen altında duran ince açıklama satırı; uyarı kutusunun yer kaplamayan hali */
export const FormFieldNote = ({ children, tone = 'info' }: FormFieldNoteProps) => {
  const Icon = tone === 'warning' ? IconAlertTriangle : IconInfoCircle;
  const color = tone === 'warning' ? 'orange.8' : 'gray.7';

  return (
    <Group
      align="flex-start"
      gap={6}
      wrap="nowrap"
      mt={4}
      fz="xs"
      lh={1.35}
      data-form-field-note={tone}
    >
      <Flex align="center" c={color} h="1lh" style={{ flexShrink: 0 }}>
        <Icon size={13} stroke={1.8} />
      </Flex>
      <Text size="xs" c={color} lh="inherit">
        {children}
      </Text>
    </Group>
  );
};
