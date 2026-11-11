import { useContext } from 'react';
import { HostedModalStackCleanupContext } from '@/components/modal-host/hosted-modal-stack-context-value';

export const useHostedModalStackCleanup = () => useContext(HostedModalStackCleanupContext);
