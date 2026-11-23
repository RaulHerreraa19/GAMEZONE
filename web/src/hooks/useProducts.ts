import { useCallback, useEffect, useState } from 'react';
import type { ProductDto } from '@shared';
import { api } from '../lib/api';
import { socket } from '../lib/socket';

/** Product catalog with stock, kept fresh when anyone sells or restocks (staff-only socket event). */
export function useProducts() {
  const [products, setProducts] = useState<ProductDto[]>([]);

  const reload = useCallback(async () => {
    try {
      setProducts(await api<ProductDto[]>('/products'));
    } catch {
      // Keep the last list; the stations banner already reports connectivity problems.
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    socket.on('ProductsChanged', onChange);
    socket.on('connect', onChange);
    return () => {
      socket.off('ProductsChanged', onChange);
      socket.off('connect', onChange);
    };
  }, [reload]);

  return { products, reload };
}
