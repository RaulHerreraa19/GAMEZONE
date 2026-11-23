import type { ReactNode } from 'react';
import type { EmployeeDto } from '@shared';
import { ROLE_LABEL } from '@shared';
import { IcBox, IcCart, IcGrid, IcLog, IcPad, IcRegister, IcUsers } from './icons';

export type View = 'est' | 'sna' | 'bit' | 'cor' | 'inv' | 'sal' | 'usr';

interface Props {
  view: View;
  onView: (v: View) => void;
  alerts: number;
  shiftLabel: string;
  employee: EmployeeDto | null;
  onUser: () => void;
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function Sidebar({ view, onView, alerts, shiftLabel, employee, onUser }: Props) {
  const tab = (v: View, label: string, icon: ReactNode, badge?: number) => (
    <button role="tab" aria-selected={view === v} onClick={() => onView(v)}>
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span className="badge" hidden={!badge}>
          {badge}
        </span>
      )}
    </button>
  );
  return (
    <aside className="side">
      <div className="brand">
        <img className="full" src="/brand/gz-horizontal.webp" alt="GAME ZONE · Videojuegos • Snacks" />
        <img className="mini" src="/brand/gz-circular.webp" alt="GAME ZONE" />
        <small>Panel de caja</small>
      </div>
      <p className="navlbl">Operación</p>
      <nav className="tabs" role="tablist" aria-label="Secciones">
        {tab('est', 'Estaciones', <IcGrid />, alerts)}
        {tab('sna', 'Snacks', <IcCart />)}
        {tab('bit', 'Bitácora', <IcLog />)}
        {tab('cor', 'Corte de caja', <IcRegister />)}
        {employee?.role === 'Admin' && tab('inv', 'Inventario', <IcBox />)}
        {employee?.role === 'Admin' && tab('sal', 'Salas', <IcPad />)}
        {employee?.role === 'Admin' && tab('usr', 'Usuarios', <IcUsers />)}
      </nav>
      <div className="side-foot">
        <div className="shift">
          <i />
          {shiftLabel}
        </div>
        <button className="user" onClick={onUser}>
          <span className="av">{employee ? initials(employee.name) : '—'}</span>
          <span>
            <span>{employee?.name ?? '—'}</span>
            <small>{employee ? ROLE_LABEL[employee.role] : ''} · Cerrar sesión</small>
          </span>
        </button>
      </div>
    </aside>
  );
}
