import { FC, ReactNode } from 'react';
import { List, ListProps } from '@mantine/core';

interface Props extends ListProps {
  children: ReactNode;
}

const inlineListStyles: ListProps['styles'] = {
  root: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 12,
  },
  item: {
    lineHeight: 1,
  },
  itemLabel: {
    fontSize: 'var(--mantine-font-size-xs)',
    lineHeight: 1,
  },
};

export const ListItems: FC<Props> = ({ children, ...props }) => {
  return (
    <List size="sm" styles={inlineListStyles} {...props}>
      {children}
    </List>
  );
};
