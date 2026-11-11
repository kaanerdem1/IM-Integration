import type { ReactNode } from 'react';
import { Box, LoadingOverlay } from '@mantine/core';

interface AppLoadingOverlayProps {
  visible?: boolean;
  children?: ReactNode;
  fullScreen?: boolean;
  zIndex?: number;
}

const DEFAULT_Z_INDEX = 1000;
const DEFAULT_OVERLAY_PROPS = { radius: 'sm', blur: 2 };

export const AppLoadingOverlay = ({
  visible = true,
  children,
  fullScreen = !children,
  zIndex = DEFAULT_Z_INDEX,
}: AppLoadingOverlayProps) => {
  if (!visible && !children) {
    return null;
  }

  if (!visible) {
    return <>{children}</>;
  }

  if (fullScreen) {
    return (
      <Box pos="fixed" inset={0} style={{ zIndex }}>
        <LoadingOverlay
          visible
          zIndex={zIndex}
          overlayProps={DEFAULT_OVERLAY_PROPS}
          styles={{ root: { alignItems: 'center', paddingTop: 0 } }}
        />
      </Box>
    );
  }

  return (
    <Box pos="relative" mih="100vh">
      {children}
      <LoadingOverlay visible zIndex={zIndex} overlayProps={DEFAULT_OVERLAY_PROPS} />
    </Box>
  );
};
