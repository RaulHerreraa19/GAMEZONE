import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Escribe tu usuario y tu contraseña.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="sheet login-sheet" onSubmit={submit}>
        <img className="login-logo" src="/brand/gz-circular.webp" alt="GAME ZONE · Videojuegos • Snacks" />
        <h3>Panel de caja</h3>
        <p className="sub">Inicia sesión con el usuario que te dio el administrador.</p>
        <label className="lbl" htmlFor="lg-user">Usuario</label>
        <input id="lg-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
        <label className="lbl" htmlFor="lg-pass">Contraseña</label>
        <input id="lg-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <div className="err" role="alert">{error}</div>
        <button className="btn pri" type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
