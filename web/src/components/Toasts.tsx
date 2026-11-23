import { useCallback, useRef, useState, type ReactNode } from 'react';

export type ToastKind = '' | 'warn' | 'lock';
interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: ReactNode;
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const toast = useCallback((msg: ReactNode, kind: ToastKind = '') => {
    const id = ++seq.current;
    setItems((list) => [{ id, kind, msg }, ...list]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 7000);
  }, []);
  return { items, toast };
}

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
