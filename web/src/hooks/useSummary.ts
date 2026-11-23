import { useCallback, useEffect, useState } from 'react';
import type { ShiftSummaryDto } from '@shared';
import { api } from '../lib/api';

/** Summary of the open shift (totals, payments). Call `reload` after anything that moves money. */
export function useSummary() {
  const [summary, setSummary] = useState<ShiftSummaryDto | null>(null);

  const reload = useCallback(async () => {
    try {
      setSummary(await api<ShiftSummaryDto>('/shift/current/summary'));
    } catch {
      // Keep the last good summary; the stations error banner already reports connectivity.
    }
  }, []);

  useEffect(() => {
    void reload();
    // Socket events are the fast path, but a phone that slept or lost signal can hold a dead
    // connection and miss ShiftChanged. Re-sync when the tab comes back and every 30 s.
    const onVisible = () => document.visibilityState === 'visible' && void reload();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => void reload(), 30_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [reload]);

  return { summary, reload };
}
