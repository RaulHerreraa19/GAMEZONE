// Example seed data for the demo. Names and PINs are placeholders, not real client data.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS } from '../src/services/settings.js';

const prisma = new PrismaClient();

const STATIONS = [
  { id: 1, name: 'Xbox 1', consoleType: 'Xbox' },
  { id: 2, name: 'Xbox 2', consoleType: 'Xbox' },
  { id: 3, name: 'Xbox 3', consoleType: 'Xbox' },
  { id: 4, name: 'PS5 1', consoleType: 'PS5' },
  { id: 5, name: 'PS5 2', consoleType: 'PS5' },
  { id: 6, name: 'PS5 3', consoleType: 'PS5' },
  { id: 7, name: 'Switch 2 · 1', consoleType: 'Switch2' },
  { id: 8, name: 'Switch 2 · 2', consoleType: 'Switch2' },
];

const EMPLOYEES = [
  { name: 'Daniela R.', role: 'Cashier', roleLabel: 'Cajera · turno vespertino', pin: '1234' },
  { name: 'Administrador', role: 'Admin', roleLabel: 'Administrador', pin: '0000' },
];

async function main() {
  for (const [i, st] of STATIONS.entries()) {
    await prisma.station.upsert({
      where: { id: st.id },
      update: { name: st.name, consoleType: st.consoleType, order: i + 1 },
      create: { ...st, order: i + 1 },
    });
  }
  for (const e of EMPLOYEES) {
    const pinHash = await bcrypt.hash(e.pin, 10);
    await prisma.employee.upsert({
      where: { name: e.name },
      update: { role: e.role, roleLabel: e.roleLabel, pinHash, active: true },
      create: { name: e.name, role: e.role, roleLabel: e.roleLabel, pinHash },
    });
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: { value: JSON.stringify(value) }, create: { key, value: JSON.stringify(value) } });
  }
  console.log(`Seed listo: ${STATIONS.length} estaciones, ${EMPLOYEES.length} empleados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
