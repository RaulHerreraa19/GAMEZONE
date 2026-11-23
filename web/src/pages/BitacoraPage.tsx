import { useEffect, useRef, useState } from 'react';
import type { AuditDto } from '@shared';
import { api } from '../lib/api';
import { money } from '../lib/money';
import { socket } from '../lib/socket';
import { stamp } from '../lib/time';

const MAX_ROWS = 300;

const matches = (e: AuditDto, q: string) =>
  !q || [e.employeeName, e.stationName ?? '', e.action, e.detail].join(' ').toLowerCase().includes(q.toLowerCase());

/** Audit trail: searched on the server, with new entries pushed live over Socket.IO. */
export function BitacoraPage({ now }: { now: number }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AuditDto[]>([]);
  const [error, setError] = useState('');
  const query = useRef(q);
  query.current = q;
  const seq = useRef(0);

  // Debounced fetch; a counter drops answers that arrive after a newer search started.
  useEffect(() => {
    const t = setTimeout(async () => {
      const mine = ++seq.current;
      try {
        const data = await api<AuditDto[]>(`/audit?q=${encodeURIComponent(q.trim())}`);
        if (mine === seq.current) {
          setRows(data);
          setError('');
        }
      } catch (e) {
        if (mine === seq.current) setError((e as Error).message);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onNew = (e: AuditDto) => {
      if (!matches(e, query.current)) return;
      setRows((list) => (list.some((r) => r.id === e.id) ? list : [e, ...list].slice(0, MAX_ROWS)));
    };
    socket.on('AuditAppended', onNew);
    return () => void socket.off('AuditAppended', onNew);
  }, []);

  return (
    <section className="view">
      <div className="tools">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estación, empleado o acción" aria-label="Buscar en bitácora" style={{ flex: '1 1 260px' }} />
      </div>
      {error && <p className="err">{error}</p>}
      <div className="scroll">
        <table className="stack">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Empleado</th>
              <th>Estación</th>
              <th>Acción</th>
              <th>Detalle</th>
              <th className="n">Importe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-l="Hora">{stamp(r.createdUtc, now)}</td>
                <td data-l="Empleado">{r.employeeName}</td>
                <td data-l="Estación">{r.stationName ?? '—'}</td>
                <td data-l="Acción">{r.action}</td>
                <td data-l="Detalle">{r.detail}</td>
                <td className={`n ${r.amountCents < 0 ? 'amt-neg' : ''}`} data-l="Importe">
                  {r.amountCents ? money(r.amountCents) : ''}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>Sin resultados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="note">Se muestran los últimos {MAX_ROWS} movimientos. La bitácora solo se escribe; nunca se edita ni se borra.</p>
    </section>
  );
}
