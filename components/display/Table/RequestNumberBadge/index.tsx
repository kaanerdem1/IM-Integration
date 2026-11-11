import { IconStarFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Indicator, Tooltip } from '@mantine/core';

type RequestNumberBadgeProps = {
  isFavorite?: boolean;
  requestNo?: string | null;
};

// Keep the labeled indicator circular and slightly outside the badge's right edge.
const favoriteIndicatorStyles = { indicator: { paddingInline: 0 } };
const favoriteIndicatorOffset = { x: -2, y: 0 };

export const RequestNumberBadge = ({ isFavorite = false, requestNo }: RequestNumberBadgeProps) => {
  const { t } = useTranslation();
  const favoriteLabel = t('label.requests.list.favoriteIndicator');

  return (
    <Tooltip disabled={!isFavorite} label={favoriteLabel} withArrow>
      <Indicator
        aria-label={isFavorite ? favoriteLabel : undefined}
        color="red"
        disabled={!isFavorite}
        display="inline-flex"
        inline
        label={<IconStarFilled aria-hidden size={8} />}
        offset={favoriteIndicatorOffset}
        position="middle-end"
        role={isFavorite ? 'img' : undefined}
        size={14}
        styles={favoriteIndicatorStyles}
        zIndex={1}
      >
        <Badge variant="default" size="xs" tt="none" fw={600}>
          {requestNo || '-'}
        </Badge>
      </Indicator>
    </Tooltip>
  );
};
