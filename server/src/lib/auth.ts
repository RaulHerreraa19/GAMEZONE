import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import type { Role } from '../types.js';
import { HttpError } from './http.js';

export interface AuthEmployee {
  id: number;
  name: string;
  username: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      employee: AuthEmployee;
    }
  }
}

export function signToken(employeeId: number): string {
  return jwt.sign({ sub: String(employeeId) }, config.jwtSecret, { expiresIn: config.tokenTtl });
}

/** Verifies the bearer token and reloads the employee, so deactivated users are rejected at once. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Inicia sesión para continuar.');
  let id: number;
  try {
    id = Number((jwt.verify(token, config.jwtSecret) as jwt.JwtPayload).sub);
  } catch {
    throw new HttpError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  const e = await prisma.employee.findUnique({ where: { id } });
  if (!e || !e.active) throw new HttpError(401, 'Tu usuario no está activo.');
  res.locals.employee = { id: e.id, name: e.name, username: e.username, role: e.role as Role };
  next();
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (res.locals.employee?.role !== 'Admin') throw new HttpError(403, 'Solo un administrador puede hacer esto.');
  next();
};
