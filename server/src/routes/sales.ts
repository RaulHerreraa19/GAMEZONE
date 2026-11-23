import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { method, snackItems } from '../lib/schemas.js';
import { listSnackSales, sellCounterSnacks } from '../services/sales.js';

export const salesRouter = Router();
salesRouter.use('/sales', requireAuth);

salesRouter.get('/sales', async (_req, res) => {
  res.json(await listSnackSales());
});

salesRouter.post('/sales', async (req, res) => {
  const body = z.object({ method, items: snackItems.min(1, 'Elige al menos un producto.') }).parse(req.body);
  res.status(201).json(await sellCounterSnacks(res.locals.employee, body));
});
