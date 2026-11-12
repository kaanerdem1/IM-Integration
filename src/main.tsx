import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { CatalogShell } from '../service-inventory/catalog/CatalogShell';
import './preview.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <CatalogShell />
    </MantineProvider>
  </StrictMode>
);
