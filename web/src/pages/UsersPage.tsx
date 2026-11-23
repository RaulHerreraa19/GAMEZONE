import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { EmployeeDto, Role } from '@shared';
import { ROLE_LABEL, ROLES } from '@shared';
import { Chips, Modal } from '../components/Modal';
import { api } from '../lib/api';

type Dialog = { kind: 'new' } | { kind: 'edit'; user: EmployeeDto } | { kind: 'password'; user: EmployeeDto } | { kind: 'toggle'; user: EmployeeDto };

export function UsersPage({ me, onToast }: { me: EmployeeDto; onToast: (msg: ReactNode) => void }) {
  const [users, setUsers] = useState<EmployeeDto[]>([]);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api<EmployeeDto[]>('/employees'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const close = useCallback(() => setDialog(null), []);
  const done = (msg: ReactNode) => {
    setDialog(null);
    onToast(msg);
    void load();
  };

  return (
    <section className="view">
      <div className="tools">
        <button className="btn pri" style={{ flex: '0 0 auto' }} onClick={() => setDialog({ kind: 'new' })}>
          Nuevo usuario
        </button>
        <span className="note" style={{ margin: 0 }}>
          Solo el administrador da de alta usuarios. Un usuario desactivado ya no puede entrar.
        </span>
      </div>
      {error && <p className="err">{error}</p>}
      <div className="scroll">
        <table className="stack">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'inactive'}>
                <td data-l="Nombre">
                  {u.name}
                  {u.id === me.id && <span className="you"> (tú)</span>}
                </td>
                <td data-l="Usuario">{u.username}</td>
                <td data-l="Rol">{ROLE_LABEL[u.role]}</td>
                <td data-l="Estado">
                  <span className={`pill ${u.active ? 'on' : 'off'}`}>{u.active ? 'Activo' : 'Desactivado'}</span>
                </td>
                <td data-l="Acciones">
                  <div className="row-acts">
                    <button className="btn" onClick={() => setDialog({ kind: 'edit', user: u })}>Editar</button>
                    <button className="btn" onClick={() => setDialog({ kind: 'password', user: u })}>Contraseña</button>
                    {u.id !== me.id && (
                      <button className="btn ghost" onClick={() => setDialog({ kind: 'toggle', user: u })}>
                        {u.active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'new' && <UserFormModal onClose={close} onDone={done} />}
      {dialog?.kind === 'edit' && <UserFormModal user={dialog.user} isMe={dialog.user.id === me.id} onClose={close} onDone={done} />}
      {dialog?.kind === 'password' && <PasswordModal user={dialog.user} onClose={close} onDone={done} />}
      {dialog?.kind === 'toggle' && <ToggleModal user={dialog.user} onClose={close} onDone={done} />}
    </section>
  );
}

function UserFormModal({ user, isMe, onClose, onDone }: { user?: EmployeeDto; isMe?: boolean; onClose: () => void; onDone: (msg: ReactNode) => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [role, setRole] = useState<Role>(user?.role ?? 'Reception');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user && password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      if (user) {
        await api(`/employees/${user.id}`, { method: 'PATCH', body: { name, role } });
        onDone(<>Usuario <b>{name}</b> actualizado.</>);
      } else {
        await api('/employees', { body: { name, username, role, password } });
        onDone(<>Usuario <b>{name}</b> registrado.</>);
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={user ? `Editar · ${user.name}` : 'Nuevo usuario'} sub={user ? `Usuario: ${user.username}` : 'Registra a alguien del equipo para que pueda entrar al panel.'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="lbl" htmlFor="uf-name">Nombre para mostrar</label>
        <input id="uf-name" className="full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Daniela R." />
        {!user && (
          <>
            <label className="lbl" htmlFor="uf-user">Usuario (para entrar)</label>
            <input id="uf-user" className="full" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ej. daniela" autoCapitalize="none" spellCheck={false} autoComplete="off" />
          </>
        )}
        <div className="lbl">Rol</div>
        {isMe ? (
          <p className="note" style={{ margin: 0 }}>No puedes cambiar tu propio rol.</p>
        ) : (
          <Chips options={ROLES} value={role} label={(r) => ROLE_LABEL[r]} onChange={setRole} />
        )}
        {!user && (
          <>
            <label className="lbl" htmlFor="uf-pass">Contraseña (mínimo 6 caracteres)</label>
            <input id="uf-pass" className="full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <label className="lbl" htmlFor="uf-pass2">Repite la contraseña</label>
            <input id="uf-pass2" className="full" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
          </>
        )}
        <div className="err" role="alert">{error}</div>
        <div className="acts">
          <button type="button" className="btn" onClick={onClose}>Volver</button>
          <button type="submit" className="btn pri" disabled={busy}>{user ? 'Guardar cambios' : 'Registrar usuario'}</button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({ user, onClose, onDone }: { user: EmployeeDto; onClose: () => void; onDone: (msg: ReactNode) => void }) {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await api(`/employees/${user.id}/password`, { body: { password } });
      onDone(<>Contraseña de <b>{user.name}</b> actualizada.</>);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Contraseña · ${user.name}`} sub="Escribe la nueva contraseña y compártela en persona." onClose={onClose}>
      <form onSubmit={submit}>
        <label className="lbl" htmlFor="pw-1">Nueva contraseña (mínimo 6 caracteres)</label>
        <input id="pw-1" className="full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <label className="lbl" htmlFor="pw-2">Repite la contraseña</label>
        <input id="pw-2" className="full" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
        <div className="err" role="alert">{error}</div>
        <div className="acts">
          <button type="button" className="btn" onClick={onClose}>Volver</button>
          <button type="submit" className="btn pri" disabled={busy}>Cambiar contraseña</button>
        </div>
      </form>
    </Modal>
  );
}

function ToggleModal({ user, onClose, onDone }: { user: EmployeeDto; onClose: () => void; onDone: (msg: ReactNode) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const activate = !user.active;

  const go = async () => {
    setBusy(true);
    try {
      await api(`/employees/${user.id}`, { method: 'PATCH', body: { active: activate } });
      onDone(<>Usuario <b>{user.name}</b> {activate ? 'activado' : 'desactivado'}.</>);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${activate ? 'Activar' : 'Desactivar'} · ${user.name}`}
      sub={activate ? 'Podrá volver a entrar con su contraseña.' : 'Ya no podrá entrar y su sesión abierta se cierra. Su historial se conserva en la bitácora.'}
      onClose={onClose}
    >
      <div className="err" role="alert">{error}</div>
      <div className="acts">
        <button className="btn" onClick={onClose}>Volver</button>
        <button className={`btn ${activate ? 'pri' : 'danger'}`} onClick={go} disabled={busy}>
          {activate ? 'Activar usuario' : 'Desactivar usuario'}
        </button>
      </div>
    </Modal>
  );
}
