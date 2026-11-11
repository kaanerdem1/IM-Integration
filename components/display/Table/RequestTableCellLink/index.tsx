import { type MouseEvent, type MouseEventHandler, type ReactNode } from 'react';
import classes from './style.module.scss';
import { Anchor, Table, type TableTdProps } from '@mantine/core';

type Props = Omit<TableTdProps, 'children' | 'onClick'> & {
  children: ReactNode;
  href?: string;
  onClick?: MouseEventHandler<Element>;
  trailingContent?: ReactNode;
};

const isModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const stopRowClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
  event.stopPropagation();
};

export const RequestTableCellLink = ({
  children,
  href,
  onClick,
  trailingContent,
  ...cellProps
}: Props) => {
  const content = <span className={classes.content}>{children}</span>;
  const mainContent = href ? (
    <Anchor
      className={classes.link}
      c="inherit"
      href={href}
      onAuxClick={stopRowClick}
      onClick={(event) => {
        if (isModifiedClick(event)) {
          event.stopPropagation();
          return;
        }

        event.stopPropagation();
        onClick?.(event);
      }}
      tabIndex={-1}
      underline="never"
    >
      {content}
    </Anchor>
  ) : (
    content
  );

  return (
    <Table.Td
      {...cellProps}
      className={href ? `${classes.cell} ${cellProps.className ?? ''}` : cellProps.className}
    >
      {trailingContent ? (
        <div className={classes.withTrailingContent}>
          {mainContent}
          <span className={classes.trailingContent}> {trailingContent}</span>
        </div>
      ) : (
        mainContent
      )}
    </Table.Td>
  );
};
