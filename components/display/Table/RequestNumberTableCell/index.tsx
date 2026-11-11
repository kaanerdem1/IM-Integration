import type { SyntheticEvent } from 'react';
import { Table, type TableTdProps } from '@mantine/core';
import {
  RequestNumberBadgeLink,
  type RequestNumberBadgeLinkProps,
} from '@/components/display/Table/RequestNumberBadgeLink';

type Props = Pick<TableTdProps, 'miw'> & RequestNumberBadgeLinkProps;

const stopRowNavigation = (event: SyntheticEvent) => {
  event.stopPropagation();
};

export const RequestNumberTableCell = ({ requestNo, href, onClick, miw }: Props) => (
  <Table.Td
    miw={miw}
    style={{ cursor: 'default' }}
    onClick={stopRowNavigation}
    onAuxClick={stopRowNavigation}
    onKeyDown={stopRowNavigation}
  >
    <RequestNumberBadgeLink requestNo={requestNo} href={href} onClick={onClick} />
  </Table.Td>
);
