import { prisma, type Tx } from '../db.js';
import type { AuthEmployee } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { publishAudit, publishProductsChanged, publishShiftChanged, publishStation } from '../realtime/io.js';
import { METHOD_LABEL, MINUTE_MS, priceCents, type AuditDto, type PayMethod, type SnackItemInput, type StationDto } from '../types.js';
import { appendAudit } from './audit.js';
import { findAdminByPassword } from './employees.js';
import { sellSnacks } from './products.js';
import { getSettings } from './settings.js';
import { getOrOpenShift } from './shift.js';
import { getStation } from './stations.js';

const players = (n: number) => `${n} jugador${n > 1 ? 'es' : ''}`;

interface WorkResult {
  stationId: number;
  audits: AuditDto[];
  moneyMoved: boolean;
  stockMoved?: boolean;
}

/** Runs a mutation in one transaction, then publishes its results to connected clients. */
async function commit(work: (tx: Tx) => Promise<WorkResult>): Promise<StationDto> {
  const { station, r } = await prisma.$transaction(async (tx) => {
    const r = await work(tx);
    return { station: await getStation(r.stationId, tx), r };
  });
  publishStation(station);
  for (const a of r.audits) publishAudit(a);
  if (r.moneyMoved) publishShiftChanged();
  if (r.stockMoved) publishProductsChanged();
  return station;
}

async function activeSession(tx: Tx, id: number) {
  const s = await tx.playSession.findUnique({ where: { id } });
  if (!s) throw new HttpError(404, 'La sesión no existe.');
  if (s.endedAt) throw new HttpError(409, 'La sesión ya terminó.');
  return s;
}

export function startSession(
  emp: AuthEmployee,
  stationId: number,
  input: { players: number; minutes: number; method: PayMethod; snacks?: SnackItemInput[] },
) {
  return commit(async (tx) => {
    const settings = await getSettings();
    const station = await tx.station.findUnique({ where: { id: stationId } });
    if (!station || !station.active) throw new HttpError(404, 'La estación no existe.');
    if (station.outOfService) throw new HttpError(409, 'La estación está fuera de servicio.');
    if (await tx.playSession.findFirst({ where: { stationId, endedAt: null }, select: { id: true } })) {
      throw new HttpError(409, 'La estación ya tiene una sesión activa.');
    }
    const amountCents = priceCents(settings.rateCentsPerPersonHour, input.players, input.minutes);
    const now = new Date();
    const shift = await getOrOpenShift(tx, emp.id);
    const session = await tx.playSession.create({
      data: {
        stationId,
        players: input.players,
        paidMinutes: input.minutes,
        startUtc: now,
        endUtc: new Date(now.getTime() + input.minutes * MINUTE_MS),
        employeeId: emp.id,
      },
    });
    await tx.payment.create({
      data: { sessionId: session.id, shiftId: shift.id, amountCents, method: input.method, minutes: input.minutes, kind: 'Session', employeeId: emp.id },
    });
    const audits = [
      await appendAudit(tx, {
        employeeId: emp.id,
        stationId,
        action: 'Inicio de sesión',
        detail: `${players(input.players)} · ${input.minutes} min · ${METHOD_LABEL[input.method]}`,
        amountCents,
      }),
    ];
    // Snacks ordered at the start are charged in the same transaction: if stock fails, nothing starts.
    if (input.snacks?.length) {
      const sale = await sellSnacks(tx, { employeeId: emp.id, shiftId: shift.id, sessionId: session.id, stationId, method: input.method, items: input.snacks });
      audits.push(sale.audit);
    }
    return { stationId, audits, moneyMoved: true, stockMoved: !!input.snacks?.length };
  });
}

