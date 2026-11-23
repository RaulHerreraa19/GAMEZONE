import { useCallback, useEffect, useState } from 'react';
import type { SnackSaleDto } from '@shared';
import { api } from '../lib/api';
import { socket } from '../lib/socket';

/** Snack charges of the open shift (counter and rooms). Refreshes on any money movement. */
export function useSnackSales() {
  const [sales, setSales] = useState<SnackSaleDto[]>([]);

  const reload = useCallback(async () => {
    try {
      setSales(await api<SnackSaleDto[]>('/sales'));
    } catch {
      // Keep the last list; the stations banner already reports connectivity problems.
    }
  }, []);

  useEffect(() => {
    void reload();
    socket.on('ShiftChanged', reload);
    socket.on('connect', reload);
    return () => {
      socket.off('ShiftChanged', reload);
      socket.off('connect', reload);
    };
  }, [reload]);

  return { sales, reload };
}
