import { useContext } from 'react';
import { HostedModalStackContext } from '@/components/modal-host/hosted-modal-stack-context-value';

export const useHostedModalStackId = () => useContext(HostedModalStackContext);
