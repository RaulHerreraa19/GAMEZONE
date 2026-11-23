import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import type { ProductDto } from '@shared';
import { LOW_STOCK, PRODUCT_ICONS, type ProductIconKey } from '@shared';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';
import { money, parsePesos } from '../lib/money';
import { IcAlert, IcBox, IcEdit, IcPlus, IcPower, IcTag } from '../components/icons';
const look = (key: string) => PRODUCT_ICONS.find((i) => i.key === key) ?? { glyph: '🛒', color: '#b026ff' };


type Dialog =
  | { kind: 'new' }
  | { kind: 'edit'; product: ProductDto }
  | { kind: 'stock'; product: ProductDto }
  | { kind: 'toggle'; product: ProductDto };

interface Props {
  products: ProductDto[];
  onChanged: () => void;
  onToast: (msg: ReactNode) => void;
}

const centsToField = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));

export function InventoryPage({ products, onChanged, onToast }: Props) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const done = (msg: ReactNode) => {
    setDialog(null);
    onToast(msg);
    onChanged();
  };

  const stockPill = (p: ProductDto) => {
    if (p.stock === 0) return <span className="pill zero">Agotado</span>;
    if (p.stock <= LOW_STOCK) return <span className="pill low">Por agotarse · {p.stock}</span>;
    return <span className="pill on">{p.stock} pzas</span>;
  };

  const active = products.filter((p) => p.active).length;
  const low = products.filter((p) => p.active && p.stock > 0 && p.stock <= LOW_STOCK).length;
  const out = products.filter((p) => p.active && p.stock === 0).length;

  return (
    <section className="view">
      <div className="inv-stats">
        <div className="inv-stat"><span className="inv-ico" style={{ '--c': '#b026ff' } as CSSProperties}><IcBox /></span><div><b>{active}</b><small>Productos activos</small></div></div>
        <div className="inv-stat"><span className="inv-ico" style={{ '--c': '#ffb020' } as CSSProperties}><IcAlert /></span><div><b>{low}</b><small>Por agotarse</small></div></div>
        <div className="inv-stat"><span className="inv-ico" style={{ '--c': '#ff4d5e' } as CSSProperties}><IcTag /></span><div><b>{out}</b><small>Agotados</small></div></div>
        <button className="btn pri inv-new" onClick={() => setDialog({ kind: 'new' })}><IcPlus />Nuevo producto</button>
      </div>
      <p className="note" style={{ margin: '0 0 14px' }}>
        Cada venta descuenta existencias. Un producto desactivado ya no se ofrece, pero su historial se conserva.
      </p>
      <div className="pgrid">
        {products.map((p) => {
          const { glyph, color } = look(p.icon);
          return (
            <article key={p.id} className={`pcard${p.active ? '' : ' inactive'}`} style={{ '--c': color } as CSSProperties}>
              <div className="pcard-top">
                <span className="pglyph" aria-hidden="true">{glyph}</span>
                <div className="pinfo">
                  <h3>{p.name}</h3>
                  <div className="pprice">{money(p.priceCents)}</div>
                </div>
              </div>
              <div className="pcard-pills">
                {stockPill(p)}
                <span className={`pill ${p.active ? 'on' : 'off'}`}>{p.active ? 'Activo' : 'Desactivado'}</span>
              </div>
              <div className="pcard-acts">
                <button className="btn" onClick={() => setDialog({ kind: 'stock', product: p })}><IcBox />Existencias</button>
                <button className="btn" onClick={() => setDialog({ kind: 'edit', product: p })}><IcEdit />Editar</button>
                <button className="btn ghost" title={p.active ? 'Desactivar' : 'Activar'} aria-label={p.active ? 'Desactivar' : 'Activar'} onClick={() => setDialog({ kind: 'toggle', product: p })}><IcPower /></button>
              </div>
            </article>
          );
        })}
        {products.length === 0 && <p className="note">Todavía no hay productos. Agrega el primero con "Nuevo producto".</p>}
      </div>

      {dialog?.kind === 'new' && <ProductFormModal onClose={close} onDone={done} />}
      {dialog?.kind === 'edit' && <ProductFormModal product={dialog.product} onClose={close} onDone={done} />}
      {dialog?.kind === 'stock' && <StockModal product={dialog.product} onClose={close} onDone={done} />}
      {dialog?.kind === 'toggle' && <ToggleModal product={dialog.product} onClose={close} onDone={done} />}
    </section>
  );
}

type DoneFn = (msg: ReactNode) => void;

