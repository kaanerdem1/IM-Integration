import type { FC, MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { Paper, PaperProps } from '@mantine/core';

interface Props extends PaperProps {
  children: ReactNode;
  component?: 'div' | 'section';
  onClick?: () => void;
  noBorder?: boolean;
  stopPropagation?: boolean;
}

export const Content: FC<Props> = ({
  children,
  className,
  onClick,
  noBorder,
  withBorder,
  stopPropagation = Boolean(onClick),
  ...props
}) => {
  const hasBorder = Boolean(withBorder && !noBorder);

  return (
    <Paper
      withBorder={hasBorder}
      p={hasBorder ? '0 var(--mantine-spacing-md)' : undefined}
      bd={hasBorder ? '1px solid gray.3' : 0}
      radius={hasBorder ? 'md' : undefined}
      bg={hasBorder ? 'white' : undefined}
      shadow={hasBorder ? 'none' : undefined}
      onClick={(e: MouseEvent<HTMLElement>) => {
        if (stopPropagation) {
          e.stopPropagation();
        }

        if (onClick) {
          onClick();
        }
      }}
      className={clsx({ noBorder }, className)}
      {...props}
    >
      {children}
    </Paper>
  );
};
