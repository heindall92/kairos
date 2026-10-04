#!/usr/bin/env node
/* Genera los gráficos del README de KAIROS con el lenguaje de la app: escenario negro, verde eléctrico
 * (#30D158, el verde del sistema de Apple en modo oscuro), fuente del sistema y superficies planas, sin degradados.
 * Los glifos son los de la propia app (Lucide). Uso: node docs/assets/generar.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const OUT = __dirname;
const ICONS = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'app/src/ui/02-icons.js'), 'utf8') + '\n;ICONS');
const FONT = "ui-rounded, 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI Variable Display', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/* Colores del sistema de Apple */
const C = { green: '#30D158', greenInk: '#1A7F37', blue: '#0A84FF', indigo: '#5E5CE6', orange: '#FF9F0A', red: '#FF453A', teal: '#40C8E0',
  yellow: '#FFD60A', purple: '#BF5AF2', graphite: '#1C1C1E', black: '#0B0B0C' };

/* Iconos que no usa la app y sí el README (Lucide, ISC) */
const EXTRA = {
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  layoutGrid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  terminal: '<path d="M12 19h8"/><path d="m4 17 6-6-6-6"/>',
  bug: '<path d="M12 20v-9"/><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"/><path d="M14.12 3.88 16 2"/><path d="M21 21a4 4 0 0 0-3.81-4"/><path d="M21 5a4 4 0 0 1-3.55 3.97"/><path d="M22 13h-4"/><path d="M3 21a4 4 0 0 1 3.81-4"/><path d="M3 5a4 4 0 0 0 3.55 3.97"/><path d="M6 13H2"/><path d="m8 2 1.88 1.88"/><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"/>',
  gitBranch: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  workflow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  accessibility: '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
  wifiOff: '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
  fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>'
};
const glyph = (name) => ICONS[name] || EXTRA[name];

