import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { prisma } from './db.js';
import { errorHandler } from './lib/http.js';
import { attachSocketServer } from './realtime/socket.js';
import { startTicker } from './realtime/ticker.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { employeesRouter } from './routes/employees.js';
import { publicRouter } from './routes/public.js';
import { sessionsRouter } from './routes/sessions.js';
import { stationsRouter } from './routes/stations.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, serverNowUtc: new Date().toISOString() });
});
app.use('/api', publicRouter);
app.use('/api', authRouter);
app.use('/api', employeesRouter);
app.use('/api', stationsRouter);
app.use('/api', sessionsRouter);
app.use('/api', auditRouter);
app.use(errorHandler);

const server = createServer(app);
const io = attachSocketServer(server);
const stopTicker = startTicker();

server.listen(config.port, config.host, () => {
  console.log(`GAME ZONE server listening on http://${config.host}:${config.port}`);
});

async function shutdown() {
  stopTicker();
  await io.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
