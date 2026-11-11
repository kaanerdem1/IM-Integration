import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComboboxData } from '@mantine/core';
import type {
  PagedRequest,
  UnitPaginationResponseDto,
  UnitResponseDto,
  UserDto,
  UserPaginationResponseDto,
  UserResponseDto,
} from '@/_api/_core/api-gen/types';
import {
  usePortfolioDefinitionAll,
  useUnitPagination,
  useUserPagination,
  useUserSponsorandpo,
} from '@/_api/hooks';
import { FilterOperator } from '@/_common/_constants/filter-operators';
import { getTextCaseVariants } from '@/_helpers/string';
import { createUnitTypeFilter, getUnitDisplayName, OrgUnitTypeEnum } from '@/_types';
import type { RequestListFilterKey } from '@/components/request-filter/_config/filterConfig';
import { compareSelectOptionLabels } from '@/pages/requests/_shared/fields/options';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';

export type RequestListOption = {
  label: string;
  unitName?: string;
  value: string;
};

type RequestListOptionGroup = {
  group: string;
  items: RequestListOption[];
};

const filterOptionPageSize = 100;

const searchableUserFields = [
  'Code',
  'FirstName',
  'LastName',
] as const satisfies readonly (keyof UserPaginationResponseDto)[];

const searchableUnitFields = [
  'DisplayName',
  'Name',
] as const satisfies readonly (keyof UnitPaginationResponseDto)[];

const userFilterListRequest = {
  PageNumber: 0,
  PageSize: filterOptionPageSize,
  Sorts: [{ Field: 'FirstName' satisfies keyof UserPaginationResponseDto, Direction: 'asc' }],
} satisfies PagedRequest;

const unitFilterListRequest = {
  PageNumber: 0,
  PageSize: filterOptionPageSize,
  Sorts: [{ Field: 'Name' satisfies keyof UnitPaginationResponseDto, Direction: 'asc' }],
} satisfies PagedRequest;

const createUnitSearchRequest = (
  searchText: string,
  unitType?: OrgUnitTypeEnum | readonly OrgUnitTypeEnum[]
): PagedRequest => {
  const searchValues = getTextCaseVariants(searchText);
  const typeFilter = unitType !== undefined ? createUnitTypeFilter(unitType) : null;

  if (!searchValues.length) {
    return {
      ...unitFilterListRequest,
      ...(typeFilter ? { Filter: typeFilter } : {}),
    };
  }

  const nameFilter = {
    Field: '',
    Operator: '',
    Value: '',
    Logic: 'or',
    Filters: searchValues.flatMap((searchValue) =>
      searchableUnitFields.map((field) => ({
        Field: field,
        Operator: FilterOperator.Contains,
        Value: searchValue,
        Logic: 'or',
        Filters: [],
      }))
    ),
  };

  return {
    ...unitFilterListRequest,
    Filter: typeFilter
      ? {
          Field: '',
          Operator: '',
          Value: '',
          Logic: 'and',
          Filters: [typeFilter, nameFilter],
        }
      : nameFilter,
  };
};

const mapUserToFilterOption = (
  user: UserDto | UserPaginationResponseDto | UserResponseDto
): RequestListOption | null => {
  const userCode = user.Code?.trim() ?? '';
  const userName = `${user.FirstName ?? ''} ${user.LastName ?? ''}`.trim();
  const unitName = 'UnitName' in user ? (user.UnitName?.trim() ?? '') : '';

  return userCode ? { label: userName || userCode, unitName, value: userCode } : null;
};

const uniqueNonEmptyStrings = (...valueGroups: Array<string[] | undefined>) => {
  const valueSet = new Set<string>();

  valueGroups.flat().forEach((value) => {
    const normalizedValue = value?.trim() ?? '';

    if (normalizedValue) {
      valueSet.add(normalizedValue);
    }
  });

  return [...valueSet];
};

const createExactLookupRequest = (
  field: keyof UserPaginationResponseDto | keyof UnitPaginationResponseDto,
  values: string[],
  sorts?: PagedRequest['Sorts']
): PagedRequest => ({
  PageNumber: 0,
  PageSize: Math.max(values.length, 1),
  ...(sorts ? { Sorts: sorts } : {}),
  Filter: {
    Field: field,
    Operator: values.length > 1 ? FilterOperator.In : FilterOperator.Equal,
    Value: values.length > 1 ? values : (values[0] ?? ''),
    Logic: 'or',
    Filters: [],
  },
});

