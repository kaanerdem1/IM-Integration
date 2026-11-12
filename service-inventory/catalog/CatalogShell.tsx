import { useMemo, useState } from 'react';
import { IconHeartbeat } from '@tabler/icons-react';
import { Group } from '@mantine/core';
import { CATALOG_TREE, findNode, findParent, nodeMatches } from './mockCatalog';
import { ImpactSummary } from './ImpactSummary';
import { ModuleSidebar } from './ModuleSidebar';
import { ServiceStage } from './ServiceStage';
import type { CatalogNode, RelationsTab, StagePrimary, StageView } from './types';
import classes from './catalog.module.scss';

const resolveService = (id?: string) => {
  if (!id) return undefined;
  const node = findNode(id);
  if (!node) return undefined;
  if (node.kind === 'service') return node;
  if (node.kind === 'method') return findParent(id);
  return undefined;
};

export const CatalogShell = () => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('svc-popup');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    loans: true,
    'jar-consumer': true,
    'pkg-consumer': true,
  });
  const [favorites, setFavorites] = useState<string[]>(['svc-popup']);
  const [primary, setPrimary] = useState<StagePrimary>('relations');
  const [relationsTab, setRelationsTab] = useState<RelationsTab>('services');
  const [view, setView] = useState<StageView>('map');
  const [surface, setSurface] = useState<'services' | 'dwh'>('services');

  const service = resolveService(selectedId);
  const visibleTree = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return CATALOG_TREE;
    return CATALOG_TREE.filter((node) => nodeMatches(node, needle));
  }, [query]);

  const selectNode = (node: CatalogNode) => {
    if (node.kind === 'method') {
      const parent = findParent(node.id);
      if (parent) setSelectedId(parent.id);
      return;
    }
    setSelectedId(node.id);
    setOpenIds((current) => ({ ...current, [node.id]: true }));
    if (node.kind === 'service') {
      setPrimary('relations');
      setView('map');
    }
  };

  return (
    <div className={classes.shell} data-testid="catalog-shell">
      <header className={classes.masthead}>
        <div className={classes.surfaceTabs} role="tablist" aria-label="Katalog yüzeyi">
          <button
            type="button"
            className={classes.surfaceTab}
            role="tab"
            aria-selected={surface === 'services'}
            data-active={surface === 'services'}
            onClick={() => setSurface('services')}
          >
            Servis
          </button>
          <button
            type="button"
            className={classes.surfaceTab}
            role="tab"
            aria-selected={surface === 'dwh'}
            data-active={surface === 'dwh'}
            onClick={() => setSurface('dwh')}
          >
            DWH
          </button>
        </div>
        <div className={classes.brand}>{surface === 'dwh' ? 'DWH Katalog' : 'Servis Kataloğu'}</div>
        <div className={classes.mastheadActions}>
          <button type="button" className={classes.healthButton}>
            <Group gap={6} wrap="nowrap">
              <IconHeartbeat size={16} />
              Katalog Sağlığı
            </Group>
          </button>
        </div>
      </header>
      <div className={classes.body}>
        <ModuleSidebar
          tree={visibleTree}
          query={query}
          selectedId={service?.id ?? selectedId}
          openIds={openIds}
          onQueryChange={setQuery}
          onToggle={(id) => setOpenIds((current) => ({ ...current, [id]: !current[id] }))}
          onSelect={selectNode}
        />
        <ServiceStage
          service={service}
          favorite={Boolean(service && favorites.includes(service.id))}
          primary={primary}
          relationsTab={relationsTab}
          view={view}
          onPrimaryChange={setPrimary}
          onRelationsTabChange={setRelationsTab}
          onViewChange={setView}
          onToggleFavorite={() => {
            if (!service) return;
            setFavorites((current) =>
              current.includes(service.id) ? current.filter((id) => id !== service.id) : [...current, service.id]
            );
          }}
          onClear={() => setSelectedId('')}
          idleTitle={service ? undefined : findNode(selectedId)?.name}
        />
        <ImpactSummary />
      </div>
    </div>
  );
};
