import { IssueTypeEnum } from '@/_api/_core/api-gen/types';

export const RequestFilterScope = {
  Common: -1,
  SoftwareDevelopment: IssueTypeEnum.NUMBER_1,
  Operational: IssueTypeEnum.NUMBER_2,
} as const;

export type RequestFilterScope = (typeof RequestFilterScope)[keyof typeof RequestFilterScope];

// Missing scope in older saved filters is equivalent to an explicit Common selection.
export const getRequestFilterScope = (value?: string): RequestFilterScope => {
  if (value === String(RequestFilterScope.SoftwareDevelopment)) {
    return RequestFilterScope.SoftwareDevelopment;
  }
  if (value === String(RequestFilterScope.Operational)) {
    return RequestFilterScope.Operational;
  }
  return RequestFilterScope.Common;
};

// All scope explanations share the same copy across filter entry points.
export const requestFilterScopeTooltipContent = {
  [RequestFilterScope.SoftwareDevelopment]: {
    titleKey: 'label.requests.list.filters.groupSoftwareRequests',
    descriptionKey: 'label.requests.list.filters.scopeSoftwareDescription',
  },
  [RequestFilterScope.Operational]: {
    titleKey: 'label.requests.list.filters.scopeOperational',
    descriptionKey: 'label.requests.list.filters.scopeOperationalDescription',
  },
  [RequestFilterScope.Common]: {
    titleKey: 'label.requests.list.filters.scopeCommon',
    descriptionKey: 'label.requests.list.filters.scopeCommonDescription',
  },
} as const;

export const requestFilterScopeOptions = [
  {
    value: RequestFilterScope.SoftwareDevelopment,
    labelKey: 'label.requests.list.filters.scopeSoftwareShort',
  },
  {
    value: RequestFilterScope.Operational,
    labelKey: 'label.requests.list.filters.scopeOperationalShort',
  },
  {
    value: RequestFilterScope.Common,
    labelKey: 'label.requests.list.filters.scopeCommon',
  },
] as const;

export const requestFilterScopeDescriptionKeys = {
  [RequestFilterScope.SoftwareDevelopment]:
    'label.requests.list.filters.softwareOnlyFieldDescription',
  [RequestFilterScope.Operational]: 'label.requests.list.filters.operationalOnlyFieldDescription',
} as const;
