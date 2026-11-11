import type { ReactNode } from 'react';
import classes from './style.module.scss';
import { LoadingOverlay } from '@mantine/core';

type DrawerDetailLoadingBoundaryProps = {
  children: ReactNode;
  loading: boolean;
};

export const DrawerDetailLoadingBoundary = ({
  children,
  loading,
}: DrawerDetailLoadingBoundaryProps) => (
  <>
    <LoadingOverlay
      className={classes.loadingOverlay}
      visible={loading}
      overlayProps={{ blur: 0, backgroundOpacity: 0.35 }}
      transitionProps={{ duration: 0 }}
    />
    {/* Preserve the drawer grid and mounted forms while also blocking keyboard input. */}
    <div style={{ display: 'contents' }} inert={loading} aria-busy={loading}>
      {children}
    </div>
  </>
);
