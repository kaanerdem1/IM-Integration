import { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconHelp, IconSearch, IconSettings, IconStar } from '@tabler/icons-react';
import { Box, Group, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { nodeMatches } from './mockCatalog';
import type { CatalogKind, CatalogNode } from './types';
import classes from './catalog.module.scss';

const KIND_FILTERS: Array<{ kind: CatalogKind; label: string }> = [
  { kind: 'group', label: 'Proje grubu' },
  { kind: 'jar', label: 'Jar' },
  { kind: 'service', label: 'Servis' },
  { kind: 'method', label: 'Metod' },
];

const kindColor: Record<CatalogKind, string> = {
  group: '#e4c27a',
  jar: '#9ec0f5',
  service: '#8dceb0',
  method: '#f0b59a',
};

const KindIcon = ({ kind, size = 14 }: { kind: CatalogKind; size?: number }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (kind === 'group') {
    return (
      <svg {...common}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    );
  }
  if (kind === 'jar') {
    return (
      <svg {...common}>
        <path d="M16.5 9.4 7.55 4.24" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.29 7 12 12l8.71-5" />
        <path d="M12 22V12" />
      </svg>
    );
  }
  if (kind === 'service') {
    return (
      <svg {...common}>
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 12.57-8.58 3.91a2 2 0 0 1-1.66 0L3.18 12.57" />
        <path d="m22 17.57-8.58 3.91a2 2 0 0 1-1.66 0L3.18 17.57" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
      <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
    </svg>
  );
};

type ModuleSidebarProps = {
  tree: CatalogNode[];
  query: string;
  selectedId?: string;
  openIds: Record<string, boolean>;
  onQueryChange: (value: string) => void;
  onToggle: (id: string) => void;
  onSelect: (node: CatalogNode) => void;
};

export const ModuleSidebar = ({
  tree,
  query,
  selectedId,
  openIds,
  onQueryChange,
  onToggle,
  onSelect,
}: ModuleSidebarProps) => {
  const [kinds, setKinds] = useState<Record<CatalogKind, boolean>>({
    group: true,
    jar: true,
    service: true,
    method: false,
  });
  const [showMore, setShowMore] = useState(false);
  const needle = query.trim().toLowerCase();

  return (
    <Box component="aside" className={classes.sidebar} data-testid="module-tree">
      <div className={classes.sidebarHead}>
        <p className={classes.kicker}>Modüller</p>
        <button type="button" className={classes.flatIcon} aria-label="Favoriler">
          <IconStar size={16} />
        </button>
      </div>
      <TextInput
        placeholder="Servis, metod, süreç…"
        size="xs"
        leftSection={<IconSearch size={14} />}
        rightSection={<Text fz={10} c="#8b93a1">Ctrl+K</Text>}
        rightSectionWidth={52}
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        styles={{
          input: { background: '#1f242c', borderColor: '#383e48', color: '#e6eaef' },
        }}
      />
      <div className={classes.kindRow}>
        {KIND_FILTERS.map((item) => (
          <button
            key={item.kind}
            type="button"
            className={classes.kindChip}
            data-active={kinds[item.kind]}
            onClick={() => setKinds((current) => ({ ...current, [item.kind]: !current[item.kind] }))}
          >
            <span className={classes.kindIcon} style={{ color: kindColor[item.kind] }}>
              <KindIcon kind={item.kind} size={13} />
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <ScrollArea className={classes.tree} offsetScrollbars>
        <Stack gap={2}>
          {tree.map((node) => (
            <TreeBranch
              key={node.id}
              node={node}
              depth={0}
              kinds={kinds}
              needle={needle}
              selectedId={selectedId}
              openIds={openIds}
              showMore={showMore}
              onShowMore={() => setShowMore(true)}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </Stack>
      </ScrollArea>
      <div className={classes.sidebarFoot}>
        <button type="button" className={classes.treeButton}>
          <IconHelp size={16} />
          Yardım
        </button>
        <button type="button" className={classes.treeButton}>
          <IconSettings size={16} />
          Seçenekler
        </button>
      </div>
    </Box>
  );
};

const TreeBranch = ({
  node,
  depth,
  kinds,
  needle,
  selectedId,
  openIds,
  showMore,
  onShowMore,
  onToggle,
  onSelect,
}: {
  node: CatalogNode;
  depth: number;
  kinds: Record<CatalogKind, boolean>;
  needle: string;
  selectedId?: string;
  openIds: Record<string, boolean>;
  showMore: boolean;
  onShowMore: () => void;
  onToggle: (id: string) => void;
  onSelect: (node: CatalogNode) => void;
}) => {
  if (!kinds[node.kind] || (needle && !nodeMatches(node, needle))) return null;

  const children = node.children ?? [];
  const visibleChildren = node.id === 'pkg-consumer' && !showMore ? children.slice(0, 1) : children;
  const hiddenCount = children.length - visibleChildren.length;
  const open = needle ? true : (openIds[node.id] ?? depth < 2);
  const selected = node.id === selectedId;

  return (
    <Stack gap={2}>
      <button
        type="button"
        className={classes.treeButton}
        data-selected={selected}
        style={{ marginLeft: depth * 14, width: `calc(100% - ${depth * 14}px)` }}
        onClick={() => onSelect(node)}
      >
        <Box
          component="span"
          c="#949bab"
          w={14}
          onClick={(event) => {
            event.stopPropagation();
            if (children.length) onToggle(node.id);
          }}
        >
          {children.length ? open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} /> : null}
        </Box>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <span className={classes.kindIcon} style={{ color: kindColor[node.kind] }}>
            <KindIcon kind={node.kind} />
          </span>
          <span className={classes.treeName}>{node.name}</span>
          {node.serviceCount ? <span className={classes.treeCount}>{node.serviceCount} servis</span> : null}
        </Group>
      </button>
      {open && visibleChildren.length ? (
        <>
          {visibleChildren.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              kinds={kinds}
              needle={needle}
              selectedId={selectedId}
              openIds={openIds}
              showMore={showMore}
              onShowMore={onShowMore}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
          {hiddenCount > 0 ? (
            <button type="button" className={classes.moreButton} onClick={onShowMore}>
              +{hiddenCount} servis daha göster
            </button>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
};
