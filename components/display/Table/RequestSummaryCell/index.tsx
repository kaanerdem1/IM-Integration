import { useMemo } from 'react';
import classes from './style.module.scss';
import { getRichTextPlainText } from '@/_helpers/rich-text';
import { RichTextValue } from '@/components/display/RichTextValue';
import { Column_Text } from '@/components/display/Table/Column_Text';

export const RequestSummaryCell = ({ title, value }: { title: string; value: string | null }) => {
  const plainText = useMemo(
    () => getRichTextPlainText(value, { preserveLineBreaks: true }).replace(/\s+/g, ' ').trim(),
    [value]
  );

  return (
    <Column_Text
      title={title}
      value={plainText}
      tooltipContent={<RichTextValue className={classes.content} value={value} fw={400} />}
    />
  );
};
