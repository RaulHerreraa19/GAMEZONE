import { useState, type ReactNode } from 'react';
import type { ShiftCloseResponse, ShiftSummaryDto, SummaryRow } from '@shared';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';
import { money } from '../lib/money';
import { hhmm } from '../lib/time';

interface Props {
  summary: ShiftSummaryDto | null;
  activeSessions: number;
  onClosed: () => void;
  onToast: (msg: ReactNode) => void;
}

function Bars({ rows, fmt }: { rows: SummaryRow[]; fmt: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <>
      {rows.map((r) => (
        <div className="row" key={r.label}>
          <span>{r.label}</span>
          <div className="m">
            <i style={{ width: `${(Math.max(r.value, 0) / max) * 100}%` }} />
          </div>
          <span className={`v ${r.value < 0 ? 'neg' : ''}`}>{fmt(r.value)}</span>
        </div>
      ))}
    </>
  );
}

const hours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`;

export function CortePage({ summary, activeSessions, onClosed, onToast }: Props) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const s = summary;
  const open = s?.shiftId != null;

  const close = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api<ShiftCloseResponse>('/shift/close', { method: 'POST' });
      const msg = `Turno cerrado a las ${hhmm(r.closedUtc)} con ${money(r.totalCents)}. Registrado en la bitácora.`;
      setMessage(msg);
      onToast(msg);
      setAsking(false);
      onClosed();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <section className="view">
      <div className="cols">
        <div className="box">
          <h3>Total del turno</h3>
          <div className="big">{money(s?.totalCents ?? 0)}</div>
          <p className="note">
            {open
              ? `${s.sessionCount} sesiones · ${s.extensionCount} extensiones · ${s.cancelCount} cancelaciones · abrió ${s.openedBy} a las ${hhmm(s.openedUtc!)}`
              : 'Sin turno abierto: el siguiente cobro abre uno nuevo.'}
          </p>
        </div>
        <div className="box">
          <h3>Por forma de pago</h3>
          <Bars rows={s?.byMethod ?? []} fmt={money} />
        </div>
        <div className="box">
          <h3>Ingresos por tipo de consola</h3>
          <Bars rows={s?.byConsole ?? []} fmt={money} />
        </div>
      </div>
      <div className="box" style={{ marginBottom: 14 }}>
        <h3>Horas vendidas por estación</h3>
        <Bars rows={s?.minutesByStation ?? []} fmt={hours} />
      </div>
      <div className="tools">
        <button className="btn pri" style={{ flex: '0 0 auto' }} disabled={!open} onClick={() => setAsking(true)}>
          Cerrar turno
        </button>
        <span className="note" style={{ margin: 0 }}>{message}</span>
      </div>

      {asking && (
        <Modal
          title="Cerrar turno"
          sub={`Se registra el corte con ${money(s?.totalCents ?? 0)}.${activeSessions ? ` Hay ${activeSessions} sesión${activeSessions > 1 ? 'es' : ''} en curso: su cobro ya queda en este corte y siguen jugando.` : ''}`}
          onClose={() => setAsking(false)}
        >
          <div className="err" role="alert">{error}</div>
          <div className="acts">
            <button className="btn" onClick={() => setAsking(false)}>Volver</button>
            <button className="btn pri" disabled={busy} onClick={() => void close()}>Cerrar turno</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
