// Example seed data for the demo. Only one example admin is created; the admin registers
// every other user from the Usuarios screen. Change the password before going live.
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

const ADMIN = { name: 'Administrador', username: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'admin123' };

async function main() {
  for (const [i, st] of STATIONS.entries()) {
    await prisma.station.upsert({
      where: { id: st.id },
      update: { name: st.name, consoleType: st.consoleType, order: i + 1 },
      create: { ...st, order: i + 1 },
    });
  }
  // Never overwrite an existing admin's password on re-seed.
  await prisma.employee.upsert({
    where: { username: ADMIN.username },
    update: { role: 'Admin', active: true },
    create: { name: ADMIN.name, username: ADMIN.username, role: 'Admin', passwordHash: await bcrypt.hash(ADMIN.password, 10) },
  });
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: { value: JSON.stringify(value) }, create: { key, value: JSON.stringify(value) } });
  }
  console.log(`Seed listo: ${STATIONS.length} estaciones y el usuario administrador "${ADMIN.username}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
