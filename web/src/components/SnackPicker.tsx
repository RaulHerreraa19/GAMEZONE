import type { ProductDto, SnackItemInput } from '@shared';
import { LOW_STOCK } from '@shared';
import { money } from '../lib/money';

export type Cart = Record<number, number>;

export const cartItems = (cart: Cart): SnackItemInput[] =>
  Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, quantity]) => ({ productId: Number(id), quantity }));

export const cartTotal = (products: ProductDto[], cart: Cart): number =>
  products.reduce((a, p) => a + p.priceCents * (cart[p.id] ?? 0), 0);

interface Props {
  products: ProductDto[];
  cart: Cart;
  onChange: (cart: Cart) => void;
}

/** Sellable products (active, in stock) with a quantity stepper capped at the stock on hand. */
export function SnackPicker({ products, cart, onChange }: Props) {
  const sellable = products.filter((p) => p.active && p.stock > 0);
  const set = (p: ProductDto, q: number) => onChange({ ...cart, [p.id]: Math.max(0, Math.min(q, p.stock)) });

  if (sellable.length === 0) return <p className="note" style={{ margin: 0 }}>No hay productos con existencias. El administrador los registra en Inventario.</p>;
  return (
    <div className="snacks">
      {sellable.map((p) => {
        const q = cart[p.id] ?? 0;
        return (
          <div className={`snack ${q ? 'on' : ''}`} key={p.id}>
            <div className="sn-name">
              <b>{p.name}</b>
              <small>
                {money(p.priceCents)} · {p.stock <= LOW_STOCK ? `quedan ${p.stock}` : `${p.stock} disp.`}
              </small>
            </div>
            <div className="step" role="group" aria-label={`Cantidad de ${p.name}`}>
              <button type="button" aria-label={`Quitar ${p.name}`} disabled={q === 0} onClick={() => set(p, q - 1)}>−</button>
              <output aria-live="polite">{q}</output>
              <button type="button" aria-label={`Agregar ${p.name}`} disabled={q >= p.stock} onClick={() => set(p, q + 1)}>+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
