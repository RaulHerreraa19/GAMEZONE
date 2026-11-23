import { useMemo, useState } from 'react';
import type { StationDto } from '@shared';
import { stationState } from '@shared';
import { SceneDefs } from './components/SceneDefs';
import { Sidebar, type View } from './components/Sidebar';
import type { CardAction } from './components/StationCard';
import { useNow } from './hooks/useNow';
import { useStations } from './hooks/useStations';
import { dateLong, hhmmss } from './lib/time';
import { Dashboard } from './pages/Dashboard';

const TITLES: Record<View, [string, string]> = {
  est: ['Estaciones', '8 salas · tarifa $50 por persona por hora'],
  bit: ['Bitácora', 'Cada movimiento con hora y empleado responsable'],
  cor: ['Corte de caja', 'Resumen del turno en curso'],
};

export function App() {
  const [view, setView] = useState<View>('est');
  const { stations, settings, error } = useStations();
  const now = useNow();

  const states = useMemo(
    () => stations.map((s) => (settings ? stationState(s.session, now, settings) : 'free')),
    [stations, settings, now],
  );
  const alerts = states.filter((k) => k === 'warning' || k === 'locked').length;

  const onAction = (action: CardAction, st: StationDto) => {
    if (action === 'tv') window.open(`/estacion/${st.id}`, `tv-${st.id}`);
  };

  const [title, sub] = TITLES[view];
  return (
    <div className="app">
      <SceneDefs />
      <Sidebar view={view} onView={setView} alerts={alerts} shiftLabel="Turno abierto" employee={null} onUser={() => {}} />
      <main>
        <div className="phead">
          <div>
            <h1>{title}</h1>
            <p>{error ? `⚠ ${error}` : sub}</p>
          </div>
          <div className="pclock">
            <span className="clock">{hhmmss(now)}</span>
            <small>{dateLong(now)}</small>
          </div>
        </div>
        {view === 'est' && <Dashboard stations={stations} states={states} summary={null} now={now} onAction={onAction} />}
        {view !== 'est' && <p className="note">Disponible en el siguiente paso.</p>}
      </main>
    </div>
  );
}
