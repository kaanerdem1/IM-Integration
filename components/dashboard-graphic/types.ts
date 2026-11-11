import type {
  UserDashboardGraphicCreateDto,
  UserDashboardGraphicResponseDto,
} from '@/_api/_core/api-gen/types';
import type { AppChartLegendPosition, AppChartType } from '@/components/charts/chartTypes';

export type RequestDistributionChartType = AppChartType;

export type RequestDistributionFormValues = {
  chartType: RequestDistributionChartType;
  legendPosition: AppChartLegendPosition;
  primaryField: string | null;
  savedFilterId: string | null;
  secondaryField: string | null;
};

export type SavedDashboardGraphic = UserDashboardGraphicResponseDto & { Id: string };
export type DashboardGraphicConfiguration = Omit<UserDashboardGraphicCreateDto, 'Name'>;

export type DashboardGraphicWidgetDraft = {
  name?: string;
  configuration: DashboardGraphicConfiguration;
  sourceId: string | null;
  baseline: UserDashboardGraphicCreateDto;
  applyFailed?: boolean;
};

export type DashboardGraphicFormValues = Required<
  Pick<UserDashboardGraphicCreateDto, 'PrimaryFieldValue' | 'SecondaryFieldValue'>
> & {
  GraphicType: RequestDistributionChartType | null;
  LegendPosition: AppChartLegendPosition;
  UserFormFilterIds: string[];
};

export type DashboardGraphicModalOptions =
  | { mode: 'create' }
  | {
      mode: 'widget';
      configuration: DashboardGraphicConfiguration;
      sourceId?: string;
      draft?: DashboardGraphicWidgetDraft;
      onApply: (
        configuration: DashboardGraphicConfiguration,
        sourceId: string
      ) => void | boolean | Promise<void | boolean>;
      onBack?: (draft: DashboardGraphicWidgetDraft) => void;
      onCancel?: () => void;
    }
  | { mode: 'edit'; item: SavedDashboardGraphic }
  | {
      mode: 'preview';
      configuration: DashboardGraphicConfiguration;
      item: SavedDashboardGraphic;
    };
