import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { createEmployee, listEmployees, setPassword, updateEmployee } from '../services/employees.js';
import { ROLES } from '../types.js';

export const employeesRouter = Router();
employeesRouter.use('/employees', requireAuth, requireAdmin);

const idParam = z.coerce.number().int().positive('Usuario inválido.');
const name = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(40, 'El nombre es demasiado largo.');
const role = z.enum(ROLES, { message: 'Elige un rol válido.' });
const password = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').max(72, 'La contraseña es demasiado larga.');
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,30}$/, 'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.');

employeesRouter.get('/employees', async (_req, res) => {
  res.json(await listEmployees());
});

employeesRouter.post('/employees', async (req, res) => {
  const body = z.object({ name, username, role, password }).parse(req.body);
  res.status(201).json(await createEmployee(res.locals.employee, body));
});

employeesRouter.patch('/employees/:id', async (req, res) => {
  const body = z.object({ name: name.optional(), role: role.optional(), active: z.boolean().optional() }).parse(req.body);
  res.json(await updateEmployee(res.locals.employee, idParam.parse(req.params.id), body));
});

employeesRouter.post('/employees/:id/password', async (req, res) => {
  const body = z.object({ password }).parse(req.body);
  await setPassword(res.locals.employee, idParam.parse(req.params.id), body.password);
  res.json({ ok: true });
});
