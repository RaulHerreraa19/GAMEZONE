import { Router } from 'express';
import { listEmployees } from '../services/employees.js';
import { getSettings } from '../services/settings.js';

export const publicRouter = Router();

publicRouter.get('/settings', async (_req, res) => {
  res.json(await getSettings());
});

publicRouter.get('/employees', async (_req, res) => {
  res.json(await listEmployees());
});
