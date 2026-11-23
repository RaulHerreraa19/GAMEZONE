import { prisma } from '../db.js';
import type { AuthEmployee } from '../lib/auth.js';
import { publishAudit, publishProductsChanged, publishShiftChanged } from '../realtime/io.js';
import type { PayMethod, SnackItemInput, SnackSaleDto } from '../types.js';
import { sellSnacks } from './products.js';
import { getOrOpenShift } from './shift.js';

const include = {
  items: { orderBy: { id: 'asc' as const } },
  employee: { select: { name: true } },
  session: { select: { station: { select: { id: true, name: true } } } },
};

type SaleRow = {
  id: number;
  createdUtc: Date;
  method: string;
  amountCents: number;
  items: { name: string; quantity: number; unitPriceCents: number }[];
  employee: { name: string };
  session: { station: { id: number; name: string } } | null;
};

const toDto = (p: SaleRow): SnackSaleDto => ({
  id: p.id,
  createdUtc: p.createdUtc.toISOString(),
  employeeName: p.employee.name,
  method: p.method as PayMethod,
  totalCents: p.amountCents,
  stationId: p.session?.station.id ?? null,
  stationName: p.session?.station.name ?? null,
  lines: p.items.map(({ name, quantity, unitPriceCents }) => ({ name, quantity, unitPriceCents })),
});

/** Snack charges of the open shift (the same period as the cash cut), newest first. */
export async function listSnackSales(): Promise<SnackSaleDto[]> {
  const rows = await prisma.payment.findMany({
    where: { kind: 'Snack', shift: { closedUtc: null } },
    orderBy: { id: 'desc' },
    include,
  });
  return rows.map(toDto);
}

/** Counter sale: snacks and drinks sold without a play session. Charged and stocked in one transaction. */
export async function sellCounterSnacks(emp: AuthEmployee, input: { method: PayMethod; items: SnackItemInput[] }): Promise<SnackSaleDto> {
  const { sale, audit } = await prisma.$transaction(async (tx) => {
    const shift = await getOrOpenShift(tx, emp.id);
    const r = await sellSnacks(tx, { employeeId: emp.id, shiftId: shift.id, sessionId: null, stationId: null, method: input.method, items: input.items });
    const row = await tx.payment.findUniqueOrThrow({ where: { id: r.paymentId }, include });
    return { sale: toDto(row), audit: r.audit };
  });
  publishAudit(audit);
  publishShiftChanged();
  publishProductsChanged();
  return sale;
}
