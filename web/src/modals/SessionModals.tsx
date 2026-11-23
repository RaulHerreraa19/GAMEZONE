import { useState, type ReactNode } from 'react';
import type { EmployeeDto, PackageOption, ProductDto, PayMethod, SettingsDto, StationDto } from '@shared';
import { MAX_CUSTOM_MINUTES, METHOD_LABEL, PAY_METHODS, priceCents, stationState } from '@shared';
import { Chips, Modal } from '../components/Modal';
import { SnackPicker, cartItems, cartTotal, type Cart } from '../components/SnackPicker';
import { api } from '../lib/api';
import { players } from '../lib/labels';
import { money } from '../lib/money';
import { fmtCountdown, serverNow } from '../lib/time';

/** What a finished action hands back to the shell: the fresh station and a toast message. */
export type ActionDone = (station: StationDto, message: ReactNode, kind?: '' | 'warn' | 'lock') => void;

interface Props {
  products: ProductDto[];
  station: StationDto;
  settings: SettingsDto;
  employee: EmployeeDto;
  onDone: ActionDone;
  onClose: () => void;
}

/** Runs one API call from a modal button, with a busy flag and the server's error message. */
function useSubmit(onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (run: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await run();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return { busy, error, setError, submit };
}

type TimeChoice = PackageOption | 'custom';

const hoursText = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

/** Package chips plus an "Otro tiempo" chip with a minutes field. `minutes` is null while the custom value is invalid. */
function useTimePicker(options: PackageOption[], defaultMinutes: number, title: string) {
  const [choice, setChoice] = useState<TimeChoice>(options.find((o) => o.minutes === defaultMinutes) ?? options[0]!);
  const [custom, setCustom] = useState('');
  const typed = /^\d{1,3}$/.test(custom) ? Number(custom) : NaN;
  const customOk = typed >= 1 && typed <= MAX_CUSTOM_MINUTES;
  const minutes = choice === 'custom' ? (customOk ? typed : null) : choice.minutes;
  const picker = (
    <>
      <div className="lbl">{title}</div>
      <Chips options={[...options, 'custom' as const]} value={choice} label={(o) => (o === 'custom' ? 'Otro tiempo' : o.label)} onChange={setChoice} />
      {choice === 'custom' && (
        <>
          <div className="lbl"><label htmlFor="custom-min">Minutos (de 1 a {MAX_CUSTOM_MINUTES})</label></div>
          <input
            id="custom-min"
            className="full"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="Ej. 45"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 3))}
          />
          <p className="note" style={{ margin: '6px 0 0' }}>
            {customOk ? `Son ${hoursText(typed)}.` : custom ? `Escribe un número de 1 a ${MAX_CUSTOM_MINUTES}.` : 'Escribe cuántos minutos quiere el cliente.'}
          </p>
        </>
      )}
    </>
  );
  return { minutes, picker };
}

function Total({ cents, detail }: { cents: number; detail?: string }) {
  return (
    <>
      <div className="total">
        <span>Total a cobrar</span>
        <strong>{money(cents)}</strong>
      </div>
      {detail && <p className="total-lines">{detail}</p>}
    </>
  );
}

export function StartModal({ station, settings, products, onDone, onClose }: Props) {
  const [nPlayers, setPlayers] = useState(1);
  const time = useTimePicker(settings.packages, 60, 'Tiempo');
  const [method, setMethod] = useState<PayMethod>('Cash');
  const [cart, setCart] = useState<Cart>({});
  const { busy, error, submit } = useSubmit(onClose);
  const timeCents = time.minutes ? priceCents(settings.rateCentsPerPersonHour, nPlayers, time.minutes) : 0;
  const snackCents = cartTotal(products, cart);
  const total = timeCents + snackCents;

  const go = () =>
    submit(async () => {
      const snacks = cartItems(cart);
      const dto = await api<StationDto>(`/stations/${station.id}/sessions`, {
        body: { players: nPlayers, minutes: time.minutes, method, snacks: snacks.length ? snacks : undefined },
      });
      onDone(dto, <><b>{station.name}</b> activa · {money(total)} cobrados.</>);
    });

  return (
    <Modal title={`Iniciar · ${station.name}`} sub="Registra el cobro para activar la estación." onClose={onClose}>
      <div className="lbl">Jugadores</div>
      <Chips options={[1, 2]} value={nPlayers} label={(n) => players(n)} onChange={setPlayers} />
      {time.picker}
      {products.some((p) => p.active && p.stock > 0) && (
        <>
          <div className="lbl">Snacks y bebidas (opcional)</div>
          <SnackPicker products={products} cart={cart} onChange={setCart} />
        </>
      )}
      <div className="lbl">Forma de pago</div>
      <Chips options={PAY_METHODS} value={method} label={(m) => METHOD_LABEL[m]} onChange={setMethod} />
      <Total cents={total} detail={snackCents ? `Tiempo ${money(timeCents)} + snacks ${money(snackCents)}` : undefined} />
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={busy || !time.minutes} onClick={() => void go()}>Cobrar e iniciar</button>
      </div>
    </Modal>
  );
}

