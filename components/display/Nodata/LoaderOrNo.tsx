import { FC, ReactNode } from 'react';
import type { TablerIcon } from '@tabler/icons-react';
import { Center, Stack, type BoxProps, type CenterProps } from '@mantine/core';
import { EntityTypes } from '@/_i18n/Tr/_entity';
import { NoData } from '@/components/display/Nodata/index';
import { LoaderMini } from './LoaderMini';

interface LoaderOrNoDataProps {
  loading: boolean;
  hasData: boolean;
  children?: ReactNode;
  text?: string;
  description?: string;
  icon?: TablerIcon;
  entity?: EntityTypes;
  fallbackClassName?: string;
  fallbackProps?: Omit<CenterProps, 'children' | 'className'>;
  noDataAction?: ReactNode;
  noDataProps?: Omit<BoxProps, 'children'>;
}

export const LoaderOrNoData: FC<LoaderOrNoDataProps> = ({
  loading,
  hasData,
  children,
  text,
  description,
  icon,
  entity,
  fallbackClassName,
  fallbackProps,
  noDataAction,
  noDataProps,
}) => {
  if (loading && !hasData) {
    return <LoaderMini {...fallbackProps} className={fallbackClassName} />;
  }

  if (hasData) {
    return children;
  }

  if (!loading && !hasData) {
    return (
      <Center {...fallbackProps} className={fallbackClassName}>
        {noDataAction ? (
          <Stack align="center" gap="xs">
            <NoData
              {...noDataProps}
              text={text}
              description={description}
              icon={icon}
              entity={entity}
            />
            {noDataAction}
          </Stack>
        ) : (
          <NoData
            {...noDataProps}
            text={text}
            description={description}
            icon={icon}
            entity={entity}
          />
        )}
      </Center>
    );
  }
};
