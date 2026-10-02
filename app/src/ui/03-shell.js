/* ---------- Piezas de presentación ---------- */
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(sel) === String(v) ? ' selected' : ''}>${esc(label ?? v)}</option>`;
const cut = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const avatar = (size = 32) => `<span class="avatar c-${esc(ws.profile.color || 'green')}" style="--s:${size}px">${esc(initials(ws.profile.nombre))}</span>`;
const catPill = (c) => c ? `<span class="cat-pill ${c === 'BÁSICA' ? 'BASICA' : c}"><span class="dot"></span>${c === 'BÁSICA' ? 'Básica' : c === 'MEDIA' ? 'Media' : 'Alta'}</span>` : '';
const critBadge = (c) => `<span class="badge ${c === 'ALTA' ? 'crit' : c === 'MEDIA' ? 'warn' : 'neutral'}">${c === 'ALTA' ? 'Alta' : c === 'MEDIA' ? 'Media' : 'Baja'}</span>`;
const sevBadge = (s) => `<span class="badge ${s === 'NC mayor' ? 'crit' : s === 'NC menor' ? 'warn' : 'accent'}">${esc(s)}</span>`;
const sevClass = (s) => (s === 'NC mayor' ? 'mayor' : s === 'NC menor' ? 'menor' : 'obs');
const okBadge = (ok, si = 'Cumple', no = 'No cumple') => ok === null || ok === undefined ? '<span class="badge neutral">Sin datos</span>' : ok ? `<span class="badge ok">${si}</span>` : `<span class="badge crit">${no}</span>`;
const lvlCell = (v) => `<span class="lvl-cell l${v}" title="${esc(E.NIVELES[v])}"><span class="sr">${esc(E.NIVELES[v])}</span></span>`;
const curvaMini = (curva) => `<span class="curva" role="img" aria-label="Impacto: ${curva.map((v, i) => `${E.HORIZONTES[i].label} ${E.NIVELES[v]}`).join(', ')}">${curva.map((v) => lvlCell(v)).join('')}</span>`;
const countSev = (sev) => (calc ? calc.checks.filter((c) => c.sev === sev).length : 0);
const nombreF = (id) => (state.funciones.find((f) => f.id === id) || {}).nombre || id;
const nombreA = (id) => (state.activos.find((a) => a.id === id) || {}).nombre || id;
const nombreP = (id) => (state.proveedores.find((p) => p.id === id) || {}).nombre || id;
const causaTxt = (c) => !c ? '—' : c.tipo === 'activo' ? `${c.id} · ${nombreA(c.id)}` : c.tipo === 'proveedor' ? `${nombreP(c.id)} (proveedor)` : `${c.id} · ${nombreF(c.id)}`;
const caseIcon = (id) => ({ techserv: 'server', hospital: 'hospital', ayuntamiento: 'landmark' }[id] || 'building');
function nextId(prefix, list, pad = 2) {
  let n = 0;
  for (const x of list) { const m = String(x.id || '').match(new RegExp('^' + prefix.replace('-', '\\-') + '(\\d+)$')); if (m) n = Math.max(n, +m[1]); }
  return prefix + String(n + 1).padStart(pad, '0');
}
function pageHead(eyebrow, title, lead, actions = '') {
  return `<header class="page-head"><div class="ph-text">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>${actions ? `<div class="ph-actions">${actions}</div>` : ''}</header>`;
}
function emptyState(ic, title, text, action = '') { return `<div class="empty-state">${icon(ic, 28)}<h3>${title}</h3><p>${text}</p>${action}</div>`; }
const fld = (label, control, cls = '') => `<label class="fld ${cls}">${label}${control}</label>`;
const inTxt = (path, v, extra = '') => `<input type="text" data-set="${path}" value="${esc(v)}" ${extra}>`;
const inNum = (path, v, extra = '') => `<input type="number" inputmode="decimal" min="0" step="any" data-set="${path}" data-type="hrs" value="${v === null || v === undefined ? '' : esc(v)}" ${extra}>`;
const inArea = (path, v, extra = '') => `<textarea data-set="${path}" ${extra}>${esc(v)}</textarea>`;
const inChk = (path, v, label) => `<label class="chk"><input type="checkbox" data-set="${path}" data-type="bool"${v ? ' checked' : ''}><span>${label}</span></label>`;

/* ---------- Render principal ---------- */
const PROJECT_VIEWS = ['panel', 'funciones', 'dependencias', 'recuperacion', 'copias', 'crisis', 'pruebas', 'preauditoria', 'exportar'];
const GLOBAL_VIEWS = ['inicio', 'nuevo', 'perfil', 'ajustes', 'ayuda'];
const TITLES = { inicio: 'Inicio', nuevo: 'Nuevo proyecto', perfil: 'Perfil', ajustes: 'Ajustes', ayuda: 'Ayuda', panel: 'Panel', funciones: 'Funciones e impacto', dependencias: 'Dependencias', recuperacion: 'Recuperación', copias: 'Copias de seguridad', crisis: 'Gestión de crisis', pruebas: 'Pruebas', preauditoria: 'Preauditoría', exportar: 'Exportar' };
/* El proyecto se recorre en tres fases, como el método: analizar el impacto, planificar la respuesta y verificarla */
const PHASES = [
  { k: 'analizar', n: 1, label: 'Analizar', ic: 'layers', views: ['funciones', 'dependencias'] },
  { k: 'planificar', n: 2, label: 'Planificar', ic: 'route', views: ['recuperacion', 'copias', 'crisis'] },
  { k: 'verificar', n: 3, label: 'Verificar', ic: 'shieldCheck', views: ['pruebas', 'preauditoria', 'exportar'] }
];
const VIEW_IC = { inicio: 'home', panel: 'dashboard', funciones: 'layers', dependencias: 'network', recuperacion: 'route', copias: 'hardDrive', crisis: 'users', pruebas: 'flask', preauditoria: 'shieldCheck', exportar: 'download', ayuda: 'help', ajustes: 'sliders', perfil: 'user', nuevo: 'plus' };
const phaseOf = (v) => PHASES.find((p) => p.views.includes(v)) || null;
const phaseTarget = (k) => { const p = PHASES.find((x) => x.k === k); return (ui.lastIn && ui.lastIn[k]) || p.views[0]; };
function go(view) {
  if (PROJECT_VIEWS.includes(view) && !state) view = 'inicio';
  ui.view = view; ui.menu = null; ui.confirm = null;
  const ph = phaseOf(view); if (ph) ui.lastIn[ph.k] = view;
  try { history.replaceState(null, '', '#' + view); } catch (e) { /* sandbox */ }
  render(); window.scrollTo({ top: 0 });
  const h = $('#main h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
/* Tras redibujar, el foco vuelve al mismo control: por su id o, si no tiene, por sus data-* */
const FOCUS_KEYS = ['act', 'view', 'phase', 'tab', 'v', 'k', 'id', 'case', 'i', 'what', 'menu', 'sev'];
function focusKey(el) {
  if (!el || !el.dataset || !el.dataset.act) return null;
  return FOCUS_KEYS.filter((k) => el.dataset[k] !== undefined).map((k) => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('');
}
function render() {
  const ae = document.activeElement; const active = ae && ae.id; const fkey = !active && ae !== document.body ? focusKey(ae) : null;
  let sel = null; try { if (ae && typeof ae.selectionStart === 'number') sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { sel = null; }
  ui.entering = ui._rv !== ui.view; ui._rv = ui.view;
  livethumbs();
  $('#top').innerHTML = renderTop();
  $('#tabbar').innerHTML = renderTabbar();
  // Con un menú abierto, el resto de la página queda inerte: ni foco ni clics detrás del menú
  $('#main').inert = !!ui.menu; $('#tabbar').inert = !!ui.menu;
  const V = { inicio: vInicio, nuevo: vNuevo, perfil: vPerfil, ajustes: vAjustes, ayuda: vAyuda, panel: vPanel, funciones: vFunciones, dependencias: vDependencias, recuperacion: vRecuperacion, copias: vCopias, crisis: vCrisis, pruebas: vPruebas, preauditoria: vPreauditoria, exportar: vExportar };
  $('#view').innerHTML = (state && isDemo() && PROJECT_VIEWS.includes(ui.view) ? demoBanner() : '') + (V[ui.view] || vInicio)();
  document.documentElement.toggleAttribute('data-sub', !!(state && phaseOf(ui.view)));
  renderPalette();
  localize();
  moveThumb('#top .phases'); moveThumb('#view .tabs');
  // Lo que solo está en un tooltip también llega al teclado y al lector de pantalla
  document.querySelectorAll('#view [data-tip].tipable').forEach((el) => {
    el.setAttribute('tabindex', '0'); el.setAttribute('role', 'img'); el.setAttribute('aria-label', lang() === 'en' ? tr(el.getAttribute('data-tip')) : el.getAttribute('data-tip'));
  });
  document.querySelectorAll('#view .table-wrap, #view pre.code, #view .chart-scroll').forEach((el) => {
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) { el.setAttribute('tabindex', '0'); if (!el.hasAttribute('aria-label')) { el.setAttribute('role', 'region'); el.setAttribute('aria-label', lang() === 'en' ? 'Scrollable content' : 'Contenido desplazable'); } }
  });
  const sk = document.querySelector('.skip'); if (sk) sk.textContent = lang() === 'en' ? 'Skip to content' : 'Ir al contenido';
  if (active) { const el = document.getElementById(active); if (el) { el.focus({ preventScroll: true }); if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* n/a */ } } } }
  else if (fkey) { const el = document.querySelector('#top ' + fkey + ', #view ' + fkey + ', #palette ' + fkey + ', #tabbar ' + fkey); if (el) el.focus({ preventScroll: true }); }
  if (ui.confirm) { const c = document.querySelector('#view [data-act="del-project"], #view [data-act="wipe"]'); if (c && fkey && /data-act="ask"/.test(fkey)) c.focus({ preventScroll: true }); }
}
/* Control segmentado: la píldora se desliza hasta la opción activa partiendo de donde está en pantalla en ese
 * instante (valor de presentación), así un cambio a mitad de recorrido no salta: se redirige. */
const thumbs = {};
function livethumbs() {
  for (const sel of ['#top .phases', '#view .tabs']) {
    const host = document.querySelector(sel); const th = host && host.querySelector('.thumb');
    if (!th || th.style.opacity === '0') continue;
    const hr = host.getBoundingClientRect(); const tr2 = th.getBoundingClientRect();
    if (tr2.width) thumbs[sel] = [tr2.left - hr.left - host.clientLeft, tr2.width];
  }
}
function moveThumb(selector) {
  const host = document.querySelector(selector); if (!host) return;
  const th = host.querySelector('.thumb'); const on = host.querySelector('[aria-current="page"], [aria-selected="true"]');
  if (!th) return;
  if (!on || !on.offsetWidth) { th.style.opacity = '0'; thumbs[selector] = null; return; }
  const to = [on.offsetLeft, on.offsetWidth]; const from = thumbs[selector];
  th.style.opacity = '1';
  if (from && (from[0] !== to[0] || from[1] !== to[1])) {
    th.style.transition = 'none'; th.style.transform = `translateX(${from[0]}px)`; th.style.width = from[1] + 'px'; void th.offsetWidth; th.style.transition = '';
  }
  th.style.transform = `translateX(${to[0]}px)`; th.style.width = to[1] + 'px';
  thumbs[selector] = to;
}
const logo = (size = 30) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" class="mark"><rect width="32" height="32" rx="9.5" fill="#0b0b0c"/><circle cx="16" cy="16" r="10" fill="none" stroke="#30d158" stroke-opacity=".22" stroke-width="3"/><path d="M16 6a10 10 0 1 1-9.6 12.8" fill="none" stroke="#30d158" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="5" fill="none" stroke="#30d158" stroke-opacity=".22" stroke-width="2.4"/><path d="M16 11a5 5 0 0 1 4.6 3" fill="none" stroke="#30d158" stroke-width="2.4" stroke-linecap="round"/></svg>`;
function phaseBadge(k) {
  if (!state || !calc) return '';
  if (k === 'analizar') { const n = calc.funciones.filter((x) => x.cumpleRto === false).length; return n ? `<span class="pbadge" title="${plural(n, 'función fuera del RTO', 'funciones fuera del RTO')}">${n}</span>` : ''; }
  if (k === 'verificar') { const n = countSev('NC mayor'); return n ? `<span class="pbadge" title="${plural(n, 'NC mayor', 'NC mayores')}">${n}</span>` : ''; }
  return '';
}
function renderTop() {
  const p = activeMeta(); const ph = phaseOf(ui.view);
  const temaIc = ws.settings.tema === 'oscuro' ? 'moon' : ws.settings.tema === 'claro' ? 'sun' : 'monitor';
  const pill = state ? `<button type="button" class="proj-pill" data-act="menu" data-menu="proyectos" aria-haspopup="true" aria-expanded="${ui.menu === 'proyectos'}">
      <span class="proj-ic ${p?.kind === 'demo' ? 'demo' : ''}">${icon(p?.kind === 'demo' ? caseIcon(p.caseId) : 'building', 15)}</span><span class="pp-txt"><b>${esc(state.meta.nombre || 'Proyecto')}</b></span>${catPill(state.meta.categoria)}${icon('chevronDown', 14, 'muted')}</button>`
    : `<button type="button" class="proj-pill empty" data-act="menu" data-menu="proyectos" aria-haspopup="true" aria-expanded="${ui.menu === 'proyectos'}"><span class="proj-ic">${icon('folder', 15)}</span><span class="pp-txt"><b>Abrir proyecto</b></span>${icon('chevronDown', 14, 'muted')}</button>`;
  const phases = state ? `<nav class="phases" aria-label="Fases del proyecto"><span class="thumb" aria-hidden="true"></span>
      <button type="button" data-act="nav" data-view="panel"${ui.view === 'panel' ? ' aria-current="page"' : ''}>${icon('dashboard', 15)}<span>Panel</span></button>
      ${PHASES.map((x) => `<button type="button" data-act="phase" data-phase="${x.k}"${ph && ph.k === x.k ? ' aria-current="page"' : ''}><span class="pn num">${x.n}</span><span>${x.label}</span>${phaseBadge(x.k)}</button>`).join('')}</nav>` : '<span class="phases-gap"></span>';
  const sub = state && ph ? `<nav class="subnav" aria-label="${ph.label}"><span class="sub-phase"><span class="pn num">${ph.n}</span>${ph.label}</span>${ph.views.map((v) => `<button type="button" data-act="nav" data-view="${v}"${ui.view === v ? ' aria-current="page"' : ''}>${icon(VIEW_IC[v], 15)}<span>${TITLES[v]}</span>${v === 'preauditoria' && countSev('NC mayor') ? `<span class="count crit">${countSev('NC mayor')}</span>` : ''}</button>`).join('')}</nav>` : '';
  return `<div class="bar">
    <button type="button" class="brand" data-act="nav" data-view="inicio" aria-label="KAIROS · Inicio"${ui.view === 'inicio' ? ' aria-current="page"' : ''}>${logo(28)}<span class="wordmark">Kairos</span></button>
    <div class="pop-wrap">${pill}${ui.menu === 'proyectos' ? '<div class="menu-scrim" aria-hidden="true"></div>' + projectMenu() : ''}</div>
    ${phases}
    <div class="tools">
      <button type="button" class="search-btn" data-act="palette" aria-label="Buscar y ejecutar comandos">${icon('search', 16)}<span>Buscar</span><kbd>⌘K</kbd></button>
      <div class="lang-switch" role="group" aria-label="Idioma"><button type="button" data-act="set" data-k="idioma" data-v="es" aria-pressed="${ws.settings.idioma !== 'en'}" title="Español">ES</button><button type="button" data-act="set" data-k="idioma" data-v="en" aria-pressed="${ws.settings.idioma === 'en'}" title="English">EN</button></div>
      <button type="button" class="icon-btn hide-sm" data-act="cycle-theme" aria-label="Cambiar tema" title="Tema: ${ws.settings.tema}">${icon(temaIc, 18)}</button>
      <button type="button" class="icon-btn hide-sm" data-act="nav" data-view="ayuda" aria-label="Ayuda"${ui.view === 'ayuda' ? ' aria-current="page"' : ''}>${icon('help', 18)}</button>
      <div class="pop-wrap"><button type="button" class="avatar-btn" data-act="menu" data-menu="cuenta" aria-haspopup="true" aria-expanded="${ui.menu === 'cuenta'}" aria-label="Cuenta y ajustes">${avatar(32)}</button>${ui.menu === 'cuenta' ? '<div class="menu-scrim" aria-hidden="true"></div>' + accountMenu() : ''}</div>
    </div></div>${sub}`;
}
function renderTabbar() {
  const ph = phaseOf(ui.view);
  const it = (attrs, label, ic, on, badge = '') => `<button type="button" ${attrs}${on ? ' aria-current="page"' : ''}>${icon(ic, 21)}<span>${label}</span>${badge}</button>`;
  if (!state) return `${it('data-act="nav" data-view="inicio"', 'Inicio', 'home', ui.view === 'inicio')}${it('data-act="nav" data-view="nuevo"', 'Nuevo', 'plus', ui.view === 'nuevo')}${it('data-act="nav" data-view="ayuda"', 'Ayuda', 'help', ui.view === 'ayuda')}${it('data-act="nav" data-view="ajustes"', 'Ajustes', 'sliders', ui.view === 'ajustes')}`;
  return `${it('data-act="nav" data-view="inicio"', 'Inicio', 'home', ui.view === 'inicio')}${it('data-act="nav" data-view="panel"', 'Panel', 'dashboard', ui.view === 'panel')}
    ${PHASES.map((x) => it(`data-act="phase" data-phase="${x.k}"`, x.label, x.ic, ph && ph.k === x.k, phaseBadge(x.k).replace('pbadge', 'tb-badge'))).join('')}`;
}
function projectMenu() {
  const own = ws.projects.filter((p) => p.kind === 'own'); const demos = ws.projects.filter((p) => p.kind === 'demo');
  const row = (p) => `<button type="button" role="menuitem" class="menu-item${p.id === ws.activeId ? ' on' : ''}" data-act="open-project" data-id="${esc(p.id)}">${icon(p.kind === 'demo' ? caseIcon(p.caseId) : 'building', 16)}<span>${esc(p.nombre)}</span>${p.id === ws.activeId ? icon('check', 16, 'accent') : ''}</button>`;
  return `<div class="menu pop" role="menu" aria-label="Proyectos">
    ${own.length ? `<div class="menu-label" role="presentation">Mis proyectos</div>${own.map(row).join('')}` : ''}
    ${demos.length ? `<div class="menu-label" role="presentation">Casos de ejemplo abiertos</div>${demos.map(row).join('')}` : ''}
    ${own.length || demos.length ? '<div class="menu-sep" role="separator"></div>' : ''}
    <button type="button" role="menuitem" class="menu-item" data-act="nav" data-view="nuevo">${icon('plus', 16)}<span>Nuevo proyecto</span></button>
    <button type="button" role="menuitem" class="menu-item" data-act="import-json">${icon('upload', 16)}<span>Importar proyecto (.json)</span></button>
    <button type="button" role="menuitem" class="menu-item" data-act="nav" data-view="inicio">${icon('home', 16)}<span>Todos los proyectos y casos</span></button>
  </div>`;
}
function accountMenu() {
  return `<div class="menu pop right" role="menu" aria-label="Cuenta">
    <div class="menu-me" role="presentation">${avatar(36)}<span><b>${esc(ws.profile.nombre || 'Tu perfil')}</b><small>${esc(ws.profile.rol || 'Completa tu perfil')}</small></span></div>
    <div class="menu-sep" role="separator"></div>
    <button type="button" role="menuitem" class="menu-item" data-act="nav" data-view="perfil">${icon('user', 16)}<span>Perfil</span></button>
    <button type="button" role="menuitem" class="menu-item" data-act="nav" data-view="ajustes">${icon('sliders', 16)}<span>Ajustes</span></button>
    <button type="button" role="menuitem" class="menu-item" data-act="nav" data-view="ayuda">${icon('help', 16)}<span>Ayuda</span><kbd>?</kbd></button>
    <button type="button" role="menuitem" class="menu-item" data-act="cycle-theme">${icon('moon', 16)}<span>Cambiar tema</span></button>
  </div>`;
}
function demoBanner() {
  const p = activeMeta();
  return `<div class="demo-banner">${icon('info', 18)}<p><b>Caso de ejemplo con datos ficticios.</b> Los cambios se guardan en una copia local; «Restablecer» recupera el estado original.</p>
    <div class="row"><button type="button" class="btn sm ghost" data-act="reset-case" data-case="${esc(p.caseId)}">${icon('refresh', 15)}Restablecer</button>
    <button type="button" class="btn sm primary" data-act="nav" data-view="nuevo">Nuevo proyecto${icon('arrowRight', 15)}</button></div></div>`;
}

