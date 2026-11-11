import { useMemo } from 'react';
import { getDefaultRequestFilterValue } from '../_config/defaultRequestFilter';

/** Keep the relative default stable; resolve dates only when preparing a request. */
export const useDefaultRequestFilter = () => {
  return useMemo(getDefaultRequestFilterValue, []);
};
