import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import type { AuthEmployee } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { ROLE_LABEL, type EmployeeDto, type Role } from '../types.js';
import { appendAudit } from './audit.js';

type EmployeeRow = { id: number; name: string; username: string; role: string; active: boolean };

export function toEmployeeDto(e: EmployeeRow): EmployeeDto {
  return { id: e.id, name: e.name, username: e.username, role: e.role as Role, active: e.active };
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export async function listEmployees(): Promise<EmployeeDto[]> {
  const rows = await prisma.employee.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  return rows.map(toEmployeeDto);
}

export async function createEmployee(
  actor: AuthEmployee,
  input: { name: string; username: string; role: Role; password: string },
): Promise<EmployeeDto> {
  const exists = await prisma.employee.findUnique({ where: { username: input.username } });
  if (exists) throw new HttpError(409, `El usuario "${input.username}" ya existe.`);
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const e = await tx.employee.create({ data: { name: input.name, username: input.username, role: input.role, passwordHash } });
    await appendAudit(tx, { employeeId: actor.id, action: 'Alta de usuario', detail: `${e.name} (${e.username}) · ${ROLE_LABEL[input.role]}` });
    return toEmployeeDto(e);
  });
}

export async function updateEmployee(
  actor: AuthEmployee,
  id: number,
  input: { name?: string; role?: Role; active?: boolean },
): Promise<EmployeeDto> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'El usuario no existe.');
    const losesAdmin =
      before.role === 'Admin' && before.active && (input.active === false || (input.role !== undefined && input.role !== 'Admin'));
    if (losesAdmin && id === actor.id) throw new HttpError(409, 'No puedes quitarte el rol de administrador ni desactivarte a ti mismo.');
    if (losesAdmin) {
      const admins = await tx.employee.count({ where: { role: 'Admin', active: true } });
      if (admins <= 1) throw new HttpError(409, 'Debe quedar al menos un administrador activo.');
    }
    const e = await tx.employee.update({ where: { id }, data: input });
    const changes: string[] = [];
    if (input.name !== undefined && input.name !== before.name) changes.push(`nombre: ${before.name} → ${e.name}`);
    if (input.role !== undefined && input.role !== before.role) changes.push(`rol: ${ROLE_LABEL[before.role as Role]} → ${ROLE_LABEL[input.role]}`);
    if (input.active !== undefined && input.active !== before.active) changes.push(e.active ? 'activado' : 'desactivado');
    if (changes.length) {
      await appendAudit(tx, { employeeId: actor.id, action: 'Usuario modificado', detail: `${e.name} (${e.username}) · ${changes.join(' · ')}` });
    }
    return toEmployeeDto(e);
  });
}

export async function setPassword(actor: AuthEmployee, id: number, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const e = await tx.employee.findUnique({ where: { id } });
    if (!e) throw new HttpError(404, 'El usuario no existe.');
    await tx.employee.update({ where: { id }, data: { passwordHash } });
    await appendAudit(tx, { employeeId: actor.id, action: 'Cambio de contraseña', detail: `${e.name} (${e.username})` });
  });
}

/** Returns the active admin whose password matches, or null. Used to authorize cancellations. */
export async function findAdminByPassword(password: string): Promise<{ id: number; name: string } | null> {
  const admins = await prisma.employee.findMany({ where: { role: 'Admin', active: true } });
  for (const a of admins) {
    if (await bcrypt.compare(password, a.passwordHash)) return { id: a.id, name: a.name };
  }
  return null;
}