export function extendSession(emp: AuthEmployee, sessionId: number, input: { minutes: number; method: PayMethod }) {
  return commit(async (tx) => {
    const settings = await getSettings();
    const s = await activeSession(tx, sessionId);
    const now = Date.now();
    const wasLocked = s.lockedAt !== null || s.endUtc.getTime() <= now;
    const amountCents = priceCents(settings.rateCentsPerPersonHour, s.players, input.minutes);
    const shift = await getOrOpenShift(tx, emp.id);
    await tx.playSession.update({
      where: { id: s.id },
      data: {
        endUtc: new Date((wasLocked ? now : s.endUtc.getTime()) + input.minutes * MINUTE_MS),
        paidMinutes: { increment: input.minutes },
        warnedAt: null,
        lockedAt: null,
      },
    });
    await tx.payment.create({
      data: { sessionId: s.id, shiftId: shift.id, amountCents, method: input.method, minutes: input.minutes, kind: 'Extension', employeeId: emp.id },
    });
    const audit = await appendAudit(tx, {
      employeeId: emp.id,
      stationId: s.stationId,
      action: 'Extensión',
      detail: `+${input.minutes} min · ${METHOD_LABEL[input.method]}${wasLocked ? ' · desbloqueo' : ''}`,
      amountCents,
    });
    return { stationId: s.stationId, audits: [audit], moneyMoved: true };
  });
}

/** Snacks added to a session already in progress (also allowed while the station is locked). */
export function addSnacks(emp: AuthEmployee, sessionId: number, input: { method: PayMethod; items: SnackItemInput[] }) {
  return commit(async (tx) => {
    const s = await activeSession(tx, sessionId);
    const shift = await getOrOpenShift(tx, emp.id);
    const sale = await sellSnacks(tx, { employeeId: emp.id, shiftId: shift.id, sessionId: s.id, stationId: s.stationId, method: input.method, items: input.items });
    return { stationId: s.stationId, audits: [sale.audit], moneyMoved: true, stockMoved: true };
  });
}

export function endSession(emp: AuthEmployee, sessionId: number) {
  return commit(async (tx) => {
    const s = await activeSession(tx, sessionId);
    const early = s.endUtc.getTime() > Date.now();
    await tx.playSession.update({ where: { id: s.id }, data: { endedAt: new Date(), endReason: early ? 'EndedEarly' : 'Completed' } });
    const audit = await appendAudit(tx, {
      employeeId: emp.id,
      stationId: s.stationId,
      action: 'Sesión finalizada',
      detail: early ? 'Antes de tiempo' : 'Tiempo cumplido',
    });
    return { stationId: s.stationId, audits: [audit], moneyMoved: false };
  });
}

export async function cancelSession(emp: AuthEmployee, sessionId: number, input: { reason: string; adminPassword?: string }) {
  // Resolve the authorizing admin first: bcrypt is slow and must not hold the transaction open.
  let authorizer: { id: number; name: string };
  if (emp.role === 'Admin') {
    authorizer = emp;
  } else {
    const admin = input.adminPassword ? await findAdminByPassword(input.adminPassword) : null;
    if (!admin) throw new HttpError(403, 'Contraseña de administrador incorrecta.');
    authorizer = admin;
  }

  return commit(async (tx) => {
    const s = await activeSession(tx, sessionId);
    // Only play time is refunded: snacks already handed over (and their stock) stay sold.
    const paid = await tx.payment.findMany({ where: { sessionId: s.id, kind: { in: ['Session', 'Extension'] } } });
    const shift = await getOrOpenShift(tx, emp.id);
    // One negative payment per original payment method, so the cash/card/transfer cut stays honest.
    const byMethod = new Map<string, number>();
    for (const p of paid) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amountCents);
    const refunds = [...byMethod].filter(([, cents]) => cents !== 0);
    const minutes = paid.reduce((a, p) => a + p.minutes, 0);
    for (const [i, [method, cents]] of refunds.entries()) {
      await tx.payment.create({
        data: { sessionId: s.id, shiftId: shift.id, amountCents: -cents, method, minutes: i === 0 ? minutes : 0, kind: 'Refund', employeeId: emp.id },
      });
    }
    await tx.playSession.update({ where: { id: s.id }, data: { endedAt: new Date(), endReason: 'Cancelled' } });
    const refundCents = refunds.reduce((a, [, c]) => a + c, 0);
    const audit = await appendAudit(tx, {
      employeeId: emp.id,
      stationId: s.stationId,
      action: 'Cancelación',
      detail: `${input.reason} · autorizó ${authorizer.name}`,
      amountCents: -refundCents,
    });
    return { stationId: s.stationId, audits: [audit], moneyMoved: true };
  });
}
