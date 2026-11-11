import { FC } from 'react';
import { Box, BoxProps, Group, Text, TextProps, Tooltip } from '@mantine/core';
import { getDateParse, relativeTime } from '@/_helpers/date';
import { View } from '@/components/display/View';

interface Props extends TextProps {
  date: number | string | null;
  wrapperProps?: BoxProps;
}

export const Column_Date: FC<Props> = ({ date, wrapperProps, ...props }) => {
  const timestamp = Number(date);
  const hasDate = Boolean(date) && Number.isFinite(timestamp);
  const parsedDate = hasDate ? getDateParse(timestamp) : null;

  return (
    <Box className="table-date" {...wrapperProps}>
      <View show={hasDate}>
        <Tooltip
          withArrow
          color="gray.7"
          radius="lg"
          py="xs"
          px="lg"
          label={
            <>
              <Group gap="xs">
                <Text size="xs" c="gray.0">
                  {parsedDate?.date}
                </Text>
                <Text size="xs" c="gray.0">
                  {parsedDate?.time}
                </Text>
              </Group>
            </>
          }
        >
          <Text {...props}>{relativeTime(timestamp)} </Text>
        </Tooltip>
      </View>
    </Box>
  );
};
