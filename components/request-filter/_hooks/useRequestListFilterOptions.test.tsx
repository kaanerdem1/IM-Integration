import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PagedRequest } from '@/_api/_core/api-gen/types';
import type { RequestListFilterKey } from '@/components/request-filter/_config/filterConfig';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { useRequestListFilterOptions } from './useRequestListFilterOptions';

const mocks = vi.hoisted(() => ({
  contacts: vi.fn(),
  users: vi.fn(),
  units: vi.fn(),
  contactData: {
    Data: {
      SponsorUsers: [
        { Id: 'sponsor-user-id', Code: 'sponsor-code', FirstName: 'Proje', LastName: 'Sponsoru' },
      ],
      PortfolioUsers: [
        { Id: 'manager-user-id', Code: 'manager-code', FirstName: 'PO', LastName: 'Yöneticisi' },
      ],
    },
  },
  t: (key: string) => key,
}));
const defaultContactData = mocks.contactData;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.t }) }));
vi.mock('@/_api/hooks', () => ({
  useUserSponsorandpo: (options: { enabled: boolean }) => {
    mocks.contacts(options);
    return { data: mocks.contactData, isFetching: false };
  },
  useUserPagination: (request: PagedRequest, options: { enabled: boolean }) => {
    mocks.users(request, options);
    return {
      data: { Data: [{ Code: 'old-sponsor', FirstName: 'Eski', LastName: 'Sponsor' }] },
      isFetching: false,
    };
  },
  useUnitPagination: (request: PagedRequest, options: { enabled: boolean }) =>
    mocks.units(request, options),
  usePortfolioDefinitionAll: () => ({ data: { Data: [] }, isFetching: false }),
}));

let options: ReturnType<typeof useRequestListFilterOptions>;
function Harness({
  opened = true,
  activeFilterKeys = ['listProjectSponsor', 'listPortfolioManager'],
  value = {},
  businessUnitSearchText = '',
}: {
  opened?: boolean;
  activeFilterKeys?: RequestListFilterKey[];
  value?: RequestListFilterValue;
  businessUnitSearchText?: string;
}) {
  options = useRequestListFilterOptions({
    opened,
    activeFilterKeys,
    value,
    assignedUserSearchText: '',
    businessUnitSearchText,
    createdBySearchText: '',
    softwareUnitSearchText: '',
    unitSearchText: '',
  });
  return null;
}

