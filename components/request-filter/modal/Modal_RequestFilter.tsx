import { IconSettings } from '@tabler/icons-react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useLocation, useMatch, useNavigate } from 'react-router';
import { Badge, Button, Group, Tooltip } from '@mantine/core';
import { appUrlPrefix } from '@/_common/_constants';
import { Modal } from '@/components/display/Modal/Modal';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import { requestFilterModes } from '@/components/request-filter/_types';
import type { RequestFilterMode } from '@/components/request-filter/_types';
import { RequestFilterPanel } from '@/components/request-filter/panel/RequestFilterPanel';
import { RequestFilterSelectionPanel } from '@/components/request-filter/panel/RequestFilterSelectionPanel';
import {
  getFiltersAndGraphsView,
  type FiltersAndGraphsView,
} from '@/pages/filters-and-graphs/_config';

const filtersView: FiltersAndGraphsView = 'filters';

const titleKeyByMode = {
  [requestFilterModes.apply]: 'label.requests.list.filters.title',
  [requestFilterModes.create]: 'label.requests.list.filters.createTitle',
  [requestFilterModes.edit]: 'label.requests.list.filters.editTitle',
} as const satisfies Record<RequestFilterMode, ParseKeys>;

/**
 * Talep filtresi modalı: modal-host üzerinden her yerden açılır —
 * Uygulama, oluşturma ve düzenleme davranışı modal seçeneklerindeki `mode` ile belirlenir.
 */
export const Modal_RequestFilter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isFiltersAndGraphsPage = useMatch(`${appUrlPrefix}/filters-and-graphs`);
  const isFiltersPage =
    isFiltersAndGraphsPage &&
    getFiltersAndGraphsView(new URLSearchParams(location.search).get('view')) === filtersView;
  const { opened, options, closeModal } = useModalState('RequestFilter');
  const titleMode = options?.item
    ? requestFilterModes.edit
    : (options?.mode ?? requestFilterModes.apply);
  const selectedFilterCount =
    options?.mode === requestFilterModes.apply ? (options.items?.length ?? 0) : 0;
  const onClose = () => closeModal('RequestFilter');
  const handleManage = () => {
    onClose();
    navigate(`${appUrlPrefix}/filters-and-graphs?view=${filtersView}`);
  };

  return (
    <Modal
      title={
        <Group component="span" gap="xs">
          <span>{t(titleKeyByMode[titleMode])}</span>
          {!isFiltersPage && (
            <Tooltip label={t('label.requests.list.filters.manageFilters')} withArrow>
              <Button
                data-testid="request-list-filter-manage-button"
                aria-label={t('label.requests.list.filters.manageFilters')}
                leftSection={<IconSettings aria-hidden size={14} stroke={1.8} />}
                size="compact-xs"
                variant="light"
                onClick={handleManage}
              >
                {t('label.manage')}
              </Button>
            </Tooltip>
          )}
          {selectedFilterCount > 1 && (
            <Badge data-testid="request-filter-selection-count" size="sm" variant="light" tt="none">
              {t('label.requests.list.filters.multipleSelected', { count: selectedFilterCount })}
            </Badge>
          )}
        </Group>
      }
      opened={opened}
      onClose={onClose}
      size={1040}
      xOffset={16}
      yOffset={16}
      styles={{
        body: { padding: 0 },
        content: { height: 'min(780px, calc(100dvh - 32px))' },
        header: { flexShrink: 0 },
      }}
    >
      {opened && options ? (
        options.mode === requestFilterModes.apply && options.items?.length ? (
          <RequestFilterSelectionPanel {...options} items={options.items} onClose={onClose} />
        ) : (
          <RequestFilterPanel {...options} onClose={onClose} />
        )
      ) : null}
    </Modal>
  );
};
