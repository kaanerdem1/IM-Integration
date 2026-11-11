import type { TableTdProps, TableThProps } from '@mantine/core';

// İçeriğe göre daralan sütun: %1 genişlik → sütun kendi min-content'ine iner (fazla alan esnek sütuna kalır)
export const listTableShrinkColumnProps = { w: '1%' } satisfies TableThProps;

// Esnek sütun (talep başlığı vb.): sabit genişlik yerine alt sınır; kalan alanı bu sütun doldurur
export const listTableSubjectColumnProps = { miw: 350 } satisfies Pick<TableTdProps, 'miw'>;
