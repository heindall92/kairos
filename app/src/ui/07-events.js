/* ---------- Eventos ---------- */
function setPath(obj, path, value) {
  const ks = path.split('.');
  if (ks.some((k) => BAD_KEYS.has(k))) return; // defensa ante prototype pollution
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!Object.prototype.hasOwnProperty.call(o, k) || o[k] === null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  o[ks[ks.length - 1]] = typeof value === 'string' ? s(value) : value;
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o && !BAD_KEYS.has(k) ? o[k] : undefined), obj); }
function readVal(el) {
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.type === 'num') v = v === '' ? 0 : Math.max(0, Number(v) || 0);
  if (el.dataset.type === 'hrs') v = v === '' ? null : Math.max(0, Math.min(8760, Number(v) || 0));
  if (el.dataset.type === 'int') v = Math.max(0, Math.min(4, Math.round(Number(v) || 0)));
  if (el.dataset.type === 'bool') v = !!el.checked;
  return v;
}
function pickFile(accept, cb) {
  const inp = $('#file-any'); inp.accept = accept; inp.value = '';
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) cb(f); };
  inp.click();
}
const readText = (f, cb) => { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsText(f); };

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset.ws) { setPath(ws, el.dataset.ws, readVal(el)); saveWs(); recompute(); render(); return; }
  if (el.dataset.wz) {
    // Solo se redibuja si cambia algo visible (la categoría o un aviso): así no se reemplaza el campo al que pasa el foco
    setPath(ui.wizard, el.dataset.wz, readVal(el)); ui.wizard.error = '';
    const al = document.querySelector('.wizard .alert'); if (al) al.remove();
    if (el.tagName === 'SELECT') render(); return;
  }
  if (el.dataset.rule) { const st = new Set(ws.settings.reglasOff); el.checked ? st.delete(el.dataset.rule) : st.add(el.dataset.rule); ws.settings.reglasOff = [...st]; saveWs(); recompute(); render(); return; }
  if (el.dataset.acc && state) { const k = el.dataset.acc; state.acciones[k] = { ...(state.acciones[k] || { estado: 'Pendiente', responsable: '', fecha: '' }), [el.dataset.f]: s(el.value, 200) }; commit(el.dataset.f === 'estado' && el.value === 'Hecha' ? 'Acción completada' : null); return; }
  if (el.dataset.list && state) {
    const list = getPath(state, el.dataset.list); if (!Array.isArray(list)) return;
    const v = el.value; const next = el.checked ? [...new Set([...list, v])] : list.filter((x) => x !== v);
    setPath(state, el.dataset.list, next); state = sanitizeState(state); commit(); return;
  }
  const path = el.dataset.set; if (!path || !state) return;
  setPath(state, path, readVal(el));
  // Al activar la copia de un activo, se crea con valores por defecto
  if (/^activos\.\d+\.backup\.aplica$/.test(path) && el.checked) { const a = state.activos[+path.split('.')[1]]; a.backup = { aplica: true, tipo: '', frecuenciaHoras: 24, retencionDias: 30, offsite: false, cifrado: false, inmutable: false, ultimaRestauracion: '', resultado: 'Pendiente' }; }
  state = sanitizeState(state); commit();
});
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.id === 'glo-q') { ui.glosarioQ = el.value; clearTimeout(ui._qT); ui._qT = setTimeout(render, 150); }
  if (el.id === 'pal-q') { ui.paletteQ = el.value; ui.paletteIdx = 0; renderPalette(); }
  if (el.dataset.ws === 'profile.nombre' && el.id === 'pf-n') { ws.profile.nombre = el.value; saveWs(); $('#top').innerHTML = renderTop(); localize(); moveThumb('#top .phases'); }
});

