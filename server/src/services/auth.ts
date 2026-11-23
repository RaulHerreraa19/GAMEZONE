import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signToken } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { ROLE_LABEL, type AuthResponse, type Role } from '../types.js';
import { appendAudit } from './audit.js';
import { toEmployeeDto } from './employees.js';

// Simple in-memory throttle: 5 failed attempts lock that username for 1 minute.
const MAX_FAILS = 5;
const LOCK_MS = 60_000;
const fails = new Map<string, { count: number; until: number }>();

function registerFail(username: string) {
  const prev = fails.get(username);
  const count = (prev && prev.count < MAX_FAILS ? prev.count : 0) + 1;
  fails.set(username, { count, until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const f = fails.get(username);
  if (f && f.until > Date.now()) throw new HttpError(429, 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.');

  const e = await prisma.employee.findUnique({ where: { username } });
  const ok = e ? await bcrypt.compare(password, e.passwordHash) : false;
  if (!e || !ok) {
    registerFail(username);
    throw new HttpError(401, 'Usuario o contraseña incorrectos.');
  }
  if (!e.active) throw new HttpError(403, 'Tu usuario está desactivado. Habla con el administrador.');
  fails.delete(username);

  await prisma.$transaction((tx) => appendAudit(tx, { employeeId: e.id, action: 'Acceso al sistema', detail: ROLE_LABEL[e.role as Role] }));
  return { token: signToken(e.id), employee: toEmployeeDto(e) };
}

export async function logout(employeeId: number): Promise<void> {
  await prisma.$transaction((tx) => appendAudit(tx, { employeeId, action: 'Salida del sistema', detail: '' }));
}
