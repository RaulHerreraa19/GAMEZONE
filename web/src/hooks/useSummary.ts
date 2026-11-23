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
  }, [reload]);

  return { summary, reload };
}
