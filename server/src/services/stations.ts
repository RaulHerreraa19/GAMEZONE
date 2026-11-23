import { prisma, type Tx } from '../db.js';
import { HttpError } from '../lib/http.js';
import type { ConsoleType, StationDto } from '../types.js';

const activeSessionInclude = {
  sessions: {
    where: { endedAt: null },
    take: 1,
    include: { employee: { select: { name: true } }, payments: { select: { amountCents: true } } },
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
          paidCents: s.payments.reduce((a, p) => a + p.amountCents, 0),
        }
      : null,
  };
}

export async function listStations(): Promise<StationDto[]> {
  const rows = await prisma.station.findMany({ orderBy: { order: 'asc' }, include: activeSessionInclude });
  return rows.map(toDto);
}

export async function getStation(id: number, db: Tx = prisma): Promise<StationDto> {
  const st = await loadOne(db, id);
  if (!st) throw new HttpError(404, 'La estación no existe.');
  return toDto(st);
}
