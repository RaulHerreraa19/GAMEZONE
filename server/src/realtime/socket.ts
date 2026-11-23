import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { STAFF_ROOM, setIo, type GzServer } from './io.js';

/** Attaches Socket.IO. Anyone can connect (station TVs); a valid staff token also joins the staff room. */
export function attachSocketServer(http: HttpServer): GzServer {
  const io: GzServer = new Server(http, { cors: { origin: true } });
  io.on('connection', async (socket) => {
    const token = (socket.handshake.auth as { token?: unknown }).token;
    if (typeof token !== 'string' || !token) return;
    try {
      const id = Number((jwt.verify(token, config.jwtSecret) as jwt.JwtPayload).sub);
      const e = await prisma.employee.findUnique({ where: { id }, select: { active: true } });
      if (e?.active) await socket.join(STAFF_ROOM);
    } catch {
      // Invalid or expired token: stays a public (read-only station) connection.
    }
  });
  setIo(io);
  return io;
}
