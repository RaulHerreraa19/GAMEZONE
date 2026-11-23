import { useCallback, useEffect, useState } from 'react';
import type { SettingsDto, StationDto, StationsResponse } from '@shared';
import { api } from '../lib/api';
import { syncServerTime } from '../lib/time';

export function useStations() {
  const [stations, setStations] = useState<StationDto[]>([]);
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [res, cfg] = await Promise.all([api<StationsResponse>('/stations'), api<SettingsDto>('/settings')]);
      syncServerTime(res.serverNowUtc);
      setStations(res.stations);
      setSettings(cfg);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  /** Replaces one station with a fresh DTO from the server (REST response or socket event). */
  const applyStation = useCallback((dto: StationDto) => {
    setStations((list) => list.map((s) => (s.id === dto.id ? dto : s)));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { stations, settings, error, reload, applyStation };
}
