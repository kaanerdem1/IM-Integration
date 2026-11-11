import { FC, ReactNode } from 'react';
import classes from './style.module.scss';
import { Box, BoxProps } from '@mantine/core';
import { useDocumentTitle } from '@mantine/hooks';
import { getDocumentTitle } from '@/_helpers/document-title';

interface Props extends BoxProps {
  title: string;
  children: ReactNode;
}

export const Page: FC<Props> = ({ title, children, ...props }) => {
  //Title
  useDocumentTitle(getDocumentTitle(title));

  return (
    <Box className={classes.pegeWrapper} {...props}>
      {children}
    </Box>
  );
};
