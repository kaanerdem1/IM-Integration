import { memo, useMemo, useRef } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Box,
  Group,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useSlaAccess } from '@/_hooks/_modules/sla/useSlaAccess';
import {
  isRequestListFilterInScope,
  requestListFilterKeys,
  type RequestListFilterKey,
} from '../_config/filterConfig';
import {
  getRequestFilterScope,
  requestFilterScopeOptions,
  type RequestFilterScope,
} from '../_config/requestFilterScope';
import { RequestFilterScopeTooltipLabel } from '../RequestFilterScopeTooltipLabel';

type RequestFilterFieldsProps = {
  activeFilterKeys: RequestListFilterKey[];
  scope: RequestFilterScope;
  disabled: boolean;
  getFilterLabel: (key: RequestListFilterKey) => string;
  onAdd: (key: RequestListFilterKey) => void;
  onScopeChange: (scope: RequestFilterScope) => void;
};

export const RequestFilterFields = memo(
  ({
    activeFilterKeys,
    scope,
    disabled,
    getFilterLabel,
    onAdd,
    onScopeChange,
  }: RequestFilterFieldsProps) => {
    const { t } = useTranslation();
    const canViewSla = useSlaAccess();
    const viewportRef = useRef<HTMLDivElement>(null);
    const scopeOptions = useMemo(
      () =>
        requestFilterScopeOptions.map(({ value, labelKey }) => ({
          value: String(value),
          label: (
            <Tooltip
              label={<RequestFilterScopeTooltipLabel scope={value} />}
              position="bottom"
              openDelay={300}
              multiline
              w={260}
              withArrow
            >
              <Box
                component="span"
                display="block"
                data-testid={`request-list-filter-scope-option-${value}`}
              >
                {t(labelKey)}
              </Box>
            </Tooltip>
          ),
        })),
      [t]
    );
    const availableKeys = useMemo(() => {
      const activeKeys = new Set(activeFilterKeys);
      return requestListFilterKeys.filter(
        (key) =>
          (canViewSla || key !== 'listSlaStatus') &&
          isRequestListFilterInScope(key, scope) &&
          !activeKeys.has(key)
      );
    }, [activeFilterKeys, scope, canViewSla]);

    return (
      <Stack
        component="aside"
        aria-labelledby="request-list-filter-fields-title"
        bg="gray.0"
        flex={{ base: '2 1 0', xs: '0 0 280px' }}
        gap={0}
        mih={0}
        miw={0}
        style={{ overflow: 'hidden' }}
      >
        <Text
          component="h3"
          id="request-list-filter-fields-title"
          size="sm"
          fw={600}
          m={0}
          p="sm"
          flex="0 0 auto"
        >
          {t('label.requests.list.filters.fields')}
        </Text>
        <SegmentedControl
          data-testid="request-list-filter-scope"
          aria-label={t('label.requests.list.filters.scope')}
          data={scopeOptions}
          value={String(scope)}
          disabled={disabled}
          bg="gray.2"
          mx="xs"
          mb="xs"
          flex="0 0 auto"
          fullWidth
          onChange={(value) => {
            onScopeChange(getRequestFilterScope(value));
            if (viewportRef.current) {
              viewportRef.current.scrollTop = 0;
            }
          }}
        />
        <ScrollArea
          flex={1}
          mih={0}
          miw={0}
          viewportRef={viewportRef}
          data-testid="request-list-filter-fields-scroll"
          scrollbars="y"
          type="auto"
          offsetScrollbars="y"
          overscrollBehavior="contain"
        >
          {availableKeys.length ? (
            <Stack component="ul" gap={0} m={0} px="xs" pb="xs" style={{ listStyle: 'none' }}>
              {availableKeys.map((key) => {
                const label = getFilterLabel(key);
                return (
                  <Group component="li" key={key} gap="xs" px="xs" py={4} wrap="nowrap">
                    <Text
                      component="span"
                      size="xs"
                      flex={1}
                      miw={0}
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {label}
                    </Text>
                    <ActionIcon
                      data-testid={`request-list-filter-add-${key}`}
                      aria-label={t('label.requests.list.filters.addFilter', { value: label })}
                      size="sm"
                      variant="light"
                      type="button"
                      flex="0 0 auto"
                      onClick={() => onAdd(key)}
                    >
                      <IconPlus size={12} stroke={1.8} />
                    </ActionIcon>
                  </Group>
                );
              })}
            </Stack>
          ) : (
            <Text c="dimmed" size="xs" p="sm">
              {t('label.requests.list.filters.allAdded')}
            </Text>
          )}
        </ScrollArea>
      </Stack>
    );
  }
);
