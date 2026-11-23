import { memo } from 'react';
import type { ConsoleType, StationState } from '@shared';
import { TYPE_CLASS } from '../lib/labels';

// Inner markup of the 3D room, ported from scene() in docs/prototipo-caja.html.
// It is static per console type; state and players only toggle CSS classes on the wrapper.
const floorLines =
  [0.2, 0.4, 0.6, 0.8].map((t) => `<line x1="${68 + 184 * t}" y1="132" x2="${320 * t}" y2="200"/>`).join('') +
  [148, 170].map((y) => `<line x1="${68 - (y - 132)}" y1="${y}" x2="${252 + (y - 132)}" y2="${y}"/>`).join('');

function sceneMarkup(type: string): string {
  const con = type === 'nin' ? '<use href="#con-nin" x="219" y="78" width="38" height="38"/>' : `<use href="#con-${type}" x="218" y="74" width="40" height="40"/>`;
  return `<polygon points="0,0 320,0 252,18 68,18" fill="#0e1014"/>
  <polygon points="0,0 68,18 68,132 0,200" fill="url(#gWallL)"/><polygon points="320,0 252,18 252,132 320,200" fill="url(#gWallR)"/>
  <path d="M14 22L54 32V122L14 150ZM306 22L266 32V122L306 150Z" fill="#ffffff" opacity=".025"/>
  <rect x="68" y="18" width="184" height="114" fill="url(#gWallB)"/>
  <line x1="68" y1="18.6" x2="252" y2="18.6" stroke="currentColor" stroke-width="1.2" opacity=".55"/>
  <polygon points="68,132 252,132 320,200 0,200" fill="url(#gFloor)"/>
  <g stroke="#fff" stroke-opacity=".05">${floorLines}</g>
  <g class="amb"><ellipse cx="160" cy="55" rx="96" ry="46" opacity=".35"/><ellipse cx="160" cy="55" rx="78" ry="40" opacity=".45"/><ellipse cx="160" cy="55" rx="62" ry="34" opacity=".6"/></g>
  <rect x="101" y="24" width="124" height="70" rx="3" fill="#000" opacity=".35"/>
  <rect x="98" y="20" width="124" height="70" rx="3" fill="#050608" stroke="#2c313b" stroke-width=".6"/>
  <svg x="101" y="23" width="118" height="64" viewBox="0 0 118 64">
    <g class="sc sc-g"><rect width="118" height="64" fill="url(#gGame)"/><path d="M0 50L20 38L35 46L55 30L75 44L95 34L118 46V64H0Z" fill="#000" opacity=".35"/><rect class="sweep" x="0" y="-10" width="16" height="90" fill="#fff" opacity=".1" transform="skewX(-20)"/><rect x="6" y="6" width="26" height="3" rx="1" fill="#fff" opacity=".35"/><rect x="6" y="6" width="18" height="3" rx="1" fill="#dcaaff"/></g>
    <g class="sc sc-l"><rect width="118" height="64" fill="url(#gLock)"/><g class="lk"><path d="M53 27v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#ff4d5e" stroke-width="2.4"/><rect x="50" y="26" width="18" height="13" rx="2" fill="#ff4d5e"/></g><text x="59" y="51" text-anchor="middle" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="8" fill="#fff">TIEMPO TERMINADO</text><text x="59" y="59" text-anchor="middle" font-family="Inter,sans-serif" font-size="5.5" fill="#f1c6cb">Pasa a caja para extender</text></g>
    <g class="sc sc-i"><rect width="118" height="64" fill="url(#gIdle)"/><use href="#gzLogo" transform="translate(29,4) scale(.1012)"/><text x="59" y="47" text-anchor="middle" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="7.5" fill="#dcaaff">DISPONIBLE</text><text x="59" y="56" text-anchor="middle" font-family="Inter,sans-serif" font-size="5.5" fill="#bfb2cc">$50 por persona por hora</text></g>
  </svg>
  <rect class="ledbar" x="106" y="91.5" width="108" height="1.6" rx=".8"/>
  <g class="amb2"><ellipse cx="160" cy="138" rx="110" ry="10" opacity=".5"/><ellipse cx="160" cy="137" rx="80" ry="6" opacity=".8"/></g>
  <polygon points="76,112 244,112 252,119 68,119" fill="#2b303a"/><polygon points="76,112 244,112 244,112.6 76,112.6" fill="#fff" opacity=".08"/><rect x="68" y="119" width="184" height="15" fill="url(#gTable)"/>
  <rect x="96" y="125.5" width="40" height="1.2" rx=".6" fill="#3a404c"/><rect x="184" y="125.5" width="40" height="1.2" rx=".6" fill="#3a404c"/>
  <path transform="translate(-30,0)" d="M110 114c0-2.6 2.6-3.6 5.4-3.6h9.2c2.8 0 5.4 1 5.4 3.6l.9 2.6c0 1.8-1.8 2.6-2.7 1.8l-2.7-1.8h-10.8l-2.7 1.8c-.9.8-2.7 0-2.7-1.8z" fill="#121418"/>
  ${con}
  <ellipse cx="160" cy="188" rx="128" ry="13" fill="#000" opacity=".3"/>
  <use class="hd hd1" href="#head" transform="translate(122,147)"/><use href="#chair" transform="translate(122,151)"/>
  <use class="hd hd2" href="#head" transform="translate(198,147)"/><use href="#chair" transform="translate(198,151)"/>`;
}

const SceneSvg = memo(function SceneSvg({ typeClass, name }: { typeClass: string; name: string }) {
  return <svg className="scene" viewBox="0 0 320 200" role="img" aria-label={`Sala ${name}`} dangerouslySetInnerHTML={{ __html: sceneMarkup(typeClass) }} />;
});

export function StationScene({ type, state, players, name }: { type: ConsoleType; state: StationState; players: number; name: string }) {
  const typeClass = TYPE_CLASS[type];
  return (
    <div className={`scene-box ${state} ct-${typeClass} pl${players}`}>
      <SceneSvg typeClass={typeClass} name={name} />
    </div>
  );
}
