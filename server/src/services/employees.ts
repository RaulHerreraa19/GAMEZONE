import { prisma } from '../db.js';
import type { EmployeeDto, Role } from '../types.js';

export function toEmployeeDto(e: { id: number; name: string; role: string; roleLabel: string }): EmployeeDto {
  return { id: e.id, name: e.name, role: e.role as Role, roleLabel: e.roleLabel };
}

export async function listEmployees(): Promise<EmployeeDto[]> {
  const rows = await prisma.employee.findMany({ where: { active: true }, orderBy: { id: 'asc' } });
  return rows.map(toEmployeeDto);
}
