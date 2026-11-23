import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { prisma } from './db.js';
import { errorHandler } from './lib/http.js';
import { publicRouter } from './routes/public.js';
import { stationsRouter } from './routes/stations.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, serverNowUtc: new Date().toISOString() });
});
app.use('/api', publicRouter);
app.use('/api', stationsRouter);
app.use(errorHandler);

const server = createServer(app);

server.listen(config.port, config.host, () => {
  console.log(`GAME ZONE server listening on http://${config.host}:${config.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
