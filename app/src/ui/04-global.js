/* ---------- Vistas globales: inicio, nuevo proyecto, perfil, ajustes, ayuda ---------- */
const ROLES = ['Responsable de continuidad (BCM)', 'Responsable de Seguridad (CISO)', 'Responsable del Sistema', 'Auditor/a', 'Consultor/a GRC', 'Estudiante', 'Otro'];
const COLORS = ['green', 'blue', 'teal', 'amber', 'rose', 'slate'];
const COLOR_NAME = { green: 'Verde', blue: 'Azul', teal: 'Verde agua', amber: 'Ámbar', rose: 'Rojo', slate: 'Pizarra' };
const ACCENTS = [['green', 'Verde'], ['blue', 'Azul'], ['teal', 'Verde agua'], ['amber', 'Ámbar'], ['rose', 'Rojo'], ['graphite', 'Grafito']];
const CAT_TXT = {
  'BÁSICA': 'Se exige el análisis de impacto (op.cont.1).',
  MEDIA: 'Se exigen el análisis de impacto, el plan de continuidad y las pruebas periódicas (op.cont.1 a op.cont.3).',
  ALTA: 'Se exigen además medios alternativos (op.cont.4): sitio de recuperación o procedimientos manuales probados.'
};

/* Resumen de cada caso de ejemplo (se calcula con la fecha de hoy) */
const caseMetaCache = {};
function caseMeta(c) {
  if (!caseMetaCache[c.id]) { const r = E.calcular(c.state); caseMetaCache[c.id] = { funciones: r.kpi.funciones, cumplen: r.kpi.cumplenRto, evaluables: r.kpi.evaluables, ncMayor: r.kpi.ncMayor, rows: dialRows(r) }; }
  return caseMetaCache[c.id];
}
function vInicio() {
  const own = ws.projects.filter((p) => p.kind === 'own');
  const demos = ws.projects.filter((p) => p.kind === 'demo');
  const projRow = (p) => {
    const del = ui.confirm === 'del:' + p.id;
    return `<div class="proj-row">
      <span class="proj-ic lg ${p.kind === 'demo' ? 'demo' : ''}">${icon(p.kind === 'demo' ? caseIcon(p.caseId) : 'building', 18)}</span>
      <div class="pr-main"><b>${esc(p.nombre)}</b><small>${esc(p.organizacion || '')}${p.kind === 'demo' ? ' · caso de ejemplo' : ''}</small></div>
      <div class="pr-meta">${catPill(p.categoria)}${p.preparacion !== undefined ? `<span class="muted small num">${pct(p.preparacion)} de RTO alcanzables</span>` : ''}${p.ncMayor ? `<span class="badge crit">${plural(p.ncMayor, 'NC mayor', 'NC mayores')}</span>` : ''}</div>
      <span class="muted small pr-date">${icon('clock', 14)} ${esc(fmtDate(p.updated))}</span>
      <div class="row">${del ? `<span class="small">¿Eliminar?</span><button type="button" class="btn sm danger-solid" data-act="del-project" data-id="${esc(p.id)}">Eliminar</button><button type="button" class="btn sm" data-act="confirm-no">Cancelar</button>`
        : `<button type="button" class="btn sm" data-act="open-project" data-id="${esc(p.id)}">Abrir</button><button type="button" class="icon-btn sm" data-act="ask" data-what="del:${esc(p.id)}" aria-label="Eliminar ${esc(p.nombre)}">${icon('trash', 16)}</button>`}</div></div>`;
  };
  return `
  <section class="stage hero">
    <div class="stage-side">
      <span class="stage-k">ISO 22301 · ISO/IEC 27001 · ENS op.cont</span>
      <h1>Cada función, de vuelta a tiempo.</h1>
      <p class="lead">Análisis de impacto (BIA), plan de continuidad (BCP) y recuperación ante desastres (DRP) en un mismo modelo. KAIROS recorre la cadena de dependencias para calcular cuándo vuelve cada función, compara el RPO con las copias reales y revisa el plan con ${E.REGLAS.length} reglas de ISO 22301 y del ENS.</p>
      <div class="row"><button type="button" class="btn primary" data-act="nav" data-view="nuevo">${icon('plus', 16)}Nuevo proyecto</button>${state ? `<button type="button" class="btn on-dark" data-act="nav" data-view="panel">Continuar con ${esc(cut(state.meta.nombre || 'el proyecto', 28))}${icon('arrowRight', 16)}</button>` : `<button type="button" class="btn on-dark" data-act="open-case" data-case="techserv">Abrir el caso TechServ${icon('arrowRight', 16)}</button>`}</div>
    </div>
    <div class="stage-dial">${(() => { const rows = state ? dialRows(calc) : caseMeta(D.casos[0]).rows; const who = state ? (state.meta.nombre || 'el proyecto abierto') : D.casos[0].titulo; return rows.length ? dial(rows, { anim: ui.entering, label: `Reloj de recuperación de ${who}` }) + `<span class="dial-who">${esc(cut(who, 40))}</span>` : ''; })()}</div>
  </section>
  ${!ws.onboarded && !ws.profileDone ? `<div class="card onboard">
      <div class="ob-text"><h3>Autor de los documentos (opcional)</h3><p class="muted small">El nombre y el rol figuran como autor en el plan de continuidad y en el informe de preauditoría. No condicionan el acceso a ninguna sección.</p></div>
      <div class="ob-form"><label class="fld">Nombre<input type="text" id="ob-nombre" data-ws="profile.nombre" value="${esc(ws.profile.nombre)}" placeholder="Nombre y apellidos"></label>
      <label class="fld">Rol<select id="ob-rol" data-ws="profile.rol">${opt('', 'Elige tu rol', ws.profile.rol)}${ROLES.map((r) => opt(r, r, ws.profile.rol)).join('')}</select></label>
      <div class="row span2"><button type="button" class="btn primary sm" data-act="ob-save">${icon('check', 15)}Guardar</button><button type="button" class="btn ghost sm" data-act="ob-skip">Omitir</button></div></div></div>` : ''}
  <div class="start-grid">
    <button type="button" class="start-card primary" data-act="nav" data-view="nuevo"><span class="sc-ic">${icon('plus', 22)}</span><b>Nuevo proyecto</b><span>Asistente en tres pasos: organización y categoría, funciones de negocio con sus objetivos de recuperación y resumen de lo que exige el ENS.</span><em>Crear proyecto ${icon('arrowRight', 16)}</em></button>
    <button type="button" class="start-card" data-act="import-json"><span class="sc-ic">${icon('upload', 22)}</span><b>Importar un proyecto</b><span>Abre un proyecto exportado desde KAIROS en formato JSON. Todo lo importado se valida antes de usarse.</span><em>Elegir fichero .json ${icon('arrowRight', 16)}</em></button>
    <a class="start-card" href="#casos"><span class="sc-ic">${icon('book', 22)}</span><b>Abrir un caso de ejemplo</b><span>Tres organizaciones ficticias con planes en distinto estado, incluido el caso de clase TechServ.</span><em>Ver casos ${icon('arrowRight', 16)}</em></a>
  </div>
  ${own.length || demos.length ? `<section class="block"><div class="block-head"><h2>Tus proyectos</h2><span class="muted small">${plural(own.length, 'proyecto propio', 'proyectos propios')} · ${plural(demos.length, 'caso abierto', 'casos abiertos')}</span></div>
    <div class="card flush">${[...own, ...demos].map(projRow).join('')}</div></section>` : ''}
  ${ws.settings.mostrarCasos ? `<section class="block" id="casos"><div class="block-head"><h2>Casos de ejemplo</h2><span class="muted small">Datos ficticios con fines formativos</span></div>
    <div class="case-grid">${D.casos.map((c) => `<article class="case-card">
      <div class="cc-top"><span class="case-ic c-${esc(c.id)}">${icon(caseIcon(c.id), 22)}</span>${catPill(c.state.meta.categoria)}</div>
      <h3>${esc(c.titulo)}</h3><span class="muted small">${esc(c.sector)}</span>
      <p>${esc(c.resumen)}</p>
      <ul class="retos">${c.retos.map((r) => `<li>${icon('flag', 14)}${esc(r)}</li>`).join('')}</ul>
      ${(() => { const m = caseMeta(c); return `<div class="cc-stats"><span><b class="num">${m.funciones}</b> funciones</span><span><b class="num">${m.cumplen}/${m.evaluables}</b> RTO alcanzables</span><span><b class="num crit-t">${m.ncMayor}</b> NC mayores</span></div>`; })()}
      <button type="button" class="btn ${ws.activeId === 'demo-' + c.id ? '' : 'primary'} w-full" data-act="open-case" data-case="${esc(c.id)}">${ws.projects.some((p) => p.id === 'demo-' + c.id) ? 'Continuar' : 'Abrir caso'}${icon('arrowRight', 16)}</button>
    </article>`).join('')}</div></section>` : ''}`;
}

