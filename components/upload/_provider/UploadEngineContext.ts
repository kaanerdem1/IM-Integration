import { createContext } from 'react';
import { UploadEngine } from '@/components/upload/engine/engine';

export const UploadEngineContext = createContext<UploadEngine | null>(null);