/* ---------- Paleta de comandos ---------- */
function paletteItems() {
  const q = ui.paletteQ.trim().toLowerCase();
  const items = [];
  const V = [['inicio', 'home'], ['panel', 'dashboard'], ['funciones', 'layers'], ['dependencias', 'network'], ['recuperacion', 'route'], ['copias', 'hardDrive'], ['crisis', 'users'], ['pruebas', 'flask'], ['preauditoria', 'shieldCheck'], ['exportar', 'download'], ['ayuda', 'help'], ['ajustes', 'sliders'], ['perfil', 'user'], ['nuevo', 'plus']];
  for (const [v, ic] of V) if (state || !PROJECT_VIEWS.includes(v)) items.push({ grupo: 'Ir a', label: TITLES[v], ic, act: () => go(v) });
  if (state) {
    items.push({ grupo: 'Acciones', label: 'Descargar el plan de continuidad (.md)', ic: 'fileText', act: () => exportar('plan') });
    items.push({ grupo: 'Acciones', label: 'Descargar el libro Excel del BIA y el plan', ic: 'sheet', act: () => exportXlsx() });
    items.push({ grupo: 'Acciones', label: 'Añadir una función', ic: 'plus', act: () => addFuncion() });
    items.push({ grupo: 'Acciones', label: 'Registrar una prueba', ic: 'flask', act: () => addPrueba() });
  }
  items.push({ grupo: 'Acciones', label: 'Cambiar entre tema claro y oscuro', ic: 'moon', act: () => { ws.settings.tema = document.documentElement.getAttribute('data-theme') === 'dark' || (ws.settings.tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'claro' : 'oscuro'; saveWs(); applyTheme(); render(); } });
  for (const c of D.casos) items.push({ grupo: 'Casos de ejemplo', label: `Abrir ${c.titulo}`, ic: caseIcon(c.id), act: () => openCase(c.id) });
  if (state) {
    for (const f of calc.funciones) items.push({ grupo: 'Funciones', label: `${f.id} · ${f.nombre}`, ic: 'layers', hint: `RTO ${fmtH(f.rto)}`, act: () => { ui.fOpen = f.id; go('funciones'); } });
    for (const a of calc.activos) items.push({ grupo: 'Activos', label: `${a.id} · ${a.nombre}`, ic: 'server', hint: E.ESTRATEGIAS[a.a.estrategia].label, act: () => { ui.aOpen = a.id; go('recuperacion'); } });
  }
  const blob = (it) => (it.label + ' ' + it.grupo + ' ' + tr(it.label) + ' ' + tr(it.grupo)).toLowerCase();
  const res = q ? items.filter((it) => blob(it).includes(q)) : items.filter((it) => it.grupo !== 'Funciones' && it.grupo !== 'Activos');
  return res.slice(0, 40);
}
function renderPalette() {
  const host = $('#palette');
  if (!ui.palette) {
    const wasOpen = !host.hidden; host.hidden = true; host.innerHTML = '';
    if (wasOpen && ui._palReturn && document.contains(ui._palReturn)) ui._palReturn.focus({ preventScroll: true });
    ui._palReturn = null; return;
  }
  const items = paletteItems(); ui._pItems = items;
  if (ui.paletteIdx >= items.length) ui.paletteIdx = Math.max(0, items.length - 1);
  let last = ''; let html = '';
  items.forEach((it, i) => {
    if (it.grupo !== last) { html += `<div class="pal-group">${esc(it.grupo)}</div>`; last = it.grupo; }
    html += `<button type="button" class="pal-item${i === ui.paletteIdx ? ' on' : ''}" data-act="pal-run" data-i="${i}" id="pal-${i}" role="option" aria-selected="${i === ui.paletteIdx}" tabindex="-1">${icon(it.ic, 16)}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`;
  });
  const wasOpen = !host.hidden;
  if (host.hidden && !ui._palReturn) ui._palReturn = document.activeElement !== document.body ? document.activeElement : null;
  host.hidden = false;
  if (!wasOpen || !$('#pal-q')) {
    host.innerHTML = `<div class="overlay" data-act="pal-close"></div><div class="palette" role="dialog" aria-modal="true" aria-label="Buscar"><div class="pal-in">${icon('search', 18)}<input id="pal-q" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-label="Buscar" placeholder="Busca una función, un activo, una sección o una acción…" value="${esc(ui.paletteQ)}" autocomplete="off"><kbd>Esc</kbd></div><div class="pal-list" id="pal-list" role="listbox" aria-label="Resultados"></div></div>`;
  }
  $('#pal-list').innerHTML = html || '<div class="pal-empty" role="status">Sin resultados.</div>';
  const q = $('#pal-q'); if (q) { if (items.length) q.setAttribute('aria-activedescendant', 'pal-' + ui.paletteIdx); else q.removeAttribute('aria-activedescendant'); }
  localize();
  const on = $('#pal-' + ui.paletteIdx); if (on) on.scrollIntoView({ block: 'nearest' });
  if (!wasOpen) $('#pal-q').focus();
}

/* ---------- Avisos ---------- */
let toastT = null;
function toast(msg, kind) {
  const t = $('#toast'); const err = kind === 'error';
  t.classList.toggle('err', err); t.setAttribute('role', err ? 'alert' : 'status');
  t.innerHTML = `${icon(err ? 'alert' : 'check', 16)}<span>${esc(tr(msg))}</span>`; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, err ? 5000 : 2600);
}
