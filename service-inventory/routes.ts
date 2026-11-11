import { matchPath } from 'react-router';
import { appUrlPrefix } from '@/_common/_constants';

export const SERVICE_INVENTORY_ROUTE = 'service-inventory';
export const SERVICE_INVENTORY_PATH = `${appUrlPrefix}/${SERVICE_INVENTORY_ROUTE}`;

export const isServiceInventoryPath = (pathname: string) =>
  matchPath({ path: SERVICE_INVENTORY_PATH, end: true }, pathname) !== null;
