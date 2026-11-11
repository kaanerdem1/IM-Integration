/** Stable placement keys, independent of permission codes and translated labels. */
export const FILTER_SELECTION_SCOPES = {
  home: {
    welcome: 'home.welcome',
    pool: 'home.pool',
    requestType: 'home.requestType',
    acceptance: 'home.acceptance',
    coming: 'home.coming',
    runnable: 'home.runnable',
    sla: 'home.sla',
    reject: 'home.reject',
    latePlanning: 'home.latePlanning',
  },
  sla: {
    pool: 'sla.pool',
    latePlanning: 'sla.latePlanning',
    distribution: 'sla.distribution',
    mostDelayed: 'sla.mostDelayed',
    workflowPerformance: 'sla.workflowPerformance',
    exceeded: 'sla.exceeded',
    risky: 'sla.risky',
  },
} as const;

export const savedFilterScopes = [
  ...Object.values(FILTER_SELECTION_SCOPES.home),
  ...Object.values(FILTER_SELECTION_SCOPES.sla),
];

export type SavedFilterScope = (typeof savedFilterScopes)[number];
