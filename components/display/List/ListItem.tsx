import { FC, ReactNode } from 'react';
import type { TablerIcon } from '@tabler/icons-react';
import { Group, List, ListItemProps, Text, ThemeIcon } from '@mantine/core';
import { useHover } from '@mantine/hooks';

interface Props extends Omit<ListItemProps, 'icon'> {
  icon?: TablerIcon;
  customIcon?: ReactNode;
  text?: string | number;
  hoveredText?: string;
  hoveredHideText?: boolean;
}

export const ListItem: FC<Props> = ({
  text,
  hoveredText,
  hoveredHideText,
  customIcon,
  icon,
  ...props
}) => {
  const Icon = icon || null;
  const { hovered, ref } = useHover();
  const transition = 'grid-template-columns 400ms cubic-bezier(0.4, 0, 0.2, 1)';
  const hasText = text !== undefined && text !== null && text !== '';

  return (
    <List.Item
      ref={ref}
      icon={
        customIcon ??
        (Icon ? (
          <ThemeIcon color="gray" variant="light" size="sm">
            <Icon size={14} />
          </ThemeIcon>
        ) : null)
      }
      styles={{ itemIcon: { marginRight: 5 } }}
      {...props}
    >
      <Group
        gap={0}
        style={{
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: 'fit-content',
          overflow: 'hidden',
        }}
      >
        {hoveredText && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: hovered ? '1fr' : '0fr',
              transition,
            }}
          >
            <div
              style={{
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text fz="xs" mr={5} fw={600}>
                {hoveredText}
              </Text>
            </div>
          </div>
        )}

        {hasText && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: hovered && hoveredHideText ? '0fr' : '1fr',
              transition,
            }}
          >
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <Text fz="xs" maw={150} truncate>
                {text}
              </Text>
            </div>
          </div>
        )}
      </Group>
    </List.Item>
  );
};
