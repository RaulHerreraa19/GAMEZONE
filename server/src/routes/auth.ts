import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { login, logout } from '../services/auth.js';
import type { EmployeeDto } from '../types.js';

export const authRouter = Router();

const loginBody = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Escribe tu usuario.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

authRouter.post('/auth/login', async (req, res) => {
  const { username, password } = loginBody.parse(req.body);
  res.json(await login(username, password));
});

authRouter.get('/auth/me', requireAuth, (_req, res) => {
  const e = res.locals.employee;
  const body: EmployeeDto = { id: e.id, name: e.name, username: e.username, role: e.role, active: true };
  res.json(body);
});

authRouter.post('/auth/logout', requireAuth, async (_req, res) => {
  await logout(res.locals.employee.id);
  res.json({ ok: true });
});