let gPending = false;
document.addEventListener('keydown', (ev) => {
  const t = ev.target; const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.id !== 'pal-q';
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); ui.palette = !ui.palette; ui.paletteQ = ''; ui.paletteIdx = 0; renderPalette(); return; }
  if (ui.palette) {
    const items = ui._pItems || [];
    if (ev.key === 'Escape') { ui.palette = false; renderPalette(); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); $('#pal-q').focus(); return; }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); ui.paletteIdx = Math.min(items.length - 1, ui.paletteIdx + 1); renderPalette(); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); ui.paletteIdx = Math.max(0, ui.paletteIdx - 1); renderPalette(); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); const it = items[ui.paletteIdx]; ui.palette = false; renderPalette(); if (it) it.act(); return; }
    return;
  }
  if (ev.key === 'Escape') {
    if (ui.menu || ui.confirm) {
      const back = ui.menu ? `[data-act="menu"][data-menu="${ui.menu}"]` : null;
      ui.menu = null; ui.confirm = null; render();
      const b = back && document.querySelector(back); if (b) b.focus({ preventScroll: true });
    }
    return;
  }
  if (/^Arrow(Left|Right|Up|Down)$/.test(ev.key) && t.matches && (t.matches('[role="tab"]') || t.matches('[role="menuitem"]'))) {
    const tab = t.matches('[role="tab"]'); if (tab && /Up|Down/.test(ev.key)) return;
    const list = [...t.parentElement.closest(tab ? '[role="tablist"]' : '[role="menu"]').querySelectorAll(tab ? '[role="tab"]' : '[role="menuitem"]')];
    const d = /Right|Down/.test(ev.key) ? 1 : -1; const n = list[(list.indexOf(t) + d + list.length) % list.length];
    if (n) { ev.preventDefault(); n.focus(); if (tab) n.click(); }
    return;
  }
  if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === '?') { ui.helpTab = 'atajos'; go('ayuda'); return; }
  if (ev.key.toLowerCase() === 'g') { gPending = true; setTimeout(() => { gPending = false; }, 900); return; }
  if (gPending) { gPending = false; const m = { p: 'panel', f: 'funciones', d: 'dependencias', r: 'recuperacion', c: 'copias', a: 'preauditoria', t: 'pruebas', i: 'inicio' }[ev.key.toLowerCase()]; if (m) go(m); }
});
document.addEventListener('toggle', (ev) => { const k = ev.target && ev.target.dataset && ev.target.dataset.keep; if (k) ui[k] = ev.target.open; }, true);

/* Tooltip ligero para [data-tip], también con el teclado */
const tip = () => $('#tip');
function showTip(el) {
  const t = tip(); t.textContent = lang() === 'en' ? tr(el.getAttribute('data-tip')) : el.getAttribute('data-tip'); t.hidden = false;
  const r = el.getBoundingClientRect(); const tw = t.offsetWidth;
  t.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + 'px';
  t.style.top = Math.max(8, r.top - t.offsetHeight - 8) + 'px';
}
document.addEventListener('mouseover', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (!el) { tip().hidden = true; return; } showTip(el); });
document.addEventListener('focusin', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (!el || !el.matches(':focus-visible')) { tip().hidden = true; return; } showTip(el); });
document.addEventListener('focusout', () => { tip().hidden = true; });
document.addEventListener('scroll', () => { tip().hidden = true; }, true);

