import { getRequestFormRouteMatch } from '@/pages/requests/_shared/navigation/requestFormRoute';
import { isServiceInventoryPath } from '@/pages/service-inventory/routes';
import { isTaskFormPath } from '@/pages/tasks/routes';

export const shouldKeepRequestFormRendered = (
  hasRenderedRequestForm: boolean,
  shouldRenderRequestFormNow: boolean
) => hasRenderedRequestForm || shouldRenderRequestFormNow;

export const shouldRenderTaskForm = (pathname: string) => isTaskFormPath(pathname);

export const shouldRenderServiceInventoryDrawer = (pathname: string) =>
  isServiceInventoryPath(pathname);

export const shouldRenderRequestForm = (pathname: string, search: string) => {
  if (isTaskFormPath(pathname) || isServiceInventoryPath(pathname)) {
    return false;
  }
  if (getRequestFormRouteMatch(pathname)) {
    return true;
  }

  return new URLSearchParams(search).get('modal') === 'request';
};