/* --- Asistente de nuevo proyecto --- */
function wzInit() {
  ui.wizard = { step: 1, nombre: '', organizacion: '', sistema: '', categoria: 'MEDIA', responsable: ws.profile.nombre ? `${ws.profile.nombre}${ws.profile.rol ? ' – ' + ws.profile.rol : ''}` : '', alcance: '',
    funciones: [{ nombre: '', responsable: '', rto: 4, rpo: 1, mtpd: 24, costeHora: 0 }, { nombre: '', responsable: '', rto: 24, rpo: 24, mtpd: 72, costeHora: 0 }], error: '' };
}
function vNuevo() {
  if (!ui.wizard) wzInit();
  const w = ui.wizard;
  const steps = ['Organización', 'Funciones de negocio', 'Resumen'];
  const stepper = `<ol class="stepper">${steps.map((s, i) => `<li class="${w.step === i + 1 ? 'on' : w.step > i + 1 ? 'done' : ''}"><span>${w.step > i + 1 ? icon('check', 14) : i + 1}</span>${s}</li>`).join('')}</ol>`;
  let body = '';
  if (w.step === 1) {
    body = `<div class="form-grid">
      <label class="fld span2">Organización *<input type="text" id="wz-org" data-wz="organizacion" value="${esc(w.organizacion)}" placeholder="p. ej. Ayuntamiento de …, Hospital …, Mi Empresa, S.L."></label>
      <label class="fld span2">Sistema o alcance *<input type="text" id="wz-sis" data-wz="sistema" value="${esc(w.sistema)}" placeholder="p. ej. Sede electrónica y gestión de expedientes"></label>
      <label class="fld">Categoría del sistema (ENS)<select id="wz-cat" data-wz="categoria">${E.CATEGORIAS.map((c) => opt(c, c, w.categoria)).join('')}</select></label>
      <label class="fld">Responsable del análisis<input type="text" id="wz-resp" data-wz="responsable" value="${esc(w.responsable)}"></label>
      <p class="muted small span2">${CAT_TXT[w.categoria]} Si la organización no está sujeta al ENS, elige la categoría que mejor refleje su exigencia.</p>
      <label class="fld span2">Alcance del análisis<textarea id="wz-alc" data-wz="alcance" placeholder="Servicios, sedes y periodo que cubre el análisis">${esc(w.alcance)}</textarea></label></div>`;
  } else if (w.step === 2) {
    body = `<p class="muted">Funciones de negocio que sostiene el sistema. Para cada una, el tiempo máximo hasta recuperarla (RTO), la pérdida de datos tolerable (RPO) y el tiempo a partir del cual el daño es inaceptable (MTPD). Después podrás valorar el impacto en el tiempo y las dependencias.</p>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Función</th><th>Responsable</th><th class="c">RTO (h)</th><th class="c">RPO (h)</th><th class="c">MTPD (h)</th><th class="c">€ / hora</th><th></th></tr></thead><tbody>
      ${w.funciones.map((f, i) => `<tr><td><input type="text" id="wz-f${i}-n" aria-label="Función" data-wz="funciones.${i}.nombre" value="${esc(f.nombre)}" placeholder="p. ej. Registro electrónico" class="w-full"></td>
        <td><input type="text" id="wz-f${i}-r" aria-label="Responsable" data-wz="funciones.${i}.responsable" value="${esc(f.responsable)}" class="w-full"></td>
        ${['rto', 'rpo', 'mtpd', 'costeHora'].map((k) => `<td class="c"><input type="number" min="0" step="any" id="wz-f${i}-${k}" class="w-sm num" aria-label="${{ rto: 'RTO', rpo: 'RPO', mtpd: 'MTPD', costeHora: 'Coste por hora' }[k]}" data-wz="funciones.${i}.${k}" data-type="num" value="${esc(f[k])}"></td>`).join('')}
        <td><button type="button" class="icon-btn sm" data-act="wz-del" data-i="${i}" aria-label="Quitar"${w.funciones.length < 2 ? ' disabled' : ''}>${icon('x', 16)}</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="row"><button type="button" class="btn sm" data-act="wz-add">${icon('plus', 16)}Añadir función</button></div>
      <div class="note">${icon('info', 16)}<p><b>Regla:</b> el RTO debe ser menor que el MTPD. El RPO es independiente: mide datos perdidos, no tiempo sin servicio.</p></div>`;
  } else {
    const exig = E.estadoEns({ meta: { categoria: w.categoria } }, []);
    body = `<div class="grid g2">
      <div class="card soft summary">
        <div class="row">${catPill(w.categoria)}<b>${esc(w.organizacion || 'Tu organización')}</b></div>
        <dl class="kv"><dt>Sistema</dt><dd>${esc(w.sistema || '—')}</dd><dt>Funciones</dt><dd>${w.funciones.length}</dd>
          <dt>RTO más exigente</dt><dd>${fmtH(Math.min(...w.funciones.map((f) => Number(f.rto) || 0)))}</dd></dl>
      </div>
      <div class="stack"><h4>Medidas de continuidad del ENS</h4>${exig.map((e) => `<div class="ens-line">${e.aplica ? icon('check', 16, 'accent') : icon('x', 16, 'muted')}<code>${e.code}</code><span>${e.nombre}</span><span class="muted small">${e.aplica ? 'Exigida' : 'No exigida'}</span></div>`).join('')}
        <p class="muted small">Siguientes pasos: valorar el impacto en el tiempo, inventariar los activos con su estrategia de recuperación y registrar las pruebas.</p></div></div>`;
  }
  return `${pageHead('ISO 22301 § 8.2 · ENS op.cont.1', 'Nuevo proyecto', 'Datos de la organización, funciones de negocio y objetivos de recuperación. Con eso se calcula qué exige el ENS y desde dónde empezar.')}
  <div class="card wizard">${stepper}${w.error ? `<div class="alert crit" role="alert">${icon('alert', 16)}${esc(w.error)}</div>` : ''}${body}
    <div class="wz-foot">${w.step > 1 ? `<button type="button" class="btn" data-act="wz-back">${icon('arrowLeft', 16)}Atrás</button>` : `<button type="button" class="btn ghost" data-act="nav" data-view="inicio">Cancelar</button>`}
      ${w.step < 3 ? `<button type="button" class="btn primary" data-act="wz-next">Continuar${icon('arrowRight', 16)}</button>` : `<button type="button" class="btn primary" data-act="wz-create">${icon('check', 16)}Crear proyecto</button>`}</div></div>`;
}

/* --- Perfil --- */
function vPerfil() {
  const p = ws.profile;
  return `${pageHead('Cuenta', 'Tu perfil', 'Figura como autor en el plan de continuidad, en el informe de preauditoría y en el libro Excel. Se guarda solo en este navegador.')}
  <div class="grid g-side">
    <div class="card profile-card">${avatar(88)}<h2>${esc(p.nombre || 'Sin nombre')}</h2><p class="muted">${esc(p.rol || 'Sin rol')}</p>${p.organizacion ? `<p class="small">${esc(p.organizacion)}</p>` : ''}
      <div class="swatches" role="group" aria-label="Color del avatar">${COLORS.map((c) => `<button type="button" class="swatch c-${c}${p.color === c ? ' on' : ''}" data-act="set-color" data-c="${c}" aria-label="${COLOR_NAME[c]}" title="${COLOR_NAME[c]}"></button>`).join('')}</div>
      <p class="muted small">Color del avatar. Salvo pizarra, cambia también el color de acento de la interfaz.</p>
      <div class="pf-stats"><div><b class="num">${ws.projects.filter((x) => x.kind === 'own').length}</b><span>proyectos</span></div><div><b class="num">${ws.projects.filter((x) => x.kind === 'demo').length}</b><span>casos abiertos</span></div></div></div>
    <div class="card"><h3>Datos</h3><div class="form-grid" style="margin-top:14px">
      <label class="fld span2">Nombre y apellidos<input type="text" id="pf-n" data-ws="profile.nombre" value="${esc(p.nombre)}"></label>
      <label class="fld">Rol<select id="pf-r" data-ws="profile.rol">${opt('', 'Elige tu rol', p.rol)}${ROLES.map((r) => opt(r, r, p.rol)).join('')}</select></label>
      <label class="fld">Organización<input type="text" id="pf-o" data-ws="profile.organizacion" value="${esc(p.organizacion)}"></label>
      <label class="fld span2">Correo electrónico<input type="text" id="pf-e" data-ws="profile.email" value="${esc(p.email)}" placeholder="nombre@organizacion.es"></label>
    </div><p class="muted small" style="margin-top:14px">En los documentos aparecerá: <b>${esc(firma())}</b></p></div>
  </div>`;
}
const firma = () => ws.profile.nombre ? `${ws.profile.nombre}${ws.profile.rol ? ' – ' + ws.profile.rol : ''}` : 'Sin autor (completa tu perfil)';

/* --- Ajustes --- */
function setRow(title, desc, control) { return `<div class="set-row"><div><b>${title}</b>${desc ? `<p>${desc}</p>` : ''}</div><div class="set-ctl">${control}</div></div>`; }
function vAjustes() {
  const s = ws.settings;
  const seg = (key, opts, label) => `<div class="seg" role="group" aria-label="${label}">${opts.map(([v, l, ic]) => `<button type="button" data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${s[key] === v}">${ic ? icon(ic, 15) : ''}${l}</button>`).join('')}</div>`;
  const sw = (key, id, label) => `<label class="switch"><input type="checkbox" id="${id}" aria-label="${label}" data-ws="settings.${key}" data-type="bool"${s[key] ? ' checked' : ''}><span></span></label>`;
  const conf = ui.confirm === 'wipe';
  return `${pageHead('Preferencias', 'Ajustes', 'Apariencia, reglas de preauditoría y datos. Los cambios se aplican a todos los proyectos de este navegador.')}
  <div class="settings">
    <section class="card"><h3>Apariencia</h3>
      ${setRow('Idioma', 'Idioma de menús, ajustes y ayuda. Los datos de los proyectos se muestran tal como se escribieron.', seg('idioma', [['es', 'Español'], ['en', 'English']], 'Idioma'))}
      ${setRow('Tema', 'Sistema sigue la configuración de tu equipo.', seg('tema', [['sistema', 'Sistema', 'monitor'], ['claro', 'Claro', 'sun'], ['oscuro', 'Oscuro', 'moon']], 'Tema'))}
      ${setRow('Color de acento', 'Botones, navegación, gráficas y resaltes.', `<div class="swatches" role="group" aria-label="Color de acento">${ACCENTS.map(([c, name]) => `<button type="button" class="swatch a-${c}${s.acento === c ? ' on' : ''}" data-act="set" data-k="acento" data-v="${c}" aria-label="${name}" title="${name}"></button>`).join('')}</div>`)}
      ${setRow('Densidad', 'Compacta muestra más filas en tablas y listas.', seg('densidad', [['comoda', 'Cómoda'], ['compacta', 'Compacta']], 'Densidad'))}
    </section>
    <section class="card"><h3>Preauditoría</h3>
      <details class="rules-box" data-keep="rulesOpen"${ui.rulesOpen ? ' open' : ''}><summary>Reglas activas <span class="muted small">${E.REGLAS.length - s.reglasOff.length} de ${E.REGLAS.length}</span></summary>
        <div class="rules-list">${E.REGLAS.map(([id, t, ref]) => `<label class="rule-row"><span class="switch"><input type="checkbox" data-rule="${id}" aria-label="${esc(id)}"${s.reglasOff.includes(id) ? '' : ' checked'}><span></span></span><code>${id}</code><span>${esc(t)}<small class="muted"> · ${esc(ref)}</small></span></label>`).join('')}</div></details>
    </section>
    <section class="card"><h3>Casos de ejemplo</h3>
      ${setRow('Mostrar los casos en Inicio', 'Muestra u oculta la sección «Casos de ejemplo».', sw('mostrarCasos', 'st-mc', 'Mostrar los casos en Inicio'))}
      ${setRow('Cerrar los casos abiertos', 'Elimina las copias de los casos de ejemplo; tus proyectos no se tocan.', `<button type="button" class="btn sm" data-act="close-demos">${icon('x', 15)}Cerrar ${plural(ws.projects.filter((p) => p.kind === 'demo').length, 'caso', 'casos')}</button>`)}
    </section>
    <section class="card"><h3>Datos y privacidad</h3>
      <p class="muted small" style="margin:4px 0 8px">KAIROS no tiene servidor ni hace peticiones de red. Los proyectos, el perfil y los ajustes se guardan solo en el almacenamiento local de este navegador; si se borran los datos del sitio, se pierden.</p>
      <p class="muted small" style="margin:0 0 8px">Se guardan sin cifrar. Cualquier página del mismo origen puede leerlos: todos los HTML abiertos desde el disco (file://) y todos los proyectos publicados en heindall92.github.io. Con datos reales de una organización, usa el fichero descargado en un equipo y perfil de navegador propios, y borra los datos al terminar.</p>
      ${setRow('Copia de seguridad', 'Perfil, ajustes y todos los proyectos en un único fichero JSON.', `<div class="row"><button type="button" class="btn sm" data-act="backup">${icon('download', 15)}Descargar</button><button type="button" class="btn sm" data-act="restore">${icon('upload', 15)}Restaurar</button></div>`)}
      ${setRow('Borrar todos los datos', 'Elimina perfil, ajustes y proyectos de este navegador.', conf ? `<div class="row"><button type="button" class="btn sm danger-solid" data-act="wipe">Sí, borrar todo</button><button type="button" class="btn sm" data-act="confirm-no">Cancelar</button></div>` : `<button type="button" class="btn sm danger" data-act="ask" data-what="wipe">${icon('trash', 15)}Borrar…</button>`)}
    </section>
  </div>`;
}

/* --- Ayuda --- */
const GLOSARIO = [
  ['BIA · Análisis de impacto', 'Análisis de las funciones de negocio y del daño que causa su interrupción a lo largo del tiempo. Fija qué es crítico y en cuánto tiempo debe volver (ISO 22301 § 8.2.2; ENS op.cont.1).'],
  ['BCP · Plan de continuidad', 'Cómo sigue funcionando la organización durante y después de una interrupción: equipo de crisis, activación, alternativas manuales y comunicación (ISO 22301 § 8.4).'],
  ['DRP · Plan de recuperación', 'Parte técnica del plan de continuidad: cómo y en qué orden se recuperan los sistemas TIC dentro de los objetivos del BIA.'],
  ['RTO', 'Recovery Time Objective. Tiempo máximo desde la interrupción hasta que la función vuelve a estar disponible.'],
  ['RPO', 'Recovery Point Objective. Pérdida máxima de datos tolerable, medida en tiempo. La determina la frecuencia de las copias o de la réplica.'],
  ['MTPD', 'Maximum Tolerable Period of Disruption (también MAD). Tiempo a partir del cual las consecuencias son inaceptables. El RTO debe ser menor.'],
  ['RTO alcanzable', 'Instante en que KAIROS calcula que la función estaría de vuelta con las estrategias actuales: el fin de la recuperación de todo lo que necesita, recorriendo la cadena de dependencias.'],
  ['Ruta crítica', 'Cadena de dependencias que más tarda en recuperarse. Mejorar cualquier otro elemento no adelanta la vuelta de la función.'],
  ['Hot, warm y cold standby', 'Estrategias de recuperación: réplica activa con conmutación automática (minutos), réplica periódica con conmutación semiautomática (horas) y restauración manual desde copia (un día o más).'],
  ['Regla 3-2-1', 'Tres copias de los datos, en dos soportes distintos y una fuera de la sede. Hoy se completa con una copia inmutable o desconectada frente al ransomware.'],
  ['Ejercicio de mesa', 'Prueba en la que el equipo recorre un escenario sin ejecutar acciones técnicas. Detecta roles confusos y decisiones sin dueño.'],
  ['Sitio alternativo', 'Instalación donde se recuperan los servicios si la principal no está disponible. El ENS lo exige, o medios alternativos equivalentes, en categoría ALTA (op.cont.4).'],
  ['NC mayor / NC menor', 'No conformidades. La mayor compromete un requisito; la menor es un incumplimiento puntual. La observación es una oportunidad de mejora.']
];
const FAQ = [
  ['¿En qué se diferencia de la plantilla de BIA y BCP?', 'La plantilla recoge los datos; KAIROS además calcula. Recorre las dependencias para saber cuándo vuelve cada función, compara el RPO con la frecuencia real de las copias, comprueba que el plan se activa antes de que venza el RTO y que el sitio alternativo llega a tiempo, y revisa todo con 28 reglas.'],
  ['¿Por qué no se exige que el RPO sea menor que el RTO?', 'Porque miden cosas distintas: el RTO es tiempo sin servicio y el RPO, datos perdidos. Una función puede tolerar 24 h de parada y ninguna pérdida de datos (RPO 0, RTO 24 h). Lo que sí se exige es RTO menor que MTPD.'],
  ['¿Cómo se calcula el RTO alcanzable?', 'Cada activo empieza a recuperarse cuando terminan aquellos de los que depende, y tarda lo que indica su procedimiento o, si no consta, lo típico de su estrategia. Una función vuelve cuando terminan sus activos, las funciones de las que depende y el plazo comprometido por sus proveedores.'],
  ['¿Qué activos cuentan para el RPO?', 'Solo los marcados como «guarda datos de la función». Las copias de configuración de red o del directorio no determinan la pérdida de datos de negocio.'],
  ['¿Dónde se guardan mis datos?', 'Solo en este navegador. No hay servidor ni cuentas. Usa Ajustes → Copia de seguridad para llevarte tus proyectos a otro equipo.'],
  ['¿Sirve para organizaciones fuera del ENS?', 'Sí. Las reglas de ISO 22301 e ISO/IEC 27001 aplican igual; la categoría solo modula qué se exige de op.cont.2 a op.cont.4.']
];
/* Herramientas GRC del autor: el mismo bloque en Rosetta, ENS Compliance Studio y KAIROS */
const SUITE = [
  ['rosetta', 'Rosetta', 'Mapa multinorma: ENS, ISO/IEC 27001, NIS2 e ISO/IEC 42001 en 115 controles unificados, con equivalencias ENS ↔ ISO alineadas con la CCN-STIC 825.', 'https://heindall92.github.io/rosetta_multinorma/', 'https://github.com/heindall92/rosetta_multinorma'],
  ['ens', 'ENS Compliance Studio', 'Categorización del sistema, análisis de riesgos MAGERIT, Declaración de Aplicabilidad y preauditoría del ENS.', 'https://heindall92.github.io/grc_ens_compliance_studio/app/dist/ens-compliance-studio.html', 'https://github.com/heindall92/grc_ens_compliance_studio'],
  ['kairos', 'KAIROS', 'Continuidad de negocio: BIA, BCP y DRP con la ruta crítica de recuperación de cada función.', 'https://heindall92.github.io/kairos/', 'https://github.com/heindall92/kairos']
];
function suiteGrc() {
  const ext = (h, l, ic) => `<a class="btn sm" href="${h}" target="_blank" rel="noopener noreferrer">${icon(ic, 14)}${l}</a>`;
  return `<section class="suite" aria-labelledby="suite-h"><h3 id="suite-h">Herramientas GRC del autor</h3><p class="muted small">Se complementan: la SoA de ENS Compliance Studio se importa en Rosetta, y KAIROS cubre op.cont, la continuidad que las otras dos solo enumeran.</p>
    <div class="suite-grid">${SUITE.map(([id, n, d, app, repo]) => `<article class="suite-card${id === 'kairos' ? ' here' : ''}"><div class="suite-hd"><b>${n}</b>${id === 'kairos' ? '<span class="badge accent">Estás aquí</span>' : ''}</div><p>${d}</p>
      <div class="row">${id === 'kairos' ? ext(repo, 'Código', 'external') : ext(app, 'Abrir la app', 'arrowRight') + ext(repo, 'Código', 'external')}</div></article>`).join('')}</div></section>`;
}
function vAyuda() {
  const tabs = [['inicio', 'Primeros pasos', 'flag'], ['metodo', 'Cómo calcula', 'gauge'], ['glosario', 'Glosario', 'book'], ['reglas', 'Reglas de preauditoría', 'shieldCheck'], ['atajos', 'Atajos de teclado', 'keyboard'], ['faq', 'Preguntas frecuentes', 'help'], ['acerca', 'Acerca de', 'info']];
  let body = '';
  const t = ui.helpTab;
  if (t === 'inicio') {
    const pasos = [['Crea o abre un proyecto', 'Empieza con tus datos, importa un proyecto o abre uno de los casos de ejemplo.', 'inicio'], ['Valora las funciones', 'Impacto a 1 h, 4 h, 24 h, 72 h y 7 días; RTO, RPO, MTPD y coste por hora. La criticidad y el MTPD que admite la matriz se calculan solos.', 'funciones'], ['Mapea las dependencias', 'Activos TIC, otras funciones y proveedores con su plazo comprometido.', 'dependencias'], ['Define la recuperación', 'Estrategia, tiempo y procedimiento de cada activo. El orden y la ruta crítica salen del mapa.', 'recuperacion'], ['Revisa las copias', 'Frecuencia, ubicación, cifrado y última restauración.', 'copias'], ['Prepara la crisis', 'Equipo con suplentes, criterio de activación, comunicación y sitio alternativo.', 'crisis'], ['Prueba y corrige', 'Registra los ejercicios con el RTO y el RPO medidos y atiende la preauditoría.', 'preauditoria']];
    body = `<ol class="steps">${pasos.map(([h, p, v], i) => `<li><span class="step-n">${i + 1}</span><div><b>${h}</b><p>${p}</p></div>${state || v === 'inicio' ? `<button type="button" class="btn sm ghost" data-act="nav" data-view="${v}">Ir${icon('arrowRight', 15)}</button>` : ''}</li>`).join('')}</ol>`;
  } else if (t === 'metodo') {
    body = `<div class="flow" role="img" aria-label="Del impacto al plan: funciones, dependencias, recuperación y verificación">
      <div class="flow-col"><div class="fnode">${icon('layers', 18)}<b>Impacto en el tiempo</b><small>1 h · 4 h · 24 h · 72 h · 7 días</small></div><div class="fnode">${icon('hourglass', 18)}<b>RTO · RPO · MTPD</b><small>Objetivos por función</small></div></div>
      <div class="flow-arrow">${icon('arrowRight', 22)}</div>
      <div class="flow-col mid"><div class="fnode big">${icon('network', 22)}<b>Ruta crítica de recuperación</b><small>Activos, funciones y proveedores encadenados · RTO y RPO alcanzables · exposición económica</small></div></div>
      <div class="flow-arrow">${icon('arrowRight', 22)}</div>
      <div class="flow-col"><div class="fnode">${icon('shieldCheck', 18)}<b>Preauditoría</b><small>${E.REGLAS.length} reglas</small></div><div class="fnode">${icon('fileText', 18)}<b>Plan de continuidad</b><small>Markdown · Excel</small></div></div></div>
      <div class="grid g3" style="margin-top:18px">
      <div class="card soft"><h4>Criticidad y MTPD</h4><p class="small">Se toma el impacto máximo de las cuatro dimensiones en cada horizonte, sin que pueda bajar con el tiempo. Alta si es crítico a las 24 h o alto a las 4 h; media si es alto a las 72 h. El MTPD que admite la matriz es el primer horizonte en «Crítico».</p></div>
      <div class="card soft"><h4>RTO alcanzable</h4><p class="small">Cada activo empieza cuando terminan sus dependencias y tarda lo que su procedimiento (o su estrategia: hot 15 min, warm y nube 4 h, cold 24 h). La función vuelve cuando terminan sus activos, las funciones de las que depende y el plazo de sus proveedores.</p></div>
      <div class="card soft"><h4>Exposición económica</h4><p class="small">Horas por encima del RTO × coste por hora. Mide lo que cuesta, en cada incidente, no llegar al objetivo con las estrategias actuales.</p></div></div>`;
  } else if (t === 'glosario') {
    const q = ui.glosarioQ.toLowerCase();
    const items = GLOSARIO.filter(([a, b]) => !q || (a + ' ' + b + ' ' + tr(a) + ' ' + tr(b)).toLowerCase().includes(q));
    body = `<input type="search" id="glo-q" aria-label="Buscar un término" value="${esc(ui.glosarioQ)}" placeholder="Buscar un término…" class="w-full" style="margin-bottom:14px"><dl class="glossary">${items.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('') || '<p class="muted">Sin resultados.</p>'}</dl>`;
  } else if (t === 'reglas') {
    body = `<div class="table-wrap"><table class="tbl"><thead><tr><th>Regla</th><th>Qué comprueba</th><th>Referencia</th>${state ? '<th class="c">En este proyecto</th>' : ''}</tr></thead><tbody>${E.REGLAS.map(([id, d, ref]) => `<tr><td><code>${id}</code></td><td>${esc(d)}</td><td class="small">${esc(ref)}</td>${state ? `<td class="c num">${calc.checks.filter((f) => f.id === id).length}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  } else if (t === 'atajos') {
    const k = [['Ctrl / ⌘ + K', 'Buscar y ejecutar comandos'], ['↑ ↓ · Enter', 'Moverse y abrir en el buscador'], ['Esc', 'Cerrar buscador, menús y diálogos'], ['?', 'Abrir la ayuda'], ['G y luego P', 'Ir al panel'], ['G y luego F', 'Ir a funciones'], ['G y luego D', 'Ir a dependencias'], ['G y luego R', 'Ir a recuperación'], ['G y luego T', 'Ir a pruebas'], ['G y luego A', 'Ir a la preauditoría']];
    body = `<div class="kbd-list">${k.map(([a, b]) => `<div><span>${a.split(' ').map((x) => /^[+·yluego]+$/.test(x) ? `<em>${x}</em>` : `<kbd>${esc(x)}</kbd>`).join(' ')}</span><p>${b}</p></div>`).join('')}</div>`;
  } else if (t === 'faq') {
    body = `<div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
  } else {
    body = `<div class="about"><p><b>KAIROS ${VERSION}</b> · Continuidad de negocio: BIA, BCP y DRP. Proyecto del Máster en Ciberseguridad &amp; IA (Evolve Academy), módulo de Gobierno, Riesgo y Cumplimiento, a partir de la plantilla formativa de BIA y BCP del curso.</p>
      <div class="about-card"><span class="avatar c-green" style="--s:52px">YR</span><div><b>Yoandy Ramírez Delgado</b><small>Diseño y desarrollo · Junior Pentester · eJPTv2 · AI Governance (ISO 42001)</small></div></div>
      <div class="about-links">${[['https://www.linkedin.com/in/yoandyrd92/', 'LinkedIn'], ['https://github.com/heindall92', 'GitHub'], ['https://yoandyramirez.com', 'Portafolio'], ['https://profile.hackthebox.com/profile/019c5812-b4ca-7315-b12f-14db6d2b42fa', 'HackTheBox'], ['mailto:yoandyramirezdelgado@gmail.com', 'Correo']].map(([h, l]) => `<a class="btn sm" href="${h}" target="_blank" rel="noopener noreferrer">${icon('external', 14)}${l}</a>`).join('')}</div>
      ${suiteGrc()}
      <p>Normativa de referencia: ISO 22301:2019, ISO/IEC 27001:2022 (A.5.29, A.5.30, A.8.13), Real Decreto 311/2022 (op.cont.1 a op.cont.4, mp.info.6), CCN-STIC 817.</p>
      <p>Herramienta de apoyo y preauditoría: no sustituye a la auditoría formal. Los casos de ejemplo son ficticios.</p>
      <p class="muted small">Exportación a Excel con xlsx-js-style 1.2.0 (Apache-2.0). Código bajo licencia GPLv2.</p></div>`;
  }
  return `${pageHead('Centro de ayuda', 'Ayuda', 'Primeros pasos, método de cálculo, reglas de preauditoría, glosario y atajos de teclado.')}
  <div class="help-layout"><nav class="help-nav">${tabs.map(([id, l, ic]) => `<button type="button" data-act="help-tab" data-tab="${id}"${t === id ? ' aria-current="page"' : ''}>${icon(ic, 16)}${l}</button>`).join('')}</nav>
  <div class="card help-body"><h2>${tabs.find((x) => x[0] === t)[1]}</h2>${body}</div></div>`;
}
