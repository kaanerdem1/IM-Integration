import { describe, expect, it } from 'vitest';
import { RequestFilterScope } from '../_config/requestFilterScope';
import { changeRequestFilterScope } from './workflowStepDraft';

describe('workflow step drafts', () => {
  it('restores each type separately without overwriting shared fields or chart groups', () => {
    const step = { field: 'stepDefinationId', value: '42', label: 'Adım: Analiz', group: 1 };
    const pool = { field: 'talep-havuzu', value: 'pool-1', label: 'Havuz: Planlanan', group: 1 };
    const software = {
      listIssueType: '1',
      listStep: ['41'],
      listBreakdowns: JSON.stringify([step, pool]),
      listNo: ['YT-1'],
    };
    const operational = changeRequestFilterScope(software, {}, RequestFilterScope.Operational, [
      'listStep',
      'listNo',
    ]);
    expect(operational.activeFilterKeys).toEqual(['listNo']);
    expect(operational.values.listStep).toBeUndefined();
    expect(JSON.parse(operational.values.listBreakdowns!)).toEqual([pool]);
    operational.values.listStep = ['84'];
    operational.values.listNo = ['OT-2'];
    const common = changeRequestFilterScope(
      operational.values,
      operational.workflowStepDrafts,
      RequestFilterScope.Common,
      [...operational.activeFilterKeys, 'listStep']
    );
    expect(common.values.listStep).toBeUndefined();
    const restored = changeRequestFilterScope(
      common.values,
      common.workflowStepDrafts,
      RequestFilterScope.SoftwareDevelopment,
      common.activeFilterKeys
    );
    expect(restored.values.listStep).toEqual(['41']);
    expect(restored.activeFilterKeys).toEqual(['listNo', 'listStep']);
    expect(restored.values.listNo).toEqual(['OT-2']);
    expect(JSON.parse(restored.values.listBreakdowns!)).toEqual([pool, step]);
    expect(
      changeRequestFilterScope(
        restored.values,
        restored.workflowStepDrafts,
        RequestFilterScope.Operational,
        restored.activeFilterKeys
      ).values.listStep
    ).toEqual(['84']);
    expect(software.listStep).toEqual(['41']);
    expect(JSON.parse(software.listBreakdowns)).toEqual([step, pool]);
  });

  it('does not restore a step after the user clears it', () => {
    const operational = changeRequestFilterScope(
      { listIssueType: '1', listStep: ['42'] },
      {},
      RequestFilterScope.Operational,
      ['listStep']
    );
    const software = changeRequestFilterScope(
      operational.values,
      operational.workflowStepDrafts,
      RequestFilterScope.SoftwareDevelopment,
      operational.activeFilterKeys
    );
    software.values.listStep = undefined;
    const common = changeRequestFilterScope(
      software.values,
      software.workflowStepDrafts,
      RequestFilterScope.Common,
      software.activeFilterKeys
    );
    expect(
      changeRequestFilterScope(
        common.values,
        common.workflowStepDrafts,
        RequestFilterScope.SoftwareDevelopment,
        common.activeFilterKeys
      ).values.listStep
    ).toBeUndefined();
  });

  it('keeps malformed chart criteria fail-closed instead of silently discarding them', () => {
    const value = { listIssueType: '1', listBreakdowns: 'invalid-json' };
    expect(
      changeRequestFilterScope(value, {}, RequestFilterScope.Operational, []).values.listBreakdowns
    ).toBe('invalid-json');
  });
});
