/* ---------- Núcleo: datos, almacenamiento, estado global ---------- */
const D = window.KAIROS_DATA;
const E = window.KairosEngine;
/* Librería para escribir el Excel propio (nunca lee ficheros ajenos). La versión autónoma la lleva incrustada
 * sin ejecutar; la alojada la pide al CDN con integridad (SRI). */
const XLSX_LIB = { id: 'xlsx-escribir', cdn: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', sri: 'sha384-OUW9euuUyxyHcAhTqbhI+Iyb8LMssXt/cpz0yXhs9UWG2/R/uaWdakx/4cfww7Vb' };
const VERSION = '1.0.1';

const clone = (o) => JSON.parse(JSON.stringify(o));
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const blank = E.isBlank;
const fmtH = (h) => (lang() === 'en' ? E.fmtH(h).replace(',', '.').replace(' días', ' days') : E.fmtH(h));
const pct = (x, d = 0) => (Number(x) * 100).toLocaleString(locale(), { maximumFractionDigits: d, minimumFractionDigits: d }) + ' %';
const eur = (x) => Math.round(Number(x) || 0).toLocaleString(locale()) + ' €';
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? '—' : d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }); };
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const uid = () => { const b = new Uint8Array(6); crypto.getRandomValues(b); return [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 10); };
const initials = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '··';

/* Almacenamiento: localStorage si está disponible; si no, memoria (la app funciona igual) */
const MEM = {};
let storeWarned = false;
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? safeParse(v) : (MEM[k] ?? null); } catch (e) { return MEM[k] ?? null; } },
  set(k, v) {
    MEM[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {
      if (!storeWarned) { storeWarned = true; setTimeout(() => toast('No se pudo guardar en este navegador. Descarga una copia de seguridad.', 'error'), 0); }
    }
  },
  del(k) { delete MEM[k]; try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
};
const WS_KEY = 'kairos/v1/ws';
const PKEY = (id) => 'kairos/v1/p/' + id;

let ws = null;     // espacio de trabajo: perfil, ajustes y lista de proyectos (se valida al arrancar)
const saveWs = () => store.set(WS_KEY, ws);
let state = null;  // proyecto activo
let calc = null;   // resultado del motor
const initialView = (location.hash || '').replace('#', '');
const ui = {
  view: 'inicio', fOpen: null, aOpen: null, tOpen: null, sevFiltro: 'todas', preTab: 'hallazgos',
  confirm: null, menu: null, palette: false, paletteQ: '', paletteIdx: 0, lastIn: {}, helpTab: 'inicio', glosarioQ: '',
  wizard: null, busyXlsx: false
};

const reglasOff = () => new Set(ws.settings.reglasOff || []);
function recompute() {
  if (!state) { calc = null; return; }
  calc = E.calcular(state);
  const off = reglasOff();
  if (off.size) { calc.checks = calc.checks.filter((c) => !off.has(c.id)); for (const k of ['ncMayor', 'ncMenor', 'obs']) calc.kpi[k] = calc.checks.filter((c) => c.sev === { ncMayor: 'NC mayor', ncMenor: 'NC menor', obs: 'Observación' }[k]).length; }
}
function snapshot() {
  if (!state || !calc) return;
  const s = { fecha: today(), ...E.instantanea(calc) };
  state.historial = (state.historial || []).filter((h) => h.fecha !== s.fecha);
  state.historial.push(s); state.historial = state.historial.slice(-24);
}
let saveT = null;
function saveProject() {
  if (!state || !ws.activeId) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    store.set(PKEY(ws.activeId), state);
    const p = ws.projects.find((x) => x.id === ws.activeId);
    if (p) { p.updated = new Date().toISOString(); p.nombre = state.meta.nombre || p.nombre; p.organizacion = state.meta.organizacion || ''; p.categoria = state.meta.categoria; p.preparacion = calc ? calc.kpi.preparacion : 0; p.ncMayor = calc ? calc.kpi.ncMayor : 0; }
    saveWs();
  }, 200);
}
function commit(msg) { recompute(); snapshot(); saveProject(); render(); if (msg) toast(msg); }

