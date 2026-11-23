import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EmployeeDto, StationDto } from '@shared';
import { ROLE_LABEL, stationState } from '@shared';
import { Modal } from './components/Modal';
import { SceneDefs } from './components/SceneDefs';
import { Sidebar, type View } from './components/Sidebar';
import type { CardAction } from './components/StationCard';
import { Toasts, useToasts } from './components/Toasts';
import { useAuth } from './hooks/useAuth';
import { useNow } from './hooks/useNow';
import { useProducts } from './hooks/useProducts';
import { useStations } from './hooks/useStations';
import { useSummary } from './hooks/useSummary';
import { beep } from './lib/beep';
import { money } from './lib/money';
import { socket } from './lib/socket';
import { dateLong, hhmmss } from './lib/time';
import { CancelModal, EndModal, ExtendModal, SnackModal, StartModal } from './modals/SessionModals';
import { Dashboard } from './pages/Dashboard';
import { BitacoraPage } from './pages/BitacoraPage';
import { CortePage } from './pages/CortePage';
import { InventoryPage } from './pages/InventoryPage';
import { Login } from './pages/Login';
import { SnacksPage } from './pages/SnacksPage';
import { StationsAdminPage } from './pages/StationsAdminPage';
import { UsersPage } from './pages/UsersPage';

const TITLES: Record<View, [string, string]> = {
  est: ['Estaciones', '8 salas · tarifa $50 por persona por hora'],
  sna: ['Snacks', 'Venta de mostrador, ventas por sala y tickets'],
  bit: ['Bitácora', 'Cada movimiento con hora y empleado responsable'],
  cor: ['Corte de caja', 'Resumen del turno en curso'],
  inv: ['Inventario', 'Snacks y bebidas: precios y existencias'],
  sal: ['Salas', 'Agrega, apaga o desactiva estaciones de trabajo'],
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
  const { stations, settings, error, applyStation } = useStations();
  const { summary, reload: reloadSummary } = useSummary();
  const { products, reload: reloadProducts } = useProducts();
  const [modal, setModal] = useState<{ action: Exclude<CardAction, 'tv'>; stationId: number } | null>(null);
  const { items: toastItems, toast } = useToasts();
  const now = useNow();

  const states = useMemo(
    () => stations.map((s) => (settings ? stationState(s, now, settings) : 'free')),
    [stations, settings, now],
  );
  const alerts = states.filter((k) => k === 'warning' || k === 'locked').length;

  const onAction = (action: CardAction, st: StationDto) => {
    if (action === 'tv') window.open(`/estacion/${st.id}`, `tv-${st.id}`);
    else setModal({ action, stationId: st.id });
  };
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  useEffect(() => {
    const name = (id: number) => stationsRef.current.find((s) => s.id === id)?.name ?? 'Estación';
    const onWarning = ({ stationId, minutesLeft }: { stationId: number; minutesLeft: number }) => {
      toast(<><b>{name(stationId)}</b>: quedan {minutesLeft} min. Avisa al cliente.</>, 'warn');
      beep(880);
    };
    const onLocked = ({ stationId }: { stationId: number }) => {
      toast(<><b>{name(stationId)}</b> bloqueada: el tiempo terminó.</>, 'lock');
      beep(440);
    };
    const onShift = () => void reloadSummary();
    socket.on('SessionWarning', onWarning);
    socket.on('SessionLocked', onLocked);
    socket.on('ShiftChanged', onShift);
    socket.on('connect', onShift);
    return () => {
      socket.off('SessionWarning', onWarning);
      socket.off('SessionLocked', onLocked);
      socket.off('ShiftChanged', onShift);
      socket.off('connect', onShift);
    };
  }, [toast, reloadSummary]);
  const closeLogout = useCallback(() => setAskLogout(false), []);
  const closeModal = useCallback(() => setModal(null), []);
  const onDone = (dto: StationDto, message: ReactNode, kind: '' | 'warn' | 'lock' = '') => {
    applyStation(dto);
    void reloadSummary();
    void reloadProducts();
    toast(message, kind);
  };
  const modalStation = modal ? stations.find((s) => s.id === modal.stationId) : undefined;

  const adminOnly = view === 'usr' || view === 'sal' || view === 'inv';
  const current = adminOnly && employee.role !== 'Admin' ? 'est' : view;
  const [title, subtitle] = TITLES[current];
  const sub = current === 'est' ? `${stations.length} salas · tarifa ${money(settings?.rateCentsPerPersonHour ?? 5000)} por persona por hora` : subtitle;
  return (
    <div className="app">
      <SceneDefs />
      <Sidebar view={current} onView={setView} alerts={alerts} shiftLabel={summary?.shiftId ? 'Turno abierto' : 'Sin turno abierto'} employee={employee} onUser={() => setAskLogout(true)} />
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
        {current === 'est' && <Dashboard stations={stations} states={states} summary={summary} now={now} onAction={onAction} />}
        {current === 'sna' && <SnacksPage products={products} summary={summary} now={now} onChanged={() => { void reloadSummary(); void reloadProducts(); }} onToast={toast} />}
        {current === 'usr' && <UsersPage me={employee} onToast={toast} />}
        {current === 'bit' && <BitacoraPage now={now} />}
        {current === 'cor' && (
          <CortePage summary={summary} activeSessions={stations.filter((s) => s.session).length} onClosed={() => void reloadSummary()} onToast={toast} />
        )}
        {current === 'inv' && <InventoryPage products={products} onChanged={() => void reloadProducts()} onToast={toast} />}
        {current === 'sal' &&<StationsAdminPage onToast={toast} />}
      </main>
      {modal && modalStation && settings && (modal.action === 'start' || modalStation.session) && (
        <>
          {modal.action === 'start' && <StartModal station={modalStation} settings={settings} products={products} employee={employee} onDone={onDone} onClose={closeModal} />}
          {modal.action === 'extend' && <ExtendModal station={modalStation} settings={settings} products={products} employee={employee} onDone={onDone} onClose={closeModal} />}
          {modal.action === 'snacks' && <SnackModal station={modalStation} settings={settings} products={products} employee={employee} onDone={onDone} onClose={closeModal} />}
          {modal.action === 'end' &&<EndModal station={modalStation} settings={settings} products={products} employee={employee} onDone={onDone} onClose={closeModal} />}
          {modal.action === 'cancel' && <CancelModal station={modalStation} settings={settings} products={products} employee={employee} onDone={onDone} onClose={closeModal} />}
        </>
      )}
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
