import { useEffect, useCallback } from 'react';
import { onDataChanged } from '../utils/dataSync';

export function useDataSync(types, refreshFn) {
  const refresh = useCallback(() => {
    refreshFn();
  }, [refreshFn]);

  useEffect(() => {
    const unsubscribe = onDataChanged((changedType) => {
      if (types.includes(changedType)) {
        refresh();
      }
    });
    return unsubscribe;
  }, [types, refresh]);
}