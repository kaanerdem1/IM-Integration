import type { CatalogNode } from './types';

const moreLoanServices = [
  'CONS_DSS_APPLICATION_SEARCH',
  'CONS_DSS_APPLICATION_DETAIL',
  'CONS_DSS_APPLICATION_SAVE',
  'CONS_DSS_LIMIT_QUERY',
  'CONS_DSS_PAYMENT_PLAN',
].map((name, index) => ({
  id: `svc-loan-${index}`,
  name,
  kind: 'service' as const,
  summary: 'Bireysel kredi başvuru servisi.',
  screens: [],
  processes: [],
  reports: [],
}));

export const CATALOG_TREE: CatalogNode[] = [
  {
    id: 'loans',
    name: 'LOANS',
    kind: 'group',
    summary: 'Bireysel ve ticari kredi servisleri.',
    children: [
      {
        id: 'jar-consumer',
        name: 'Bireysel Krediler Modülü',
        kind: 'jar',
        serviceCount: 2291,
        children: [
          {
            id: 'pkg-consumer',
            name: 'ConsumerLoans',
            kind: 'jar',
            serviceCount: 2291,
            children: [
              {
                id: 'svc-popup',
                name: 'CONS_DSS_APPLICATION_SEARCH_POPUP_LIST',
                kind: 'service',
                summary: 'Başvuru arama penceresinin liste servisi.',
                screens: ['CONS_APPLICATION_SEARCH_POPUP'],
                processes: ['Başvuru Arama', 'Başvuru Seçimi'],
                reports: [],
                children: [
                  { id: 'm-search', name: 'search', kind: 'method' },
                  { id: 'm-list', name: 'list', kind: 'method' },
                ],
              },
              ...moreLoanServices,
            ],
          },
          { id: 'pkg-core', name: 'LoansCore', kind: 'jar', serviceCount: 67 },
          { id: 'pkg-general', name: 'LoansGeneral', kind: 'jar', serviceCount: 5 },
          { id: 'pkg-internet', name: 'LoansInternetServices', kind: 'jar', serviceCount: 13 },
          { id: 'pkg-memzuc', name: 'MemzucTakip', kind: 'jar', serviceCount: 21 },
        ],
      },
    ],
  },
  {
    id: 'ny',
    name: 'NY',
    kind: 'group',
    children: [{ id: 'pkg-cash', name: 'CashManagement', kind: 'jar', serviceCount: 40 }],
  },
  {
    id: 'pay',
    name: 'PAY',
    kind: 'group',
    children: [{ id: 'pkg-payment', name: 'PaymentSystems', kind: 'jar', serviceCount: 88 }],
  },
  {
    id: 'pos',
    name: 'POS',
    kind: 'group',
    children: [{ id: 'pkg-pos', name: 'POSSystems', kind: 'jar', serviceCount: 24 }],
  },
  {
    id: 'pric',
    name: 'PRIC',
    kind: 'group',
    children: [{ id: 'pkg-price', name: 'PricingEngine', kind: 'jar', serviceCount: 16 }],
  },
];

export const findNode = (id: string, nodes: CatalogNode[] = CATALOG_TREE): CatalogNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findNode(id, node.children) : undefined;
    if (child) return child;
  }
  return undefined;
};

export const findParent = (id: string, nodes: CatalogNode[] = CATALOG_TREE, parent?: CatalogNode): CatalogNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return parent;
    const found = node.children ? findParent(id, node.children, node) : undefined;
    if (found) return found;
  }
  return undefined;
};

export const nodeMatches = (node: CatalogNode, query: string): boolean => {
  if (!query) return true;
  if (node.name.toLowerCase().includes(query)) return true;
  return Boolean(node.children?.some((child) => nodeMatches(child, query)));
};
