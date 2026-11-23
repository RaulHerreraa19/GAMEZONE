import type { PayMethod, SnackSaleDto } from '@shared';
import { METHOD_LABEL, PAY_METHODS } from '@shared';
import { dateTime } from './time';

export const COUNTER = 'Mostrador';
export const originOf = (s: SnackSaleDto) => s.stationName ?? COUNTER;

export interface TicketLine {
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}
export interface TicketSection {
  heading?: string;
  lines: TicketLine[];
  subtotalCents: number;
}
export interface TicketData {
  title: string;
  meta: [label: string, value: string][];
  sections: TicketSection[];
  /** Totals by payment method; only on summary tickets. */
  byMethod?: [label: string, cents: number][];
  totalCents: number;
}

export interface OriginGroup {
  origin: string;
  sales: SnackSaleDto[];
  totalCents: number;
}

const sum = (sales: SnackSaleDto[]) => sales.reduce((a, s) => a + s.totalCents, 0);

/** Counter first, then each room by name; every group holds that origin's sales. */
export function groupByOrigin(sales: SnackSaleDto[]): OriginGroup[] {
  const map = new Map<string, SnackSaleDto[]>();
  for (const s of sales) map.set(originOf(s), [...(map.get(originOf(s)) ?? []), s]);
  return [...map]
    .map(([origin, list]) => ({ origin, sales: list, totalCents: sum(list) }))
    .sort((a, b) => (a.origin === COUNTER ? -1 : b.origin === COUNTER ? 1 : a.origin.localeCompare(b.origin, 'es', { numeric: true })));
}

/** Same product and price collapse into one line. */
function section(sales: SnackSaleDto[], heading?: string): TicketSection {
  const lines = new Map<string, TicketLine>();
  for (const l of sales.flatMap((s) => s.lines)) {
    const key = `${l.name}|${l.unitPriceCents}`;
    const quantity = (lines.get(key)?.quantity ?? 0) + l.quantity;
    lines.set(key, { name: l.name, quantity, unitPriceCents: l.unitPriceCents, totalCents: quantity * l.unitPriceCents });
  }
  return { heading, lines: [...lines.values()], subtotalCents: sum(sales) };
}

const methodTotals = (sales: SnackSaleDto[]): [string, number][] =>
  PAY_METHODS.map((m: PayMethod): [string, number] => [METHOD_LABEL[m], sum(sales.filter((s) => s.method === m))]).filter(([, c]) => c !== 0);

const sinceMeta = (sinceUtc: string | null): [string, string][] => (sinceUtc ? [['Turno desde', dateTime(sinceUtc)]] : []);

/** One charge: what a customer takes with them. */
export function saleTicket(s: SnackSaleDto): TicketData {
  return {
    title: `Ticket #${String(s.id).padStart(5, '0')}`,
    meta: [
      ['Fecha', dateTime(s.createdUtc)],
      ['Origen', originOf(s)],
      ['Pago', METHOD_LABEL[s.method]],
      ['Atendió', s.employeeName],
    ],
    sections: [section([s])],
    totalCents: s.totalCents,
  };
}

/** Everything sold to one room (or the counter) in the current shift. */
export function originTicket(g: OriginGroup, sinceUtc: string | null, nowMs: number): TicketData {
  return {
    title: `Resumen de snacks · ${g.origin}`,
    meta: [['Generado', dateTime(nowMs)], ...sinceMeta(sinceUtc), ['Ventas', String(g.sales.length)]],
    sections: [section(g.sales)],
    byMethod: methodTotals(g.sales),
    totalCents: g.totalCents,
  };
}

/** The whole shift, one section per room. */
export function shiftTicket(groups: OriginGroup[], sinceUtc: string | null, nowMs: number): TicketData {
  const all = groups.flatMap((g) => g.sales);
  return {
    title: 'Resumen de snacks del turno',
    meta: [['Generado', dateTime(nowMs)], ...sinceMeta(sinceUtc), ['Ventas', String(all.length)]],
    sections: groups.map((g) => section(g.sales, g.origin)),
    byMethod: methodTotals(all),
    totalCents: sum(all),
  };
}
