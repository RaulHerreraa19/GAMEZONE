import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { ConsoleType, StationDto } from '@shared';
import { CONSOLE_LABEL, CONSOLE_TYPES } from '@shared';
import { Chips, Modal } from '../components/Modal';
import { api } from '../lib/api';
import { TYPE_CLASS } from '../lib/labels';
import { socket } from '../lib/socket';

type Change = { key: 'out' | 'in' | 'off' | 'on'; station: StationDto };
type Dialog = { kind: 'new' } | { kind: 'edit'; station: StationDto } | { kind: 'change'; change: Change };

const COPY: Record<Change['key'], { title: string; sub: string; button: string; danger: boolean; body: object }> = {
  out: { title: 'Fuera de servicio', sub: 'Seguirá visible en el panel, pero no se podrá iniciar sesión en ella hasta que la regreses a servicio.', button: 'Marcar fuera de servicio', danger: true, body: { outOfService: true } },
  in: { title: 'Volver a servicio', sub: 'Quedará disponible para iniciar sesiones.', button: 'Volver a servicio', danger: false, body: { outOfService: false } },
  off: { title: 'Desactivar', sub: 'Desaparece del panel y de las pantallas. Su historial se conserva y la puedes activar de nuevo cuando quieras.', button: 'Desactivar estación', danger: true, body: { active: false } },
  on: { title: 'Activar', sub: 'Vuelve a aparecer en el panel.', button: 'Activar estación', danger: false, body: { active: true } },
};

export function StationsAdminPage({ onToast }: { onToast: (msg: ReactNode) => void }) {
  const [stations, setStations] = useState<StationDto[]>([]);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const load = useCallback(async () => {
    try {
      setStations(await api<StationDto[]>('/stations/manage'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const reload = () => void load();
    socket.on('StationsChanged', reload);
    socket.on('StationUpdated', reload); // a session starting or ending changes what can be switched off
    return () => {
      socket.off('StationsChanged', reload);
      socket.off('StationUpdated', reload);
    };
  }, [load]);

  const close = useCallback(() => setDialog(null), []);
  const done = (msg: ReactNode) => {
    setDialog(null);
    onToast(msg);
    void load();
  };

  const pill = (s: StationDto) => {
    if (!s.active) return <span className="pill off">Desactivada</span>;
    if (s.outOfService) return <span className="pill warn">Fuera de servicio</span>;
    return <span className="pill on">{s.session ? 'En uso' : 'En servicio'}</span>;
  };

  return (
    <section className="view">
      <div className="tools">
        <button className="btn pri" style={{ flex: '0 0 auto' }} onClick={() => setDialog({ kind: 'new' })}>
          Nueva estación
        </button>
        <span className="note" style={{ margin: 0 }}>
          Solo el administrador agrega o quita estaciones. Una estación con sesión en curso no se puede apagar.
        </span>
      </div>
      {error && <p className="err">{error}</p>}
      <div className="scroll">
        <table className="stack">
          <thead>
            <tr>
              <th>Estación</th>
              <th>Consola</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.id} className={s.active ? '' : 'inactive'}>
                <td data-l="Estación">{s.name}</td>
                <td data-l="Consola">
                  <span className={`tag t-${TYPE_CLASS[s.consoleType]}`}>{CONSOLE_LABEL[s.consoleType]}</span>
                </td>
                <td data-l="Estado">{pill(s)}</td>
                <td data-l="Acciones">
                  <div className="row-acts">
                    <button className="btn" onClick={() => setDialog({ kind: 'edit', station: s })}>Editar</button>
                    {s.active && (
                      <button className="btn" onClick={() => setDialog({ kind: 'change', change: { key: s.outOfService ? 'in' : 'out', station: s } })}>
                        {s.outOfService ? 'Volver a servicio' : 'Fuera de servicio'}
                      </button>
                    )}
                    <button className="btn ghost" onClick={() => setDialog({ kind: 'change', change: { key: s.active ? 'off' : 'on', station: s } })}>
                      {s.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'new' && <StationFormModal onClose={close} onDone={done} />}
      {dialog?.kind === 'edit' && <StationFormModal station={dialog.station} onClose={close} onDone={done} />}
      {dialog?.kind === 'change' && <ChangeModal change={dialog.change} onClose={close} onDone={done} />}
    </section>
  );
}

function StationFormModal({ station, onClose, onDone }: { station?: StationDto; onClose: () => void; onDone: (msg: ReactNode) => void }) {
  const [name, setName] = useState(station?.name ?? '');
  const [type, setType] = useState<ConsoleType>(station?.consoleType ?? 'Xbox');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inUse = !!station?.session;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (station) {
        const body = { name: name !== station.name ? name : undefined, consoleType: type !== station.consoleType ? type : undefined };
        const st = await api<StationDto>(`/stations/${station.id}`, { method: 'PATCH', body });
        onDone(<>Estación <b>{st.name}</b> actualizada.</>);
      } else {
        const st = await api<StationDto>('/stations', { body: { name, consoleType: type } });
        onDone(<>Estación <b>{st.name}</b> agregada.</>);
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={station ? `Editar · ${station.name}` : 'Nueva estación'}
      sub={station ? 'Cambia el nombre o la consola que hay en esta estación.' : 'Aparece al instante en el panel de todos los dispositivos.'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label className="lbl" htmlFor="sf-name">Nombre</label>
        <input id="sf-name" className="full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Xbox 4" />
        <div className="lbl">Tipo de consola</div>
        {inUse ? (
          <p className="note" style={{ margin: 0 }}>Hay una sesión en curso: la consola ({CONSOLE_LABEL[station.consoleType]}) se podrá cambiar cuando termine.</p>
        ) : (
          <Chips options={CONSOLE_TYPES} value={type} label={(t) => CONSOLE_LABEL[t]} onChange={setType} />
        )}
        {station && !inUse && type !== station.consoleType && (
          <p className="note">Los ingresos del turno por tipo de consola se calculan con la consola actual de la estación.</p>
        )}
        <div className="err" role="alert">{error}</div>
        <div className="acts">
          <button type="button" className="btn" onClick={onClose}>Volver</button>
          <button type="submit" className="btn pri" disabled={busy}>{station ? 'Guardar cambios' : 'Agregar estación'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ChangeModal({ change, onClose, onDone }: { change: Change; onClose: () => void; onDone: (msg: ReactNode) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const c = COPY[change.key];
  const { station } = change;

  const go = async () => {
    setBusy(true);
    try {
      await api(`/stations/${station.id}`, { method: 'PATCH', body: c.body });
      onDone(<><b>{station.name}</b>: {c.title.toLowerCase()}.</>);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`${c.title} · ${station.name}`} sub={c.sub} onClose={onClose}>
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Volver</button>
        <button className={`btn ${c.danger ? 'danger' : 'pri'}`} disabled={busy} onClick={() => void go()}>{c.button}</button>
      </div>
    </Modal>
  );
}
