import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { listAudit } from '../services/audit.js';

export const auditRouter = Router();

auditRouter.get('/audit', requireAuth, async (req, res) => {
  const { q } = z.object({ q: z.string().trim().max(60).default('') }).parse(req.query);
  res.json(await listAudit(q));
});
