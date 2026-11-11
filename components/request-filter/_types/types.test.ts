import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  UserFormFilterCreateDto,
  UserFormFilterResponseDto,
} from '@/_api/_core/api-gen/types';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { isSavedUserFormFilter, requestFilterModes } from './index';
import type { RequestFilterModalOptions, RequestFilterMode, SavedUserFormFilter } from './index';

describe('request filter contracts', () => {
  it('accepts a service-typed initial name for a prefilled create modal without a saved record', () => {
    expectTypeOf<
      Extract<RequestFilterModalOptions, { mode: 'create' }>['initialName']
    >().toEqualTypeOf<NonNullable<UserFormFilterCreateDto['Name']> | undefined>();
    expectTypeOf<
      Extract<RequestFilterModalOptions, { mode: 'create' }>['initialDescription']
    >().toEqualTypeOf<UserFormFilterCreateDto['Description']>();
    expectTypeOf<{
      mode: 'create';
      initialName: string;
      value: RequestListFilterValue;
    }>().toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      mode: 'create';
      initialName: number;
    }>().not.toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      mode: 'create';
      initialName: string;
      item: SavedUserFormFilter;
    }>().not.toExtend<RequestFilterModalOptions>();
  });

  it('excludes scope from modal options and apply callbacks', () => {
    expectTypeOf<'view'>().not.toExtend<keyof RequestFilterModalOptions>();
    expectTypeOf<
      Extract<RequestFilterModalOptions, { mode: 'apply' }>['onApply']
    >().parameters.toEqualTypeOf<[RequestListFilterValue]>();
  });

  it('restricts modes to the supported literal values', () => {
    expectTypeOf<RequestFilterMode>().toEqualTypeOf<'apply' | 'create' | 'edit'>();
    expectTypeOf<string>().not.toExtend<RequestFilterMode>();
    expectTypeOf<{ mode: 'unknown' }>().not.toExtend<RequestFilterModalOptions>();
    expectTypeOf<{ value: RequestListFilterValue }>().not.toExtend<RequestFilterModalOptions>();
  });

  it('requires apply callbacks and forbids them in create and edit modes', () => {
    expectTypeOf({
      mode: requestFilterModes.apply,
      value: {},
      onApply: (_value: RequestListFilterValue) => undefined,
      onReset: () => undefined,
    }).toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      mode: 'apply';
      value: RequestListFilterValue;
    }>().not.toExtend<RequestFilterModalOptions>();
    expectTypeOf({ mode: requestFilterModes.create }).toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      mode: 'create';
      onApply: (value: RequestListFilterValue) => void;
    }>().not.toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      item: SavedUserFormFilter;
      mode: 'edit';
      value: RequestListFilterValue;
      onReset: () => void;
    }>().not.toExtend<RequestFilterModalOptions>();
  });

  it('allows applying list criteria while editing an identified saved record', () => {
    expectTypeOf<{
      item: SavedUserFormFilter;
      mode: 'apply';
      value: RequestListFilterValue;
      onApply: (value: RequestListFilterValue) => void;
      onReset: () => void;
    }>().toExtend<RequestFilterModalOptions>();
  });

  it('requires a saved service record and filter values only when editing', () => {
    expectTypeOf<SavedUserFormFilter>().toExtend<UserFormFilterResponseDto>();
    expectTypeOf<{
      item: SavedUserFormFilter;
      mode: 'edit';
      value: RequestListFilterValue;
    }>().toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      mode: 'edit';
      value: RequestListFilterValue;
    }>().not.toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      item: UserFormFilterResponseDto;
      mode: 'edit';
      value: RequestListFilterValue;
    }>().not.toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      item: SavedUserFormFilter;
      mode: 'edit';
    }>().not.toExtend<RequestFilterModalOptions>();
    expectTypeOf<{
      item: SavedUserFormFilter;
      mode: 'create';
    }>().not.toExtend<RequestFilterModalOptions>();
  });

  it.each<UserFormFilterResponseDto>([
    {},
    { Id: '', Name: 'Liste' },
    { Id: 'filter-1' },
    { Id: 'filter-1', Name: null },
    { Id: 'filter-1', Name: '' },
  ])('rejects incomplete service records: %j', (item) => {
    expect(isSavedUserFormFilter(item)).toBe(false);
  });

  it('narrows complete service records without redefining the DTO', () => {
    const item: UserFormFilterResponseDto = { Id: 'filter-1', Name: 'Liste' };

    expect(isSavedUserFormFilter(item)).toBe(true);

    if (isSavedUserFormFilter(item)) {
      expectTypeOf(item.Id).toEqualTypeOf<string>();
      expectTypeOf(item.Name).toEqualTypeOf<string>();
    }
  });
});