/* ---------- Proyectos ---------- */
const activeMeta = () => ws.projects.find((p) => p.id === ws.activeId) || null;
const isDemo = () => activeMeta()?.kind === 'demo';
function openProject(id, view = 'panel') {
  const st = store.get(PKEY(id));
  if (!st) { toast('No se encuentra el proyecto', 'error'); return; }
  state = sanitizeState(st); ws.activeId = id; saveWs();
  ui.fOpen = ui.aOpen = ui.tOpen = null;
  recompute(); snapshot(); saveProject(); go(view);
}
function openCase(caseId) {
  const cs = D.casos.find((c) => c.id === caseId); if (!cs) return;
  const id = 'demo-' + caseId;
  if (!store.get(PKEY(id))) {
    store.set(PKEY(id), clone(cs.state));
    ws.projects = ws.projects.filter((p) => p.id !== id);
    ws.projects.unshift({ id, kind: 'demo', caseId, nombre: cs.titulo, organizacion: cs.state.meta.organizacion, created: new Date().toISOString(), updated: new Date().toISOString(), categoria: cs.state.meta.categoria });
  }
  ws.onboarded = true; openProject(id);
  toast(`Caso de ejemplo: ${cs.titulo}`);
}
function resetCase(caseId) {
  const cs = D.casos.find((c) => c.id === caseId); if (!cs) return;
  store.set(PKEY('demo-' + caseId), clone(cs.state));
  if (ws.activeId === 'demo-' + caseId) { state = sanitizeState(clone(cs.state)); recompute(); render(); }
  toast('Caso restablecido a su estado original');
}
function createProject(st, { view = 'panel', msg } = {}) {
  const id = 'p-' + uid();
  st = sanitizeState(st);
  store.set(PKEY(id), st);
  ws.projects.unshift({ id, kind: 'own', nombre: st.meta.nombre || st.meta.organizacion || 'Proyecto', organizacion: st.meta.organizacion || '', created: new Date().toISOString(), updated: new Date().toISOString(), categoria: st.meta.categoria });
  ws.onboarded = true; saveWs(); openProject(id, view);
  if (msg) toast(msg);
}
function deleteProject(id) {
  store.del(PKEY(id)); ws.projects = ws.projects.filter((p) => p.id !== id);
  if (ws.activeId === id) { ws.activeId = null; state = null; recompute(); }
  saveWs();
}
const ROLES_BASE = ['Responsable de crisis', 'Responsable de recuperación técnica', 'Responsable de comunicación'];
function blankState({ nombre = '', organizacion = '', sistema = '', categoria = 'MEDIA', responsable = '', alcance = '', funciones = [] } = {}) {
  return {
    version: 1, meta: { nombre: nombre || organizacion, organizacion, sistema, categoria, responsable, alcance },
    funciones, activos: [], proveedores: [],
    bcp: { equipo: ROLES_BASE.map((rol) => ({ rol, titular: '', suplente: '', telefono: '', responsabilidades: '' })), activacion: { umbralHoras: null, autorizado: '', escenarios: '' },
      comunicacion: { primario: '', secundario: '', externo: '', plantilla: '' }, sitio: { tipo: 'ninguno', ubicacion: '', distanciaKm: null, rtoActivacion: null, capacidad: '' } },
    pruebas: [], revision: { version: '0.1', fecha: today(), proxima: '', aprobadoPor: '', disparadores: '', historial: [] }, acciones: {}, historial: []
  };
}
const impactoVacio = () => Object.fromEntries(E.HORIZONTES.map((hz) => [hz.k, Object.fromEntries(E.DIMENSIONES.map((d) => [d.k, 0]))]));

/* ---------- Apariencia ---------- */
function applyTheme() {
  const r = document.documentElement;
  if (ws.settings.tema === 'claro') r.setAttribute('data-theme', 'light');
  else if (ws.settings.tema === 'oscuro') r.setAttribute('data-theme', 'dark');
  else r.removeAttribute('data-theme');
  r.setAttribute('data-accent', ws.settings.acento);
  r.setAttribute('data-density', ws.settings.densidad);
  r.lang = ws.settings.idioma === 'en' ? 'en' : 'es';
}
