import { prisma, type Tx } from '../db.js';
import type { AuthEmployee } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { appendAudit } from './audit.js';
import { CONSOLE_LABEL, CONSOLE_TYPES, METHOD_LABEL, MINUTE_MS, PAY_METHODS, type AuditDto, type ShiftCloseResponse, type ShiftSummaryDto } from '../types.js';

/** The open shift (closedUtc null), or a new one opened by this employee. */
export async function getOrOpenShift(db: Tx, employeeId: number): Promise<{ id: number }> {
  const open = await db.shift.findFirst({ where: { closedUtc: null }, orderBy: { id: 'desc' }, select: { id: true } });
  return open ?? db.shift.create({ data: { employeeId }, select: { id: true } });
}

export async function getCurrentSummary(): Promise<ShiftSummaryDto> {
  const shift = await prisma.shift.findFirst({
    where: { closedUtc: null },
    orderBy: { id: 'desc' },
    include: {
      employee: { select: { name: true } },
      payments: { orderBy: { id: 'asc' }, include: { session: { select: { stationId: true, station: { select: { consoleType: true } } } } } },
    },
  });
  const stations = await prisma.station.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true, active: true } });
  const payments = shift?.payments ?? [];

  const hourAgo = Date.now() - 60 * MINUTE_MS;
  const sum = (xs: { amountCents: number }[]) => xs.reduce((a, p) => a + p.amountCents, 0);
  const minutesByStation = new Map<number, number>();
  for (const p of payments) {
    const sid = p.session?.stationId;
    if (sid === undefined) continue;
    // Refunds carry positive minutes; they take hours away from the station.
    minutesByStation.set(sid, (minutesByStation.get(sid) ?? 0) + (p.kind === 'Refund' ? -p.minutes : p.minutes));
  }

  return {
    shiftId: shift?.id ?? null,
    openedUtc: shift?.openedUtc.toISOString() ?? null,
    openedBy: shift?.employee.name ?? null,
    totalCents: sum(payments),
    snackCents: sum(payments.filter((p) => p.kind === 'Snack')),
    lastHourCents: sum(payments.filter((p) => p.createdUtc.getTime() >= hourAgo)),
    chargeCount: payments.filter((p) => p.kind !== 'Refund').length,
    sessionCount: payments.filter((p) => p.kind === 'Session').length,
    extensionCount: payments.filter((p) => p.kind === 'Extension').length,
    cancelCount: new Set(payments.filter((p) => p.kind === 'Refund').map((p) => p.sessionId)).size,
    byMethod: PAY_METHODS.map((m) => ({ label: METHOD_LABEL[m], value: sum(payments.filter((p) => p.method === m)) })),
    byConsole: CONSOLE_TYPES.map((t) => ({
      label: CONSOLE_LABEL[t],
      // Play time only; snacks are reported on their own line.
      value: sum(payments.filter((p) => p.kind !== 'Snack' && p.session?.station.consoleType === t)),
    })),
    minutesByStation: stations
      .filter((s) => s.active || minutesByStation.has(s.id))
      .map((s) => ({ label: s.name, value: minutesByStation.get(s.id) ?? 0 })),
    payments: payments.map((p) => ({ createdUtc: p.createdUtc.toISOString(), amountCents: p.amountCents })),
  };
}

/** Closes the open shift with its total. Sessions in progress keep running; later payments open a new shift. */
export async function closeShift(actor: AuthEmployee): Promise<{ result: ShiftCloseResponse; audit: AuditDto }> {
  return prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findFirst({ where: { closedUtc: null }, orderBy: { id: 'desc' }, include: { payments: true } });
    if (!shift) throw new HttpError(409, 'No hay un turno abierto.');
    const totalCents = shift.payments.reduce((a, p) => a + p.amountCents, 0);
    const closedUtc = new Date();
    await tx.shift.update({ where: { id: shift.id }, data: { closedUtc, totalCents } });
    const audit = await appendAudit(tx, {
      employeeId: actor.id,
      action: 'Corte de caja',
      detail: `Cierre de turno · ${shift.payments.length} movimientos`,
      amountCents: totalCents,
    });
    return { result: { closedUtc: closedUtc.toISOString(), totalCents }, audit };
  });
}
