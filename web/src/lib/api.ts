const TOKEN_KEY = 'gz-token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: the session simply won't survive a reload.
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init?.method ?? (init?.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sin conexión con el servidor.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, (data as { error?: string }).error ?? 'Ocurrió un error.');
  }
  return data as T;
}