const createUserSearchRequest = (searchText: string): PagedRequest => {
  const normalizedSearchText = searchText.trim();
  const searchWords = Array.from(new Set(normalizedSearchText.split(/\s+/).filter(Boolean)));

  if (!searchWords.length) {
    return userFilterListRequest;
  }

  return {
    ...userFilterListRequest,
    Filter: {
      Field: '',
      Operator: '',
      Value: '',
      Logic: 'and',
      Filters: searchWords.map((searchWord) => ({
        Logic: 'or',
        Filters: getTextCaseVariants(searchWord).flatMap((searchValue) =>
          searchableUserFields.map((field) => ({
            Field: field,
            Operator: FilterOperator.Contains,
            Value: searchValue,
            Logic: 'or',
            Filters: [],
          }))
        ),
      })),
    },
  };
};

const mergeOptionsByValue = (...optionGroups: RequestListOption[][]): RequestListOption[] => {
  const optionMap = new Map<string, RequestListOption>();

  optionGroups.flat().forEach((option) => {
    if (!option.value) {
      return;
    }

    if (optionMap.has(option.value)) {
      return;
    }

    optionMap.set(option.value, option);
  });

  return [...optionMap.values()];
};

const groupUserOptionsByUnitName = (
  users: Array<UserDto | UserPaginationResponseDto>,
  usedUserCodes: Set<string>,
  fallbackGroupLabel: string
): RequestListOptionGroup[] => {
  const groupMap = new Map<string, RequestListOption[]>();

  users.forEach((user) => {
    const item = mapUserToFilterOption(user);

    if (!item || usedUserCodes.has(item.value)) {
      return;
    }

    usedUserCodes.add(item.value);
    const groupName = item.unitName || fallbackGroupLabel;
    const groupItems = groupMap.get(groupName) ?? [];

    groupItems.push(item);
    groupMap.set(groupName, groupItems);
  });

  return [...groupMap.entries()]
    .map(([group, items]) => ({ group, items }))
    .sort((left, right) => left.group.localeCompare(right.group, 'tr'));
};

const mapUnitIdToFilterOption = (
  unit: UnitPaginationResponseDto | UnitResponseDto
): RequestListOption | null => {
  const unitName = 'DisplayName' in unit ? getUnitDisplayName(unit) : (unit.Name?.trim() ?? '');
  const unitId = unit.Id?.trim() ?? '';

  return unitName && unitId ? { label: unitName, value: unitId } : null;
};

type UseRequestListFilterOptionsParams = {
  activeFilterKeys: RequestListFilterKey[];
  assignedUserSearchText: string;
  businessUnitSearchText: string;
  createdBySearchText: string;
  opened: boolean;
  softwareDirectorSearchText?: string;
  softwareUnitSearchText: string;
  unitSearchText: string;
  updatedBySearchText?: string;
  value: RequestListFilterValue;
};

export type RequestListFilterOptionState = {
  assignedUserOptions: ComboboxData;
  businessUnitIdOptions: ComboboxData;
  createdByOptions: ComboboxData;
  isLoadingAssignedUserOptions: boolean;
  isLoadingCreatedByOptions: boolean;
  isLoadingPortfolioOptions: boolean;
  isLoadingPortfolioManagerOptions: boolean;
  isLoadingProjectSponsorOptions: boolean;
  isLoadingSoftwareDirectorOptions: boolean;
  isLoadingUnitOptions: boolean;
  isLoadingUpdatedByOptions: boolean;
  portfolioOptions: ComboboxData;
  portfolioManagerOptions: ComboboxData;
  projectSponsorOptions: ComboboxData;
  softwareDirectorIdOptions: ComboboxData;
  softwareUnitIdOptions: ComboboxData;
  unitIdOptions: ComboboxData;
  updatedByOptions: ComboboxData;
};

