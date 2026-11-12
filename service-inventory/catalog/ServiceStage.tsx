import type { ReactNode } from 'react';
import { IconStar, IconStarFilled, IconX } from '@tabler/icons-react';
import { Box, Code, Group, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';
import { Content } from '@/components/display/Content';
import { CountPill } from '@/components/display/CountPill';
import type { CatalogNode, RelationsTab, StagePrimary, StageView } from './types';
import classes from './catalog.module.scss';

type ServiceStageProps = {
  service?: CatalogNode;
  favorite: boolean;
  primary: StagePrimary;
  relationsTab: RelationsTab;
  view: StageView;
  onPrimaryChange: (value: StagePrimary) => void;
  onRelationsTabChange: (value: RelationsTab) => void;
  onViewChange: (value: StageView) => void;
  onToggleFavorite: () => void;
  onClear: () => void;
  idleTitle?: string;
};

export const ServiceStage = ({
  service,
  favorite,
  primary,
  relationsTab,
  view,
  onPrimaryChange,
  onRelationsTabChange,
  onViewChange,
  onToggleFavorite,
  onClear,
  idleTitle,
}: ServiceStageProps) => (
  <Box component="section" className={classes.stage} data-testid="service-stage">
    {service ? (
      <>
        <div className={classes.stageHead}>
          <Group justify="space-between" wrap="nowrap" mb={8}>
            <div className={classes.stageTitleRow}>
              <span className={classes.presence} />
              <Title order={3} className={classes.stageTitle}>
                {service.name}
              </Title>
              <ToolbarActionIcon
                label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                icon={favorite ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                onClick={onToggleFavorite}
              />
            </div>
            <ToolbarActionIcon label="Seçimi kapat" icon={<IconX size={16} />} onClick={onClear} />
          </Group>
          <Tabs
            value={primary}
            onChange={(value) => {
              if (value === 'overview' || value === 'relations' || value === 'history') onPrimaryChange(value);
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="overview">Servis Detayı</Tabs.Tab>
              <Tabs.Tab value="relations">İlişkiler</Tabs.Tab>
              <Tabs.Tab value="history">Servis Tarihçesi</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          {primary === 'relations' ? (
            <div className={classes.subTabs}>
              <Tabs
                value={relationsTab}
                onChange={(value) => {
                  if (value === 'services' || value === 'screens' || value === 'processes' || value === 'reports') {
                    onRelationsTabChange(value);
                  }
                }}
              >
                <Tabs.List>
                  <Tabs.Tab value="services">Servisler</Tabs.Tab>
                  <Tabs.Tab value="screens">
                    Ekranlar <CountPill ml={6}>{(service.screens ?? []).length}</CountPill>
                  </Tabs.Tab>
                  <Tabs.Tab value="processes">
                    Süreçler <CountPill ml={6}>{(service.processes ?? []).length}</CountPill>
                  </Tabs.Tab>
                  <Tabs.Tab value="reports">Raporlar</Tabs.Tab>
                </Tabs.List>
              </Tabs>
              <div className={classes.viewToggle} role="group" aria-label="Görünüm">
                <button
                  type="button"
                  className={classes.viewToggleBtn}
                  data-active={view === 'map'}
                  aria-pressed={view === 'map'}
                  onClick={() => onViewChange('map')}
                >
                  <MapIcon />
                  <span>Harita</span>
                </button>
                <button
                  type="button"
                  className={classes.viewToggleBtn}
                  data-active={view === 'table'}
                  aria-pressed={view === 'table'}
                  onClick={() => onViewChange('table')}
                >
                  <TableIcon />
                  <span>Tablo</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <StageBody service={service} primary={primary} relationsTab={relationsTab} view={view} />
      </>
    ) : (
      <Stack align="center" justify="center" h="100%" gap={6}>
        <Text fw={600}>{idleTitle ?? 'Servis seçilmedi'}</Text>
        <Text c="dimmed" fz="sm">
          Soldaki ağaçtan bir servis seçin.
        </Text>
      </Stack>
    )}
  </Box>
);

const StageBody = ({
  service,
  primary,
  relationsTab,
  view,
}: {
  service: CatalogNode;
  primary: StagePrimary;
  relationsTab: RelationsTab;
  view: StageView;
}) => {
  if (primary === 'overview') {
    return (
      <Box p="lg">
        <Content withBorder>
          <Text py="md">{service.summary}</Text>
        </Content>
      </Box>
    );
  }

  if (primary === 'history') {
    return (
      <Box p="lg">
        <Content withBorder>
          <Text py="md" c="dimmed">
            Bu servis için kayıtlı tarihçe yok.
          </Text>
        </Content>
      </Box>
    );
  }

  if (view === 'table' || relationsTab !== 'services') {
    const rows =
      relationsTab === 'screens'
        ? (service.screens ?? [])
        : relationsTab === 'processes'
          ? (service.processes ?? [])
          : relationsTab === 'reports'
            ? (service.reports ?? [])
            : (service.children ?? []).map((child) => child.name);

    return (
      <Box p="lg">
        <Content withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{relationsTab === 'services' ? 'Metod' : 'Ad'}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length ? (
                rows.map((row) => (
                  <Table.Tr key={row}>
                    <Table.Td>
                      <Code>{row}</Code>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td>Kayıt yok</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Content>
      </Box>
    );
  }

  return (
    <div className={classes.canvas}>
      <div className={classes.mapNode}>{service.name}</div>
      <div className={classes.dock} role="toolbar" aria-label="Harita araçları">
        <button type="button" className={classes.dockGrip} aria-label="Taşı">
          <GripIcon />
        </button>
        <span className={classes.dockSep} />
        <DockGroup label="Görünüm">
          <DockIconButton label="Uzaklaştır">−</DockIconButton>
          <DockIconButton label="Yakınlaştır">+</DockIconButton>
          <DockIconButton label="Ekrana sığdır">
            <FitIcon />
          </DockIconButton>
        </DockGroup>
        <span className={classes.dockSep} />
        <DockGroup label="Katman">
          <span className={classes.dockHop}>1/1</span>
        </DockGroup>
        <span className={classes.dockSep} />
        <DockGroup label="İçerik">
          <DockIconButton label="İçerik">
            <LayersMiniIcon />
          </DockIconButton>
        </DockGroup>
        <span className={classes.dockSep} />
        <DockGroup label="Kayıt">
          <DockIconButton label="Kaydet">
            <SaveIcon />
          </DockIconButton>
        </DockGroup>
        <span className={classes.dockSep} />
        <DockGroup label="Bilgi">
          <DockIconButton label="Bilgi">i</DockIconButton>
        </DockGroup>
      </div>
    </div>
  );
};

const DockGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className={classes.dockGroup}>
    <span className={classes.dockKicker}>{label}</span>
    <div className={classes.dockRow}>{children}</div>
  </div>
);

const DockIconButton = ({ label, children }: { label: string; children: ReactNode }) => (
  <button type="button" className={classes.dockBtn} aria-label={label} title={label}>
    {children}
  </button>
);

const MapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M2.5 4.2 6 2.8l4 1.4 3.5-1.4v9.6L10 13.8l-4-1.4-3.5 1.4V4.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M6 2.8v9.6M10 4.2v9.6" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="2.5" y="3" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.5 6.5h11M6.5 3v10" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const GripIcon = () => (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
    <circle cx="2.5" cy="2.5" r="1.2" />
    <circle cx="7.5" cy="2.5" r="1.2" />
    <circle cx="2.5" cy="8" r="1.2" />
    <circle cx="7.5" cy="8" r="1.2" />
    <circle cx="2.5" cy="13.5" r="1.2" />
    <circle cx="7.5" cy="13.5" r="1.2" />
  </svg>
);

const FitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const LayersMiniIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 2.5 13 5 8 7.5 3 5 8 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M3 8 8 10.5 13 8M3 11l5 2.5L13 11" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M3 2.5h7.2L13 5.3V13.5H3V2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M5.5 2.5V6h5M5.5 13.5v-3.2h5V13.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);
