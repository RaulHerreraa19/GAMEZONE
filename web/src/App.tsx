import { useCallback, useMemo, useState } from 'react';
import type { EmployeeDto, StationDto } from '@shared';
import { ROLE_LABEL, stationState } from '@shared';
import { Modal } from './components/Modal';
import { SceneDefs } from './components/SceneDefs';
import { Sidebar, type View } from './components/Sidebar';
import type { CardAction } from './components/StationCard';
import { Toasts, useToasts } from './components/Toasts';
import { useAuth } from './hooks/useAuth';
import { useNow } from './hooks/useNow';
import { useStations } from './hooks/useStations';
import { dateLong, hhmmss } from './lib/time';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { UsersPage } from './pages/UsersPage';

const TITLES: Record<View, [string, string]> = {
  est: ['Estaciones', '8 salas · tarifa $50 por persona por hora'],
  bit: ['Bitácora', 'Cada movimiento con hora y empleado responsable'],
  cor: ['Corte de caja', 'Resumen del turno en curso'],
  usr: ['Usuarios', 'Altas, roles y accesos del equipo'],
};

export function App() {
  const { employee, checking } = useAuth();
  if (checking) return <div className="loading">Cargando…</div>;
  if (!employee) return <Login />;
  return <Shell employee={employee} />;
}

function Shell({ employee }: { employee: EmployeeDto }) {
  const { logout } = useAuth();
  const [view, setView] = useState<View>('est');
  const [askLogout, setAskLogout] = useState(false);
  const { stations, settings, error } = useStations();
  const { items: toastItems, toast } = useToasts();
  const now = useNow();

  const states = useMemo(
    () => stations.map((s) => (settings ? stationState(s.session, now, settings) : 'free')),
    [stations, settings, now],
  );
  const alerts = states.filter((k) => k === 'warning' || k === 'locked').length;

  const onAction = (action: CardAction, st: StationDto) => {
    if (action === 'tv') window.open(`/estacion/${st.id}`, `tv-${st.id}`);
  };
  const closeLogout = useCallback(() => setAskLogout(false), []);

  const current = view === 'usr' && employee.role !== 'Admin' ? 'est' : view;
  const [title, sub] = TITLES[current];
  return (
    <div className="app">
      <SceneDefs />
      <Sidebar view={current} onView={setView} alerts={alerts} shiftLabel="Turno abierto" employee={employee} onUser={() => setAskLogout(true)} />
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
        {current === 'est' && <Dashboard stations={stations} states={states} summary={null} now={now} onAction={onAction} />}
        {current === 'usr' && <UsersPage me={employee} onToast={toast} />}
        {(current === 'bit' || current === 'cor') && <p className="note">Disponible en un paso siguiente.</p>}
      </main>
      {askLogout && (
        <Modal title="Cerrar sesión" sub={`${employee.name} · ${ROLE_LABEL[employee.role]}`} onClose={closeLogout}>
          <p className="note" style={{ marginTop: 0 }}>Para cambiar de usuario, cierra tu sesión y entra con la otra cuenta.</p>
          <div className="acts">
            <button className="btn" onClick={closeLogout}>Volver</button>
            <button className="btn pri" onClick={() => void logout()}>Cerrar sesión</button>
          </div>
        </Modal>
      )}
      <Toasts items={toastItems} />
    </div>
  );
}
