import { IconArrowRight, IconChartBar, IconLink } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Group,
  List,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { appUrlPrefix } from '@/_common/_constants';
import { Content } from '@/components/display/Content';
import { Modal } from '@/components/display/Modal/Modal';
import { ModalFooter } from '@/components/display/Modal/ModalFooter';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import type { FiltersAndGraphsView } from '@/pages/filters-and-graphs/_config';

const graphicsView: FiltersAndGraphsView = 'graphics';

export const Modal_RequestList_SavedFilterDeleteBlocked = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { opened, options, closeModal } = useModalState('RequestListSavedFilterDeleteBlocked');
  const graphics = options?.item.UserDashboardGraphics ?? [];
  const onClose = () => closeModal('RequestListSavedFilterDeleteBlocked');
  const handleManage = () => {
    onClose();
    navigate(`${appUrlPrefix}/filters-and-graphs?view=${graphicsView}`);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('label.requests.list.filters.savedFilterDeleteBlockedTitle')}
      size="md"
      styles={{ header: { flexShrink: 0 } }}
    >
      <Stack gap="md" p="lg" flex="1 1 auto" mih={0}>
        <Alert
          color="yellow"
          variant="light"
          icon={<IconLink aria-hidden size={20} />}
          flex="0 0 auto"
        >
          <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
            {t('label.requests.list.filters.savedFilterDeleteBlockedDescription', {
              name: options?.item.Name ?? '',
            })}
          </Text>
        </Alert>
        <Group gap="xs" flex="0 0 auto">
          <Text component="h3" size="sm" fw={600} m={0}>
            {t('label.requests.list.filters.savedFilterDependentGraphics')}
          </Text>
          <Badge size="sm" variant="light" color="gray">
            {graphics.length}
          </Badge>
        </Group>
        <Content
          data-testid="saved-filter-dependent-graphics-content"
          withBorder
          radius="md"
          p={0}
          display="flex"
          flex="0 1 auto"
          mih={0}
          style={{ overflow: 'hidden' }}
        >
          <ScrollArea.Autosize
            flex={1}
            mih={0}
            scrollbars="y"
            type="auto"
            offsetScrollbars="y"
            overscrollBehavior="contain"
          >
            <List
              p="sm"
              spacing="sm"
              size="sm"
              aria-label={t('label.requests.list.filters.savedFilterDependentGraphics')}
              icon={
                <ThemeIcon size="sm" variant="light" color="gray" radius="sm">
                  <IconChartBar aria-hidden size={14} />
                </ThemeIcon>
              }
            >
              {graphics.map((graphic, index) => (
                <List.Item key={graphic.Id ?? index} style={{ overflowWrap: 'anywhere' }}>
                  {graphic.Name?.trim() ||
                    t('label.requests.list.filters.savedFilterUnnamedGraphic')}
                </List.Item>
              ))}
            </List>
          </ScrollArea.Autosize>
        </Content>
      </Stack>
      <ModalFooter>
        <Button size="xs" variant="default" onClick={onClose}>
          {t('label.close')}
        </Button>
        <Button
          size="xs"
          rightSection={<IconArrowRight aria-hidden size={14} />}
          onClick={handleManage}
        >
          {t('label.requests.list.filters.savedFilterManageGraphics')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
