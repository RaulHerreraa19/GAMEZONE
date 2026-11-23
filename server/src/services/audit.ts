import type { Tx } from '../db.js';
import type { AuditDto } from '../types.js';

export interface AuditInput {
  employeeId: number | null; // null = Sistema
  stationId?: number | null;
  action: string;
  detail: string;
  amountCents?: number;
}

/** Insert-only audit trail. Call it inside the same transaction as the change it records. */
export async function appendAudit(db: Tx, input: AuditInput): Promise<AuditDto> {
  const row = await db.auditLog.create({
    data: {
      employeeId: input.employeeId,
      stationId: input.stationId ?? null,
      action: input.action,
      detail: input.detail,
      amountCents: input.amountCents ?? 0,
    },
    include: { employee: { select: { name: true } }, station: { select: { name: true } } },
  });
  return toAuditDto(row);
}

export function toAuditDto(row: {
  id: number;
  createdUtc: Date;
  stationId: number | null;
  action: string;
  detail: string;
  amountCents: number;
  employee: { name: string } | null;
  station: { name: string } | null;
}): AuditDto {
  return {
    id: row.id,
    createdUtc: row.createdUtc.toISOString(),
    employeeName: row.employee?.name ?? 'Sistema',
    stationId: row.stationId,
    stationName: row.station?.name ?? null,
    action: row.action,
    detail: row.detail,
    amountCents: row.amountCents,
  };
}
