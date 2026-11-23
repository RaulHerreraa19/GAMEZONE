import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { cancelSession, endSession, extendSession, startSession } from '../services/sessions.js';
import { publishAudit, publishShiftChanged } from '../realtime/io.js';
import { closeShift, getCurrentSummary } from '../services/shift.js';
import { MAX_CUSTOM_MINUTES, PAY_METHODS } from '../types.js';

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

const id = (msg: string) => z.coerce.number({ message: msg }).int().positive(msg);
const method = z.enum(PAY_METHODS, { message: 'Elige una forma de pago válida.' });
// Any whole number of minutes: the fixed packages are only shortcuts for the UI.
const minutes = z
  .number({ message: 'Elige el tiempo.' })
  .int('Los minutos deben ser un número entero.')
  .min(1, 'El tiempo mínimo es 1 minuto.')
  .max(MAX_CUSTOM_MINUTES, `El tiempo máximo es ${MAX_CUSTOM_MINUTES} minutos.`);

sessionsRouter.post('/stations/:id/sessions', async (req, res) => {
  const body = z
    .object({ players: z.number().int().min(1, 'Elige 1 o 2 jugadores.').max(2, 'Elige 1 o 2 jugadores.'), minutes, method })
    .parse(req.body);
  res.status(201).json(await startSession(res.locals.employee, id('Estación inválida.').parse(req.params.id), body));
});

sessionsRouter.post('/sessions/:id/extend', async (req, res) => {
  const body = z.object({ minutes, method }).parse(req.body);
  res.json(await extendSession(res.locals.employee, id('Sesión inválida.').parse(req.params.id), body));
});

sessionsRouter.post('/sessions/:id/end', async (req, res) => {
  res.json(await endSession(res.locals.employee, id('Sesión inválida.').parse(req.params.id)));
});

sessionsRouter.post('/sessions/:id/cancel', async (req, res) => {
  const body = z
    .object({
      reason: z.string().trim().min(1, 'Escribe el motivo de la cancelación.').max(200, 'El motivo es demasiado largo.'),
      adminPassword: z.string().max(72).optional(),
    })
    .parse(req.body);
  res.json(await cancelSession(res.locals.employee, id('Sesión inválida.').parse(req.params.id), body));
});

sessionsRouter.get('/shift/current/summary', async (_req, res) => {
  res.json(await getCurrentSummary());
});

sessionsRouter.post('/shift/close', async (_req, res) => {
  const { result, audit } = await closeShift(res.locals.employee);
  publishAudit(audit);
  publishShiftChanged();
  res.json(result);
});
