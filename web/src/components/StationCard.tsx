import type { StationDto, StationState } from '@shared';
import { CONSOLE_LABEL } from '@shared';
import { money } from '../lib/money';
import { TYPE_CLASS, STATE_LABEL, players, shortName } from '../lib/labels';
import { fmtCountdown, hhmm } from '../lib/time';
import { StationScene } from './StationScene';

export type CardAction = 'start' | 'extend' | 'snacks' | 'end' | 'cancel' | 'tv';

interface Props {
  station: StationDto;
  state: StationState;
  now: number;
  onAction: (action: CardAction, station: StationDto) => void;
}

export function StationCard({ station: st, state, now, onAction }: Props) {
  const s = st.session;
  const tc = TYPE_CLASS[st.consoleType];
  const end = s ? Date.parse(s.endUtc) : 0;
  const start = s ? Date.parse(s.startUtc) : 0;
  const rem = s ? end - now : 0;
  const pct = s ? Math.max(0, Math.min(100, (rem / Math.max(end - start, 1)) * 100)) : 0;
  const n = s?.players ?? 0;

  return (
    <article className={`card ${state} ct-${tc} pl${n}`}>
      <StationScene type={st.consoleType} state={state} players={n} name={st.name} />
      <div className="body">
        <div className="chead">
          <div className="name">
            <span className={`tag t-${tc}`}>{CONSOLE_LABEL[st.consoleType]}</span>
            {shortName(st.name)}
          </div>
          <span className="st">{STATE_LABEL[state]}</span>
        </div>
        <div className="time">{state === 'out' ? 'Fuera de servicio' : state === 'free' ? 'Libre' : state === 'locked' ? '00:00' : fmtCountdown(rem)}</div>
        <div className="bar">
          <i style={{ width: pct + '%' }} />
        </div>
        <div className="meta">
          {s ? (
            <>
              <b>{players(s.players)}</b> · {s.paidMinutes} min pagados
              <br />
              Termina {hhmm(s.endUtc)} · {s.employeeName}
              {s.snackCents > 0 && <> · Snacks {money(s.snackCents)}</>}
            </>
          ) : (
            <>{state === 'out' ? 'No disponible por ahora' : <>{CONSOLE_LABEL[st.consoleType]} · lista para jugar</>}</>
          )}
        </div>
        <div className="acts">
          {state === 'out' ? null : state === 'free' ? (
            <button className="btn pri" onClick={() => onAction('start', st)}>
              Iniciar
            </button>
          ) : (
            <>
              <button className={`btn ${state === 'locked' ? 'pri' : ''}`} onClick={() => onAction('extend', st)}>
                {state === 'locked' ? 'Extender' : '+ Tiempo'}
              </button>
              <button className="btn" onClick={() => onAction('snacks', st)}>
                Snacks
              </button>
              <button className="btn" onClick={() => onAction('end', st)}>
                Finalizar
              </button>
              <button className="btn ghost" onClick={() => onAction('cancel', st)}>
                Cancelar
              </button>
            </>
          )}
          <button className="btn ghost" onClick={() => onAction('tv', st)} aria-label={`Ver televisión de ${st.name}`}>
            TV
          </button>
        </div>
      </div>
    </article>
  );
}