function ProductFormModal({ product, onClose, onDone }: { product?: ProductDto; onClose: () => void; onDone: DoneFn }) {
  const [name, setName] = useState(product?.name ?? '');
  const [icon, setIcon] = useState<ProductIconKey>(product?.icon ?? 'generic');
  const [price, setPrice] = useState(product ? centsToField(product.priceCents) : '');
  const [stock, setStock] = useState('0');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const priceCents = parsePesos(price);
    if (!priceCents) return setError('Escribe un precio válido, por ejemplo 25 o 25.50.');
    const units = Number(stock);
    if (!product && !/^\d{1,5}$/.test(stock)) return setError('Escribe las existencias como número entero.');
    setBusy(true);
    try {
      if (product) {
        await api(`/products/${product.id}`, { method: 'PATCH', body: { name, icon, priceCents } });
        onDone(<>Producto <b>{name.trim()}</b> actualizado.</>);
      } else {
        await api('/products', { body: { name, icon, priceCents, stock: units } });
        onDone(<>Producto <b>{name.trim()}</b> agregado.</>);
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={product ? `Editar · ${product.name}` : 'Nuevo producto'} sub={product ? 'Las existencias se ajustan aparte.' : 'Se podrá vender en cuanto lo guardes.'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="lbl" htmlFor="pf-name">Nombre</label>
        <input id="pf-name" className="full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Refresco 600 ml" autoComplete="off" />
        <div className="lbl" id="pf-icon-lbl">Icono</div>
        <div className="icon-pick" role="radiogroup" aria-labelledby="pf-icon-lbl">
          {PRODUCT_ICONS.map((i) => (
            <button
              type="button"
              key={i.key}
              role="radio"
              aria-checked={icon === i.key}
              aria-label={i.label}
              title={i.label}
              className={icon === i.key ? 'on' : ''}
              style={{ '--c': i.color } as CSSProperties}
              onClick={() => setIcon(i.key)}
            >
              <span aria-hidden="true">{i.glyph}</span>
              <small>{i.label}</small>
            </button>
          ))}
        </div>
        <label className="lbl" htmlFor="pf-price">Precio (MXN)</label>
        <input id="pf-price" className="full" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej. 25" autoComplete="off" />
        {!product && (
          <>
            <label className="lbl" htmlFor="pf-stock">Existencias iniciales</label>
            <input id="pf-stock" className="full" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, '').slice(0, 5))} autoComplete="off" />
          </>
        )}
        <div className="err" role="alert">{error}</div>
        <div className="acts">
          <button type="button" className="btn" onClick={onClose}>Volver</button>
          <button type="submit" className="btn pri" disabled={busy}>{product ? 'Guardar cambios' : 'Agregar producto'}</button>
        </div>
      </form>
    </Modal>
  );
}

function StockModal({ product, onClose, onDone }: { product: ProductDto; onClose: () => void; onDone: DoneFn }) {
  const [value, setValue] = useState(String(product.stock));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = /^\d{1,5}$/.test(value) ? Number(value) : null;
  const add = (n: number) => setValue(String(Math.min((current ?? 0) + n, 100000)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (current === null) return setError('Escribe las existencias como número entero.');
    setBusy(true);
    try {
      await api(`/products/${product.id}`, { method: 'PATCH', body: { stock: current } });
      onDone(<><b>{product.name}</b>: existencias en {current}.</>);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Existencias · ${product.name}`} sub={`Ahora hay ${product.stock}. Escribe el conteo real o suma lo que llegó.`} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="lbl" htmlFor="st-val">Existencias</label>
        <input id="st-val" className="full" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 5))} autoComplete="off" />
        <div className="lbl">Sumar lo que llegó</div>
        <div className="chips">
          {[6, 12, 24].map((n) => (
            <button type="button" key={n} onClick={() => add(n)}>+{n}</button>
          ))}
        </div>
        {current !== null && current !== product.stock && (
          <p className="note">Cambio: {current - product.stock > 0 ? '+' : ''}{current - product.stock} pzas. Queda registrado en la bitácora.</p>
        )}
        <div className="err" role="alert">{error}</div>
        <div className="acts">
          <button type="button" className="btn" onClick={onClose}>Volver</button>
          <button type="submit" className="btn pri" disabled={busy || current === product.stock}>Guardar existencias</button>
        </div>
      </form>
    </Modal>
  );
}

function ToggleModal({ product, onClose, onDone }: { product: ProductDto; onClose: () => void; onDone: DoneFn }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const activate = !product.active;

  const go = async () => {
    setBusy(true);
    try {
      await api(`/products/${product.id}`, { method: 'PATCH', body: { active: activate } });
      onDone(<><b>{product.name}</b> {activate ? 'activado' : 'desactivado'}.</>);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${activate ? 'Activar' : 'Desactivar'} · ${product.name}`}
      sub={activate ? 'Volverá a ofrecerse en las ventas.' : 'Ya no se ofrecerá en las ventas. Su historial y sus existencias se conservan.'}
      onClose={onClose}
    >
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Volver</button>
        <button className={`btn ${activate ? 'pri' : 'danger'}`} disabled={busy} onClick={() => void go()}>
          {activate ? 'Activar producto' : 'Desactivar producto'}
        </button>
      </div>
    </Modal>
  );
}
