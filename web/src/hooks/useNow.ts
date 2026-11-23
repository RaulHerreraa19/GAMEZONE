import { useEffect, useState } from 'react';
import { serverNow } from '../lib/time';

/** Server-corrected "now" in ms, refreshed twice per second. */
export function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
