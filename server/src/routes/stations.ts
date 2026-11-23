import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { createStation, getStation, listAllStations, listStations, updateStation } from '../services/stations.js';
import { CONSOLE_TYPES, type StationsResponse } from '../types.js';

export const stationsRouter = Router();

const stationName = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(30, 'El nombre es demasiado largo.');
const consoleType = z.enum(CONSOLE_TYPES, { message: 'Elige el tipo de consola.' });

const idParam = z.coerce.number({ message: 'Estación inválida.' }).int().positive('Estación inválida.');

stationsRouter.get('/stations', async (_req, res) => {
  const body: StationsResponse = { serverNowUtc: new Date().toISOString(), stations: await listStations() };
  res.json(body);
});

// Admin management. Declared before /stations/:id so "manage" is not read as an id.
stationsRouter.get('/stations/manage', requireAuth, requireAdmin, async (_req, res) => {
  res.json(await listAllStations());
});

stationsRouter.post('/stations', requireAuth, requireAdmin, async (req, res) => {
  const body = z.object({ name: stationName, consoleType }).parse(req.body);
  res.status(201).json(await createStation(res.locals.employee, body));
});

stationsRouter.patch('/stations/:id', requireAuth, requireAdmin, async (req, res) => {
  const body = z
    .object({
      name: stationName.optional(),
      consoleType: consoleType.optional(),
      active: z.boolean().optional(),
      outOfService: z.boolean().optional(),
    })
    .parse(req.body);
  res.json(await updateStation(res.locals.employee, idParam.parse(req.params.id), body));
});

stationsRouter.get('/stations/:id', async (req, res) => {
  const station = await getStation(idParam.parse(req.params.id));
  res.json({ serverNowUtc: new Date().toISOString(), station });
});
