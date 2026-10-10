/* ---------- Seguridad: todo lo que entra se trata como no fiable ----------
 * - Validación por esquema de proyectos, copias y almacenamiento local (listas blancas, límites, tipos).
 * - Claves peligrosas (__proto__, constructor, prototype) bloqueadas en cualquier ruta de escritura.
 * - Neutralización de fórmulas en CSV y de HTML y Markdown en los informes.
 * La salida al DOM se escapa siempre con esc(); nunca se inserta HTML procedente de datos. */
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const LIM = { str: 4000, arr: 1000, fileJson: 20 * 1024 * 1024 };
const s = (v, max = LIM.str) => (v === null || v === undefined ? '' : String(typeof v === 'object' ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/;
const idOk = (v) => (typeof v === 'string' || typeof v === 'number') && ID_RE.test(String(v)) ? String(v) : null;
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const num = (v, min, max, def = min) => { const n = Number(v); return v !== null && v !== '' && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };
const hrs = (v) => num(v, 0, 8760, null); // horas: 0 a un año; vacío = sin definir
const isoTs = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(v) ? v : '');
const dateOk = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : '');
const arr = (v, max = LIM.arr) => (Array.isArray(v) ? v.slice(0, max) : []);
function safeEntries(o, max = 500) { return isObj(o) ? Object.keys(o).filter((k) => !BAD_KEYS.has(k)).slice(0, max).map((k) => [k, o[k]]) : []; }
function safeParse(text) { return JSON.parse(text, (k, v) => (BAD_KEYS.has(k) ? undefined : v)); }
const CASE_IDS = D.casos.map((c) => c.id);
const ESTRATEGIAS = Object.keys(E.ESTRATEGIAS);
const SITIOS = ['ninguno', 'hot', 'warm', 'cold', 'cloud'];
const uniq = (list) => [...new Set(list)];

