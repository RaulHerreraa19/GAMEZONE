import { Router } from 'express';
import { getSettings } from '../services/settings.js';

export const publicRouter = Router();

publicRouter.get('/settings', async (_req, res) => {
  res.json(await getSettings());
});
