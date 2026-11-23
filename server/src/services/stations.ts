import { prisma, type Tx } from '../db.js';
import type { AuthEmployee } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { publishAudit, publishStationsChanged } from '../realtime/io.js';
import { CONSOLE_LABEL, type AuditDto, type ConsoleType, type StationDto } from '../types.js';
import { appendAudit } from './audit.js';

const activeSessionInclude = {
  sessions: {
    where: { endedAt: null },
    take: 1,
    include: { employee: { select: { name: true } }, payments: { select: { amountCents: true, kind: true } } },
  },
} as const;

type StationRow = NonNullable<Awaited<ReturnType<typeof loadOne>>>;

function loadOne(db: Tx, id: number) {
  return db.station.findUnique({ where: { id }, include: activeSessionInclude });
}

function toDto(st: StationRow): StationDto {
  const s = st.sessions[0];
  return {
    id: st.id,
    name: st.name,
    consoleType: st.consoleType as ConsoleType,
    order: st.order,
    active: st.active,
    outOfService: st.outOfService,
    session: s
      ? {
          id: s.id,
          players: s.players,
          paidMinutes: s.paidMinutes,
          startUtc: s.startUtc.toISOString(),
          endUtc: s.endUtc.toISOString(),
          warnedAt: s.warnedAt?.toISOString() ?? null,
          lockedAt: s.lockedAt?.toISOString() ?? null,
          employeeName: s.employee.name,
          paidCents: s.payments.filter((p) => p.kind !== 'Snack').reduce((a, p) => a + p.amountCents, 0),
          snackCents: s.payments.filter((p) => p.kind === 'Snack').reduce((a, p) => a + p.amountCents, 0),
        }
      : null,
  };
}

/** Stations shown on the board and TV screens: deactivated ones are hidden. */
export async function listStations(): Promise<StationDto[]> {
  const rows = await prisma.station.findMany({ where: { active: true }, orderBy: { order: 'asc' }, include: activeSessionInclude });
  return rows.map(toDto);
}

/** Every station, including deactivated ones (admin management screen). */
export async function listAllStations(): Promise<StationDto[]> {
  const rows = await prisma.station.findMany({ orderBy: [{ active: 'desc' }, { order: 'asc' }], include: activeSessionInclude });
  return rows.map(toDto);
}

export async function getStation(id: number, db: Tx = prisma): Promise<StationDto> {
  const st = await loadOne(db, id);
  if (!st) throw new HttpError(404, 'La estación no existe.');
  return toDto(st);
}

/** Publishes a committed admin change: the audit rows (staff only) and a list reload for everyone. */
function publishAdminChange(audits: AuditDto[]) {
  for (const a of audits) publishAudit(a);
  publishStationsChanged();
}

export async function createStation(actor: AuthEmployee, input: { name: string; consoleType: ConsoleType }): Promise<StationDto> {
  const { dto, audits } = await prisma.$transaction(async (tx) => {
    const all = await tx.station.findMany({ select: { name: true, order: true } });
    if (all.some((s) => s.name.toLowerCase() === input.name.toLowerCase())) {
      throw new HttpError(409, `Ya existe una estación llamada "${input.name}".`);
    }
    const order = all.reduce((m, s) => Math.max(m, s.order), 0) + 1;
    const st = await tx.station.create({ data: { name: input.name, consoleType: input.consoleType, order } });
    const audit = await appendAudit(tx, {
      employeeId: actor.id,
      stationId: st.id,
      action: 'Alta de estación',
      detail: `${st.name} · ${CONSOLE_LABEL[input.consoleType]}`,
    });
    return { dto: await getStation(st.id, tx), audits: [audit] };
  });
  publishAdminChange(audits);
  return dto;
}

export interface StationChanges {
  name?: string;
  consoleType?: ConsoleType;
  active?: boolean;
  outOfService?: boolean;
}

/** Admin edits. A station with a session in progress cannot be taken out of use or change console. */
export async function updateStation(actor: AuthEmployee, id: number, input: StationChanges): Promise<StationDto> {
  const { dto, audits } = await prisma.$transaction(async (tx) => {
    const before = await loadOne(tx, id);
    if (!before) throw new HttpError(404, 'La estación no existe.');
    const renamed = input.name !== undefined && input.name !== before.name;
    const swapped = input.consoleType !== undefined && input.consoleType !== before.consoleType;
    const turnsOff = input.active === false || input.outOfService === true;
    if ((turnsOff || swapped) && before.sessions.length > 0) {
      throw new HttpError(409, 'Tiene una sesión en curso. Finalízala o cancélala primero.');
    }
    if (renamed) {
      const others = await tx.station.findMany({ where: { id: { not: id } }, select: { name: true } });
      if (others.some((o) => o.name.toLowerCase() === input.name!.toLowerCase())) {
        throw new HttpError(409, `Ya existe una estación llamada "${input.name}".`);
      }
    }
    const actions: { action: string; detail: string }[] = [];
    if (renamed || swapped) {
      const parts: string[] = [];
      if (renamed) parts.push(`${before.name} → ${input.name}`);
      if (swapped) parts.push(`consola: ${CONSOLE_LABEL[before.consoleType as ConsoleType]} → ${CONSOLE_LABEL[input.consoleType!]}`);
      actions.push({ action: 'Estación modificada', detail: renamed ? parts.join(' · ') : `${before.name} · ${parts.join(' · ')}` });
    }
    if (input.outOfService !== undefined && input.outOfService !== before.outOfService) {
      actions.push({ action: input.outOfService ? 'Estación fuera de servicio' : 'Estación en servicio', detail: before.name });
    }
    if (input.active !== undefined && input.active !== before.active) {
      actions.push({ action: input.active ? 'Estación activada' : 'Estación desactivada', detail: before.name });
    }
    if (actions.length === 0) return { dto: toDto(before), audits: [] };
    await tx.station.update({ where: { id }, data: input });
    const audits: AuditDto[] = [];
    for (const a of actions) audits.push(await appendAudit(tx, { employeeId: actor.id, stationId: id, ...a }));
    return { dto: await getStation(id, tx), audits };
  });
  if (audits.length) publishAdminChange(audits);
  return dto;
}
