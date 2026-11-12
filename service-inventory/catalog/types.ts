export type CatalogKind = 'group' | 'jar' | 'service' | 'method';

export type StagePrimary = 'overview' | 'relations' | 'history';

export type RelationsTab = 'services' | 'screens' | 'processes' | 'reports';

export type StageView = 'map' | 'table';

export type CatalogNode = {
  id: string;
  name: string;
  kind: CatalogKind;
  summary?: string;
  serviceCount?: number;
  screens?: string[];
  processes?: string[];
  reports?: string[];
  children?: CatalogNode[];
};
