import { FC } from 'react';
import type { CSSProperties } from 'react';
import { ScrollArea, ScrollAreaProps } from '@mantine/core';

interface Props extends ScrollAreaProps {
  children?: React.ReactNode;
}

export const ModalBody: FC<Props> = ({ children, style, viewportProps, ...props }: Props) => {
  const viewportStyle = viewportProps?.style as CSSProperties | undefined;

  return (
    <ScrollArea.Autosize
      mah="calc(100dvh - 180px)"
      style={[{ flex: 1, minHeight: 0 }, style]}
      viewportProps={{
        ...viewportProps,
        style: { padding: 'var(--mantine-spacing-lg)', ...viewportStyle },
      }}
      {...props}
    >
      {children}
    </ScrollArea.Autosize>
  );
};
