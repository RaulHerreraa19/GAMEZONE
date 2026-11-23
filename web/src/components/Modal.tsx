import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Custom modal sheet from the prototype (never window.alert/confirm). */
export function Modal({ title, sub, onClose, children }: Props) {
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = sheet.current?.querySelector<HTMLElement>('input,textarea,button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={sheet}>
        <h3>{title}</h3>
        {sub && <p className="sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

interface ChipsProps<T> {
  options: readonly T[];
  value: T;
  label: (o: T) => string;
  onChange: (o: T) => void;
}

export function Chips<T>({ options, value, label, onChange }: ChipsProps<T>) {
  return (
    <div className="chips">
      {options.map((o, i) => (
        <button type="button" key={i} aria-pressed={o === value} onClick={() => onChange(o)}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}
