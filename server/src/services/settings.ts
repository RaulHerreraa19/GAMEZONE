import { prisma } from '../db.js';
import type { SettingsDto } from '../types.js';

export const DEFAULT_SETTINGS: SettingsDto = {
  rateCentsPerPersonHour: 5000,
  packages: [
    { minutes: 30, label: '30 min' },
    { minutes: 60, label: '1 hora' },
    { minutes: 90, label: '1 h 30' },
    { minutes: 120, label: '2 horas' },
    { minutes: 3, label: 'Demo 3 min' },
  ],
  extensions: [
    { minutes: 15, label: '+15 min' },
    { minutes: 30, label: '+30 min' },
    { minutes: 60, label: '+1 hora' },
  ],
  warnMinutes: 5,
  warnMinutesShort: 1,
  shortThreshold: 10,
};

let cache: SettingsDto | null = null;

export async function getSettings(): Promise<SettingsDto> {
  if (cache) return cache;
  const rows = await prisma.setting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key in DEFAULT_SETTINGS) merged[r.key] = JSON.parse(r.value);
  }
  cache = merged as unknown as SettingsDto;
  return cache;
}
