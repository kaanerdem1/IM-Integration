import { IconSquare, IconSquareCheckFilled } from '@tabler/icons-react';

export const SavedFilterSelectionIcon = ({ selected }: { selected: boolean }) => {
  const Icon = selected ? IconSquareCheckFilled : IconSquare;

  // The row owns interaction; the fixed-size icon never takes focus or shifts its label.
  return (
    <Icon
      aria-hidden
      size={16}
      stroke={1.5}
      style={{
        color: `var(--mantine-color-${selected ? 'cyan-8' : 'gray-5'})`,
        flexShrink: 0,
        stroke: selected ? 'none' : 'currentColor',
      }}
    />
  );
};
