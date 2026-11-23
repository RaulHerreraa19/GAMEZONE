import { useCallback, useEffect, useState } from 'react';
import type { SettingsDto, StationDto, StationState } from '@shared';
import { CONSOLE_LABEL, stationState } from '@shared';
import { useNow } from '../hooks/useNow';
import { api } from '../lib/api';
import { money } from '../lib/money';
import { socket } from '../lib/socket';
import { syncServerTime } from '../lib/time';

const LED: Record<StationState, { cls: string; label: string }> = {
  free: { cls: 'off', label: 'Semáforo apagado' },
  out: { cls: 'off', label: 'Semáforo apagado' },
  playing: { cls: '', label: 'Semáforo verde: en juego' },
  warning: { cls: 'warn', label: 'Semáforo ámbar: por terminar' },
  locked: { cls: 'lock', label: 'Semáforo rojo: tiempo terminado' },
};

/**
 * Simulates the TV of one station (public, no login). It listens to the same Socket.IO events
 * as the panel, and the hardware module of phase 2 will mirror exactly these states.
 */
export function StationTv({ id }: { id: number }) {
  const [station, setStation] = useState<StationDto | null>(null);
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [error, setError] = useState('');
  const now = useNow();

  const load = useCallback(async () => {
    try {
      const [res, cfg] = await Promise.all([
        api<{ serverNowUtc: string; station: StationDto }>(`/stations/${id}`),
        api<SettingsDto>('/settings'),
      ]);
      syncServerTime(res.serverNowUtc);
      setStation(res.station);
      setSettings(cfg);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
    let first = true;
    const onConnect = () => {
      if (first) first = false;
      else void load(); // catch up on anything missed while offline
    };
    const onStation = (dto: StationDto) => dto.id === id && setStation(dto);
    socket.on('connect', onConnect);
    socket.on('StationUpdated', onStation);
    socket.on('StationsChanged', load);
    socket.on('ServerTime', ({ nowUtc }) => syncServerTime(nowUtc));
    socket.connect(); // no token: a public connection that only receives station state
    return () => {
      socket.off('connect', onConnect);
      socket.off('StationUpdated', onStation);
      socket.off('StationsChanged', load);
      socket.off('ServerTime');
      socket.disconnect();
    };
  }, [id, load]);

  useEffect(() => {
    document.title = station ? `TV · ${station.name}` : 'TV · GAME ZONE';
  }, [station]);

  if (!station || !settings) {
    return <div className="loading">{error || 'Cargando…'}</div>;
  }

  const state: StationState = station.active ? stationState(station, now, settings) : 'out';
  const led = LED[state];
  const logo = <img className="gzl" src="/brand/gz-circular.webp" alt="GAME ZONE" />;

  return (
    <div className="tv">
      <div className="bezel">
        {state === 'free' && (
          <div className="scr idle">
            {logo}
            <h4>Estación disponible</h4>
            <p>{money(settings.rateCentsPerPersonHour)} por persona por hora · pide tu tiempo en caja</p>
          </div>
        )}
        {state === 'out' && (
          <div className="scr idle">
            {logo}
            <div className="gz">{station.name}</div>
            <h4>Fuera de servicio</h4>
            <p>Esta estación no está disponible por ahora</p>
          </div>
        )}
        {state === 'locked' && (
          <div className="scr lock">
            {logo}
            <div className="gz">{station.name}</div>
            <h4>Tiempo terminado</h4>
            <p>Pasa a caja para extender tu tiempo</p>
          </div>
        )}
        {(state === 'playing' || state === 'warning') && (
          <div className="scr game">
            <p>Señal de la consola {CONSOLE_LABEL[station.consoleType]} (simulada) · el jugador ve su juego normal</p>
          </div>
        )}
      </div>
      <div className={`led ${led.cls}`} role="img" aria-label={led.label} />
      <div className="tvbar">
        <span>{station.name}</span>
        <span>Vista simulada de la televisión y su semáforo LED</span>
      </div>
    </div>
  );
}
