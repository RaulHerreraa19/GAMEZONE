const whole = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/** Formats integer cents as MXN; whole pesos are shown without decimals, like the prototype. */
export function money(amountCents: number): string {
  return amountCents % 100 === 0 ? whole.format(amountCents / 100) : cents.format(amountCents / 100);
}

/** "12", "12.5" or "12,50" → integer cents; null when empty, zero or malformed. */
export function parsePesos(text: string): number | null {
  const m = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return cents > 0 ? cents : null;
}
