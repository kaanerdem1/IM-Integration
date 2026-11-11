import { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, BoxProps, Text } from '@mantine/core';
import { appUrlPrefix } from '@/_common/_constants';
import { titleProps } from '@/_common/_props/title';
import { useNavigationData } from '@/_hooks/useNavigation';
import { usePageSplit } from '@/_hooks/usePageSplit';
import { getNavigationItemLabel, navData_Nav } from '@/_root/layouts/_data/nav-data';
import classes from '@/components/display/Content/style.module.scss';

interface Props extends BoxProps {
  children?: ReactNode;
}

export const ContentTitle: FC<Props> = ({ children, ...props }) => {
  const { t } = useTranslation();
  const { moduleData } = useNavigationData(navData_Nav);
  const { getPathAfter } = usePageSplit();
  const currentRouteKey = getPathAfter(appUrlPrefix);
  const isCurrentRoute = (routeKey?: string) =>
    Boolean(
      currentRouteKey &&
      routeKey &&
      (currentRouteKey === routeKey || currentRouteKey.startsWith(`${routeKey}/`))
    );
  const currentParentMenu = moduleData.find((item) => isCurrentRoute(item.routeKey));
  const currentChildMenu = currentParentMenu?.children
    ?.filter((item) => isCurrentRoute(item.routeKey))
    .sort((left, right) => (right.routeKey?.length ?? 0) - (left.routeKey?.length ?? 0))[0];
  const titleLabel =
    (currentChildMenu ? getNavigationItemLabel(currentChildMenu, t) : undefined) ??
    (currentParentMenu ? getNavigationItemLabel(currentParentMenu, t) : undefined) ??
    (moduleData[1] ? getNavigationItemLabel(moduleData[1], t) : undefined) ??
    String(t('label.root.fallbackTitle'));

  return (
    <Box pr="md" className={classes.contentTitle} {...props}>
      {children || <Text {...titleProps}>{titleLabel}</Text>}
    </Box>
  );
};
