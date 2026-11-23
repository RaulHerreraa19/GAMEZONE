import type { CSSProperties } from 'react';
import type { ShiftSummaryDto, StationDto, StationState } from '@shared';
import { MINUTE_MS } from '@shared';
import { money } from '../lib/money';
import { fmtCountdown } from '../lib/time';
import { IcCash, IcClock, IcLock, IcPad } from './icons';

const COL: Record<StationState, string> = { free: '#343a45', out: '#20242b', playing: 'var(--play)', warning: 'var(--warn)', locked: 'var(--lock)' };

interface Props {
  stations: StationDto[];
  states: StationState[];
  summary: ShiftSummaryDto | null;
  now: number;
}

function sparkLine(summary: ShiftSummaryDto | null, now: number): string {
  const ps = summary ? [...summary.payments].sort((a, b) => Date.parse(a.createdUtc) - Date.parse(b.createdUtc)) : [];
  const total = summary?.totalCents ?? 0;
  const t0 = ps[0] ? Date.parse(ps[0].createdUtc) - 10 * MINUTE_MS : now - 60 * MINUTE_MS;
  const span = Math.max(now - t0, 1);
  const mx = Math.max(total, 1);
  let acc = 0;
  const pts: [number, number][] = [[0, 42]];
  for (const p of ps) {
    const x = ((Date.parse(p.createdUtc) - t0) / span) * 200;
    pts.push([x, 42 - (acc / mx) * 36]);
    acc += p.amountCents;
    pts.push([x, 42 - (acc / mx) * 36]);
  }
  pts.push([200, 42 - (acc / mx) * 36]);
  return pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
}

function arc(i: number, n: number) {
  const step = 360 / n;
  const a1 = ((-90 + i * step + 3) * Math.PI) / 180;
  const a2 = ((-90 + (i + 1) * step - 3) * Math.PI) / 180;
  const r = 38;
  return `M${46 + r * Math.cos(a1)} ${46 + r * Math.sin(a1)}A${r} ${r} 0 0 1 ${46 + r * Math.cos(a2)} ${46 + r * Math.sin(a2)}`;
}

export function Kpis({ stations, states, summary, now }: Props) {
  const inService = states.filter((k) => k !== 'out').length;
  const busy = states.filter((k) => k !== 'free' && k !== 'out').length;
  const count = (k: StationState) => states.filter((x) => x === k).length;
  const warn = stations.filter((_, i) => states[i] === 'warning');
  const lock = stations.filter((_, i) => states[i] === 'locked');
  const line = sparkLine(summary, now);

  return (
    <div className="kpis">
      <article className="kpi" style={{ '--k': 'var(--play)' } as CSSProperties}>
        <div className="kh"><span className="ic"><IcCash /></span><span className="lab">Ingresos del turno</span></div>
        <div className="val">{money(summary?.totalCents ?? 0)}</div>
        <div className="hint"><b>+{money(summary?.lastHourCents ?? 0)}</b> en la última hora · {summary?.chargeCount ?? 0} cobros</div>
        <svg className="spark" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={`${line} 200,44 0,44`} fill="currentColor" opacity=".14" />
          <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </article>
      <article className="kpi" style={{ '--k': 'var(--ps)' } as CSSProperties}>
        <div className="kh"><span className="ic"><IcPad /></span><span className="lab">Ocupación</span></div>
        <div className="occ">
          <svg className="ring" viewBox="0 0 92 92" role="img" aria-label={`${busy} de ${inService} estaciones ocupadas`}>
            {states.map((k, i) => <path key={i} d={arc(i, states.length)} fill="none" stroke={COL[k]} strokeWidth="9" strokeLinecap="round" />)}
            <text x="46" y="50" textAnchor="middle" fontFamily="Chakra Petch,sans-serif" fontWeight="700" fontSize="22" fill="var(--ink)">{busy}/{inService}</text>
            <text x="46" y="64" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="10" fill="var(--mute)">ocupadas</text>
          </svg>
          <div className="legend">
            {([['En juego', 'playing'], ['Por terminar', 'warning'], ['Bloqueadas', 'locked'], ['Libres', 'free'], ['Fuera de servicio', 'out']] as const).filter(([, k]) => k !== 'out' || count(k) > 0).map(([l, k]) => (
              <span key={k}><i style={{ background: COL[k] }} />{l}<b>{count(k)}</b></span>
            ))}
          </div>
        </div>
      </article>
      <article className={`kpi ${warn.length ? 'on' : ''}`} style={{ '--k': 'var(--warn)' } as CSSProperties}>
        <div className="kh"><span className="ic"><IcClock /></span><span className="lab">Por terminar</span><i className="live" /></div>
        <div className="val">{warn.length}</div>
        <div className="kchips">
          {warn.length ? warn.map((s) => <span key={s.id}>{s.name} · {fmtCountdown(Date.parse(s.session!.endUtc) - now)}</span>) : <em>Ninguna por ahora</em>}
        </div>
      </article>
      <article className={`kpi ${lock.length ? 'on' : ''}`} style={{ '--k': 'var(--lock)' } as CSSProperties}>
        <div className="kh"><span className="ic"><IcLock /></span><span className="lab">Bloqueadas</span><i className="live" /></div>
        <div className="val">{lock.length}</div>
        <div className="kchips">
          {lock.length ? lock.map((s) => <span key={s.id}>{s.name} · esperando cobro</span>) : <em>Todo en orden</em>}
        </div>
      </article>
    </div>
  );
}
