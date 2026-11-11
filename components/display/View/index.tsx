import type { FC } from 'react';

type ViewProps = {
  show: boolean;
  children: React.ReactNode;
};

export const View: FC<ViewProps> = ({ show, children }) => {
  if (!show) {
    return null;
  }
  return <>{children}</>;
};