const toggleOpen = (k, id) => { ui[k] = ui[k] === id ? null : id; render(); };
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (ui.menu && !ev.target.closest('.menu') && !(el && el.dataset.act === 'menu')) { ui.menu = null; render(); }
  if (!el || el.disabled) return;
  const act = el.dataset.act; const i = el.dataset.i !== undefined ? +el.dataset.i : null;
  switch (act) {
    case 'nav': if (el.dataset.locked === '1') { toast('Esta sección requiere un proyecto abierto.'); break; } if (el.dataset.view === 'nuevo' && ui.view !== 'nuevo') ui.wizard = null; go(el.dataset.view); break;
    case 'menu': ui.menu = ui.menu === el.dataset.menu ? null : el.dataset.menu; render(); if (ui.menu) { const f = document.querySelector('.menu [role="menuitem"]'); if (f) f.focus(); } break;
    case 'phase': go(phaseTarget(el.dataset.phase)); break;
    case 'palette': ui.palette = true; ui.paletteQ = ''; ui.paletteIdx = 0; renderPalette(); break;
    case 'pal-close': ui.palette = false; renderPalette(); break;
    case 'pal-run': { const it = (ui._pItems || [])[i]; ui.palette = false; renderPalette(); if (it) it.act(); break; }
    case 'cycle-theme': { const order = ['sistema', 'claro', 'oscuro']; ws.settings.tema = order[(order.indexOf(ws.settings.tema) + 1) % 3]; saveWs(); applyTheme(); render(); toast(`Tema: ${ws.settings.tema}`); break; }
    case 'set': ws.settings[el.dataset.k] = el.dataset.v; ws = sanitizeWs(ws); saveWs(); applyTheme(); render(); break;
    case 'set-color': { ws.profile.color = el.dataset.c; if (el.dataset.c !== 'slate') ws.settings.acento = el.dataset.c; ws = sanitizeWs(ws); saveWs(); applyTheme(); render(); break; }
    case 'help-tab': ui.helpTab = el.dataset.tab; render(); break;
    case 'open-project': openProject(el.dataset.id); break;
    case 'open-case': openCase(el.dataset.case); break;
    case 'reset-case': resetCase(el.dataset.case); break;
    case 'close-demos': for (const p of ws.projects.filter((x) => x.kind === 'demo')) deleteProject(p.id); render(); toast('Casos de ejemplo cerrados'); break;
    case 'ask': ui.confirm = el.dataset.what; render(); break;
    case 'confirm-no': { const w = ui.confirm; ui.confirm = null; render(); const b = w && document.querySelector(`[data-act="ask"][data-what="${CSS.escape(w)}"]`); if (b) b.focus({ preventScroll: true }); break; }
    case 'del-project': deleteProject(el.dataset.id); ui.confirm = null; render(); toast('Proyecto eliminado'); break;
    case 'wipe': for (const p of ws.projects) store.del(PKEY(p.id)); store.del(WS_KEY); ws = sanitizeWs(null); state = null; recompute(); applyTheme(); ui.confirm = null; go('inicio'); toast('Datos borrados'); break;
    case 'ob-save': ws.profileDone = true; saveWs(); render(); toast('Perfil guardado'); break;
    case 'ob-skip': ws.profileDone = true; saveWs(); render(); break;
    case 'backup': backup(); break;
    case 'restore': case 'import-json': ui.menu = null; pickFile('.json,application/json', (f) => checkSize(f, LIM.fileJson, 'El fichero es') && readText(f, importProyecto)); break;
    /* asistente */
    case 'wz-add': ui.wizard.funciones.push({ nombre: '', responsable: '', rto: 24, rpo: 24, mtpd: 72, costeHora: 0 }); render(); break;
    case 'wz-del': ui.wizard.funciones.splice(i, 1); render(); break;
    case 'wz-back': ui.wizard.step--; ui.wizard.error = ''; render(); break;
    case 'wz-next': { const w = ui.wizard;
      if (w.step === 1 && (blank(w.organizacion) || blank(w.sistema))) { w.error = 'Indica la organización y el sistema o alcance.'; render(); break; }
      if (w.step === 2 && w.funciones.some((f) => blank(f.nombre))) { w.error = 'Pon nombre a todas las funciones (o quita las que sobren).'; render(); break; }
      if (w.step === 2 && w.funciones.some((f) => Number(f.rto) >= Number(f.mtpd))) { w.error = 'El RTO de cada función debe ser menor que su MTPD.'; render(); break; }
      w.step++; w.error = ''; render(); break; }
    case 'wz-create': { const w = ui.wizard;
      const funciones = w.funciones.map((f, j) => ({ id: `F-${String(j + 1).padStart(2, '0')}`, nombre: f.nombre, descripcion: '', responsable: f.responsable, rto: f.rto, rpo: f.rpo, mtpd: f.mtpd, costeHora: f.costeHora, alternativa: '', impacto: impactoVacio(), dependencias: { activos: [], funciones: [], proveedores: [] } }));
      const st = blankState({ nombre: w.organizacion, organizacion: w.organizacion, sistema: w.sistema, categoria: w.categoria, responsable: w.responsable, alcance: w.alcance, funciones });
      ui.wizard = null; createProject(st, { view: 'funciones', msg: 'Proyecto creado. Siguiente paso: valora el impacto de cada función.' }); break; }
    /* proyecto */
    case 'f-toggle': toggleOpen('fOpen', el.dataset.id); break;
    case 'a-toggle': toggleOpen('aOpen', el.dataset.id); break;
    case 't-toggle': toggleOpen('tOpen', el.dataset.id); break;
    case 'add-funcion': addFuncion(); break;
    case 'del-funcion': { const id = state.funciones[i].id; state.funciones.splice(i, 1); state = sanitizeState(state); ui.fOpen = null; commit(`Función ${id} eliminada`); break; }
    case 'add-activo': addActivo(); break;
    case 'del-activo': { const id = state.activos[i].id; state.activos.splice(i, 1); state = sanitizeState(state); ui.aOpen = null; commit(`Activo ${id} eliminado`); break; }
    case 'add-prov': state.proveedores.push({ id: nextId('P-', state.proveedores), nombre: 'Nuevo proveedor', servicio: '', contacto: '', slaHoras: null, contrato: '', bcmVerificado: false }); commit('Proveedor añadido'); break;
    case 'del-prov': state.proveedores.splice(i, 1); state = sanitizeState(state); commit('Proveedor eliminado'); break;
    case 'add-rol': state.bcp.equipo.push({ rol: 'Nuevo rol', titular: '', suplente: '', telefono: '', responsabilidades: '' }); commit(); break;
    case 'del-rol': state.bcp.equipo.splice(i, 1); commit(); break;
    case 'add-prueba': addPrueba(); break;
    case 'del-prueba': { const id = state.pruebas[i].id; state.pruebas.splice(i, 1); ui.tOpen = null; commit(`Prueba ${id} eliminada`); break; }
    case 'add-rev': state.revision.historial.push({ version: '', fecha: today(), motivo: '', responsable: '', aprobado: '' }); commit(); break;
    case 'del-rev': state.revision.historial.splice(i, 1); commit(); break;
    case 'sev-f': ui.sevFiltro = ui.sevFiltro === el.dataset.sev ? 'todas' : el.dataset.sev; render(); break;
    case 'pre-tab': ui.preTab = el.dataset.tab; render(); break;
    case 'copy-plantilla': { const txt = state.bcp.comunicacion.plantilla || ''; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Plantilla copiada'), () => toast('No se pudo copiar: selecciona el texto y cópialo a mano', 'error')); break; }
    case 'export-plan': exportar('plan'); break;
    case 'export-informe': exportar('informe'); break;
    case 'export-acciones': exportar('acciones'); break;
    case 'export-json': exportar('json'); break;
    case 'export-xlsx': exportXlsx(); break;
    default: break;
  }
});

