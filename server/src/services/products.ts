import { prisma, type Tx } from '../db.js';
import type { AuthEmployee } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { publishAudit, publishProductsChanged } from '../realtime/io.js';
import { METHOD_LABEL, PRODUCT_ICON_KEYS, type ProductIconKey, type AuditDto, type PayMethod, type ProductDto, type SnackItemInput } from '../types.js';
import { appendAudit } from './audit.js';

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const money = (cents: number) => pesos.format(cents / 100);

type ProductRow = { id: number; name: string; icon: string; priceCents: number; stock: number; active: boolean };
const toDto = (p: ProductRow): ProductDto => ({
  id: p.id,
  name: p.name,
  icon: PRODUCT_ICON_KEYS.find((k) => k === p.icon) ?? 'generic',
  priceCents: p.priceCents,
  stock: p.stock,
  active: p.active,
});

export async function listProducts(): Promise<ProductDto[]> {
  const rows = await prisma.product.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  return rows.map(toDto);
}

async function assertUniqueName(tx: Tx, name: string, exceptId?: number) {
  const all = await tx.product.findMany({ where: exceptId ? { id: { not: exceptId } } : undefined, select: { name: true } });
  if (all.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new HttpError(409, `Ya existe un producto llamado "${name}".`);
}

export async function createProduct(actor: AuthEmployee, input: { name: string; icon: ProductIconKey; priceCents: number; stock: number }): Promise<ProductDto> {
  const { dto, audit } = await prisma.$transaction(async (tx) => {
    await assertUniqueName(tx, input.name);
    const p = await tx.product.create({ data: input });
    const audit = await appendAudit(tx, {
      employeeId: actor.id,
      action: 'Alta de producto',
      detail: `${p.name} · ${money(p.priceCents)} · ${p.stock} pzas`,
    });
    return { dto: toDto(p), audit };
  });
  publishAudit(audit);
  publishProductsChanged();
  return dto;
}

export async function updateProduct(
  actor: AuthEmployee,
  id: number,
  input: { name?: string; icon?: ProductIconKey; priceCents?: number; stock?: number; active?: boolean },
): Promise<ProductDto> {
  const { dto, audits } = await prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'El producto no existe.');
    if (input.name !== undefined && input.name !== before.name) await assertUniqueName(tx, input.name, id);

    const changes: string[] = [];
    if (input.name !== undefined && input.name !== before.name) changes.push(`nombre: ${before.name} → ${input.name}`);
    if (input.priceCents !== undefined && input.priceCents !== before.priceCents) {
      changes.push(`precio: ${money(before.priceCents)} → ${money(input.priceCents)}`);
    }
    if (input.active !== undefined && input.active !== before.active) changes.push(input.active ? 'activado' : 'desactivado');
    if (input.icon !== undefined && input.icon !== before.icon) changes.push('icono cambiado');
    const stockChanged = input.stock !== undefined && input.stock !== before.stock;
    if (!changes.length && !stockChanged) return { dto: toDto(before), audits: [] as AuditDto[] };

    const p = await tx.product.update({ where: { id }, data: input });
    const audits: AuditDto[] = [];
    if (changes.length) {
      audits.push(await appendAudit(tx, { employeeId: actor.id, action: 'Producto modificado', detail: `${p.name} · ${changes.join(' · ')}` }));
    }
    if (stockChanged) {
      const delta = p.stock - before.stock;
      audits.push(
        await appendAudit(tx, {
          employeeId: actor.id,
          action: 'Ajuste de inventario',
          detail: `${p.name}: ${before.stock} → ${p.stock} pzas (${delta > 0 ? '+' : ''}${delta})`,
        }),
      );
    }
    return { dto: toDto(p), audits };
  });
  for (const a of audits) publishAudit(a);
  if (audits.length) publishProductsChanged();
  return dto;
}

/**
 * Charges snacks inside the caller's transaction: validates stock, decrements it atomically, and
 * records one Snack payment with its lines plus an audit entry. `sessionId`/`stationId` are null
 * for counter sales that are not tied to a station.
 */
export async function sellSnacks(
  tx: Tx,
  ctx: { employeeId: number; shiftId: number; sessionId: number | null; stationId: number | null; method: PayMethod; items: SnackItemInput[] },
): Promise<{ paymentId: number; amountCents: number; audit: AuditDto }> {
  const qty = new Map<number, number>();
  for (const it of ctx.items) qty.set(it.productId, (qty.get(it.productId) ?? 0) + it.quantity);
  if (qty.size === 0) throw new HttpError(400, 'Elige al menos un producto.');

  const products = await tx.product.findMany({ where: { id: { in: [...qty.keys()] } } });
  const lines: { productId: number; name: string; unitPriceCents: number; quantity: number }[] = [];
  for (const [productId, quantity] of qty) {
    const p = products.find((x) => x.id === productId);
    if (!p || !p.active) throw new HttpError(409, 'Un producto ya no está disponible. Actualiza la lista.');
    // Atomic: only decrements when enough units remain, so concurrent sales can never oversell.
    const { count } = await tx.product.updateMany({ where: { id: p.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
    if (count !== 1) {
      const left = (await tx.product.findUnique({ where: { id: p.id }, select: { stock: true } }))?.stock ?? 0;
      throw new HttpError(409, left > 0 ? `Solo quedan ${left} de ${p.name}.` : `${p.name} está agotado.`);
    }
    lines.push({ productId, name: p.name, unitPriceCents: p.priceCents, quantity });
  }

  const amountCents = lines.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0);
  const payment = await tx.payment.create({
    data: {
      sessionId: ctx.sessionId,
      shiftId: ctx.shiftId,
      amountCents,
      method: ctx.method,
      minutes: 0,
      kind: 'Snack',
      employeeId: ctx.employeeId,
      items: { create: lines },
    },
  });
  const audit = await appendAudit(tx, {
    employeeId: ctx.employeeId,
    stationId: ctx.stationId,
    action: 'Venta de snacks',
    detail: `${lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')} · ${METHOD_LABEL[ctx.method]}`,
    amountCents,
  });
  return { paymentId: payment.id, amountCents, audit };
}