describe('request list filter options', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.units.mockReset().mockReturnValue({ data: { Data: [] }, isFetching: false });
    mocks.contactData = defaultContactData;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  const render = (props: Parameters<typeof Harness>[0] = {}) =>
    act(async () => root.render(<Harness {...props} />));

  it.each(['', 'Dijital'])(
    'requests and displays all project leader unit types without a type filter with search %s',
    async (businessUnitSearchText) => {
      const units = [
        { Id: 'business-id', DisplayName: 'İş Birimi', Type: 0 },
        { Id: 'software-id', DisplayName: 'Yazılım Birimi', Type: 1 },
        { Id: 'director-id', DisplayName: 'Direktörlük', Type: 2 },
        { Id: 'section-id', DisplayName: 'Bölüm', Type: 3 },
      ];
      mocks.units.mockImplementation((_request, query) => ({
        data: { Data: query.enabled ? units : [] },
        isFetching: false,
      }));
      await render({ activeFilterKeys: ['listProjectLeaderUnit'], businessUnitSearchText });
      const requests = mocks.units.mock.calls.filter(([, query]) => query.enabled);
      expect(requests).toHaveLength(1);
      const request = requests[0][0];
      expect(request).toMatchObject({
        PageNumber: 0,
        PageSize: 100,
      });
      expect(JSON.stringify(request)).not.toContain('"Type"');
      if (businessUnitSearchText) {
        expect(request.Filter).toMatchObject({
          Logic: 'or',
          Filters: expect.arrayContaining([
            expect.objectContaining({ Field: 'Name', Operator: 'contains', Value: 'Dijital' }),
            expect.objectContaining({
              Field: 'DisplayName',
              Operator: 'contains',
              Value: 'Dijital',
            }),
          ]),
        });
      } else {
        expect(request).not.toHaveProperty('Filter');
      }
      expect(options.businessUnitIdOptions).toHaveLength(4);
      expect(options.businessUnitIdOptions).toEqual(
        expect.arrayContaining(units.map((unit) => ({ value: unit.Id, label: unit.DisplayName })))
      );
    }
  );

  it('keeps the project leader request stable when unrelated filter values change', async () => {
    const activeFilterKeys: RequestListFilterKey[] = ['listProjectLeaderUnit'];
    await render({ activeFilterKeys });
    const initialRequest = mocks.units.mock.calls.find(([, query]) => query.enabled)![0];

    mocks.units.mockClear();
    await render({ activeFilterKeys, value: { listNo: ['YT-123'] } });
    const unchangedRequest = mocks.units.mock.calls.find(([, query]) => query.enabled)![0];
    expect(unchangedRequest).toBe(initialRequest);

    mocks.units.mockClear();
    await render({ activeFilterKeys, businessUnitSearchText: 'Dijital' });
    const searchRequest = mocks.units.mock.calls.find(([, query]) => query.enabled)![0];
    expect(searchRequest).not.toBe(initialRequest);
    expect(JSON.stringify(searchRequest)).not.toContain('"Type"');
  });

  it.each([
    ['listSoftwareUnit', 1],
    ['listSoftwareDirector', 2],
  ] as const)('preserves the type constraint for %s', async (key, unitType) => {
    await render({ activeFilterKeys: [key] });
    const requests = mocks.units.mock.calls.filter(([, query]) => query.enabled);

    expect(requests).toHaveLength(1);
    expect(requests[0][0].Filter).toMatchObject({
      Field: 'Type',
      Operator: 'eq',
      Value: unitType,
    });
  });

  it('uses separate role lists keyed by Code, without looking up names already returned', async () => {
    await render({
      value: { listProjectSponsor: ['sponsor-code'], listPortfolioManager: ['manager-code'] },
    });
    expect(mocks.contacts).toHaveBeenCalledExactlyOnceWith({ enabled: true });
    expect(options.projectSponsorOptions).toEqual([
      { value: 'sponsor-code', label: 'Proje Sponsoru', unitName: '' },
    ]);
    expect(options.portfolioManagerOptions).toEqual([
      { value: 'manager-code', label: 'PO Yöneticisi', unitName: '' },
    ]);
    expect(mocks.users.mock.calls.every(([, query]) => !query.enabled)).toBe(true);
  });

  it.each([{ opened: false }, { activeFilterKeys: [] }])(
    'does not request choices outside active filters: %j',
    async (props) => {
      await render(props);
      expect(mocks.contacts).toHaveBeenCalledExactlyOnceWith({ enabled: false });
    }
  );

  it('keeps historical selected users absent from the current role list', async () => {
    await render({ value: { listProjectSponsor: ['old-sponsor'] } });
    expect(options.projectSponsorOptions).toContainEqual({
      value: 'old-sponsor',
      label: 'Eski Sponsor',
      unitName: '',
    });
    expect(mocks.users).toHaveBeenCalledWith(
      expect.objectContaining({
        Filter: expect.objectContaining({ Field: 'Code', Value: 'old-sponsor' }),
      }),
      { enabled: true }
    );
  });

  it('sorts both contact lists alphabetically after merging historical selections', async () => {
    const names = ['Zeynep', 'İpek', 'Işıl', 'Çağla', 'Cem'];
    mocks.contactData = {
      Data: {
        SponsorUsers: names.map((FirstName) => ({
          Id: `sponsor-id-${FirstName}`,
          Code: `sponsor-${FirstName}`,
          FirstName,
          LastName: '',
        })),
        PortfolioUsers: names.map((FirstName) => ({
          Id: `manager-id-${FirstName}`,
          Code: `manager-${FirstName}`,
          FirstName,
          LastName: '',
        })),
      },
    };
    await render({
      value: { listProjectSponsor: ['old-sponsor'], listPortfolioManager: ['old-sponsor'] },
    });
    for (const [data, prefix] of [
      [options.projectSponsorOptions, 'sponsor'],
      [options.portfolioManagerOptions, 'manager'],
    ] as const) {
      expect(data).toEqual(
        ['Cem', 'Çağla', 'Eski Sponsor', 'Işıl', 'İpek', 'Zeynep'].map((label) => ({
          label,
          value: label === 'Eski Sponsor' ? 'old-sponsor' : `${prefix}-${label}`,
          unitName: '',
        }))
      );
    }
    expect(mocks.contactData.Data.SponsorUsers.map((user) => user.FirstName)).toEqual(names);
    expect(mocks.contactData.Data.PortfolioUsers.map((user) => user.FirstName)).toEqual(names);
  });
});