/* ---------- Iconos de sección: verde legible en el tema claro y en el oscuro de GitHub ---------- */
const SECTION = { route: 'route', 'list-checks': 'listChecks', rocket: 'arrowRight', 'shield-check': 'shieldCheck', terminal: 'terminal',
  'folder-tree': 'folder', 'triangle-alert': 'alert', scale: 'scale', 'user-round': 'user', image: 'image', 'layout-grid': 'layoutGrid',
  network: 'network', accessibility: 'accessibility', 'file-check': 'fileCheck', target: 'target', hourglass: 'hourglass', gauge: 'gauge' };
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
for (const [file, name] of Object.entries(SECTION)) {
  fs.writeFileSync(path.join(OUT, 'icons', file + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#28A745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph(name)}</svg>\n`);
}

/* ---------- Mosaicos tipo icono de app: superficie plana con radio del 22 % ---------- */
const tile = (id, color, label, { g, text, ink = '#FFFFFF' }) => {
  const body = g
    ? `<g transform="translate(80 46) scale(4)" fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${glyph(g)}</g>
  <text x="128" y="206" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${label.length > 9 ? 26 : 31}" letter-spacing="-0.4" fill="${ink}">${label}</text>`
    : `<text x="128" y="${text.sub ? 132 : 152}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${text.size || 76}" letter-spacing="-2" fill="${ink}">${text.main}</text>${text.sub ? `
  <text x="128" y="190" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="28" letter-spacing="-0.3" fill="${ink}" fill-opacity="0.86">${text.sub}</text>` : ''}`;
  return [id, `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${label}">
  <title>${label}</title>
  <rect width="256" height="256" rx="57" fill="${color}"/>
  ${body}
</svg>
`];
};
const K = '#0B0B0C';
const TILES = [
  // Normativa
  tile('iso22301', C.green, 'ISO 22301', { text: { main: '22301', sub: 'ISO · 2019', size: 74 }, ink: K }),
  tile('iso27001', C.indigo, 'ISO/IEC 27001', { text: { main: '27001', sub: 'A.5.29 · A.8.13', size: 74 } }),
  tile('ens', C.blue, 'ENS', { text: { main: 'ENS', sub: 'op.cont', size: 84 } }),
  tile('ccn-stic', C.red, 'CCN-STIC', { text: { main: 'CCN', sub: 'STIC 817', size: 84 } }),
  // Motor
  tile('bia', C.green, 'BIA', { g: 'layers', ink: K }),
  tile('ruta', C.black, 'Ruta crítica', { g: 'route', ink: C.green }),
  tile('rpo', C.teal, 'RPO', { g: 'database', ink: K }),
  tile('crisis', C.orange, 'Crisis', { g: 'users', ink: K }),
  tile('reglas', C.purple, '28 reglas', { g: 'listChecks' }),
  // Código
  tile('javascript', C.yellow, 'JavaScript', { text: { main: 'JS', sub: 'ES2022', size: 96 }, ink: K }),
  tile('html', C.orange, 'HTML', { text: { main: 'HTML', size: 72 }, ink: K }),
  tile('css', C.blue, 'CSS', { text: { main: 'CSS', size: 84 } }),
  tile('nodejs', C.green, 'Node.js', { text: { main: 'Node', sub: 'build', size: 72 }, ink: K }),
  // Calidad
  tile('pruebas', C.green, 'node:test', { g: 'check', ink: K }),
  tile('playwright', C.teal, 'Playwright', { g: 'monitor', ink: K }),
  tile('axe', C.purple, 'axe-core', { g: 'accessibility' }),
  // Seguridad
  tile('csp', C.red, 'CSP', { g: 'lock' }),
  tile('sri', C.orange, 'SRI', { g: 'fingerprint', ink: K }),
  tile('sin-red', C.black, 'Sin red', { g: 'wifiOff', ink: C.green }),
  // Publicación
  tile('git', C.red, 'Git', { g: 'gitBranch' }),
  tile('actions', C.blue, 'Actions', { g: 'workflow' }),
  tile('pages', C.graphite, 'Pages', { g: 'globe' })
];
fs.mkdirSync(path.join(OUT, 'stack'), { recursive: true });
for (const [id, svg] of TILES) fs.writeFileSync(path.join(OUT, 'stack', id + '.svg'), svg);

/* ---------- Cabecera y pie con ola flotante en verde eléctrico ----------
   La cabecera es el escenario negro de la app: el Reloj de recuperación como marca y dos capas de ola del mismo verde,
   la trasera con opacidad. Se desplazan despacio en bucle; con «reducir movimiento» del sistema se quedan quietas. */
const wavePath = (w, base, amp, len, up) => {
  let d = `M0 ${base}`;
  for (let x = 0; x < w; x += len) d += ` C${x + len * 0.25} ${base - amp},${x + len * 0.25} ${base - amp},${x + len * 0.5} ${base} S${x + len * 0.75} ${base + amp},${x + len} ${base}`;
  return d + (up ? ` V400 H0 Z` : ` V400 H0 Z`);
};
const WAVE_CSS = `<style>
    .w1 { animation: flota 24s linear infinite; } .w2 { animation: flota 16s linear infinite reverse; }
    .t { animation: sube 1.2s cubic-bezier(.32,.72,0,1) both; }
    .r { stroke-dasharray: 1 1; animation: anillo 1.6s cubic-bezier(.32,.72,0,1) both; }
    @keyframes flota { from { transform: translateX(0); } to { transform: translateX(-640px); } }
    @keyframes sube { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes anillo { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .w1, .w2, .t, .r { animation: none; } }
  </style>`;
/* Marca: anillos concéntricos que no cierran, como el Reloj de recuperación */
const arc = (cx, cy, r, f) => { const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * f; const p = (a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`; return `M${p(a0)} A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${p(a1)}`; };
const marca = (cx, cy) => [[34, 0.86, C.green], [24, 0.62, C.green], [14, 0.4, C.red]].map(([r, f, c], i) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-opacity=".2" stroke-width="7"/><path class="r" style="animation-delay:${i * 120}ms" d="${arc(cx, cy, r, f)}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" pathLength="1"/>`).join('');
const header = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="320" viewBox="0 0 1280 320" role="img" aria-label="KAIROS · Continuidad de negocio">
  <title>KAIROS · Continuidad de negocio</title>
  ${WAVE_CSS}
  <clipPath id="c"><rect width="1280" height="320" rx="32"/></clipPath>
  <g clip-path="url(#c)">
    <rect width="1280" height="320" fill="${C.black}"/>
    <g class="w1"><path d="${wavePath(1920, 268, 14, 640, true)}" fill="${C.green}" fill-opacity="0.32"/></g>
    <g class="w2"><path d="${wavePath(1920, 286, 12, 640, true)}" fill="${C.green}"/></g>
  </g>
  <g class="t">
    ${marca(640, 74)}
    <text x="640" y="176" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="64" letter-spacing="2" fill="#FFFFFF">KAIROS</text>
    <text x="640" y="214" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="22" letter-spacing="-0.2" fill="#A1A1A6">Continuidad de negocio · BIA · BCP · DRP · ruta crítica de recuperación</text>
  </g>
</svg>
`;
const footer = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="130" viewBox="0 0 1280 130" role="img" aria-label="Fin">
  ${WAVE_CSS}
  <g class="w1"><path d="${wavePath(1920, 70, 14, 640, false)}" fill="${C.green}" fill-opacity="0.32"/></g>
  <g class="w2"><path d="${wavePath(1920, 88, 12, 640, false)}" fill="${C.green}"/></g>
</svg>
`;
/* Cifras bajo la cabecera */
const stats = (dark) => {
  const k = dark ? { bg: '#1C1C1E', ink: '#F5F5F7', faint: '#A1A1A6', acc: C.green } : { bg: '#F2F2F7', ink: '#111113', faint: '#5F5F64', acc: '#1A7F37' };
  const items = [['5 × 4', 'matriz de impacto'], ['28', 'reglas de preauditoría'], ['3', 'casos de ejemplo'], ['0', 'peticiones de red']];
  const colW = 300; const x0 = 640 - (colW * items.length) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="150" viewBox="0 0 1280 150" role="img" aria-label="${items.map(([n, l]) => `${n} ${l}`).join(', ')}">
  <rect width="1280" height="150" rx="28" fill="${k.bg}"/>
  ${items.map(([n, l], i) => `<text x="${x0 + colW * i + colW / 2}" y="74" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="48" letter-spacing="-1.4" fill="${i === 0 ? k.acc : k.ink}">${n}</text>
  <text x="${x0 + colW * i + colW / 2}" y="110" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="19" fill="${k.faint}">${l}</text>`).join('\n  ')}
</svg>
`;
};
fs.mkdirSync(path.join(OUT, 'readme'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'readme', 'cabecera.svg'), header());
fs.writeFileSync(path.join(OUT, 'readme', 'pie.svg'), footer());
fs.writeFileSync(path.join(OUT, 'readme', 'cifras-light.svg'), stats(false));
fs.writeFileSync(path.join(OUT, 'readme', 'cifras-dark.svg'), stats(true));
console.log(`OK: ${TILES.length} mosaicos, ${Object.keys(SECTION).length} iconos de sección, cabecera, pie y cifras`);
