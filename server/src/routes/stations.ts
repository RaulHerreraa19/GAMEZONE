import { Router } from 'express';
import { z } from 'zod';
import { getStation, listStations } from '../services/stations.js';
import type { StationsResponse } from '../types.js';

export const stationsRouter = Router();

const idParam = z.coerce.number({ message: 'Estación inválida.' }).int().positive('Estación inválida.');

stationsRouter.get('/stations', async (_req, res) => {
  const body: StationsResponse = { serverNowUtc: new Date().toISOString(), stations: await listStations() };
  res.json(body);
});

stationsRouter.get('/stations/:id', async (req, res) => {
  const station = await getStation(idParam.parse(req.params.id));
  res.json({ serverNowUtc: new Date().toISOString(), station });
});
