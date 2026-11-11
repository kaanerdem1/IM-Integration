import { describe, expect, it } from 'vitest';
import { isTaskFormPath } from '@/pages/tasks/routes';
import {
  shouldKeepRequestFormRendered,
  shouldRenderRequestForm,
  shouldRenderServiceInventoryDrawer,
  shouldRenderTaskForm,
} from './modalRendering';

describe('modal rendering', () => {
  it('keeps the request form mounted after it has been rendered once', () => {
    expect(shouldKeepRequestFormRendered(false, false)).toBe(false);
    expect(shouldKeepRequestFormRendered(false, true)).toBe(true);
    expect(shouldKeepRequestFormRendered(true, false)).toBe(true);
  });

  it.each([
    ['/app/requests/new', ''],
    ['/app/requests/YT-550', ''],
    ['/app/requests/YT-550/etki-analizi', ''],
    ['/app/requests', '?modal=request&id=issue-id'],
    ['/app/home', '?modal=request&id=issue-id'],
  ])('loads the request form for %s%s', (pathname, search) => {
    expect(shouldRenderRequestForm(pathname, search)).toBe(true);
  });

  it.each([
    ['/app/requests', ''],
    ['/app/requests/', ''],
    ['/app/home', ''],
    ['/app/reports', '?modal=other'],
  ])('does not load the request form for %s%s', (pathname, search) => {
    expect(shouldRenderRequestForm(pathname, search)).toBe(false);
  });

  it.each([
    '/app/tasks/task-id',
    '/app/tasks/task-id/analiz-gorev',
    '/app/requests/YT-550/tasks/new/analysis',
    '/app/requests/YT-550/tasks/new/development/gelistirme-gorev',
    '/app/requests/YT-550/tasks/GV-1001',
    '/app/requests/YT-550/tasks/GV-1004/gelistirme-gorev',
  ])('renders the task drawer without rendering the parent request drawer for %s', (pathname) => {
    expect(isTaskFormPath(pathname)).toBe(true);
    expect(shouldRenderTaskForm(pathname)).toBe(true);
    expect(shouldRenderRequestForm(pathname, '')).toBe(false);
  });

  it('keeps the parent request drawer active on the task list tab', () => {
    const pathname = '/app/requests/YT-550/tasks';

    expect(isTaskFormPath(pathname)).toBe(false);
    expect(shouldRenderTaskForm(pathname)).toBe(false);
    expect(shouldRenderRequestForm(pathname, '')).toBe(true);
  });

  it.each(['/app/service-inventory', '/app/service-inventory/', '/APP/SERVICE-INVENTORY'])(
    'renders only service inventory on its standalone route %s',
    (pathname) => {
      expect(shouldRenderServiceInventoryDrawer(pathname)).toBe(true);
      expect(shouldRenderTaskForm(pathname)).toBe(false);
      expect(shouldRenderRequestForm(pathname, '')).toBe(false);
      expect(shouldRenderRequestForm(pathname, '?modal=request&id=issue-id')).toBe(false);
    }
  );

  it.each([
    '/app/tasks/task-id',
    '/app/requests/YT-550',
    '/app/service-inventory/extra',
    '/app/service-inventory-other',
  ])('does not render service inventory on unrelated paths %s', (pathname) => {
    expect(shouldRenderServiceInventoryDrawer(pathname)).toBe(false);
  });

  it.each([
    '/app/tasks/task-id/analiz-gorev/extra',
    '/app/requests/YT-1/tasks/G-1/analiz-gorev/extra',
    '/app/requests/YT-1/tasks/new/analysis/analiz-gorev/extra',
    '/app/requests-other/YT-1/tasks/G-1',
  ])('does not open either drawer for an unmatched path: %s', (path) => {
    expect(shouldRenderTaskForm(path)).toBe(false);
    expect(shouldRenderRequestForm(path, '')).toBe(false);
  });

  it.each([
    '/app/requests/YT-1/tasks/G-1',
    '/app/requests/YT-1/tasks/G-1/analiz-gorev',
    '/app/requests/YT-1/tasks/new/analysis/analiz-gorev',
    '/app/requests/YT-1/tasks/new/development/gelistirme-gorev',
    '/app/requests/YT-1/tasks/new/test/test-gorev',
  ])('does not reopen the parent drawer from legacy query parameters on %s', (pathname) => {
    expect(shouldRenderTaskForm(pathname)).toBe(true);
    expect(shouldRenderRequestForm(pathname, '?modal=request')).toBe(false);
  });

  it('matches case and trailing slashes consistently with the router', () => {
    expect(isTaskFormPath('/APP/REQUESTS/yt-1/TASKS/g-1/')).toBe(true);
  });
});