/* ---------- Arranque ---------- */
ws = sanitizeWs(store.get(WS_KEY));
applyTheme();
if (ws.activeId && store.get(PKEY(ws.activeId))) { state = sanitizeState(store.get(PKEY(ws.activeId))); recompute(); } else ws.activeId = null;
ui.view = [...PROJECT_VIEWS, ...GLOBAL_VIEWS].includes(initialView) && (state || !PROJECT_VIEWS.includes(initialView)) ? initialView : (state ? 'panel' : 'inicio');
render();
// Puerta para las pruebas automáticas: solo existe al abrir la app con ?test
if (/[?&]test\b/.test(location.search)) window.__KAIROS__ = { get state() { return state; }, get calc() { return calc; }, get ws() { return ws; }, openCase, go, commit };

/* Al cambiar el ancho de la ventana, la píldora del control segmentado se recoloca */
let segRz = null;
window.addEventListener('resize', () => { clearTimeout(segRz); segRz = setTimeout(() => { moveThumb('#top .phases'); moveThumb('#view .tabs'); }, 80); });
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
/* Borde de desplazamiento: la línea bajo la cabecera solo aparece cuando hay contenido pasando por debajo */
const edge = () => document.documentElement.toggleAttribute('data-scrolled', window.scrollY > 4);
window.addEventListener('scroll', edge, { passive: true }); edge();
