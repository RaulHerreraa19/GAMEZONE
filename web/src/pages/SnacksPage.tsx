import { useMemo, useState, type ReactNode } from 'react';
import type { PayMethod, ProductDto, ShiftSummaryDto, SnackSaleDto } from '@shared';
import { METHOD_LABEL, PAY_METHODS } from '@shared';
import { Chips } from '../components/Modal';
import { SnackPicker, cartItems, cartTotal, type Cart } from '../components/SnackPicker';
import { TicketModal } from '../components/TicketModal';
import { IcReceipt } from '../components/icons';
import { useSnackSales } from '../hooks/useSnackSales';
import { api } from '../lib/api';
import { money } from '../lib/money';
import { groupByOrigin, originOf, originTicket, saleTicket, shiftTicket, type TicketData } from '../lib/tickets';
import { hhmm } from '../lib/time';

interface Props {
  products: ProductDto[];
  summary: ShiftSummaryDto | null;
  now: number;
  onChanged: () => void;
  onToast: (msg: ReactNode) => void;
}

const itemsText = (s: SnackSaleDto) => s.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ');

export function SnacksPage({ products, summary, now, onChanged, onToast }: Props) {
  const { sales, reload } = useSnackSales();
  const [cart, setCart] = useState<Cart>({});
  const [method, setMethod] = useState<PayMethod>('Cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [last, setLast] = useState<SnackSaleDto | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const groups = useMemo(() => groupByOrigin(sales), [sales]);
  const since = summary?.openedUtc ?? null;
  const items = cartItems(cart);
  const total = cartTotal(products, cart);
  const soldCents = sales.reduce((a, s) => a + s.totalCents, 0);

  const charge = async () => {
    setBusy(true);
    setError('');
    try {
      const sale = await api<SnackSaleDto>('/sales', { body: { method, items } });
      setLast(sale);
      setCart({});
      onToast(<>Venta de mostrador · {money(sale.totalCents)} cobrados.</>);
      onChanged();
      void reload();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <section className="view">
      <div className="inv-stats snk-stats">
        <div className="inv-stat">
          <div>
            <b>{money(soldCents)}</b>
            <small>Vendido en snacks este turno</small>
          </div>
        </div>
        <div className="inv-stat">
          <div>
            <b>{sales.length}</b>
            <small>Ventas · {groups.length} {groups.length === 1 ? 'origen' : 'orígenes'}</small>
          </div>
        </div>
        <button className="btn pri inv-new" disabled={!sales.length} onClick={() => setTicket(shiftTicket(groups, since, now))}>
          <IcReceipt />
          Generar ticket del turno
        </button>
      </div>

      <div className="cols snk-cols">
        <div className="box">
          <h3>Venta de mostrador</h3>
          <p className="note" style={{ margin: '0 0 10px' }}>Para clientes que solo compran snacks o bebidas, sin jugar. Se descuenta del inventario.</p>
          <SnackPicker products={products} cart={cart} onChange={setCart} />
          <div className="lbl">Forma de pago</div>
          <Chips options={PAY_METHODS} value={method} label={(m) => METHOD_LABEL[m]} onChange={setMethod} />
          <div className="total">
            <span>Total a cobrar</span>
            <strong>{money(total)}</strong>
          </div>
          <div className="err" role="alert">{error}</div>
          <div className="acts">
            <button className="btn pri" disabled={busy || items.length === 0} onClick={() => void charge()}>Cobrar venta</button>
          </div>
          {last && (
            <div className="last-sale">
              <span>
                Venta #{last.id} cobrada · <b>{money(last.totalCents)}</b>
              </span>
              <button className="btn" onClick={() => setTicket(saleTicket(last))}>
                <IcReceipt />
                Generar ticket
              </button>
            </div>
          )}
        </div>

        <div className="box">
          <h3>Ventas por sala</h3>
          {groups.length === 0 && <p className="note" style={{ margin: 0 }}>Aún no hay ventas de snacks en este turno.</p>}
          <div className="groups">
            {groups.map((g) => (
              <div className="group" key={g.origin}>
                <div className="group-head">
                  <div>
                    <b>{g.origin}</b>
                    <small>{g.sales.length} venta{g.sales.length > 1 ? 's' : ''}</small>
                  </div>
                  <strong>{money(g.totalCents)}</strong>
                </div>
                <div className="group-acts">
                  <button className="btn" onClick={() => setTicket(originTicket(g, since, now))}>
                    <IcReceipt />
                    Generar ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20 }}>Ventas individuales</h2>
      <div className="scroll">
        <table className="stack">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Hora</th>
              <th>Origen</th>
              <th>Productos</th>
              <th>Pago</th>
              <th>Atendió</th>
              <th className="n">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td data-l="Folio">#{s.id}</td>
                <td data-l="Hora">{hhmm(s.createdUtc)}</td>
                <td data-l="Origen">{originOf(s)}</td>
                <td data-l="Productos">{itemsText(s)}</td>
                <td data-l="Pago">{METHOD_LABEL[s.method]}</td>
                <td data-l="Atendió">{s.employeeName}</td>
                <td data-l="Total" className="n">{money(s.totalCents)}</td>
                <td>
                  <button className="btn" aria-label={`Generar ticket de la venta ${s.id}`} onClick={() => setTicket(saleTicket(s))}>
                    <IcReceipt />
                    Ticket
                  </button>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: 'var(--mute)' }}>Sin ventas todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ticket && <TicketModal ticket={ticket} onClose={() => setTicket(null)} />}
    </section>
  );
}
