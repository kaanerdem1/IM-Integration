import type { MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import { Anchor, Badge, Tooltip } from '@mantine/core';

export type RequestNumberBadgeLinkProps = {
  requestNo?: string | null;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

const clickableStyle = { cursor: 'pointer' };

export const RequestNumberBadgeLink = ({
  requestNo,
  href,
  onClick,
}: RequestNumberBadgeLinkProps) => {
  const { t } = useTranslation();

  if (!requestNo) {
    return '-';
  }

  return (
    <Tooltip
      label={t('label.requests.viewRequest')}
      disabled={!href}
      events={{ hover: true, focus: true, touch: false }}
      position="bottom"
      withArrow
    >
      <Anchor
        style={!href ? { cursor: 'default' } : undefined}
        href={href || undefined}
        underline="never"
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        onAuxClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <span>
          {/* Keep badge typography separate from the table-wide anchor styles. */}
          <Badge
            variant="default"
            size="xs"
            tt="none"
            fw={600}
            style={href ? clickableStyle : { cursor: 'default' }}
          >
            {requestNo}
          </Badge>
        </span>
      </Anchor>
    </Tooltip>
  );
};
