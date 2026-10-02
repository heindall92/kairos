/* ---------- Vistas del proyecto ---------- */
const fIdx = (id) => state.funciones.findIndex((f) => f.id === id);
const aIdx = (id) => state.activos.findIndex((a) => a.id === id);
const checklist = (path, opciones, sel, labelFn) => `<div class="chk-list">${opciones.length ? opciones.map((o) => `<label class="chk"><input type="checkbox" data-list="${path}" value="${esc(o.id)}"${sel.includes(o.id) ? ' checked' : ''}><span><code>${esc(o.id)}</code> ${esc(labelFn ? labelFn(o) : o.nombre)}</span></label>`).join('') : '<p class="muted small">Nada que enlazar todavía.</p>'}</div>`;

/* Escala de tiempo comprimida: distingue minutos y días en el mismo eje */
const T_TICKS = [0, 1, 4, 8, 24, 72, 168];
const tScale = (max, w) => { const m = Math.log1p(max); return (h) => (Math.log1p(Math.max(0, Math.min(h, max))) / m) * w; };
const tickLabel = (h) => (h === 0 ? '0' : h < 24 ? `${h} h` : `${h / 24} d`);

/* Recuperación por función: barra hasta el RTO alcanzable; lo que excede el RTO, en rojo; marcas de RTO y MTPD */
function chartFunciones() {
  const rows = calc.funciones.filter((x) => x.rto !== null).sort((a, b) => a.rto - b.rto);
  if (!rows.length) return emptyState('hourglass', 'Sin objetivos de recuperación', 'Define el RTO de las funciones para ver si vuelven a tiempo.');
  const max = Math.max(24, ...rows.map((x) => Math.max(x.rtoAlcanzable, x.rto, x.mtpd || 0)));
  const L = 220, W = 400, RH = 34, top = 8; const H = top + rows.length * RH + 28;
  const x = tScale(max, W);
  const ticks = T_TICKS.filter((t) => t <= max).concat(max > 168 ? [Math.ceil(max)] : []);
  let g = ticks.map((t) => `<line x1="${L + x(t)}" x2="${L + x(t)}" y1="${top}" y2="${H - 22}" class="grid-l"/><text x="${L + x(t)}" y="${H - 6}" class="ax-t" text-anchor="middle">${tickLabel(t)}</text>`).join('');
  rows.forEach((r, i) => {
    const y = top + i * RH + 8; const bh = 16;
    const ok = r.rtoAlcanzable <= r.rto + 1e-9;
    const label = cut(`${r.id} · ${r.nombre}`, 30);
    const tipTxt = `${r.id} · ${r.nombre}: vuelve a las ${fmtH(r.rtoAlcanzable)} · RTO ${fmtH(r.rto)}${r.mtpd !== null ? ` · MTPD ${fmtH(r.mtpd)}` : ''}`;
    g += `<g class="bar-g tipable" data-tip="${esc(tipTxt)}"><text x="${L - 10}" y="${y + 12}" class="lab-t" text-anchor="end">${esc(label)}</text>
      <rect x="${L}" y="${y}" width="${Math.max(2, x(Math.min(r.rtoAlcanzable, r.rto)))}" height="${bh}" rx="4" class="s-mayor"/>
      ${ok ? '' : `<rect x="${L + x(r.rto)}" y="${y}" width="${Math.max(2, x(r.rtoAlcanzable) - x(r.rto))}" height="${bh}" rx="4" class="s-over"/>`}
      <line x1="${L + x(r.rto)}" x2="${L + x(r.rto)}" y1="${y - 4}" y2="${y + bh + 4}" class="mk-rto"/>
      ${r.mtpd !== null ? `<line x1="${L + x(r.mtpd)}" x2="${L + x(r.mtpd)}" y1="${y - 4}" y2="${y + bh + 4}" class="mk-mtpd"/>` : ''}</g>`;
  });
  return `<div class="chart-scroll"><svg viewBox="0 0 ${L + W + 16} ${H}" class="chart timeline" role="img" aria-label="Tiempo de recuperación por función frente a su RTO y su MTPD">${g}</svg></div>
    <div class="legend"><span><i class="lg s-mayor"></i>Recuperación dentro del RTO</span><span><i class="lg s-over"></i>Tiempo por encima del RTO</span><span><i class="lg mk mk-rto"></i>RTO</span><span><i class="lg mk mk-mtpd"></i>MTPD</span></div>`;
}

/* Reloj de recuperación: un anillo por función con objetivo. El arco llega hasta el momento en que vuelve con las
 * estrategias actuales (verde dentro del RTO, rojo lo que lo excede) y la marca indica el RTO. Escala comprimida
 * (log1p) para que quepan minutos y días en la misma vuelta; la vuelta completa abarca 330°. */
const dialRows = (r) => r.funciones.filter((x) => x.rto !== null).sort((a, b) => a.rto - b.rto || a.id.localeCompare(b.id)).slice(0, 7)
  .map((x) => ({ id: x.id, nombre: x.nombre, rto: x.rto, ach: x.rtoAlcanzable, ok: x.rtoAlcanzable <= x.rto + 1e-9, mtpd: x.mtpd }));