function sanitizeState(raw) {
  const r = isObj(raw) ? raw : {};
  const st = { version: 1 };
  if (CASE_IDS.includes(r.caseId)) st.caseId = r.caseId;
  const m = isObj(r.meta) ? r.meta : {};
  st.meta = { nombre: s(m.nombre, 200), organizacion: s(m.organizacion, 200), sistema: s(m.sistema, 300), categoria: oneOf(m.categoria, E.CATEGORIAS, 'MEDIA'), responsable: s(m.responsable, 200), alcance: s(m.alcance, 3000) };

  const aIds = new Set(); const pIds = new Set(); const fIds = new Set();
  const activos = arr(r.activos, 300).filter((a) => isObj(a) && idOk(a.id) && !aIds.has(a.id) && aIds.add(a.id));
  const proveedores = arr(r.proveedores, 200).filter((p) => isObj(p) && idOk(p.id) && !pIds.has(p.id) && pIds.add(p.id));
  const funciones = arr(r.funciones, 300).filter((f) => isObj(f) && idOk(f.id) && !fIds.has(f.id) && fIds.add(f.id));

  st.activos = activos.map((a) => {
    const b = isObj(a.backup) ? a.backup : null; const pr = isObj(a.procedimiento) ? a.procedimiento : {};
    return { id: String(a.id), nombre: s(a.nombre, 200), tipo: oneOf(a.tipo, E.TIPOS_ACTIVO, 'Servidor'), datos: a.datos === true, estrategia: oneOf(a.estrategia, ESTRATEGIAS, 'ninguna'),
      tiempoRecuperacion: hrs(a.tiempoRecuperacion), dependeDe: uniq(arr(a.dependeDe, 100).filter((x) => aIds.has(x) && x !== a.id)), ubicacion: s(a.ubicacion, 300), responsable: s(a.responsable, 200),
      procedimiento: { pasos: s(pr.pasos), exito: s(pr.exito, 2000), credenciales: s(pr.credenciales, 300) },
      backup: !b || b.aplica === false ? { aplica: false } : { aplica: true, tipo: s(b.tipo, 120), frecuenciaHoras: hrs(b.frecuenciaHoras), retencionDias: num(b.retencionDias, 0, 36500, null), offsite: b.offsite === true, cifrado: b.cifrado === true, inmutable: b.inmutable === true, ultimaRestauracion: dateOk(b.ultimaRestauracion), resultado: oneOf(b.resultado, ['OK', 'Parcial', 'Fallido', 'Pendiente'], 'Pendiente') } };
  });
  st.proveedores = proveedores.map((p) => ({ id: String(p.id), nombre: s(p.nombre, 200), servicio: s(p.servicio, 300), contacto: s(p.contacto, 300), slaHoras: hrs(p.slaHoras), contrato: s(p.contrato, 120), bcmVerificado: p.bcmVerificado === true }));
  st.funciones = funciones.map((f) => {
    const im = isObj(f.impacto) ? f.impacto : {}; const dep = isObj(f.dependencias) ? f.dependencias : {};
    return { id: String(f.id), nombre: s(f.nombre, 200), descripcion: s(f.descripcion, 2000), responsable: s(f.responsable, 200),
      rto: hrs(f.rto), rpo: hrs(f.rpo), mtpd: hrs(f.mtpd), costeHora: num(f.costeHora, 0, 1e9, 0), alternativa: s(f.alternativa, 2000),
      impacto: Object.fromEntries(E.HORIZONTES.map((hz) => [hz.k, Object.fromEntries(E.DIMENSIONES.map((d) => [d.k, Math.round(num(isObj(im[hz.k]) ? im[hz.k][d.k] : 0, 0, 4, 0))]))])),
      dependencias: { activos: uniq(arr(dep.activos, 100).filter((x) => aIds.has(x))), funciones: uniq(arr(dep.funciones, 100).filter((x) => fIds.has(x) && x !== f.id)), proveedores: uniq(arr(dep.proveedores, 100).filter((x) => pIds.has(x))) } };
  });

  const b = isObj(r.bcp) ? r.bcp : {}; const ac = isObj(b.activacion) ? b.activacion : {}; const co = isObj(b.comunicacion) ? b.comunicacion : {}; const si = isObj(b.sitio) ? b.sitio : {};
  st.bcp = {
    equipo: arr(b.equipo, 30).filter(isObj).map((x) => ({ rol: s(x.rol, 120), titular: s(x.titular, 200), suplente: s(x.suplente, 200), telefono: s(x.telefono, 60), responsabilidades: s(x.responsabilidades, 1000) })),
    activacion: { umbralHoras: hrs(ac.umbralHoras), autorizado: s(ac.autorizado, 200), escenarios: s(ac.escenarios) },
    comunicacion: { primario: s(co.primario, 300), secundario: s(co.secundario, 300), externo: s(co.externo, 300), plantilla: s(co.plantilla) },
    sitio: { tipo: oneOf(si.tipo, SITIOS, 'ninguno'), ubicacion: s(si.ubicacion, 300), distanciaKm: num(si.distanciaKm, 0, 40000, null), rtoActivacion: hrs(si.rtoActivacion), capacidad: s(si.capacidad, 2000) }
  };
  const tIds = new Set();
  st.pruebas = arr(r.pruebas, 500).filter((p) => isObj(p) && idOk(p.id) && !tIds.has(p.id) && tIds.add(p.id)).map((p) => ({
    id: String(p.id), fecha: dateOk(p.fecha), tipo: oneOf(p.tipo, Object.keys(E.TIPOS_PRUEBA), 'tabletop'),
    funciones: uniq(arr(p.funciones, 100).filter((x) => fIds.has(x))), activos: uniq(arr(p.activos, 100).filter((x) => aIds.has(x))),
    rtoReal: hrs(p.rtoReal), rpoReal: hrs(p.rpoReal), resultado: oneOf(p.resultado, E.RESULTADOS, 'OK'), gaps: s(p.gaps, 2000), accion: s(p.accion, 2000), responsable: s(p.responsable, 200) }));
  const rv = isObj(r.revision) ? r.revision : {};
  st.revision = { version: s(rv.version, 20), fecha: dateOk(rv.fecha), proxima: dateOk(rv.proxima), aprobadoPor: s(rv.aprobadoPor, 200), disparadores: s(rv.disparadores, 2000),
    historial: arr(rv.historial, 100).filter(isObj).map((h) => ({ version: s(h.version, 20), fecha: dateOk(h.fecha), motivo: s(h.motivo, 500), responsable: s(h.responsable, 200), aprobado: s(h.aprobado, 200) })) };
  st.acciones = {};
  for (const [k, a] of safeEntries(r.acciones, 2000)) if (isObj(a) && k.length <= 200) st.acciones[k] = { estado: oneOf(a.estado, ['Pendiente', 'En curso', 'Hecha'], 'Pendiente'), responsable: s(a.responsable, 200), fecha: dateOk(a.fecha) };
  st.historial = arr(r.historial, 60).filter((h) => isObj(h) && dateOk(h.fecha)).map((h) => ({ fecha: h.fecha, preparacion: num(h.preparacion, 0, 1, 0), ncMayor: Math.round(num(h.ncMayor, 0, 9999, 0)), ncMenor: Math.round(num(h.ncMenor, 0, 9999, 0)), exposicion: num(h.exposicion, 0, 1e12, 0) }));
  // Exposición técnica importada de CTEM-Nexus (sobre «yrd-ecosistema»): se vuelve a sanear en cada carga
  const ctem = isObj(r.ctem) ? E.desdeCtem(r.ctem) : null;
  if (ctem && Object.keys(ctem.activos).length) st.ctem = ctem;
  return st;
}
const PROJ_ID = /^(p-[a-z0-9]{4,20}|demo-[a-z]{2,20})$/;
const COLOR_IDS = ['green', 'blue', 'teal', 'amber', 'rose', 'slate'];
const REGLA_IDS = new Set(E.REGLAS.map((r) => r[0]));
function sanitizeWs(raw) {
  const r = isObj(raw) ? raw : {};
  const pr = isObj(r.profile) ? r.profile : {}; const se = isObj(r.settings) ? r.settings : {};
  return {
    profile: { nombre: s(pr.nombre, 120), rol: s(pr.rol, 80), organizacion: s(pr.organizacion, 160), email: s(pr.email, 160), color: oneOf(pr.color, COLOR_IDS, 'green') },
    settings: { tema: oneOf(se.tema, ['sistema', 'claro', 'oscuro'], 'sistema'), acento: oneOf(se.acento, ['green', 'blue', 'teal', 'amber', 'rose', 'graphite'], 'green'), densidad: oneOf(se.densidad, ['comoda', 'compacta'], 'comoda'),
      idioma: oneOf(se.idioma, ['es', 'en'], 'es'), reglasOff: arr(se.reglasOff, 60).filter((x) => REGLA_IDS.has(x)), mostrarCasos: se.mostrarCasos !== false },
    projects: arr(r.projects, 300).filter((p) => isObj(p) && PROJ_ID.test(String(p.id))).map((p) => ({ id: p.id, kind: oneOf(p.kind, ['own', 'demo'], 'own'), caseId: CASE_IDS.includes(p.caseId) ? p.caseId : undefined, nombre: s(p.nombre, 200), organizacion: s(p.organizacion, 200), created: isoTs(p.created), updated: isoTs(p.updated), categoria: oneOf(p.categoria, E.CATEGORIAS, undefined), preparacion: p.preparacion === undefined ? undefined : num(p.preparacion, 0, 1, 0), ncMayor: Math.round(num(p.ncMayor, 0, 9999, 0)) })),
    activeId: PROJ_ID.test(String(r.activeId)) ? r.activeId : null, onboarded: r.onboarded === true, profileDone: r.profileDone === true
  };
}
/* CSV: una celda que empieza por = + - @ (también tras espacios o en ancho completo) se ejecutaría como fórmula */
const noFormula = (v) => { const x = String(v ?? ''); return /^[\s\u00A0\u3000\u200B-\u200D\uFEFF]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]|^[\t\r\n]/.test(x) ? "'" + x : x; };
/* Markdown: se neutraliza HTML, enlaces, imágenes, énfasis y barras de tabla */
const mdSafe = (v) => String(v ?? '').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/\|/g, '/').replace(/[\\`*_[\]!]/g, '\\$&').replace(/[\r\n]+/g, ' ');
const mdBlock = (v) => String(v ?? '').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/[\\`*_[\]!#|]/g, '\\$&');
function checkSize(f, max, label) { if (f.size > max) { toast(`${label} demasiado grande (máximo ${Math.round(max / 1048576)} MB)`, 'error'); return false; } return true; }
