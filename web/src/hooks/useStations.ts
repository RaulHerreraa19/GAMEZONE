import { useCallback, useEffect, useState } from 'react';
import type { SettingsDto, StationDto, StationsResponse } from '@shared';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { syncServerTime } from '../lib/time';

/** Stations from REST, kept live by Socket.IO. Reloads everything after a reconnect to catch missed events. */
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
    let first = true;
    const onConnect = () => {
      if (first) first = false;
      else void reload();
    };
    socket.on('connect', onConnect);
    socket.on('StationUpdated', applyStation);
    const onListChanged = () => void reload();
    socket.on('StationsChanged', onListChanged);
    socket.on('ServerTime', ({ nowUtc }) => syncServerTime(nowUtc));
    socket.connect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('StationUpdated', applyStation);
      socket.off('StationsChanged', onListChanged);
      socket.off('ServerTime');
      socket.disconnect();
    };
  }, [reload, applyStation]);

  return { stations, settings, error, reload, applyStation };
}
