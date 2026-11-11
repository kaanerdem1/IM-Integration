import type { ReactNode } from 'react';
import { ScrollArea, Stack, Text, Tooltip } from '@mantine/core';

export const Column_Text = ({
  title,
  value,
  tooltipContent,
}: {
  title: string;
  value?: string | null;
  tooltipContent?: ReactNode;
}) => {
  if (!value?.trim()) {
    return '-';
  }

  return (
    <Tooltip
      events={{ hover: true, focus: true, touch: false }}
      interactive
      multiline
      maw="min(480px, calc(100vw - 32px))"
      transitionProps={{ duration: 0 }}
      withArrow
      label={
        <Stack gap="xs" onClick={(event) => event.stopPropagation()}>
          <Text component="div" inherit fw={600}>
            {title}
          </Text>
          <ScrollArea.Autosize mah="min(360px, 50vh)" scrollbars="y">
            {tooltipContent ?? (
              <Text
                component="div"
                inherit
                style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {value}
              </Text>
            )}
          </ScrollArea.Autosize>
        </Stack>
      }
    >
      <Text
        component="span"
        display="block"
        inherit
        tabIndex={0}
        truncate
        w="100%"
        // Uzun metin tablo sütununu genişletmez; mevcut sütun genişliğinde kısaltılır.
        style={{ contain: 'inline-size' }}
      >
        {value}
      </Text>
    </Tooltip>
  );
};
