import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import { Main } from '@/_root/layouts/main';
import mainClasses from '@/_root/layouts/main/style.module.scss';
import tableClasses from '@/components/display/TableCard/style.module.scss';
import { ListPage, ListPageBody, ListPageFooter, ListTableCard } from './ListPage';

vi.mock('@/_root/layouts/header', () => ({ AppHeader: () => <header>Başlık</header> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ListPage shell sizing', () => {
  let container: HTMLDivElement;
  let root: Root;
  const scrollToDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (scrollToDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollToDescriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
    }
  });

  const render = async (totalPages: number) => {
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <MemoryRouter initialEntries={['/app/requests']}>
            <Routes>
              <Route element={<Main />}>
                <Route
                  path="/app/requests"
                  element={
                    <ListPage>
                      <ListPageBody>
                        <ListTableCard hasData isLoading={false}>
                          <Table>
                            <Table.Tbody>
                              <Table.Tr>
                                <Table.Td>YT-1</Table.Td>
                              </Table.Tr>
                            </Table.Tbody>
                          </Table>
                        </ListTableCard>
                        <ListPageFooter
                          pageNumber={0}
                          totalPages={totalPages}
                          onPageChange={() => {}}
                        />
                      </ListPageBody>
                    </ListPage>
                  }
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </MantineProvider>
      );
    });
  };

  it('connects the bounded shell content directly to the full-height list', async () => {
    await render(2);

    const page = container.querySelector('[data-list-page]');
    expect(page?.parentElement).toHaveClass(mainClasses.scrollContent);
    expect(container.querySelector(`.${tableClasses.card}`)).toHaveClass(tableClasses.fill);
    expect(container.querySelector('[data-autosize]')).toBeNull();
    expect(
      container
        .querySelector<HTMLElement>('.mantine-TableScrollContainer-scrollContainer')
        ?.style.getPropertyValue('--table-max-height')
    ).toBe('');
  });

  it('keeps the table mounted when pagination appears or disappears', async () => {
    await render(1);
    const table = container.querySelector('table');
    expect(container.querySelector('.mantine-Pagination-root')).toBeNull();

    await render(5);
    expect(container.querySelector('table')).toBe(table);
    expect(container.querySelector('.mantine-Pagination-root')).not.toBeNull();

    await render(1);
    expect(container.querySelector('table')).toBe(table);
    expect(container.querySelector('.mantine-Pagination-root')).toBeNull();
  });
});
