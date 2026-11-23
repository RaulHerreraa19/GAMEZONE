import type { ConsoleType, StationState } from '@shared';

export const TYPE_CLASS: Record<ConsoleType, string> = { Xbox: 'xbox', PS5: 'ps', Switch2: 'nin' };
export const STATE_LABEL: Record<StationState, string> = { free: 'Disponible', playing: 'En juego', warning: 'Por terminar', locked: 'Bloqueada' };

export const players = (n: number) => `${n} jugador${n > 1 ? 'es' : ''}`;
export const shortName = (name: string) => name.replace(/^(Xbox|PS5|Switch 2 ·) ?/, '');
