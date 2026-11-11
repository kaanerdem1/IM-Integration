import { createContext } from 'react';
import type { ModalType } from '@/components/modal-host/core/type';

export type RemoveHostedModalFromStack = (stackId: string) => void;

export const HostedModalStackContext = createContext<ModalType | null>(null);
export const HostedModalStackCleanupContext = createContext<RemoveHostedModalFromStack | null>(
  null
);
