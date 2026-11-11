import { forwardRef, ReactNode } from 'react';
import classes from './style.module.scss';
import clsx from 'clsx';
import { ScrollArea, ScrollAreaProps } from '@mantine/core';

interface Props extends ScrollAreaProps {
  children: ReactNode;
}

export const LeftContent = forwardRef<HTMLDivElement, Props>(
  ({ children, className, scrollbars = 'y', styles, ...props }, ref) => {
    return (
      <ScrollArea
        viewportRef={ref}
        className={clsx(classes.drawerDetailBodyLeftContent, className)}
        scrollbars={scrollbars}
        styles={styles}
        {...props}
      >
        {children}
      </ScrollArea>
    );
  }
);
