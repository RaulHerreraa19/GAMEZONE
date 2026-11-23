const whole = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/** Formats integer cents as MXN; whole pesos are shown without decimals, like the prototype. */
export function money(amountCents: number): string {
  return amountCents % 100 === 0 ? whole.format(amountCents / 100) : cents.format(amountCents / 100);
}
