import { Modal } from './Modal';
import { IcReceipt } from './icons';
import { money } from '../lib/money';
import type { TicketData } from '../lib/tickets';

/** Receipt preview. "Imprimir" prints only the ticket (see @media print in styles.css). */
export function TicketModal({ ticket, onClose }: { ticket: TicketData; onClose: () => void }) {
  return (
    <Modal title="Ticket" sub="Revisa el resumen y mándalo a imprimir o guárdalo como PDF." onClose={onClose}>
      <article className="ticket" aria-label={ticket.title}>
        <header>
          <b>GAME ZONE</b>
          <small>Videojuegos • Snacks</small>
        </header>
        <h4>{ticket.title}</h4>
        <dl>
          {ticket.meta.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {ticket.sections.map((s, i) => (
          <section key={s.heading ?? i}>
            {s.heading && <h5>{s.heading}</h5>}
            {s.lines.map((l) => (
              <div className="tl" key={`${l.name}|${l.unitPriceCents}`}>
                <span>
                  {l.quantity} × {l.name}
                  {l.quantity > 1 && <small> ({money(l.unitPriceCents)} c/u)</small>}
                </span>
                <span>{money(l.totalCents)}</span>
              </div>
            ))}
            {s.heading && (
              <div className="tl sub">
                <span>Subtotal</span>
                <span>{money(s.subtotalCents)}</span>
              </div>
            )}
          </section>
        ))}
        {ticket.byMethod && ticket.byMethod.length > 0 && (
          <section>
            <h5>Por forma de pago</h5>
            {ticket.byMethod.map(([label, cents]) => (
              <div className="tl" key={label}>
                <span>{label}</span>
                <span>{money(cents)}</span>
              </div>
            ))}
          </section>
        )}
        <div className="tl tot">
          <span>TOTAL</span>
          <span>{money(ticket.totalCents)}</span>
        </div>
        <footer>¡Gracias por tu visita!</footer>
      </article>
      <div className="acts">
        <button className="btn" onClick={onClose}>Cerrar</button>
        <button className="btn pri" onClick={() => window.print()}>
          <IcReceipt />
          Imprimir
        </button>
      </div>
    </Modal>
  );
}
