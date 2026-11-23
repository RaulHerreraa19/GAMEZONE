import { prisma } from '../db.js';
import { MINUTE_MS, warnMinutesFor } from '../types.js';
import { appendAudit } from '../services/audit.js';
import { getSettings } from '../services/settings.js';
import { getStation } from '../services/stations.js';
import { publishAudit, publishLocked, publishServerTime, publishStation, publishWarning } from './io.js';

/**
 * Server-side clock for sessions: marks warnedAt / lockedAt as time passes.
 * It reads everything from the database each second, so a restart simply resumes.
 * Every update is guarded by the endUtc it observed, so a concurrent extension wins.
 */
async function tick() {
  const settings = await getSettings();
  const now = new Date();
  const sessions = await prisma.playSession.findMany({ where: { endedAt: null, lockedAt: null } });

  for (const s of sessions) {
    const left = s.endUtc.getTime() - now.getTime();

    if (left <= 0) {
      const audit = await prisma.$transaction(async (tx) => {
        const { count } = await tx.playSession.updateMany({
          where: { id: s.id, lockedAt: null, endedAt: null, endUtc: s.endUtc },
          data: { lockedAt: now },
        });
        return count === 1 ? appendAudit(tx, { employeeId: null, stationId: s.stationId, action: 'Bloqueo automático', detail: 'Tiempo terminado' }) : null;
      });
      if (!audit) continue;
      publishStation(await getStation(s.stationId));
      publishLocked(s.stationId);
      publishAudit(audit);
    } else if (!s.warnedAt && left <= warnMinutesFor(s.paidMinutes, settings) * MINUTE_MS) {
      const { count } = await prisma.playSession.updateMany({
        where: { id: s.id, warnedAt: null, lockedAt: null, endedAt: null, endUtc: s.endUtc },
        data: { warnedAt: now },
      });
      if (count !== 1) continue;
      publishStation(await getStation(s.stationId));
      publishWarning(s.stationId, Math.ceil(left / MINUTE_MS));
    }
  }
}

export function startTicker(): () => void {
  let running = false;
  let n = 0;
  const timer = setInterval(async () => {
    if (running) return; // never overlap two passes
    running = true;
    try {
      await tick();
      if (++n % 10 === 0) publishServerTime();
    } catch (e) {
      console.error('Ticker error', e);
    } finally {
      running = false;
    }
  }, 1000);
  return () => clearInterval(timer);
}