export const useRequestListFilterOptions = ({
  activeFilterKeys,
  assignedUserSearchText,
  businessUnitSearchText,
  createdBySearchText,
  opened,
  softwareDirectorSearchText = '',
  softwareUnitSearchText,
  unitSearchText,
  updatedBySearchText = '',
  value,
}: UseRequestListFilterOptionsParams): RequestListFilterOptionState => {
  const { t } = useTranslation();
  const shouldFetchAssignedUserOptions = opened && activeFilterKeys.includes('listAssignedUser');
  const shouldFetchCreatedByOptions = opened && activeFilterKeys.includes('listCreatedBy');
  const shouldFetchUpdatedByOptions = opened && activeFilterKeys.includes('listUpdatedBy');
  const shouldFetchProjectSponsorOptions =
    opened && activeFilterKeys.includes('listProjectSponsor');
  const shouldFetchPortfolioManagerOptions =
    opened && activeFilterKeys.includes('listPortfolioManager');
  const { data: contactUsers, isFetching: isFetchingContactUsers } = useUserSponsorandpo({
    enabled: shouldFetchProjectSponsorOptions || shouldFetchPortfolioManagerOptions,
  });
  const shouldFetchBusinessUnitOptions =
    opened && activeFilterKeys.includes('listProjectLeaderUnit');
  const shouldFetchSoftwareUnitOptions = opened && activeFilterKeys.includes('listSoftwareUnit');
  const shouldFetchSoftwareDirectorOptions =
    opened && activeFilterKeys.includes('listSoftwareDirector');
  const shouldFetchUnitOptions = opened && activeFilterKeys.includes('listUnit');
  const selectedUserCodes = useMemo(() => {
    const sponsorCodes = new Set((contactUsers?.Data?.SponsorUsers ?? []).map((user) => user.Code));
    const managerCodes = new Set(
      (contactUsers?.Data?.PortfolioUsers ?? []).map((user) => user.Code)
    );
    return uniqueNonEmptyStrings(
      value.listAssignedUser,
      value.listCreatedBy,
      value.listUpdatedBy,
      contactUsers ? value.listPortfolioManager?.filter((code) => !managerCodes.has(code)) : [],
      contactUsers ? value.listProjectSponsor?.filter((code) => !sponsorCodes.has(code)) : []
    );
  }, [
    value.listAssignedUser,
    value.listCreatedBy,
    value.listUpdatedBy,
    value.listPortfolioManager,
    value.listProjectSponsor,
    contactUsers,
  ]);
  const selectedBusinessUnitIds = useMemo(
    () => uniqueNonEmptyStrings(value.listProjectLeaderUnit),
    [value.listProjectLeaderUnit]
  );
  const selectedSoftwareUnitIds = useMemo(
    () => uniqueNonEmptyStrings(value.listSoftwareUnit),
    [value.listSoftwareUnit]
  );
  const selectedUnitIds = useMemo(
    () =>
      uniqueNonEmptyStrings(
        selectedBusinessUnitIds,
        selectedSoftwareUnitIds,
        value.listSoftwareDirector,
        value.listUnit
      ),
    [selectedBusinessUnitIds, selectedSoftwareUnitIds, value.listSoftwareDirector, value.listUnit]
  );

  const assignedUserListRequest = useMemo(
    () => createUserSearchRequest(assignedUserSearchText),
    [assignedUserSearchText]
  );
  const createdByUserListRequest = useMemo(
    () => createUserSearchRequest(createdBySearchText),
    [createdBySearchText]
  );
  const updatedByUserListRequest = useMemo(
    () => createUserSearchRequest(updatedBySearchText),
    [updatedBySearchText]
  );
  const businessUnitListRequest = useMemo(
    // Project leader units can belong to any organizational unit type.
    () => createUnitSearchRequest(businessUnitSearchText),
    [businessUnitSearchText]
  );
  const softwareUnitListRequest = useMemo(
    () => createUnitSearchRequest(softwareUnitSearchText, OrgUnitTypeEnum.Software),
    [softwareUnitSearchText]
  );
  const softwareDirectorListRequest = useMemo(
    () => createUnitSearchRequest(softwareDirectorSearchText, OrgUnitTypeEnum.Director),
    [softwareDirectorSearchText]
  );
  const unitListRequest = useMemo(() => createUnitSearchRequest(unitSearchText), [unitSearchText]);
  const { data: assignedUserList, isFetching: isFetchingAssignedUserList } = useUserPagination(
    assignedUserListRequest,
    {
      enabled: shouldFetchAssignedUserOptions,
    }
  );
  const { data: createdByUserList, isFetching: isFetchingCreatedByUserList } = useUserPagination(
    createdByUserListRequest,
    {
      enabled: shouldFetchCreatedByOptions,
    }
  );
  const { data: updatedByUserList, isFetching: isFetchingUpdatedByUserList } = useUserPagination(
    updatedByUserListRequest,
    {
      enabled: shouldFetchUpdatedByOptions,
    }
  );
  const { data: portfolioList, isFetching: isLoadingPortfolioOptions } = usePortfolioDefinitionAll({
    enabled: opened && activeFilterKeys.includes('listPortfolio'),
  });
  const selectedUsersRequest = useMemo(
    () =>
      createExactLookupRequest('Code', selectedUserCodes, [
        { Field: 'FirstName' satisfies keyof UserPaginationResponseDto, Direction: 'asc' },
      ]),
    [selectedUserCodes]
  );
  const { data: selectedUsers, isFetching: isFetchingSelectedUsers } = useUserPagination(
    selectedUsersRequest,
    {
      enabled: opened && selectedUserCodes.length > 0,
    }
  );
  const { data: unitList, isFetching: isFetchingUnitList } = useUnitPagination(unitListRequest, {
    enabled: shouldFetchUnitOptions,
  });
  const selectedUnitIdsRequest = useMemo(
    () =>
      createExactLookupRequest('Id', selectedUnitIds, [
        { Field: 'Name' satisfies keyof UnitPaginationResponseDto, Direction: 'asc' },
      ]),
    [selectedUnitIds]
  );
  const { data: selectedUnitsById, isFetching: isFetchingSelectedUnitsById } = useUnitPagination(
    selectedUnitIdsRequest,
    {
      enabled: opened && selectedUnitIds.length > 0,
    }
  );
  const { data: businessUnitList, isFetching: isFetchingBusinessUnitList } = useUnitPagination(
    businessUnitListRequest,
    {
      enabled: shouldFetchBusinessUnitOptions,
    }
  );
  const { data: softwareUnitList, isFetching: isFetchingSoftwareUnitList } = useUnitPagination(
    softwareUnitListRequest,
    {
      enabled: shouldFetchSoftwareUnitOptions,
    }
  );
  const { data: softwareDirectorList, isFetching: isFetchingSoftwareDirectorList } =
    useUnitPagination(softwareDirectorListRequest, { enabled: shouldFetchSoftwareDirectorOptions });

  const createdByOptions = useMemo<ComboboxData>(() => {
    const usedUserCodes = new Set<string>();
    const fallbackGroupLabel = t('label.requests.list.filters.otherUsersGroup');
    return groupUserOptionsByUnitName(
      [...(selectedUsers?.Data ?? []), ...(createdByUserList?.Data ?? [])],
      usedUserCodes,
      fallbackGroupLabel
    );
  }, [createdByUserList?.Data, selectedUsers?.Data, t]);

  const updatedByOptions = useMemo<ComboboxData>(() => {
    const usedUserCodes = new Set<string>();
    const fallbackGroupLabel = t('label.requests.list.filters.otherUsersGroup');
    return groupUserOptionsByUnitName(
      [...(selectedUsers?.Data ?? []), ...(updatedByUserList?.Data ?? [])],
      usedUserCodes,
      fallbackGroupLabel
    );
  }, [updatedByUserList?.Data, selectedUsers?.Data, t]);

  const unitIdOptions = useMemo<ComboboxData>(() => {
    const selectedIncludedUnitIdSet = new Set(value.listUnit ?? []);
    const baseOptions = (unitList?.Data ?? [])
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    const selectedOptions = (selectedUnitsById?.Data ?? [])
      .filter((unit) => selectedIncludedUnitIdSet.has(unit.Id ?? ''))
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    return mergeOptionsByValue(selectedOptions, baseOptions);
  }, [selectedUnitsById?.Data, unitList?.Data, value.listUnit]);

  const businessUnitIdOptions = useMemo<ComboboxData>(() => {
    const selectedBusinessUnitIdSet = new Set(selectedBusinessUnitIds);
    const baseOptions = (businessUnitList?.Data ?? [])
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    const selectedOptions = (selectedUnitsById?.Data ?? [])
      .filter((unit) => selectedBusinessUnitIdSet.has(unit.Id ?? ''))
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    return mergeOptionsByValue(selectedOptions, baseOptions);
  }, [businessUnitList?.Data, selectedBusinessUnitIds, selectedUnitsById?.Data]);

  const softwareUnitIdOptions = useMemo<ComboboxData>(() => {
    const selectedSoftwareUnitIdSet = new Set(selectedSoftwareUnitIds);
    const baseOptions = (softwareUnitList?.Data ?? [])
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    const selectedOptions = (selectedUnitsById?.Data ?? [])
      .filter((unit) => selectedSoftwareUnitIdSet.has(unit.Id ?? ''))
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    return mergeOptionsByValue(selectedOptions, baseOptions);
  }, [selectedSoftwareUnitIds, selectedUnitsById?.Data, softwareUnitList?.Data]);

  const softwareDirectorIdOptions = useMemo<ComboboxData>(() => {
    const selectedDirectorIdSet = new Set(value.listSoftwareDirector ?? []);
    const baseOptions = (softwareDirectorList?.Data ?? [])
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    const selectedOptions = (selectedUnitsById?.Data ?? [])
      .filter((unit) => selectedDirectorIdSet.has(unit.Id ?? ''))
      .map(mapUnitIdToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    return mergeOptionsByValue(selectedOptions, baseOptions);
  }, [selectedUnitsById?.Data, softwareDirectorList?.Data, value.listSoftwareDirector]);

  const assignedUserOptions = useMemo<ComboboxData>(() => {
    const baseOptions = (assignedUserList?.Data ?? [])
      .map(mapUserToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    const selectedOptions = (selectedUsers?.Data ?? [])
      .map(mapUserToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    return mergeOptionsByValue(selectedOptions, baseOptions);
  }, [assignedUserList?.Data, selectedUsers?.Data]);

  const portfolioOptions = useMemo<ComboboxData>(
    () =>
      (portfolioList?.Data ?? []).flatMap(({ Id, Name }) =>
        Id && Name ? [{ value: Id, label: Name }] : []
      ),
    [portfolioList?.Data]
  );

  const projectSponsorOptions = useMemo<ComboboxData>(() => {
    const selectedProjectSponsorCodeSet = new Set(value.listProjectSponsor ?? []);
    const baseOptions = (contactUsers?.Data?.SponsorUsers ?? [])
      .map(mapUserToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    const selectedOptions = (selectedUsers?.Data ?? [])
      .filter((user) => selectedProjectSponsorCodeSet.has(user.Code ?? ''))
      .map(mapUserToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    return mergeOptionsByValue(selectedOptions, baseOptions).sort(compareSelectOptionLabels);
  }, [contactUsers?.Data?.SponsorUsers, selectedUsers?.Data, value.listProjectSponsor]);

  const portfolioManagerOptions = useMemo<ComboboxData>(() => {
    const selectedPortfolioManagerCodeSet = new Set(value.listPortfolioManager ?? []);
    const baseOptions = (contactUsers?.Data?.PortfolioUsers ?? [])
      .map(mapUserToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    const selectedOptions = (selectedUsers?.Data ?? [])
      .filter((user) => selectedPortfolioManagerCodeSet.has(user.Code ?? ''))
      .map(mapUserToFilterOption)
      .filter((item): item is RequestListOption => Boolean(item));
    return mergeOptionsByValue(selectedOptions, baseOptions).sort(compareSelectOptionLabels);
  }, [contactUsers?.Data?.PortfolioUsers, selectedUsers?.Data, value.listPortfolioManager]);

  const isLoadingAssignedUserOptions = isFetchingAssignedUserList || isFetchingSelectedUsers;
  const isLoadingCreatedByOptions = isFetchingCreatedByUserList || isFetchingSelectedUsers;
  const isLoadingUpdatedByOptions = isFetchingUpdatedByUserList || isFetchingSelectedUsers;
  const isLoadingPortfolioManagerOptions = isFetchingContactUsers || isFetchingSelectedUsers;
  const isLoadingProjectSponsorOptions = isFetchingContactUsers || isFetchingSelectedUsers;
  const isLoadingSoftwareDirectorOptions =
    isFetchingSoftwareDirectorList || isFetchingSelectedUnitsById;
  const isLoadingUnitOptions =
    isFetchingUnitList ||
    isFetchingBusinessUnitList ||
    isFetchingSoftwareUnitList ||
    isFetchingSelectedUnitsById;

  // Filtre alanlarının memo karşılaştırması için sonuç referansını kararlı tut.
  return useMemo(
    () => ({
      assignedUserOptions,
      businessUnitIdOptions,
      createdByOptions,
      isLoadingAssignedUserOptions,
      isLoadingCreatedByOptions,
      isLoadingPortfolioOptions,
      isLoadingPortfolioManagerOptions,
      isLoadingProjectSponsorOptions,
      isLoadingSoftwareDirectorOptions,
      isLoadingUnitOptions,
      isLoadingUpdatedByOptions,
      portfolioOptions,
      portfolioManagerOptions,
      projectSponsorOptions,
      softwareDirectorIdOptions,
      softwareUnitIdOptions,
      unitIdOptions,
      updatedByOptions,
    }),
    [
      assignedUserOptions,
      businessUnitIdOptions,
      createdByOptions,
      isLoadingAssignedUserOptions,
      isLoadingCreatedByOptions,
      isLoadingPortfolioOptions,
      isLoadingPortfolioManagerOptions,
      isLoadingProjectSponsorOptions,
      isLoadingSoftwareDirectorOptions,
      isLoadingUnitOptions,
      isLoadingUpdatedByOptions,
      portfolioOptions,
      portfolioManagerOptions,
      projectSponsorOptions,
      softwareDirectorIdOptions,
      softwareUnitIdOptions,
      unitIdOptions,
      updatedByOptions,
    ]
  );
};