export function ExtendModal({ station, settings, onDone, onClose }: Props) {
  const s = station.session!;
  const locked = stationState(station, serverNow(), settings) === 'locked';
  const time = useTimePicker(settings.extensions, 30, 'Tiempo extra');
  const [method, setMethod] = useState<PayMethod>('Cash');
  const { busy, error, submit } = useSubmit(onClose);
  const total = time.minutes ? priceCents(settings.rateCentsPerPersonHour, s.players, time.minutes) : 0;

  const go = () =>
    submit(async () => {
      const dto = await api<StationDto>(`/sessions/${s.id}/extend`, { body: { minutes: time.minutes, method } });
      onDone(dto, <><b>{station.name}</b>: +{time.minutes} min{locked ? ', desbloqueada' : ''}.</>);
    });

  return (
    <Modal
      title={`Agregar tiempo · ${station.name}`}
      sub={`${players(s.players)} · ${locked ? 'estación bloqueada, se desbloquea al cobrar' : 'quedan ' + fmtCountdown(Date.parse(s.endUtc) - serverNow())}`}
      onClose={onClose}
    >
      {time.picker}
      <div className="lbl">Forma de pago</div>
      <Chips options={PAY_METHODS} value={method} label={(m) => METHOD_LABEL[m]} onChange={setMethod} />
      <Total cents={total} />
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={busy || !time.minutes} onClick={() => void go()}>Cobrar y extender</button>
      </div>
    </Modal>
  );
}

export function EndModal({ station, onDone, onClose }: Props) {
  const s = station.session!;
  const left = Date.parse(s.endUtc) - serverNow();
  const { busy, error, submit } = useSubmit(onClose);

  const go = () =>
    submit(async () => {
      const dto = await api<StationDto>(`/sessions/${s.id}/end`, { method: 'POST' });
      onDone(dto, <><b>{station.name}</b> finalizada y disponible.</>);
    });

  return (
    <Modal
      title={`Finalizar · ${station.name}`}
      sub={`${left > 0 ? `Quedan ${fmtCountdown(left)} sin usar. No genera reembolso.` : 'El tiempo ya terminó.'} La estación queda disponible.`}
      onClose={onClose}
    >
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Volver</button>
        <button className="btn pri" disabled={busy} onClick={() => void go()}>Finalizar sesión</button>
      </div>
    </Modal>
  );
}

export function CancelModal({ station, employee, onDone, onClose }: Props) {
  const s = station.session!;
  const [reason, setReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const needsAdmin = employee.role !== 'Admin';
  const { busy, error, setError, submit } = useSubmit(onClose);

  const go = () => {
    if (!reason.trim()) return setError('Escribe el motivo de la cancelación.');
    if (needsAdmin && !adminPassword) return setError('Escribe la contraseña de un administrador.');
    void submit(async () => {
      const dto = await api<StationDto>(`/sessions/${s.id}/cancel`, {
        body: { reason: reason.trim(), adminPassword: needsAdmin ? adminPassword : undefined },
      });
      onDone(dto, <><b>{station.name}</b> cancelada · {money(s.paidCents)} devueltos.</>);
    });
  };

  return (
    <Modal title={`Cancelar · ${station.name}`} sub={`Se devuelven ${money(s.paidCents)} del tiempo y queda registrado en la bitácora.${s.snackCents ? ` Los snacks (${money(s.snackCents)}) no se devuelven.` : ''}`} onClose={onClose}>
      <div className="lbl"><label htmlFor="why">Motivo (obligatorio)</label></div>
      <textarea id="why" rows={3} style={{ width: '100%' }} placeholder="Ej. el control no funcionó" value={reason} onChange={(e) => setReason(e.target.value)} />
      {needsAdmin && (
        <>
          <div className="lbl"><label htmlFor="apw">Contraseña de un administrador</label></div>
          <input id="apw" type="password" autoComplete="off" style={{ width: '100%' }} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
        </>
      )}
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Volver</button>
        <button className="btn danger" disabled={busy} onClick={go}>Cancelar y devolver</button>
      </div>
    </Modal>
  );
}

/** Adds snacks to a session in progress and charges them right away. */
export function SnackModal({ station, products, onDone, onClose }: Props) {
  const s = station.session!;
  const [cart, setCart] = useState<Cart>({});
  const [method, setMethod] = useState<PayMethod>('Cash');
  const { busy, error, submit } = useSubmit(onClose);
  const items = cartItems(cart);
  const total = cartTotal(products, cart);

  const go = () =>
    submit(async () => {
      const dto = await api<StationDto>(`/sessions/${s.id}/snacks`, { body: { method, items } });
      onDone(dto, <><b>{station.name}</b>: snacks agregados · {money(total)} cobrados.</>);
    });

  return (
    <Modal
      title={`Snacks · ${station.name}`}
      sub={`${players(s.players)} · se cobran ahora y no cambian el tiempo de juego.${s.snackCents ? ` Ya llevan ${money(s.snackCents)} en snacks.` : ''}`}
      onClose={onClose}
    >
      <div className="lbl">Productos</div>
      <SnackPicker products={products} cart={cart} onChange={setCart} />
      <div className="lbl">Forma de pago</div>
      <Chips options={PAY_METHODS} value={method} label={(m) => METHOD_LABEL[m]} onChange={setMethod} />
      <Total cents={total} />
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={busy || items.length === 0} onClick={() => void go()}>Cobrar y agregar</button>
      </div>
    </Modal>
  );
}
