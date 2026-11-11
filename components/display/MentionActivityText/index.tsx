import { Box, Group, Text } from '@mantine/core';
import {
  EntityLogActionEnum,
  EntityLogTypeEnum,
  type MentionResponseDto,
} from '@/_api/_core/api-gen/types';
import {
  getEntityLogActivityText,
  getEntityLogCommentDisplayText,
  getEntityLogMessageText,
} from '@/_helpers/entity-log';

type MentionActivityTextProps = {
  commentTextLayout?: 'inline' | 'stacked';
  includeCommentText?: boolean;
  item: MentionResponseDto;
  truncateActivityText?: boolean;
  unreadLabel: string;
};

export const MentionActivityText = ({
  commentTextLayout = 'inline',
  includeCommentText = false,
  item,
  truncateActivityText = false,
  unreadLabel,
}: MentionActivityTextProps) => {
  const requestNo = item.No?.trim() ?? '';
  const createdUserName = item.EntityLogCreatedUserName?.trim() ?? '';
  const commentText =
    includeCommentText && item.EntitLogType === EntityLogTypeEnum.NUMBER_3
      ? getEntityLogCommentDisplayText(item.EntityLogText)
      : '';
  const hasInlineComment = Boolean(commentText) && commentTextLayout === 'inline';
  const hasStackedComment = Boolean(commentText) && commentTextLayout === 'stacked';
  const isDocumentUpload =
    item.EntitLogType === EntityLogTypeEnum.NUMBER_1 &&
    item.EntityLogAction === EntityLogActionEnum.NUMBER_6;
  const message = getEntityLogMessageText({
    text: item.EntityLogText,
    type: item.EntitLogType,
  });
  const activityText = getEntityLogActivityText({
    action: item.EntityLogAction,
    createdUserName,
    requestNo,
    text: item.EntityLogText,
    type: item.EntitLogType,
  });
  const displayActivityText = commentText ? `${activityText} "${commentText}"` : activityText;
  const activityContent = (
    <>
      {requestNo ? (
        <>
          <Text span inherit fw={700} c="gray.9">
            {requestNo}
          </Text>{' '}
          talebinde{' '}
        </>
      ) : null}
      {createdUserName ? (
        <>
          <Text span inherit fw={700} c="gray.9">
            {createdUserName}
          </Text>{' '}
        </>
      ) : null}
      {createdUserName && isDocumentUpload ? <>tarafından </> : null}
      {message || '-'}
    </>
  );

  return (
    <Group align="flex-start" gap="xs" miw={0} w="100%" wrap="nowrap">
      <Box
        aria-label={!item.IsRead ? unreadLabel : undefined}
        bg={!item.IsRead ? 'blue.6' : 'transparent'}
        h={6}
        mt={5}
        role={!item.IsRead ? 'img' : undefined}
        style={{ borderRadius: '50%', flex: '0 0 auto' }}
        w={6}
      />
      <Text
        component="div"
        size="xs"
        c="gray.7"
        fw={item.IsRead ? 400 : 500}
        title={displayActivityText}
        style={{
          display: hasInlineComment ? 'flex' : undefined,
          flex: 1,
          minWidth: 0,
          opacity: item.IsRead ? 0.62 : 1,
          overflow: commentText || truncateActivityText ? 'hidden' : undefined,
          overflowWrap: hasInlineComment || truncateActivityText ? 'normal' : 'anywhere',
          textOverflow: truncateActivityText && !hasStackedComment ? 'ellipsis' : undefined,
          whiteSpace:
            hasInlineComment || (truncateActivityText && !hasStackedComment) ? 'nowrap' : undefined,
        }}
      >
        {hasStackedComment ? (
          <>
            <Text
              component="div"
              inherit
              style={{
                overflow: truncateActivityText ? 'hidden' : undefined,
                textOverflow: truncateActivityText ? 'ellipsis' : undefined,
                whiteSpace: truncateActivityText ? 'nowrap' : undefined,
              }}
            >
              {activityContent}
            </Text>
            <Box
              mt={2}
              w="100%"
              style={{
                display: 'flex',
                minWidth: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <Text span c="gray.6" fz={10} fw={400} style={{ flexShrink: 0 }}>
                "
              </Text>
              <Text
                span
                c="gray.6"
                fz={11}
                fw={400}
                style={{
                  display: 'block',
                  flex: '0 1 auto',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {commentText}
              </Text>
              <Text span c="gray.6" fz={10} fw={400} style={{ flexShrink: 0 }}>
                "
              </Text>
            </Box>
          </>
        ) : hasInlineComment ? (
          <>
            <Text span inherit style={{ flexShrink: 0 }}>
              {activityContent}
            </Text>
            <Box
              aria-hidden
              bg="gray.3"
              h={14}
              mx={6}
              w={1}
              style={{ alignSelf: 'center', flexShrink: 0 }}
            />
            <Text span inherit c="gray.6" style={{ flexShrink: 0 }}>
              {' "'}
            </Text>
            <Text
              span
              inherit
              c="gray.6"
              style={{
                flex: '0 1 auto',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {commentText}
            </Text>
            <Text span inherit c="gray.6" style={{ flexShrink: 0 }}>
              "
            </Text>
          </>
        ) : (
          activityContent
        )}
      </Text>
    </Group>
  );
};