function dial(rows, opt = {}) {
  const S = 400, c = S / 2, R0 = 150, N = Math.max(1, rows.length);
  const step = Math.min(20, N > 1 ? 76 / (N - 1) : 20); const RW = Math.max(7, Math.round(step * 0.68));
  const max = Math.max(72, ...rows.map((r) => Math.max(r.ach, r.rto)));
  const f = tScale(max, 1); const A0 = -Math.PI / 2; const SW = Math.PI * 2 * (330 / 360);
  const pt = (r, t) => { const a = A0 + t * SW; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
  const n2 = (v) => Math.round(v * 100) / 100;
  const arc = (r, t0, t1) => { t1 = Math.max(t1, t0 + 0.004); const [x0, y0] = pt(r, t0); const [x1, y1] = pt(r, t1); return `M${n2(x0)} ${n2(y0)}A${r} ${r} 0 ${(t1 - t0) * SW > Math.PI ? 1 : 0} 1 ${n2(x1)} ${n2(y1)}`; };
  let g = '';
  for (const t of T_TICKS.filter((t) => t <= max).concat(max > 168 ? [] : [])) {
    const [x0, y0] = pt(R0 + RW / 2 + 6, f(t)); const [x1, y1] = pt(R0 + RW / 2 + 12, f(t)); const [lx, ly] = pt(R0 + RW / 2 + 26, f(t));
    g += `<line x1="${n2(x0)}" y1="${n2(y0)}" x2="${n2(x1)}" y2="${n2(y1)}" class="d-tick"/><text x="${n2(lx)}" y="${n2(ly + 4)}" class="d-lab" text-anchor="middle">${tickLabel(t)}</text>`;
  }
  rows.forEach((r, i) => {
    const R = R0 - i * step; const tR = f(r.rto); const tA = f(r.ach);
    const tip = `${r.id} · ${r.nombre}: vuelve a las ${fmtH(r.ach)} · RTO ${fmtH(r.rto)}`;
    const [k0x, k0y] = pt(R - RW / 2 - 3, tR); const [k1x, k1y] = pt(R + RW / 2 + 3, tR);
    g += `<g class="ring tipable" data-tip="${esc(tip)}" style="--i:${i}"><path d="${arc(R, 0, 1)}" class="d-track" stroke-width="${RW}"/>
      <path d="${arc(R, 0, Math.min(tA, tR))}" class="d-ok" stroke-width="${RW}" pathLength="1"/>
      ${r.ok ? '' : `<path d="${arc(R, tR, tA)}" class="d-late" stroke-width="${RW}" pathLength="1"/>`}
      <line x1="${n2(k0x)}" y1="${n2(k0y)}" x2="${n2(k1x)}" y2="${n2(k1y)}" class="d-rto"/></g>`;
  });
  const ok = rows.filter((r) => r.ok).length;
  const centro = opt.centro !== undefined ? opt.centro : `<text x="${c}" y="${c + 6}" class="d-big" text-anchor="middle">${rows.length ? Math.round((ok / rows.length) * 100) : 0}<tspan class="d-pct">%</tspan></text><text x="${c}" y="${c + 30}" class="d-cap" text-anchor="middle">${opt.cap || 'a tiempo'}</text>`;
  return `<svg viewBox="0 0 ${S} ${S}" class="dial${opt.anim ? ' anim' : ''}" role="img" aria-label="${esc(opt.label || `Reloj de recuperación: ${ok} de ${rows.length} funciones vuelven dentro de su RTO`)}">${g}${centro}</svg>`;
}
function ringMini(frac, tone) {
  const r = 17, C = 2 * Math.PI * r; const v = frac === null ? 0 : Math.max(0, Math.min(1, frac));
  return `<svg viewBox="0 0 44 44" class="ring-mini ${tone || ''}" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="rm-track"/><circle cx="22" cy="22" r="${r}" class="rm-val" stroke-dasharray="${(v * C).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 22 22)"/></svg>`;
}
function metric(label, value, sub, vis, tone) {
  return `<div class="metric ${tone || ''}">${vis}<div class="m-txt"><span class="m-l">${label}</span><span class="m-v num">${value}</span><span class="m-s">${sub}</span></div></div>`;
}
function vPanel() {
  const k = calc.kpi;
  const rows = dialRows(calc); const conRto = calc.funciones.filter((x) => x.rto !== null).length;
  const rpoEval = calc.funciones.filter((x) => x.cumpleRpo !== null && x.cumpleRpo !== undefined); const rpoOk = rpoEval.filter((x) => x.cumpleRpo).length;
  const ultima = calc.pruebas.find((p) => p.resultado !== 'Cancelado' && p.fecha);
  const urg = calc.checks.filter((c) => c.sev === 'NC mayor').slice(0, 5);
  const ensCard = (e) => `<div class="ens-card ${e.aplica ? (e.ncMayor ? 'bad' : e.ncMenor ? 'warn' : 'good') : 'na'}"><code>${e.code}</code><b>${e.nombre}</b><span class="badge ${!e.aplica ? 'neutral' : e.ncMayor ? 'crit' : e.ncMenor ? 'warn' : 'ok'}">${e.estado}</span>${e.aplica && (e.ncMayor || e.ncMenor) ? `<small class="muted">${plural(e.ncMayor, 'NC mayor', 'NC mayores')} · ${plural(e.ncMenor, 'NC menor', 'NC menores')}</small>` : ''}</div>`;
  const legend = rows.map((r) => `<li class="${r.ok ? 'ok' : 'bad'}"><span class="rl-dot" aria-hidden="true"></span><code>${esc(r.id)}</code><span class="rl-n">${esc(r.nombre)}</span><span class="rl-v num"><b>${fmtH(r.ach)}</b><small> / ${fmtH(r.rto)}</small></span></li>`).join('');
  return `${pageHead(esc(state.meta.organizacion || 'Proyecto'), 'Panel de continuidad', esc(state.meta.sistema || ''), `<button type="button" class="btn" data-act="export-plan">${icon('fileText', 16)}Plan (.md)</button><button type="button" class="btn primary" data-act="export-xlsx"${ui.busyXlsx ? ' disabled' : ''}>${icon('sheet', 16)}${ui.busyXlsx ? 'Generando…' : 'Excel'}</button>`)}
  <section class="stage">
    <div class="stage-dial">${rows.length ? dial(rows, { anim: ui.entering }) : emptyState('hourglass', 'Sin objetivos de recuperación', 'Define el RTO de las funciones para ver si vuelven a tiempo.')}</div>
    <div class="stage-side">
      <span class="stage-k">Reloj de recuperación</span>
      <h2>${k.evaluables ? `${k.cumplenRto} de ${k.evaluables} funciones vuelven a tiempo` : 'Sin funciones con RTO'}</h2>
      <p>Cada anillo es una función. El arco llega hasta el momento en que vuelve con las estrategias actuales; la marca blanca es su RTO. En rojo, lo que llega tarde.</p>
      ${rows.length ? `<ul class="ring-legend">${legend}</ul>${conRto > rows.length ? `<p class="small">Se muestran las ${rows.length} funciones con el RTO más exigente de ${conRto}.</p>` : ''}` : ''}
      <button type="button" class="btn sm on-dark" data-act="nav" data-view="recuperacion">Ver la secuencia de recuperación${icon('arrowRight', 15)}</button>
    </div>
  </section>
  <div class="metric-grid">
    ${metric('RTO alcanzables', `${k.cumplenRto}<small>/${k.evaluables}</small>`, k.evaluables ? `${pct(k.preparacion)} de las funciones vuelven a tiempo` : 'Define el RTO de las funciones', ringMini(k.evaluables ? k.cumplenRto / k.evaluables : null, k.cumplenRto < k.evaluables ? 'bad' : ''), k.cumplenRto < k.evaluables ? 'alert' : '')}
    ${metric('RPO cubiertos', `${rpoOk}<small>/${rpoEval.length}</small>`, rpoEval.length ? 'Copias que cumplen la pérdida de datos tolerable' : 'Sin funciones con RPO y datos', ringMini(rpoEval.length ? rpoOk / rpoEval.length : null, rpoOk < rpoEval.length ? 'bad' : ''), rpoOk < rpoEval.length ? 'alert' : '')}
    ${metric('Exposición por incidente', eur(k.exposicion), 'Horas por encima del RTO × coste por hora', `<span class="m-ic">${icon('gauge', 20)}</span>`, k.exposicion > 0 ? 'alert' : '')}
    ${metric('NC mayores', `${k.ncMayor}`, `${plural(k.ncMenor, 'menor', 'menores')} · ${plural(k.obs, 'observación', 'observaciones')} · ${ultima ? `última prueba ${fmtDate(ultima.fecha)}` : 'sin pruebas'}`, `<span class="m-ic">${icon('alert', 20)}</span>`, k.ncMayor > 0 ? 'alert' : '')}
  </div>
  <div class="grid g-main">
    <section class="card"><div class="card-head"><h2>Lo más urgente</h2><button type="button" class="btn sm ghost" data-act="nav" data-view="preauditoria">Ver todo${icon('arrowRight', 15)}</button></div>
      ${urg.length ? `<ul class="urg-list">${urg.map((c) => `<li><span class="dot crit"></span><div><b>${esc(c.titulo)}</b><small>${esc(c.ambito)} · <code>${c.id}</code></small></div></li>`).join('')}</ul>` : `<p class="muted">Sin no conformidades mayores.</p>`}</section>
    <section class="card"><div class="card-head"><h2>Medidas de continuidad del ENS</h2>${catPill(state.meta.categoria)}</div><div class="ens-grid">${calc.ens.map(ensCard).join('')}</div></section>
  </div>`;
}

/* --- Funciones e impacto (BIA) --- */
function addFuncion() {
  const id = nextId('F-', state.funciones);
  state.funciones.push({ id, nombre: 'Nueva función', descripcion: '', responsable: '', rto: null, rpo: null, mtpd: null, costeHora: 0, alternativa: '', impacto: impactoVacio(), dependencias: { activos: [], funciones: [], proveedores: [] } });
  ui.fOpen = id; if (ui.view !== 'funciones') { commit(); go('funciones'); } else commit('Función añadida');
}
function vFunciones() {
  const rows = calc.funciones.map((x) => {
    const i = fIdx(x.id); const f = state.funciones[i]; const open = ui.fOpen === x.id;
    const head = `<button type="button" class="row-head" data-act="f-toggle" data-id="${esc(x.id)}" aria-expanded="${open}" aria-controls="fd-${esc(x.id)}">
      <code>${esc(x.id)}</code><span class="rh-name"><b>${esc(x.nombre)}</b><small>${esc(f.responsable || 'Sin responsable')}</small></span>
      ${critBadge(x.criticidad)}${curvaMini(x.curva)}
      <span class="rh-kv"><small>RTO</small><b>${fmtH(x.rto)}</b></span><span class="rh-kv"><small>Vuelve</small><b class="${x.cumpleRto === false ? 'crit-t' : ''}">${fmtH(x.rtoAlcanzable)}</b></span>
      <span class="rh-kv"><small>RPO</small><b class="${x.cumpleRpo === false ? 'crit-t' : ''}">${fmtH(x.rpo)}</b></span>${icon('chevronDown', 18, 'chev')}</button>`;
    if (!open) return `<article class="row-card">${head}</article>`;
    const p = `funciones.${i}`;
    const matriz = `<div class="table-wrap"><table class="tbl imp-tbl"><caption class="sr">Impacto por horizonte y dimensión</caption><thead><tr><th>Dimensión</th>${E.HORIZONTES.map((hz) => `<th class="c">${hz.label}</th>`).join('')}</tr></thead><tbody>
      ${E.DIMENSIONES.map((d) => `<tr><th scope="row">${d.label}</th>${E.HORIZONTES.map((hz) => { const v = f.impacto[hz.k][d.k]; return `<td class="c"><select class="lvl-sel l${v}" data-set="${p}.impacto.${hz.k}.${d.k}" data-type="int" aria-label="${d.label} a ${hz.label}">${E.NIVELES.map((n, j) => opt(j, `${j} · ${n}`, v)).join('')}</select></td>`; }).join('')}</tr>`).join('')}
      <tr class="tot"><th scope="row">Impacto (máximo)</th>${x.curva.map((v) => `<td class="c">${lvlCell(v)} <small>${E.NIVELES[v]}</small></td>`).join('')}</tr></tbody></table></div>`;
    const deps = f.dependencias;
    const res = `<dl class="kv compact">
      <dt>Criticidad</dt><dd>${critBadge(x.criticidad)}</dd>
      <dt>MTPD que admite el impacto</dt><dd>${x.mtpdMatriz === null ? 'Más de 7 días' : fmtH(x.mtpdMatriz)}${x.mtpd !== null && x.mtpdMatriz !== null && x.mtpd > x.mtpdMatriz ? ' <span class="badge warn">Declarado mayor</span>' : ''}</dd>
      <dt>Vuelve con lo actual</dt><dd>${fmtH(x.rtoAlcanzable)} ${okBadge(x.cumpleRto, 'Dentro del RTO', 'Fuera del RTO')}</dd>
      <dt>Marca el ritmo</dt><dd>${esc(causaTxt(x.rtoCausa))}</dd>
      <dt>Pérdida de datos posible</dt><dd>${x.rpoAlcanzable === null ? 'Sin activos con datos' : x.rpoAlcanzable === Infinity ? 'Sin copia' : fmtH(x.rpoAlcanzable)} ${okBadge(x.cumpleRpo, 'Dentro del RPO', 'Fuera del RPO')}</dd>
      <dt>Coste de parar hasta el RTO</dt><dd>${eur(x.impactoRto)}</dd>
      <dt>Coste con la recuperación actual</dt><dd>${eur(x.impactoAlcanzable)}${x.exposicion ? ` <span class="badge crit">+${eur(x.exposicion)}</span>` : ''}</dd></dl>`;
    return `<article class="row-card open">${head}<div class="row-body" id="fd-${esc(x.id)}">
      <div class="form-grid g4">
        ${fld('Nombre', inTxt(`${p}.nombre`, f.nombre), 'span2')}${fld('Responsable', inTxt(`${p}.responsable`, f.responsable), 'span2')}
        ${fld('RTO (horas)', inNum(`${p}.rto`, f.rto))}${fld('RPO (horas)', inNum(`${p}.rpo`, f.rpo))}${fld('MTPD (horas)', inNum(`${p}.mtpd`, f.mtpd))}${fld('Coste por hora (€)', `<input type="number" min="0" step="any" data-set="${p}.costeHora" data-type="num" value="${esc(f.costeHora)}">`)}
        ${fld('Descripción', inArea(`${p}.descripcion`, f.descripcion), 'span2')}${fld('Alternativa manual o degradada', inArea(`${p}.alternativa`, f.alternativa, 'placeholder="Cómo se sigue prestando sin el sistema"'), 'span2')}
      </div>
      <h4>Impacto de la interrupción en el tiempo</h4><p class="muted small">0 Ninguno · 1 Bajo · 2 Medio · 3 Alto · 4 Crítico (inaceptable). El primer horizonte en «Crítico» marca el MTPD máximo defendible.</p>${matriz}
      <div class="grid g2">
        <div><h4>Resultado</h4>${res}</div>
        <div><h4>Depende de</h4>
          <h5>Activos TIC</h5>${checklist(`${p}.dependencias.activos`, state.activos, deps.activos)}
          <h5>Otras funciones</h5>${checklist(`${p}.dependencias.funciones`, state.funciones.filter((o) => o.id !== f.id), deps.funciones)}
          <h5>Proveedores</h5>${checklist(`${p}.dependencias.proveedores`, state.proveedores, deps.proveedores, (o) => `${o.nombre}${o.slaHoras !== null ? ` · ${fmtH(o.slaHoras)}` : ''}`)}</div></div>
      <div class="row end"><button type="button" class="btn sm danger" data-act="del-funcion" data-i="${i}">${icon('trash', 15)}Eliminar ${esc(f.id)}</button></div></div></article>`;
  }).join('');
  return `${pageHead('BIA · ISO 22301 § 8.2.2 · ENS op.cont.1', 'Funciones e impacto', 'Funciones de negocio, impacto de su interrupción a lo largo del tiempo y objetivos de recuperación. La criticidad, el MTPD que admite el impacto y el RTO alcanzable se calculan.', `<button type="button" class="btn primary" data-act="add-funcion">${icon('plus', 16)}Añadir función</button>`)}
  ${rows ? `<section class="card"><div class="card-head"><h2>Recuperación por función</h2><span class="muted small">Con las estrategias actuales</span></div>${chartFunciones()}</section><div class="row-list">${rows}</div>` : emptyState('layers', 'Sin funciones', 'Empieza por las funciones de negocio que sostiene el sistema.', `<button type="button" class="btn primary" data-act="add-funcion">${icon('plus', 16)}Añadir función</button>`)}`;
}

/* --- Dependencias --- */
function grafoDependencias() {
  const A = state.activos; const F = state.funciones; const P = state.proveedores;
  if (!F.length) return emptyState('network', 'Sin funciones', 'El mapa se dibuja a partir de las funciones y de lo que necesitan.');
  const depth = new Map(); const visiting = new Set();
  const dOf = (id) => { if (depth.has(id)) return depth.get(id); if (visiting.has(id)) return 0; visiting.add(id); const a = A.find((x) => x.id === id); const d = a && a.dependeDe.length ? 1 + Math.max(...a.dependeDe.map(dOf)) : 0; visiting.delete(id); depth.set(id, d); return d; };
  A.forEach((a) => dOf(a.id));
  const maxD = A.length ? Math.max(...A.map((a) => depth.get(a.id))) : -1;
  const cols = []; for (let d = 0; d <= maxD; d++) cols.push(A.filter((a) => depth.get(a.id) === d).map((a) => ({ t: 'a', o: a })));
  if (P.length) { if (!cols.length) cols.push([]); cols[0] = cols[0].concat(P.map((p) => ({ t: 'p', o: p }))); }
  cols.push(F.map((f) => ({ t: 'f', o: f })));
  const NW = 178, NH = 42, GX = 70, GY = 14, PAD = 12;
  const pos = new Map();
  const H = PAD * 2 + Math.max(...cols.map((c) => c.length)) * (NH + GY);
  cols.forEach((c, ci) => { const off = (H - c.length * (NH + GY)) / 2; c.forEach((n, ri) => pos.set(n.t + n.o.id, { x: PAD + ci * (NW + GX), y: off + ri * (NH + GY), n })); });
  const W = PAD * 2 + cols.length * (NW + GX) - GX + 60;
  const fx = (id) => calc.fxById.get(id); const ax = (id) => calc.activos.find((x) => x.id === id);
  const edges = []; const curve = (s, t, bad, title) => { const x1 = s.x + NW, y1 = s.y + NH / 2, x2 = t.x, y2 = t.y + NH / 2, mx = (x1 + x2) / 2; edges.push(`<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" class="edge${bad ? ' bad' : ''}"><title>${esc(title)}</title></path>`); };
  for (const a of A) for (const d of a.dependeDe) { const s = pos.get('a' + d), t = pos.get('a' + a.id); if (s && t) curve(s, t, false, `${a.id} necesita ${d}`); }
  for (const f of F) {
    const t = pos.get('f' + f.id); const x = fx(f.id);
    for (const aId of f.dependencias.activos) { const s = pos.get('a' + aId); const fin = ax(aId)?.fin ?? 0; if (s) curve(s, t, x.rto !== null && fin > x.rto + 1e-9, `${f.id} necesita ${aId}: listo a las ${fmtH(fin)}`); }
    for (const pId of f.dependencias.proveedores) { const s = pos.get('p' + pId); const p = P.find((o) => o.id === pId); if (s) curve(s, t, x.rto !== null && p && (p.slaHoras === null || p.slaHoras > x.rto), `${f.id} depende de ${p ? p.nombre : pId}`); }
  }
  // Dependencias entre funciones: arcos a la derecha de la columna de funciones
  for (const f of F) for (const dId of f.dependencias.funciones) {
    const s = pos.get('f' + dId), t = pos.get('f' + f.id); if (!s || !t) continue;
    const d = fx(dId); const bad = d && fx(f.id).rto !== null && d.rto !== null && d.rto > fx(f.id).rto;
    const x0 = s.x + NW, y1 = s.y + NH / 2, y2 = t.y + NH / 2, bulge = 30 + Math.abs(y2 - y1) * 0.15;
    edges.push(`<path d="M${x0},${y1} C${x0 + bulge},${y1} ${x0 + bulge},${y2} ${x0},${y2}" class="edge fn${bad ? ' bad' : ''}" marker-end="url(#arr${bad ? 'b' : ''})"><title>${esc(`${f.id} depende de ${dId}`)}</title></path>`);
  }
  const nodes = [...pos.values()].map(({ x, y, n }) => {
    const o = n.o; let sub = '', cls = n.t;
    if (n.t === 'a') { const r = ax(o.id); sub = `${E.ESTRATEGIAS[o.estrategia].label} · listo a las ${fmtH(r.fin)}`; if (r.rtoObjetivo !== null && r.fin > r.rtoObjetivo + 1e-9) cls += ' bad'; }
    else if (n.t === 'p') sub = o.slaHoras === null ? 'Proveedor · sin plazo' : `Proveedor · ${fmtH(o.slaHoras)}`;
    else { const r = fx(o.id); sub = `RTO ${fmtH(r.rto)} · vuelve ${fmtH(r.rtoAlcanzable)}`; if (r.cumpleRto === false) cls += ' bad'; }
    const name = `${o.id} · ${o.nombre}`;
    return `<g class="node ${cls}"><rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="10"/><text x="${x + 10}" y="${y + 17}" class="n-t">${esc(cut(name, 26))}</text><text x="${x + 10}" y="${y + 33}" class="n-s">${esc(sub)}</text><title>${esc(name)}</title></g>`;
  }).join('');
  const heads = cols.map((c, ci) => `<text x="${PAD + ci * (NW + GX)}" y="12" class="col-t">${ci === cols.length - 1 ? 'Funciones' : ci === 0 ? 'Base' : `Nivel ${ci}`}</text>`).join('');
  return `<div class="chart-scroll"><svg viewBox="0 -6 ${W} ${H + 12}" width="${W}" class="chart graph" role="img" aria-label="Mapa de dependencias: activos, proveedores y funciones">
    <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arr"/></marker><marker id="arrb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arr bad"/></marker></defs>
    ${heads}${edges.join('')}${nodes}</svg></div>
    <div class="legend"><span><i class="lg edge-l"></i>Dependencia que llega a tiempo</span><span><i class="lg edge-l bad"></i>Llega después del RTO de la función</span><span><i class="lg node-l bad"></i>No cumple su objetivo</span></div>`;
}
function vDependencias() {
  const deps = calc.checks.filter((c) => c.id.startsWith('DEP-'));
  const prov = state.proveedores.map((p, i) => `<tr><td><code>${esc(p.id)}</code></td>
    <td><input type="text" data-set="proveedores.${i}.nombre" value="${esc(p.nombre)}" aria-label="Proveedor" class="w-full"></td>
    <td><input type="text" data-set="proveedores.${i}.servicio" value="${esc(p.servicio)}" aria-label="Servicio" class="w-full"></td>
    <td><input type="text" data-set="proveedores.${i}.contacto" value="${esc(p.contacto)}" aria-label="Contacto de emergencia" class="w-full"></td>
    <td class="c">${inNum(`proveedores.${i}.slaHoras`, p.slaHoras, 'class="w-sm num" aria-label="Plazo de restablecimiento (horas)"')}</td>
    <td><input type="text" data-set="proveedores.${i}.contrato" value="${esc(p.contrato)}" aria-label="Contrato" class="w-sm"></td>
    <td class="c"><label class="switch"><input type="checkbox" data-set="proveedores.${i}.bcmVerificado" data-type="bool" aria-label="Continuidad verificada"${p.bcmVerificado ? ' checked' : ''}><span></span></label></td>
    <td><button type="button" class="icon-btn sm" data-act="del-prov" data-i="${i}" aria-label="Eliminar ${esc(p.nombre)}">${icon('trash', 16)}</button></td></tr>`).join('');
  return `${pageHead('ISO 22301 § 8.2.2 c', 'Dependencias', 'Qué necesita cada función para volver: activos TIC, otras funciones y proveedores. Si algo de lo que depende se recupera después de su RTO, la función tampoco llega.')}
  <section class="card"><div class="card-head"><h2>Mapa</h2><span class="muted small">${plural(deps.length, 'incidencia', 'incidencias')} de dependencias</span></div>${grafoDependencias()}</section>
  <section class="card"><div class="card-head"><h2>Proveedores</h2><button type="button" class="btn sm" data-act="add-prov">${icon('plus', 15)}Añadir proveedor</button></div>
    <p class="muted small">El plazo de restablecimiento comprometido (SLA) cuenta como tiempo de recuperación de las funciones que dependen del proveedor.</p>
    ${state.proveedores.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Proveedor</th><th>Servicio</th><th>Contacto de emergencia</th><th class="c">Plazo (h)</th><th>Contrato</th><th class="c">Continuidad verificada</th><th></th></tr></thead><tbody>${prov}</tbody></table></div>` : '<p class="muted">Sin proveedores.</p>'}</section>
  ${deps.length ? `<section class="card"><h2>Incidencias</h2><div class="findings">${deps.map(findingCard).join('')}</div></section>` : ''}`;
}

/* --- Recuperación (DRP) --- */
function gantt() {
  const rows = calc.ordenRecuperacion; if (!rows.length) return emptyState('route', 'Sin activos', 'Añade los activos TIC que sostienen las funciones.');
  const max = Math.max(1, ...rows.map((r) => r.fin)); const L = 250, W = 420, RH = 30, top = 8, H = top + rows.length * RH + 28;
  const x = (h) => (h / max) * W;
  const step = max <= 4 ? 1 : max <= 12 ? 2 : max <= 24 ? 4 : max <= 72 ? 12 : 24;
  let g = ''; for (let t = 0; t <= max + 1e-9; t += step) g += `<line x1="${L + x(t)}" x2="${L + x(t)}" y1="${top}" y2="${H - 22}" class="grid-l"/><text x="${L + x(t)}" y="${H - 6}" class="ax-t" text-anchor="middle">${t} h</text>`;
  rows.forEach((r, i) => {
    const y = top + i * RH + 7; const late = r.rtoObjetivo !== null && r.fin > r.rtoObjetivo + 1e-9;
    g += `<g class="bar-g tipable" data-tip="${esc(`${r.orden}. ${r.id} · ${r.nombre}: de ${fmtH(r.inicio)} a ${fmtH(r.fin)}${r.rtoObjetivo !== null ? ` · lo necesitan antes de ${fmtH(r.rtoObjetivo)}` : ''}`)}">
      <text x="${L - 10}" y="${y + 11}" class="lab-t" text-anchor="end">${esc(cut(`${r.orden}. ${r.id} · ${r.nombre}`, 32))}</text>
      <rect x="${L + x(r.inicio)}" y="${y}" width="${Math.max(3, x(r.fin) - x(r.inicio))}" height="14" rx="4" class="${late ? 's-over' : 's-mayor'}"/>
      ${r.rtoObjetivo !== null && r.rtoObjetivo <= max ? `<line x1="${L + x(r.rtoObjetivo)}" x2="${L + x(r.rtoObjetivo)}" y1="${y - 3}" y2="${y + 17}" class="mk-rto"/>` : ''}</g>`;
  });
  return `<div class="chart-scroll"><svg viewBox="0 0 ${L + W + 16} ${H}" class="chart timeline" role="img" aria-label="Secuencia de recuperación de los activos">${g}</svg></div>
    <div class="legend"><span><i class="lg s-mayor"></i>Listo a tiempo</span><span><i class="lg s-over"></i>Listo después de lo que exigen sus funciones</span><span><i class="lg mk mk-rto"></i>RTO más exigente de las funciones que lo usan</span></div>`;
}
function addActivo() { const id = nextId('A-', state.activos); state.activos.push({ id, nombre: 'Nuevo activo', tipo: 'Servidor', datos: false, estrategia: 'ninguna', tiempoRecuperacion: null, dependeDe: [], ubicacion: '', responsable: '', procedimiento: { pasos: '', exito: '', credenciales: '' }, backup: { aplica: false } }); ui.aOpen = id; commit('Activo añadido'); }
function vRecuperacion() {
  const cards = calc.ordenRecuperacion.map((r) => {
    const i = aIdx(r.id); const a = state.activos[i]; const open = ui.aOpen === r.id; const late = r.rtoObjetivo !== null && r.fin > r.rtoObjetivo + 1e-9;
    const head = `<button type="button" class="row-head" data-act="a-toggle" data-id="${esc(r.id)}" aria-expanded="${open}" aria-controls="ad-${esc(r.id)}">
      <span class="ord num">${r.orden}</span><code>${esc(r.id)}</code><span class="rh-name"><b>${esc(a.nombre)}</b><small>${esc(a.tipo)}${a.datos ? ' · guarda datos' : ''}</small></span>
      <span class="badge ${a.estrategia === 'ninguna' ? 'crit' : 'neutral'}">${E.ESTRATEGIAS[a.estrategia].label}</span>
      <span class="rh-kv"><small>Tarda</small><b>${fmtH(r.tiempo)}</b></span><span class="rh-kv"><small>Listo</small><b class="${late ? 'crit-t' : ''}">${fmtH(r.fin)}</b></span>${icon('chevronDown', 18, 'chev')}</button>`;
    if (!open) return `<article class="row-card">${head}</article>`;
    const p = `activos.${i}`;
    return `<article class="row-card open">${head}<div class="row-body" id="ad-${esc(r.id)}">
      <div class="form-grid g4">
        ${fld('Nombre', inTxt(`${p}.nombre`, a.nombre), 'span2')}
        ${fld('Tipo', `<select data-set="${p}.tipo">${E.TIPOS_ACTIVO.map((t) => opt(t, t, a.tipo)).join('')}</select>`)}
        ${fld('Estrategia', `<select data-set="${p}.estrategia">${Object.entries(E.ESTRATEGIAS).map(([k, v]) => opt(k, v.label, a.estrategia)).join('')}</select>`)}
        ${fld('Tiempo de recuperación (h)', inNum(`${p}.tiempoRecuperacion`, a.tiempoRecuperacion, `placeholder="${E.ESTRATEGIAS[a.estrategia].rto} (típico)"`))}
        ${fld('Ubicación de la réplica o copia', inTxt(`${p}.ubicacion`, a.ubicacion), 'span2')}
        ${fld('Responsable', inTxt(`${p}.responsable`, a.responsable))}
        <div class="fld span4">${inChk(`${p}.datos`, a.datos, 'Guarda datos de las funciones (determina el RPO)')}</div>
      </div>
      <p class="muted small">${esc(E.ESTRATEGIAS[a.estrategia].desc)}. Lo necesitan ${r.funciones.length ? r.funciones.join(', ') : 'ninguna función'}${r.rtoObjetivo !== null ? `; la más exigente pide ${fmtH(r.rtoObjetivo)}` : ''}.</p>
      <div class="grid g2"><div><h4>Procedimiento</h4>
        ${fld('Pasos de recuperación', inArea(`${p}.procedimiento.pasos`, a.procedimiento.pasos, 'rows="6" placeholder="Pasos ejecutables por un técnico sin conocimiento previo del entorno"'))}
        ${fld('Criterio de éxito', inArea(`${p}.procedimiento.exito`, a.procedimiento.exito, 'placeholder="Cómo se verifica que funciona"'))}
        ${fld('Credenciales (referencia a la bóveda, nunca la contraseña)', inTxt(`${p}.procedimiento.credenciales`, a.procedimiento.credenciales))}</div>
        <div><h4>Necesita antes</h4>${checklist(`${p}.dependeDe`, state.activos.filter((o) => o.id !== a.id), a.dependeDe)}</div></div>
      <div class="row end"><button type="button" class="btn sm danger" data-act="del-activo" data-i="${i}">${icon('trash', 15)}Eliminar ${esc(a.id)}</button></div></div></article>`;
  }).join('');
  return `${pageHead('DRP · ISO 22301 § 8.3 y § 8.4.4 · ENS op.cont.2', 'Recuperación', 'Estrategia, tiempo y procedimiento de cada activo TIC. El orden sale de las dependencias: nada se recupera antes que aquello que necesita.', `<button type="button" class="btn primary" data-act="add-activo">${icon('plus', 16)}Añadir activo</button>`)}
  <section class="card"><div class="card-head"><h2>Secuencia de recuperación</h2><span class="muted small">Desde el inicio del incidente</span></div>${gantt()}</section>
  ${cards ? `<div class="row-list">${cards}</div>` : ''}`;
}

/* --- Copias de seguridad --- */
function vCopias() {
  const filas = calc.activos.map((r) => {
    const i = aIdx(r.id); const a = state.activos[i]; const b = a.backup; const p = `activos.${i}.backup`;
    if (!b.aplica) return `<tr><td><code>${esc(a.id)}</code> ${esc(a.nombre)}${a.datos ? ' <span class="badge accent">datos</span>' : ''}</td><td class="c">${fmtH(r.rpoObjetivo)}</td><td colspan="8" class="muted small">Sin copia definida</td><td class="c"><label class="switch"><input type="checkbox" data-set="${p}.aplica" data-type="bool" aria-label="Copia de ${esc(a.nombre)}"><span></span></label></td></tr>`;
    const lim = r.critico && a.datos ? 30 : 90; const dias = b.ultimaRestauracion ? E.diasEntre(b.ultimaRestauracion, today()) : null;
    const rpoOk = !a.datos || r.rpoObjetivo === null || b.frecuenciaHoras === null ? null : b.frecuenciaHoras <= r.rpoObjetivo + 1e-9;
    const restOk = dias === null ? false : dias <= lim && b.resultado !== 'Fallido';
    const chk = (k, l) => `<td class="c"><label class="switch"><input type="checkbox" data-set="${p}.${k}" data-type="bool" aria-label="${l}"${b[k] ? ' checked' : ''}><span></span></label></td>`;
    return `<tr><td><code>${esc(a.id)}</code> ${esc(a.nombre)}${a.datos ? ' <span class="badge accent">datos</span>' : ''}</td>
      <td class="c">${a.datos ? fmtH(r.rpoObjetivo) : '—'}</td>
      <td><input type="text" data-set="${p}.tipo" value="${esc(b.tipo)}" aria-label="Tipo de copia" class="w-full"></td>
      <td class="c">${inNum(`${p}.frecuenciaHoras`, b.frecuenciaHoras, 'class="w-sm num" aria-label="Frecuencia (horas)"')} ${rpoOk === false ? '<span class="badge crit">RPO</span>' : ''}</td>
      <td class="c"><input type="number" min="0" data-set="${p}.retencionDias" data-type="hrs" value="${b.retencionDias ?? ''}" class="w-sm num" aria-label="Retención (días)"></td>
      ${chk('offsite', 'Fuera de la sede')}${chk('cifrado', 'Cifrada')}${chk('inmutable', 'Inmutable o desconectada')}
      <td><input type="date" data-set="${p}.ultimaRestauracion" value="${esc(b.ultimaRestauracion)}" aria-label="Última restauración" class="${restOk ? '' : 'late'}"></td>
      <td><select data-set="${p}.resultado" aria-label="Resultado de la restauración">${['OK', 'Parcial', 'Fallido', 'Pendiente'].map((x) => opt(x, x, b.resultado)).join('')}</select></td>
      <td class="c"><label class="switch"><input type="checkbox" data-set="${p}.aplica" data-type="bool" aria-label="Copia de ${esc(a.nombre)}" checked><span></span></label></td></tr>`;
  }).join('');
  const inc = calc.checks.filter((c) => c.id.startsWith('BCK-'));
  return `${pageHead('ISO/IEC 27001 A.8.13 · ENS mp.info.6', 'Copias de seguridad', 'La frecuencia de la copia de los activos que guardan datos fija la pérdida máxima de cada función. Una copia sin restauración probada no cuenta.')}
  <div class="note">${icon('info', 16)}<p><b>Regla 3-2-1 + 1:</b> tres copias, dos soportes, una fuera de la sede y una inmutable o desconectada. Restauración probada cada 30 días en los datos de funciones críticas y cada 90 en el resto. Frecuencia 0 = réplica síncrona.</p></div>
  ${state.activos.length ? `<section class="card flush"><div class="table-wrap"><table class="tbl"><thead><tr><th>Activo</th><th class="c">RPO exigido</th><th>Tipo de copia</th><th class="c">Frecuencia (h)</th><th class="c">Retención (días)</th><th class="c">Fuera de sede</th><th class="c">Cifrada</th><th class="c">Inmutable</th><th>Última restauración</th><th>Resultado</th><th class="c">Copia</th></tr></thead><tbody>${filas}</tbody></table></div></section>` : emptyState('hardDrive', 'Sin activos', 'Las copias se definen sobre los activos de la vista Recuperación.')}
  ${inc.length ? `<section class="card"><h2>Incidencias</h2><div class="findings">${inc.map(findingCard).join('')}</div></section>` : ''}`;
}

/* --- Gestión de crisis (BCP) --- */
function vCrisis() {
  const b = state.bcp; const minRto = Math.min(...calc.funciones.filter((x) => x.critica && x.rto !== null).map((x) => x.rto));
  const um = b.activacion.umbralHoras; const tarde = um !== null && Number.isFinite(minRto) && um >= minRto;
  const equipo = b.equipo.map((r, i) => `<tr><td><input type="text" data-set="bcp.equipo.${i}.rol" value="${esc(r.rol)}" aria-label="Rol" class="w-full"></td>
    <td><input type="text" data-set="bcp.equipo.${i}.titular" value="${esc(r.titular)}" aria-label="Titular" class="w-full"></td>
    <td><input type="text" data-set="bcp.equipo.${i}.suplente" value="${esc(r.suplente)}" aria-label="Suplente" class="w-full${!blank(r.titular) && blank(r.suplente) ? ' late' : ''}"></td>
    <td><input type="text" data-set="bcp.equipo.${i}.telefono" value="${esc(r.telefono)}" aria-label="Teléfono 24 h" class="w-sm"></td>
    <td><input type="text" data-set="bcp.equipo.${i}.responsabilidades" value="${esc(r.responsabilidades)}" aria-label="Responsabilidades" class="w-full"></td>
    <td><button type="button" class="icon-btn sm" data-act="del-rol" data-i="${i}" aria-label="Eliminar rol">${icon('trash', 16)}</button></td></tr>`).join('');
  const pasos = [[0, 'Detección', 'Monitorización o personal'], [Math.min(0.25, (um ?? 1) / 4), 'Notificación', 'Soporte técnico evalúa'], [Math.min(0.5, (um ?? 1) / 2), 'Escalado', 'Responsable técnico'], [um ?? null, 'Activación del plan', b.activacion.autorizado || 'Sin persona autorizada']];
  const linea = `<ol class="esc-line">${pasos.map(([t, h, s]) => `<li><span class="t num">${t === null ? '—' : 'T+' + fmtH(t)}</span><b>${h}</b><small>${esc(s)}</small></li>`).join('')}</ol>
    ${Number.isFinite(minRto) ? `<p class="small ${tarde ? 'crit-t' : 'muted'}">${tarde ? icon('alert', 15) : icon('check', 15)} El RTO más exigente de una función crítica es ${fmtH(minRto)}. ${um === null ? 'Falta el umbral de activación.' : tarde ? 'El plan se activaría con el objetivo ya incumplido.' : `El plan se activa ${fmtH(minRto - um)} antes.`}</p>` : ''}`;
  return `${pageHead('BCP · ISO 22301 § 8.4 · ENS op.cont.2 y op.cont.4', 'Gestión de crisis', 'Quién decide, cuándo se activa el plan, cómo se comunica y dónde se recupera. Cada rol necesita suplente para que el plan no dependa de una sola persona.')}
  <section class="card"><div class="card-head"><h2>Equipo de crisis</h2><button type="button" class="btn sm" data-act="add-rol">${icon('plus', 15)}Añadir rol</button></div>
    ${b.equipo.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Rol</th><th>Titular</th><th>Suplente</th><th>Teléfono 24 h</th><th>Responsabilidades</th><th></th></tr></thead><tbody>${equipo}</tbody></table></div>` : '<p class="muted">Sin equipo designado.</p>'}</section>
  <div class="grid g2">
    <section class="card"><h2>Activación</h2><div class="form-grid">
      ${fld('Umbral de activación (horas sin servicio)', inNum('bcp.activacion.umbralHoras', um))}${fld('Persona autorizada', inTxt('bcp.activacion.autorizado', b.activacion.autorizado))}
      ${fld('Escenarios predefinidos', inArea('bcp.activacion.escenarios', b.activacion.escenarios, 'rows="5"'), 'span2')}</div>${linea}</section>
    <section class="card"><h2>Comunicación</h2><div class="form-grid">
      ${fld('Canal principal', inTxt('bcp.comunicacion.primario', b.comunicacion.primario))}${fld('Canal si los sistemas caen', inTxt('bcp.comunicacion.secundario', b.comunicacion.secundario, 'placeholder="Telefonía móvil, mensajería externa, lista impresa"'))}
      ${fld('Comunicación externa', inTxt('bcp.comunicacion.externo', b.comunicacion.externo), 'span2')}
      ${fld('Plantilla de comunicado', inArea('bcp.comunicacion.plantilla', b.comunicacion.plantilla, 'rows="8" class="mono"'), 'span2')}</div>
      <div class="row end"><button type="button" class="btn sm" data-act="copy-plantilla">${icon('copy', 15)}Copiar plantilla</button></div></section>
  </div>
  <section class="card"><h2>Sitio alternativo</h2><div class="form-grid g4">
    ${fld('Tipo', `<select data-set="bcp.sitio.tipo">${[['ninguno', 'Sin sitio alternativo'], ['hot', 'Hot site · activo 24/7'], ['warm', 'Warm site · activación en horas'], ['cold', 'Cold site · espacio y suministros'], ['cloud', 'Recuperación en la nube']].map(([v, l]) => opt(v, l, b.sitio.tipo)).join('')}</select>`)}
    ${fld('Ubicación', inTxt('bcp.sitio.ubicacion', b.sitio.ubicacion))}
    ${fld('Distancia a la sede (km)', `<input type="number" min="0" data-set="bcp.sitio.distanciaKm" data-type="hrs" value="${b.sitio.distanciaKm ?? ''}">`)}
    ${fld('Tiempo de activación (h)', inNum('bcp.sitio.rtoActivacion', b.sitio.rtoActivacion))}
    ${fld('Capacidad e infraestructura', inArea('bcp.sitio.capacidad', b.sitio.capacidad), 'span4')}</div>
    ${state.meta.categoria === 'ALTA' ? `<p class="muted small">Categoría ALTA: el ENS exige medios alternativos probados (op.cont.4).</p>` : ''}</section>`;
}

/* --- Pruebas --- */
function addPrueba() { const id = nextId('T-', state.pruebas); state.pruebas.unshift({ id, fecha: today(), tipo: 'tabletop', funciones: [], activos: [], rtoReal: null, rpoReal: null, resultado: 'OK', gaps: '', accion: '', responsable: '' }); ui.tOpen = id; if (ui.view !== 'pruebas') { commit(); go('pruebas'); } else commit('Prueba registrada'); }
function proximas() {
  const out = []; const hoy = today(); const add = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  for (const r of calc.activos) { const b = r.a.backup; if (!b.aplica || !r.critico) continue; const lim = r.a.datos ? 30 : 90; const prox = b.ultimaRestauracion ? add(b.ultimaRestauracion, lim) : hoy; out.push({ fecha: prox, que: `Restauración de ${r.id} · ${r.nombre}`, tipo: 'restauracion', vencida: prox <= hoy }); }
  for (const x of calc.funciones.filter((f) => f.critica)) {
    const ult = calc.pruebas.find((p) => p.resultado !== 'Cancelado' && p.fecha && ((p.funciones || []).includes(x.id)));
    const prox = ult ? add(ult.fecha, 365) : hoy; out.push({ fecha: prox, que: `Ejercicio sobre ${x.id} · ${x.nombre}`, tipo: 'tabletop', vencida: prox <= hoy });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);
}
function vPruebas() {
  const tipos = Object.entries(E.TIPOS_PRUEBA).map(([k, v]) => `<div class="card soft tipo-card">${icon(k === 'restauracion' ? 'hardDrive' : k === 'tabletop' ? 'users' : k === 'simulacro' ? 'flask' : 'zap', 20)}<b>${v.label}</b><small>Cada ${v.periodo} días como máximo</small></div>`).join('');
  const lista = state.pruebas.map((t, i) => {
    const open = ui.tOpen === t.id; const objs = t.funciones.map((id) => calc.fxById.get(id)).filter(Boolean);
    const peor = objs.some((x) => (t.rtoReal !== null && x.rto !== null && t.rtoReal > x.rto) || (t.rpoReal !== null && x.rpo !== null && t.rpoReal > x.rpo));
    const head = `<button type="button" class="row-head" data-act="t-toggle" data-id="${esc(t.id)}" aria-expanded="${open}" aria-controls="td-${esc(t.id)}">
      <code>${esc(t.id)}</code><span class="rh-name"><b>${esc(E.TIPOS_PRUEBA[t.tipo].label)}</b><small>${esc(fmtDate(t.fecha))} · ${esc([...t.funciones, ...t.activos].join(', ') || 'Sin alcance')}</small></span>
      <span class="badge ${t.resultado === 'OK' ? 'ok' : t.resultado === 'Parcial' ? 'warn' : t.resultado === 'Fallido' ? 'crit' : 'neutral'}">${esc(t.resultado)}</span>
      <span class="rh-kv"><small>RTO medido</small><b class="${peor ? 'crit-t' : ''}">${fmtH(t.rtoReal)}</b></span><span class="rh-kv"><small>RPO medido</small><b>${fmtH(t.rpoReal)}</b></span>${icon('chevronDown', 18, 'chev')}</button>`;
    if (!open) return `<article class="row-card">${head}</article>`;
    const p = `pruebas.${i}`;
    return `<article class="row-card open">${head}<div class="row-body" id="td-${esc(t.id)}">
      <div class="form-grid g4">
        ${fld('Fecha', `<input type="date" data-set="${p}.fecha" value="${esc(t.fecha)}">`)}
        ${fld('Tipo', `<select data-set="${p}.tipo">${Object.entries(E.TIPOS_PRUEBA).map(([k, v]) => opt(k, v.label, t.tipo)).join('')}</select>`)}
        ${fld('Resultado', `<select data-set="${p}.resultado">${E.RESULTADOS.map((x) => opt(x, x, t.resultado)).join('')}</select>`)}
        ${fld('Responsable', inTxt(`${p}.responsable`, t.responsable))}
        ${fld('RTO medido (h)', inNum(`${p}.rtoReal`, t.rtoReal))}${fld('RPO medido (h)', inNum(`${p}.rpoReal`, t.rpoReal))}
        ${fld('Carencias detectadas', inArea(`${p}.gaps`, t.gaps), 'span2')}
        ${fld('Acción correctiva', inArea(`${p}.accion`, t.accion, 'placeholder="Qué se corrige, quién y cuándo"'), 'span4')}</div>
      <div class="grid g2"><div><h4>Funciones probadas</h4>${checklist(`${p}.funciones`, state.funciones, t.funciones)}</div><div><h4>Activos probados</h4>${checklist(`${p}.activos`, state.activos, t.activos)}</div></div>
      <div class="row end"><button type="button" class="btn sm danger" data-act="del-prueba" data-i="${i}">${icon('trash', 15)}Eliminar ${esc(t.id)}</button></div></div></article>`;
  }).join('');
  const prox = proximas();
  return `${pageHead('ISO 22301 § 8.5 · ENS op.cont.3', 'Pruebas', 'Un plan sin probar es un plan sin validar. Registra cada ejercicio con el RTO y el RPO medidos: se comparan con los objetivos del BIA.', `<button type="button" class="btn primary" data-act="add-prueba">${icon('plus', 16)}Registrar prueba</button>`)}
  <div class="tipo-grid">${tipos}</div>
  ${prox.length ? `<section class="card"><h2>Próximas pruebas</h2><ul class="prox-list">${prox.map((x) => `<li><span class="badge ${x.vencida ? 'crit' : 'neutral'}">${x.vencida ? 'Vencida' : esc(fmtDate(x.fecha))}</span><span>${esc(x.que)}</span></li>`).join('')}</ul></section>` : ''}
  ${lista ? `<div class="row-list">${lista}</div>` : emptyState('flask', 'Sin pruebas', 'Registra el primer ejercicio: aunque sea de mesa, cuenta como evidencia.')}`;
}

/* --- Preauditoría --- */
const accKey = (c) => `${c.id}|${c.ambito}`.slice(0, 200);
function findingCard(c) {
  const a = state.acciones[accKey(c)] || { estado: 'Pendiente', responsable: '', fecha: '' }; const key = esc(accKey(c));
  return `<article class="finding ${sevClass(c.sev)}"><div class="f-hd">${sevBadge(c.sev)}<code>${c.id}</code><span class="f-amb">${esc(c.ambito)}</span></div>
    <h3 class="f-t">${esc(c.titulo)}</h3><p class="f-d">${esc(c.detalle)}</p><p class="f-r">${icon('arrowRight', 14)}${esc(c.recomendacion)}</p><p class="f-ref">${esc(c.ref)}</p>
    ${ui.view === 'preauditoria' ? `<div class="f-acc"><select data-acc="${key}" data-f="estado" aria-label="Estado de la acción">${['Pendiente', 'En curso', 'Hecha'].map((x) => opt(x, x, a.estado)).join('')}</select><input type="text" data-acc="${key}" data-f="responsable" value="${esc(a.responsable)}" placeholder="Responsable" aria-label="Responsable de la acción"><input type="date" data-acc="${key}" data-f="fecha" value="${esc(a.fecha)}" aria-label="Fecha límite"></div>` : ''}</article>`;
}
const CHECKLIST = [
  ['BIA', 'Funciones críticas identificadas y clasificadas', ['BIA-04'], 'ISO 22301 § 8.2.2'],
  ['BIA', 'RTO, RPO y MTPD definidos para cada función crítica, con RTO menor que MTPD', ['BIA-01', 'BIA-02', 'BIA-03'], 'ISO 22301 § 8.2.3 · ENS op.cont.1'],
  ['BIA', 'Responsable de negocio en cada función', ['BIA-05'], 'ISO 22301 § 5.3'],
  ['BIA', 'Dependencias mapeadas y coherentes con los RTO', ['DEP-01', 'DEP-02'], 'ISO 22301 § 8.2.2 c'],
  ['BIA', 'Proveedores con plazo compatible y continuidad verificada', ['DEP-03', 'DEP-04'], 'ISO/IEC 27001 A.5.22'],
  ['BIA', 'Revisión periódica programada y aprobación de la dirección', ['REV-01', 'REV-02'], 'ISO 22301 § 9.1 · § 5'],
  ['BCP', 'Equipo de crisis con suplentes', ['BCP-01'], 'ISO 22301 § 8.4.2'],
  ['BCP', 'Criterio de activación objetivo y anterior al RTO', ['BCP-02'], 'ISO 22301 § 8.4.2'],
  ['BCP', 'Canal de comunicación independiente de los sistemas', ['BCP-03'], 'ISO 22301 § 8.4.3'],
  ['BCP', 'Medios alternativos a tiempo (categoría ALTA)', ['BCP-04', 'BCP-05'], 'ENS op.cont.4'],
  ['DRP', 'Estrategia de recuperación que alcanza el RTO', ['DRP-01', 'DRP-02'], 'ISO 22301 § 8.3'],
  ['DRP', 'Procedimiento paso a paso con criterio de éxito', ['DRP-03'], 'ISO 22301 § 8.4.4'],
  ['DRP', 'Copias que cumplen el RPO, con restauración probada', ['BCK-01', 'BCK-02'], 'ISO/IEC 27001 A.8.13'],
  ['DRP', 'Regla 3-2-1, cifrado y copia inmutable', ['BCK-03', 'BCK-04', 'BCK-05'], 'ISO/IEC 27001 A.8.13'],
  ['Pruebas', 'Pruebas periódicas con RTO y RPO medidos dentro de objetivo', ['TST-01', 'TST-02', 'TST-04'], 'ENS op.cont.3 · ISO 22301 § 8.5'],
  ['Pruebas', 'Carencias de las pruebas con acción correctiva', ['TST-03'], 'ISO 22301 § 10.1']
];
function vPreauditoria() {
  const sevs = [['NC mayor', 'NC mayores'], ['NC menor', 'NC menores'], ['Observación', 'Observaciones']];
  const tabs = [['hallazgos', 'Incidencias'], ['checklist', 'Lista de comprobación'], ['revision', 'Revisión y aprobación']];
  let body = '';
  if (ui.preTab === 'hallazgos') {
    const list = calc.checks.filter((c) => ui.sevFiltro === 'todas' || c.sev === ui.sevFiltro);
    body = `<div class="sev-cards">${sevs.map(([s, l]) => `<button type="button" class="sev-card ${s === 'NC mayor' ? 'crit' : s === 'NC menor' ? 'warn' : 'accent'}${ui.sevFiltro === s ? ' on' : ''}" data-act="sev-f" data-sev="${s}" aria-pressed="${ui.sevFiltro === s}"><b class="num">${countSev(s)}</b><span>${l}</span></button>`).join('')}</div>
      <div class="row spread"><span class="muted small">${plural(list.length, 'incidencia', 'incidencias')}</span>${ui.sevFiltro !== 'todas' ? `<button type="button" class="btn sm ghost" data-act="sev-f" data-sev="todas">Ver todas</button>` : ''}</div>
      ${list.length ? `<div class="findings">${list.map(findingCard).join('')}</div>` : emptyState('check', 'Sin incidencias', 'Ninguna regla activa encuentra problemas.')}`;
  } else if (ui.preTab === 'checklist') {
    const grupos = [...new Set(CHECKLIST.map((c) => c[0]))];
    body = grupos.map((g) => `<h3 class="cl-h">${g}</h3><ul class="cl-list">${CHECKLIST.filter((c) => c[0] === g).map(([, txt, reglas, ref]) => { const n = calc.checks.filter((c) => reglas.includes(c.id)); const may = n.some((c) => c.sev === 'NC mayor'); return `<li class="${n.length ? (may ? 'bad' : 'warn') : 'good'}">${n.length ? icon(may ? 'x' : 'alert', 18) : icon('check', 18)}<div><b>${txt}</b><small>${ref}${n.length ? ` · ${plural(n.length, 'incidencia', 'incidencias')}` : ''}</small></div></li>`; }).join('')}</ul>`).join('')
      + `<h3 class="cl-h">ENS · medidas de continuidad</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Medida</th><th>Nombre</th><th class="c">Exigida en ${esc(state.meta.categoria)}</th><th>Estado</th></tr></thead><tbody>${calc.ens.map((e) => `<tr><td><code>${e.code}</code></td><td>${e.nombre}</td><td class="c">${e.aplica ? 'Sí' : 'No'}</td><td><span class="badge ${!e.aplica ? 'neutral' : e.ncMayor ? 'crit' : e.ncMenor ? 'warn' : 'ok'}">${e.estado}</span></td></tr>`).join('')}</tbody></table></div>`;
  } else {
    const rv = state.revision;
    body = `<div class="form-grid g4">${fld('Versión', inTxt('revision.version', rv.version))}${fld('Fecha', `<input type="date" data-set="revision.fecha" value="${esc(rv.fecha)}">`)}${fld('Próxima revisión', `<input type="date" data-set="revision.proxima" value="${esc(rv.proxima)}" class="${rv.proxima && rv.proxima < today() ? 'late' : ''}">`)}${fld('Aprobado por', inTxt('revision.aprobadoPor', rv.aprobadoPor, 'placeholder="Comité de dirección (acta)"'))}
      ${fld('Revisión anticipada si…', inArea('revision.disparadores', rv.disparadores, 'placeholder="Cambio de CPD, nuevo servicio crítico, incidente que active el plan…"'), 'span4')}</div>
      <div class="card-head"><h3>Historial de versiones</h3><button type="button" class="btn sm" data-act="add-rev">${icon('plus', 15)}Añadir versión</button></div>
      ${rv.historial.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Versión</th><th>Fecha</th><th>Motivo</th><th>Responsable</th><th>Aprobado por</th><th></th></tr></thead><tbody>${rv.historial.map((h, i) => `<tr><td><input type="text" data-set="revision.historial.${i}.version" value="${esc(h.version)}" class="w-sm" aria-label="Versión"></td><td><input type="date" data-set="revision.historial.${i}.fecha" value="${esc(h.fecha)}" aria-label="Fecha"></td><td><input type="text" data-set="revision.historial.${i}.motivo" value="${esc(h.motivo)}" class="w-full" aria-label="Motivo"></td><td><input type="text" data-set="revision.historial.${i}.responsable" value="${esc(h.responsable)}" class="w-full" aria-label="Responsable"></td><td><input type="text" data-set="revision.historial.${i}.aprobado" value="${esc(h.aprobado)}" class="w-full" aria-label="Aprobado por"></td><td><button type="button" class="icon-btn sm" data-act="del-rev" data-i="${i}" aria-label="Eliminar versión">${icon('trash', 16)}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin versiones registradas.</p>'}`;
  }
  return `${pageHead('ISO 22301 · ISO/IEC 27001 · ENS op.cont', 'Preauditoría', `${E.REGLAS.length} reglas revisan la coherencia del análisis de impacto, el plan y las pruebas. Prepara la auditoría; no la sustituye.`, `<button type="button" class="btn primary" data-act="export-informe">${icon('download', 16)}Informe (.md)</button>`)}
  <div class="tabs" role="tablist"><span class="thumb" aria-hidden="true"></span>${tabs.map(([id, l]) => `<button type="button" role="tab" data-act="pre-tab" data-tab="${id}" aria-selected="${ui.preTab === id}" tabindex="${ui.preTab === id ? 0 : -1}">${l}</button>`).join('')}</div>
  <div class="tab-body" role="tabpanel">${body}</div>`;
}

/* --- Exportar --- */
function vExportar() {
  const card = (ic, t, d, act, fmt) => `<button type="button" class="start-card exp-card" data-act="${act}"><span class="sc-ic">${icon(ic, 22)}</span><b>${t}</b><span>${d}</span><em>${fmt}</em></button>`;
  return `${pageHead('Entregables', 'Exportar', 'Documentos para la dirección, el auditor y el equipo técnico, generados en este navegador.')}
  <div class="export-grid">
    ${card('fileText', 'Plan de continuidad', 'BIA, estrategia, secuencia de recuperación, procedimientos, copias, equipo de crisis, activación, comunicación, pruebas y revisión en un documento.', 'export-plan', 'Markdown')}
    ${card('sheet', 'Libro del BIA y el plan', 'Una hoja por bloque: funciones e impacto, dependencias, recuperación, copias, equipo de crisis, pruebas e incidencias.', 'export-xlsx', 'Excel')}
    ${card('shieldCheck', 'Informe de preauditoría', 'Incidencias por severidad con referencia normativa, recomendación y estado de la acción.', 'export-informe', 'Markdown')}
    ${card('listChecks', 'Plan de acción', 'Una fila por incidencia con estado, responsable y fecha límite.', 'export-acciones', 'CSV')}
    ${card('download', 'Proyecto', 'El proyecto completo para guardarlo o abrirlo en otro equipo con KAIROS.', 'export-json', 'JSON')}
    ${card('upload', 'Importar un proyecto', 'Abre un proyecto exportado desde KAIROS. Se valida antes de usarse.', 'import-json', 'JSON')}
  </div>`;
}
