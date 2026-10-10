/* ---------- Entrada y salida: exportaciones, importación y copia de seguridad ---------- */
const slug = () => String(state?.meta.nombre || 'kairos').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'kairos';
function saveFile(name, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Descargado: ${name}`);
}
const toCsv = (rows) => '﻿' + rows.map((r) => r.map((c) => { const v = noFormula(c); return /[";\n,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(';')).join('\r\n') + '\r\n';
const md = mdSafe;
const mdH = (h) => (h === null || h === undefined ? '—' : E.fmtH(h));
const yes = (b) => (b ? 'Sí' : 'No');
function exportar(que) {
  if (!state) return;
  if (que === 'plan') saveFile(`${slug()}_plan_continuidad_${today()}.md`, planMd());
  else if (que === 'informe') saveFile(`${slug()}_preauditoria_${today()}.md`, informeMd());
  else if (que === 'acciones') saveFile(`${slug()}_plan_accion_${today()}.csv`, accionesCsv());
  else if (que === 'bia') saveFile(`${slug()}_bia_ecosistema_${today()}.json`, JSON.stringify(E.aSobreBia(state, calc, VERSION), null, 1), 'application/json');
  else if (que === 'json') saveFile(`${slug()}_proyecto_${today()}.json`, JSON.stringify(state, null, 1), 'application/json');
}

/* Plan de continuidad completo (BIA + BCP + DRP) */
function planMd() {
  const m = state.meta; const k = calc.kpi; const b = state.bcp; const L = [];
  L.push(`# Plan de continuidad de negocio — ${md(m.nombre || m.organizacion)}`, '',
    `**Organización:** ${md(m.organizacion)}  `, `**Sistema y alcance:** ${md(m.sistema)}  `, `**Categoría del sistema (ENS):** ${m.categoria}  `,
    `**Responsable:** ${md(m.responsable)}  `, `**Versión:** ${md(state.revision.version || '—')} · **Fecha:** ${state.revision.fecha || '—'} · **Próxima revisión:** ${state.revision.proxima || '—'}  `,
    `**Aprobado por:** ${md(state.revision.aprobadoPor || 'Pendiente')}  `, `**Elaborado por:** ${md(firma())} · KAIROS ${VERSION} · ${today()}`, '');
  if (m.alcance) L.push('## 1. Alcance', '', mdBlock(m.alcance), '');
  L.push('## 2. Resumen', '', `- Funciones analizadas: **${k.funciones}** (${k.criticas} críticas).`, `- Funciones que vuelven dentro de su RTO con las estrategias actuales: **${k.cumplenRto} de ${k.evaluables}**.`,
    `- Exposición económica por incidente (horas por encima del RTO × coste por hora): **${Math.round(k.exposicion).toLocaleString('es-ES')} €**.`, `- Preauditoría: **${k.ncMayor} NC mayores**, ${k.ncMenor} NC menores, ${k.obs} observaciones.`, '');
  L.push('| Medida ENS | Nombre | Exigida | Estado |', '|---|---|---|---|', ...calc.ens.map((e) => `| ${e.code} | ${e.nombre} | ${yes(e.aplica)} | ${e.estado} |`), '');
  L.push('## 3. Análisis de impacto (BIA)', '', '| Función | Criticidad | RTO | RPO | MTPD | MTPD según impacto | Vuelve con lo actual | € / hora |', '|---|---|---|---|---|---|---|---|');
  for (const x of calc.funciones) L.push(`| ${x.id} · ${md(x.nombre)} | ${x.criticidad} | ${mdH(x.rto)} | ${mdH(x.rpo)} | ${mdH(x.mtpd)} | ${x.mtpdMatriz === null ? '> 7 días' : mdH(x.mtpdMatriz)} | ${mdH(x.rtoAlcanzable)}${x.cumpleRto === false ? ' ✗' : ''} | ${Math.round(x.costeHora).toLocaleString('es-ES')} |`);
  L.push('', '### Impacto en el tiempo', '', `| Función | ${E.HORIZONTES.map((h) => h.label).join(' | ')} |`, `|---|${E.HORIZONTES.map(() => '---').join('|')}|`);
  for (const x of calc.funciones) L.push(`| ${x.id} | ${x.curva.map((v) => E.NIVELES[v]).join(' | ')} |`);
  L.push('', '### Dependencias', '');
  for (const f of state.funciones) {
    const d = f.dependencias; const x = calc.fxById.get(f.id);
    L.push(`- **${f.id} · ${md(f.nombre)}** — activos: ${d.activos.join(', ') || '—'}; funciones: ${d.funciones.join(', ') || '—'}; proveedores: ${d.proveedores.map((p) => md(nombreP(p))).join(', ') || '—'}. Marca el ritmo: ${md(causaTxt(x.rtoCausa))}.${f.alternativa ? ` Alternativa manual: ${md(f.alternativa)}.` : ''}`);
  }
  L.push('', '## 4. Estrategia y secuencia de recuperación (DRP)', '', '| Orden | Activo | Estrategia | Empieza | Listo | Lo necesitan antes de | Responsable |', '|---|---|---|---|---|---|---|');
  for (const r of calc.ordenRecuperacion) L.push(`| ${r.orden} | ${r.id} · ${md(r.nombre)} | ${E.ESTRATEGIAS[r.a.estrategia].label} | T+${mdH(r.inicio)} | T+${mdH(r.fin)} | ${mdH(r.rtoObjetivo)} | ${md(r.a.responsable)} |`);
  L.push('', '### Procedimientos', '');
  for (const r of calc.ordenRecuperacion) {
    const p = r.a.procedimiento;
    L.push(`#### ${r.orden}. ${r.id} · ${md(r.nombre)}`, '', `Estrategia: ${E.ESTRATEGIAS[r.a.estrategia].label} · tiempo previsto ${mdH(r.tiempo)} · necesita antes: ${r.a.dependeDe.join(', ') || 'nada'} · ubicación: ${md(r.a.ubicacion || '—')}`, '',
      p.pasos ? mdBlock(p.pasos) : '_Sin procedimiento documentado._', '', `**Criterio de éxito:** ${p.exito ? md(p.exito) : '_sin definir_'}  `, p.credenciales ? `**Credenciales:** ${md(p.credenciales)}` : '', '');
  }
  L.push('## 5. Copias de seguridad', '', '| Activo | Tipo | Frecuencia | Retención | Fuera de sede | Cifrada | Inmutable | Última restauración | Resultado |', '|---|---|---|---|---|---|---|---|---|');
  for (const a of state.activos) { const c = a.backup; if (!c.aplica) { L.push(`| ${a.id} · ${md(a.nombre)} | Sin copia | | | | | | | |`); continue; } L.push(`| ${a.id} · ${md(a.nombre)} | ${md(c.tipo)} | ${mdH(c.frecuenciaHoras)} | ${c.retencionDias ?? '—'} días | ${yes(c.offsite)} | ${yes(c.cifrado)} | ${yes(c.inmutable)} | ${c.ultimaRestauracion || '—'} | ${c.resultado} |`); }
  L.push('', '## 6. Gestión de crisis (BCP)', '', '### Equipo de crisis', '', '| Rol | Titular | Suplente | Teléfono 24 h | Responsabilidades |', '|---|---|---|---|---|',
    ...b.equipo.map((r) => `| ${md(r.rol)} | ${md(r.titular)} | ${md(r.suplente || '—')} | ${md(r.telefono)} | ${md(r.responsabilidades)} |`), '',
    '### Activación', '', `- Umbral: **${b.activacion.umbralHoras === null ? 'sin definir' : 'T+' + mdH(b.activacion.umbralHoras) + ' sin servicio'}**.`, `- Autoriza: ${md(b.activacion.autorizado || 'sin definir')}.`, '', b.activacion.escenarios ? mdBlock(b.activacion.escenarios) : '', '',
    '### Comunicación', '', `- Canal principal: ${md(b.comunicacion.primario || '—')}`, `- Si los sistemas caen: ${md(b.comunicacion.secundario || '—')}`, `- Externa: ${md(b.comunicacion.externo || '—')}`, '');
  if (b.comunicacion.plantilla) L.push('```', b.comunicacion.plantilla.replace(/```/g, "'''"), '```', '');
  L.push('### Sitio alternativo', '', `${{ ninguno: 'Sin sitio alternativo', hot: 'Hot site', warm: 'Warm site', cold: 'Cold site', cloud: 'Recuperación en la nube' }[b.sitio.tipo]} · ${md(b.sitio.ubicacion || '—')} · ${b.sitio.distanciaKm ?? '—'} km · activación en ${mdH(b.sitio.rtoActivacion)}.`, '', b.sitio.capacidad ? mdBlock(b.sitio.capacidad) : '', '');
  L.push('### Proveedores críticos', '', '| Proveedor | Servicio | Contacto | Plazo | Contrato | Continuidad verificada |', '|---|---|---|---|---|---|', ...state.proveedores.map((p) => `| ${md(p.nombre)} | ${md(p.servicio)} | ${md(p.contacto)} | ${mdH(p.slaHoras)} | ${md(p.contrato)} | ${yes(p.bcmVerificado)} |`), '');
  L.push('## 7. Pruebas', '', '| Prueba | Fecha | Tipo | Alcance | RTO medido | RPO medido | Resultado | Carencias | Acción |', '|---|---|---|---|---|---|---|---|---|',
    ...state.pruebas.map((t) => `| ${t.id} | ${t.fecha || '—'} | ${E.TIPOS_PRUEBA[t.tipo].label} | ${[...t.funciones, ...t.activos].join(', ')} | ${mdH(t.rtoReal)} | ${mdH(t.rpoReal)} | ${t.resultado} | ${md(t.gaps)} | ${md(t.accion)} |`), '');
  L.push('## 8. Revisión', '', `Revisión anticipada si: ${md(state.revision.disparadores || '—')}`, '', '| Versión | Fecha | Motivo | Responsable | Aprobado por |', '|---|---|---|---|---|',
    ...state.revision.historial.map((h) => `| ${md(h.version)} | ${h.fecha || '—'} | ${md(h.motivo)} | ${md(h.responsable)} | ${md(h.aprobado)} |`), '',
    '_Documento generado con KAIROS. Los tiempos «vuelve con lo actual» y «listo» son estimaciones a partir de las estrategias y procedimientos declarados; se confirman con las pruebas._');
  return L.join('\n');
}
function informeMd() {
  const L = [`# Preauditoría de continuidad — ${md(state.meta.nombre)}`, '', `**Fecha:** ${today()} · **Categoría ENS:** ${state.meta.categoria} · **Autor:** ${md(firma())} · KAIROS ${VERSION}`, '',
    `Resultado: **${calc.kpi.ncMayor} NC mayores**, ${calc.kpi.ncMenor} NC menores, ${calc.kpi.obs} observaciones.`, ''];
  for (const sev of E.SEV) {
    const fs = calc.checks.filter((c) => c.sev === sev); if (!fs.length) continue;
    L.push(`## ${sev === 'Observación' ? 'Observaciones' : sev === 'NC mayor' ? 'No conformidades mayores' : 'No conformidades menores'} (${fs.length})`, '', '| Regla | Ámbito | Hallazgo | Acción recomendada | Referencia | Estado |', '|---|---|---|---|---|---|');
    for (const c of fs) { const a = state.acciones[accKey(c)]; L.push(`| ${c.id} | ${md(c.ambito)} | **${md(c.titulo)}.** ${md(c.detalle)} | ${md(c.recomendacion)} | ${md(c.ref)} | ${a ? md(`${a.estado}${a.responsable ? ' · ' + a.responsable : ''}${a.fecha ? ' · ' + a.fecha : ''}`) : 'Pendiente'} |`); }
    L.push('');
  }
  L.push('_Preauditoría automática: prepara la auditoría formal, no la sustituye._');
  return L.join('\n');
}
function accionesCsv() {
  return toCsv([['Regla', 'Severidad', 'Ámbito', 'Hallazgo', 'Acción recomendada', 'Referencia', 'Estado', 'Responsable', 'Fecha límite'],
    ...calc.checks.map((c) => { const a = state.acciones[accKey(c)] || {}; return [c.id, c.sev, c.ambito, `${c.titulo}. ${c.detalle}`, c.recomendacion, c.ref, a.estado || 'Pendiente', a.responsable || '', a.fecha || '']; })]);
}

/* Excel: la librería se activa bajo demanda y se retira del objeto global */
let xlsxP = null;
const clearX = () => { try { delete window.XLSX; } catch (e) { /* no configurable */ } if (window.XLSX !== undefined) window.XLSX = undefined; };
function loadXLSX() {
  if (xlsxP) return xlsxP;
  xlsxP = new Promise((res, rej) => {
    clearX();
    const done = () => { const X = window.XLSX; clearX(); X && X.utils ? res(X) : rej(new Error('La librería de Excel no está disponible.')); };
    const s = document.createElement('script'); const inert = document.getElementById(XLSX_LIB.id);
    if (inert) { s.textContent = inert.textContent; document.head.appendChild(s); s.remove(); done(); return; }
    s.src = XLSX_LIB.cdn; s.integrity = XLSX_LIB.sri; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer'; s.async = true;
    s.onload = () => { s.remove(); done(); }; s.onerror = () => { s.remove(); rej(new Error('No se pudo cargar la librería de Excel: sin conexión o el fichero no supera la comprobación de integridad.')); };
    document.head.appendChild(s);
  }).catch((e) => { xlsxP = null; throw e; });
  return xlsxP;
}
async function exportXlsx() {
  if (!state || ui.busyXlsx) return;
  ui.busyXlsx = true; render();
  try {
    const X = await loadXLSX();
    const acc = (getComputedStyle(document.documentElement).getPropertyValue('--accent-xl').trim().replace('#', '') || '248A3D').toUpperCase();
    const hdr = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: acc } }, alignment: { vertical: 'center', wrapText: true }, border: { bottom: { style: 'thin', color: { rgb: 'D2D2D7' } } } };
    const cell = { alignment: { vertical: 'top', wrapText: true } };
    const sheet = (rows, widths) => {
      const ws0 = X.utils.aoa_to_sheet(rows.map((r) => r.map((v) => (typeof v === 'number' ? v : noFormula(v ?? '')))));
      const range = X.utils.decode_range(ws0['!ref']);
      for (let c = range.s.c; c <= range.e.c; c++) for (let r = range.s.r; r <= range.e.r; r++) { const a = X.utils.encode_cell({ r, c }); if (ws0[a]) { ws0[a].s = r === 0 ? hdr : cell; if (typeof ws0[a].v === 'string') ws0[a].t = 's'; } }
      ws0['!cols'] = widths.map((w) => ({ wch: w })); ws0['!freeze'] = { xSplit: 1, ySplit: 1 }; ws0['!autofilter'] = { ref: ws0['!ref'] };
      return ws0;
    };
    const wb = X.utils.book_new();
    const h = (v) => (v === null || v === undefined || v === Infinity ? '' : v);
    X.utils.book_append_sheet(wb, sheet([['Función', 'Nombre', 'Responsable', 'Criticidad', 'RTO (h)', 'RPO (h)', 'MTPD (h)', 'MTPD según impacto (h)', 'Vuelve con lo actual (h)', 'Cumple RTO', 'Pérdida de datos posible (h)', 'Cumple RPO', 'Coste por hora (€)', 'Exposición (€)', ...E.HORIZONTES.map((x) => `Impacto ${x.label}`), 'Alternativa manual'],
      ...calc.funciones.map((x) => [x.id, x.nombre, x.f.responsable, x.criticidad, h(x.rto), h(x.rpo), h(x.mtpd), h(x.mtpdMatriz), x.rtoAlcanzable, x.cumpleRto === null ? '' : yes(x.cumpleRto), h(x.rpoAlcanzable), x.cumpleRpo === null ? '' : yes(x.cumpleRpo), x.costeHora, Math.round(x.exposicion), ...x.curva.map((v) => E.NIVELES[v]), x.f.alternativa])], [8, 28, 22, 10, 8, 8, 8, 12, 12, 10, 12, 10, 12, 12, 10, 10, 10, 10, 10, 40]), 'BIA');
    X.utils.book_append_sheet(wb, sheet([['Función', 'Depende de activos', 'Depende de funciones', 'Depende de proveedores', 'Marca el ritmo'],
      ...state.funciones.map((f) => [f.id, f.dependencias.activos.join(', '), f.dependencias.funciones.join(', '), f.dependencias.proveedores.map(nombreP).join(', '), causaTxt(calc.fxById.get(f.id).rtoCausa)])], [8, 30, 22, 34, 34]), 'Dependencias');
    X.utils.book_append_sheet(wb, sheet([['Orden', 'Activo', 'Nombre', 'Tipo', 'Guarda datos', 'Estrategia', 'Tiempo (h)', 'Empieza (h)', 'Listo (h)', 'Lo necesitan antes de (h)', 'Necesita antes', 'Ubicación', 'Responsable', 'Pasos', 'Criterio de éxito'],
      ...calc.ordenRecuperacion.map((r) => [r.orden, r.id, r.nombre, r.a.tipo, yes(r.a.datos), E.ESTRATEGIAS[r.a.estrategia].label, r.tiempo, r.inicio, r.fin, h(r.rtoObjetivo), r.a.dependeDe.join(', '), r.a.ubicacion, r.a.responsable, r.a.procedimiento.pasos, r.a.procedimiento.exito])], [6, 8, 28, 14, 10, 14, 9, 9, 9, 12, 16, 28, 22, 60, 40]), 'Recuperación');
    X.utils.book_append_sheet(wb, sheet([['Activo', 'Nombre', 'Copia', 'Tipo', 'Frecuencia (h)', 'Retención (días)', 'Fuera de sede', 'Cifrada', 'Inmutable', 'Última restauración', 'Resultado'],
      ...state.activos.map((a) => { const c = a.backup; return c.aplica ? [a.id, a.nombre, 'Sí', c.tipo, h(c.frecuenciaHoras), h(c.retencionDias), yes(c.offsite), yes(c.cifrado), yes(c.inmutable), c.ultimaRestauracion, c.resultado] : [a.id, a.nombre, 'No', '', '', '', '', '', '', '', '']; })], [8, 28, 7, 24, 12, 12, 10, 9, 10, 16, 11]), 'Copias');
    X.utils.book_append_sheet(wb, sheet([['Rol', 'Titular', 'Suplente', 'Teléfono 24 h', 'Responsabilidades'], ...state.bcp.equipo.map((r) => [r.rol, r.titular, r.suplente, r.telefono, r.responsabilidades]), [], ['Umbral de activación (h)', h(state.bcp.activacion.umbralHoras)], ['Autoriza', state.bcp.activacion.autorizado], ['Canal principal', state.bcp.comunicacion.primario], ['Canal si caen los sistemas', state.bcp.comunicacion.secundario], ['Sitio alternativo', `${state.bcp.sitio.tipo} · ${state.bcp.sitio.ubicacion}`], ['Activación del sitio (h)', h(state.bcp.sitio.rtoActivacion)]], [30, 30, 30, 16, 50]), 'Crisis');
    X.utils.book_append_sheet(wb, sheet([['Prueba', 'Fecha', 'Tipo', 'Funciones', 'Activos', 'RTO medido (h)', 'RPO medido (h)', 'Resultado', 'Carencias', 'Acción correctiva', 'Responsable'],
      ...state.pruebas.map((t) => [t.id, t.fecha, E.TIPOS_PRUEBA[t.tipo].label, t.funciones.join(', '), t.activos.join(', '), h(t.rtoReal), h(t.rpoReal), t.resultado, t.gaps, t.accion, t.responsable])], [8, 11, 20, 14, 14, 12, 12, 10, 40, 40, 22]), 'Pruebas');
    X.utils.book_append_sheet(wb, sheet([['Regla', 'Severidad', 'Ámbito', 'Hallazgo', 'Detalle', 'Acción recomendada', 'Referencia', 'Estado', 'Responsable', 'Fecha límite'],
      ...calc.checks.map((c) => { const a = state.acciones[accKey(c)] || {}; return [c.id, c.sev, c.ambito, c.titulo, c.detalle, c.recomendacion, c.ref, a.estado || 'Pendiente', a.responsable || '', a.fecha || '']; })], [9, 11, 30, 40, 60, 50, 30, 11, 20, 12]), 'Preauditoría');
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    saveFile(`${slug()}_bia_plan_${today()}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  } catch (e) { toast(String(e.message || e), 'error'); }
  finally { ui.busyXlsx = false; render(); }
}

/* Exposición técnica de CTEM-Nexus (sobre «activos») */
function importCtem(text, raw) {
  if (raw === undefined) { try { raw = safeParse(text); } catch (e) { toast('El fichero no es un JSON válido', 'error'); return; } }
  if (!state) { toast('Abre antes el proyecto al que pertenece la exposición.', 'error'); return; }
  const cx = E.desdeCtem(raw);
  if (!cx || !Object.keys(cx.activos).length) { toast('El fichero no es un sobre de activos de CTEM-Nexus', 'error'); return; }
  const ids = new Set(state.activos.map((a) => a.id)); const n = Object.keys(cx.activos).filter((id) => ids.has(id)).length;
  state.ctem = cx; state = sanitizeState(state);
  commit(`Exposición importada: ${n} de ${Object.keys(cx.activos).length} activos emparejados`);
}
/* Importación de proyecto y copia de seguridad */
function importProyecto(text) {
  let raw; try { raw = safeParse(text); } catch (e) { toast('El fichero no es un JSON válido', 'error'); return; }
  if (isObj(raw) && raw.format === 'yrd-ecosistema') return importCtem(text, raw);
  if (isObj(raw) && isObj(raw.ws) && Array.isArray(raw.proyectos)) return restaurar(raw);
  if (!isObj(raw) || !Array.isArray(raw.funciones)) { toast('El fichero no es un proyecto de KAIROS', 'error'); return; }
  createProject(raw, { msg: 'Proyecto importado' });
}
function backup() {
  const data = { app: 'kairos', version: VERSION, fecha: new Date().toISOString(), ws, proyectos: ws.projects.map((p) => ({ id: p.id, state: store.get(PKEY(p.id)) })).filter((x) => x.state) };
  saveFile(`kairos_copia_${today()}.json`, JSON.stringify(data), 'application/json');
}
function restaurar(raw) {
  const nws = sanitizeWs(raw.ws); let n = 0;
  for (const p of arr(raw.proyectos, 300)) if (isObj(p) && PROJ_ID.test(String(p.id)) && nws.projects.some((x) => x.id === p.id)) { store.set(PKEY(p.id), sanitizeState(p.state)); n++; }
  nws.projects = nws.projects.filter((x) => store.get(PKEY(x.id)));
  ws = nws; saveWs(); applyTheme();
  state = null; if (ws.activeId && store.get(PKEY(ws.activeId))) state = sanitizeState(store.get(PKEY(ws.activeId))); else ws.activeId = null;
  recompute(); go(state ? 'panel' : 'inicio'); toast(`Copia restaurada: ${plural(n, 'proyecto', 'proyectos')}`);
}
