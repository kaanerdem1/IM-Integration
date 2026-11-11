import { UploadStatus } from '@/components/upload/engine/types';

const getColorObj = (color: 'gray' | 'blue' | 'red' | 'orange' | 'indigo' | 'green') => {
  return {
    baseColor: color,
    color: `var(--mantine-color-${color}-6)`,
    fill: `var(--mantine-color-${color}-2)`,
  };
};

export type StatusColor = ReturnType<typeof getColorObj>;

export const getUploadItemStatusColor = (status: UploadStatus): StatusColor => {
  switch (status) {
    case 'queued':
      return getColorObj('indigo');
    case 'canceled':
      return getColorObj('gray');
    case 'paused':
      return getColorObj('orange');
    case 'uploading':
      return getColorObj('blue');
    case 'success':
      return getColorObj('green');
    case 'error':
      return getColorObj('red');
    default:
      return getColorObj('gray');
  }
};
