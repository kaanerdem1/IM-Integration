import { useMemo, type ReactNode } from 'react';
import classes from './style.module.scss';
import clsx from 'clsx';
import { Box, BoxProps } from '@mantine/core';
import { sanitizeRichTextHtml } from '@/_helpers/rich-text';

type Props = Omit<BoxProps, 'children'> & {
  fallback?: ReactNode;
  value: unknown;
};

export const RichTextValue = ({ className, fallback = null, value, ...props }: Props) => {
  const sanitizedValue = useMemo(() => sanitizeRichTextHtml(value), [value]);

  if (!sanitizedValue) {
    return fallback;
  }

  return (
    <Box
      {...props}
      className={clsx(classes.richTextValue, className)}
      dangerouslySetInnerHTML={{ __html: sanitizedValue }}
    />
  );
};
