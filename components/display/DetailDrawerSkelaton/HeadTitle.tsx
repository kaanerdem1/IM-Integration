import { FC, ReactNode, type SyntheticEvent } from 'react';
import classes from './style.module.scss';
import type { TablerIcon } from '@tabler/icons-react';
import { Box, Text, ThemeIcon, Tooltip, type MantineColor } from '@mantine/core';
import { useTruncatedTooltipText } from '@/_hooks/useTruncatedTooltipText';

export type DrawerDetailHeadMetaItem = {
  key: string;
  /** Üzerine gelince gösterilen açıklama (ör. "Oluşturan") */
  label?: string;
  text: ReactNode;
};

interface Props {
  /** Numara ve başlığın altındaki rozetler. */
  badge?: ReactNode;
  icon: TablerIcon;
  iconColor?: MantineColor;
  meta?: DrawerDetailHeadMetaItem[];
  subject?: string | null;
  title: ReactNode;
}

const DrawerDetailHeadSubject = ({ subject }: { subject: string }) => {
  const { isTruncated, checkTruncation } = useTruncatedTooltipText();
  const measureSubject = (event: SyntheticEvent<HTMLSpanElement>) => {
    checkTruncation(event.currentTarget);
  };

  return (
    <Tooltip
      label={subject}
      opened={isTruncated ? undefined : false}
      withArrow
      multiline
      maw="min(480px, calc(100vw - 32px))"
      events={{ hover: true, focus: true, touch: true }}
    >
      <Text
        component="span"
        className={classes.headSubject}
        data-testid="drawer-head-subject"
        size="sm"
        c="gray.7"
        truncate="end"
        tabIndex={0}
        onMouseEnter={measureSubject}
        onFocusCapture={measureSubject}
        onTouchStartCapture={measureSubject}
      >
        {subject}
      </Text>
    </Tooltip>
  );
};

// Modül ikonu + başlık (+ rozet) + nokta ile ayrılmış meta satırı — uygulama header'ındaki başlık bloğuyla aynı dil
export const DrawerDetailHeadTitle: FC<Props> = ({
  badge,
  icon: Icon,
  iconColor = 'cyan',
  meta = [],
  subject,
  title,
}) => (
  <Box className={classes.headTitle}>
    <ThemeIcon
      className={classes.headIcon}
      radius={9}
      size={34}
      variant="light"
      color={iconColor}
      bg={`${iconColor}.0`}
      c={`${iconColor}.8`}
    >
      <Icon size={16} stroke={1.9} />
    </ThemeIcon>

    <Box className={classes.headText}>
      <Box className={classes.headTitleRow}>
        <Box className={classes.headTitleText}>{title}</Box>
        {subject?.trim() ? (
          <>
            <Box component="span" className={classes.headSubjectSeparator} aria-hidden>
              ·
            </Box>
            <DrawerDetailHeadSubject subject={subject} />
          </>
        ) : null}
      </Box>

      {badge ? <Box className={classes.headBadges}>{badge}</Box> : null}

      {meta.length ? (
        <Box className={classes.headMeta}>
          {meta.map((item, index) => (
            <Box component="span" className={classes.headMetaEntry} key={item.key}>
              {index > 0 ? (
                <Box component="span" className={classes.headMetaSeparator} aria-hidden>
                  ·
                </Box>
              ) : null}
              <Tooltip
                label={
                  <>
                    <strong>{item.label}:</strong> {item.text}
                  </>
                }
                withArrow
                multiline
                maw="min(360px, calc(100vw - 32px))"
                disabled={!item.label}
              >
                <Box component="span" className={classes.headMetaItem}>
                  {item.text}
                </Box>
              </Tooltip>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  </Box>
);
