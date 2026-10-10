/* Kairos · motor de continuidad de negocio (BIA, BCP y DRP).
 * Funciones puras, sin DOM: se usan en la app y en las pruebas de Node.
 *
 * Modelo
 *  - Funciones de negocio con impacto por horizonte temporal y dimensión, RTO, RPO, MTPD y coste por hora.
 *  - Dependencias: de otras funciones, de activos TIC y de proveedores.
 *  - Activos TIC con estrategia de recuperación, tiempo de recuperación, dependencias y copias de seguridad.
 *  - Plan de continuidad: equipo de crisis, activación, comunicación, sitio alternativo.
 *  - Pruebas con RTO y RPO medidos.
 *
 * Cálculo principal: el RTO alcanzable de una función es el instante en que termina la recuperación de todo
 * lo que necesita, recorriendo la cadena de dependencias (ruta crítica). Se compara con el RTO objetivo y
 * con el MTPD, y el RPO objetivo con la frecuencia real de las copias. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KairosEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HORIZONTES = [
    { k: 'h1', label: '1 h', h: 1 }, { k: 'h4', label: '4 h', h: 4 }, { k: 'h24', label: '24 h', h: 24 },
    { k: 'h72', label: '72 h', h: 72 }, { k: 'd7', label: '7 días', h: 168 }
  ];
  const DIMENSIONES = [
    { k: 'op', label: 'Operativo' }, { k: 'le', label: 'Legal y regulatorio' },
    { k: 're', label: 'Reputación' }, { k: 'pe', label: 'Personas' }
  ];
  const NIVELES = ['Ninguno', 'Bajo', 'Medio', 'Alto', 'Crítico'];
  const CATEGORIAS = ['BÁSICA', 'MEDIA', 'ALTA'];
  /* Estrategias de recuperación (ISO 22301 § 8.3) y tiempo de recuperación típico en horas */
  const ESTRATEGIAS = {
    hot: { label: 'Hot standby', rto: 0.25, desc: 'Réplica síncrona y conmutación automática' },
    warm: { label: 'Warm standby', rto: 4, desc: 'Réplica periódica y conmutación semiautomática' },
    cloud: { label: 'Cloud DR', rto: 4, desc: 'Instancias en la nube activadas bajo demanda' },
    cold: { label: 'Cold standby', rto: 24, desc: 'Restauración manual desde copia' },
    ninguna: { label: 'Sin estrategia', rto: 72, desc: 'Sin medio de recuperación definido' }
  };
  const TIPOS_ACTIVO = ['Servidor', 'Base de datos', 'Aplicación', 'Red', 'Identidad', 'Almacenamiento', 'Nube', 'Puesto de trabajo'];
  const TIPOS_PRUEBA = {
    restauracion: { label: 'Restauración de copia', periodo: 30 },
    tabletop: { label: 'Ejercicio de mesa', periodo: 365 },
    simulacro: { label: 'Simulacro técnico', periodo: 90 },
    failover: { label: 'Conmutación real', periodo: 365 }
  };
  const RESULTADOS = ['OK', 'Parcial', 'Fallido', 'Cancelado'];
  const SEV = ['NC mayor', 'NC menor', 'Observación'];

  const num = (v, d = null) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));
  const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';
  const r2 = (x) => Math.round(x * 100) / 100;
  const fmtH = (h) => {
    if (h === null || h === undefined || !Number.isFinite(h)) return '—';
    if (h === 0) return '0 h';
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h >= 48 && h % 24 === 0) return `${h / 24} días`;
    return `${r2(h)} h`.replace('.', ',');
  };
  const diasEntre = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

  /* ---------- Impacto ---------- */
  function curvaImpacto(f) {
    // Máximo de las dimensiones en cada horizonte; la curva no puede bajar con el tiempo
    let prev = 0;
    return HORIZONTES.map((hz) => {
      const fila = (f.impacto && f.impacto[hz.k]) || {};
      const m = Math.max(prev, ...DIMENSIONES.map((d) => num(fila[d.k], 0)));
      prev = m; return m;
    });
  }
  /* MTPD indicado por la matriz: primer horizonte en que el impacto llega a «Crítico» (inaceptable) */
  function mtpdMatriz(curva) { const i = curva.findIndex((v) => v >= 4); return i < 0 ? null : HORIZONTES[i].h; }
  function criticidad(curva) {
    if (curva[2] >= 4 || curva[1] >= 3) return 'ALTA';    // crítico en 24 h o alto en 4 h
    if (curva[3] >= 3 || curva[2] >= 3) return 'MEDIA';   // alto en 72 h
    return 'BAJA';
  }
  const tieneImpacto = (f) => HORIZONTES.some((hz) => DIMENSIONES.some((d) => num(f.impacto && f.impacto[hz.k] && f.impacto[hz.k][d.k], 0) > 0));

  /* ---------- Recuperación de activos: ruta crítica ---------- */
  function tiempoActivo(a) {
    const t = num(a.tiempoRecuperacion);
    if (t !== null && t >= 0) return t;
    return (ESTRATEGIAS[a.estrategia] || ESTRATEGIAS.ninguna).rto;
  }
  /* Orden topológico de los activos (primero aquello de lo que dependen otros) e instante de fin de recuperación.
   * Los activos sin dependencias se recuperan en paralelo desde t=0. Devuelve también los ciclos. */
  function recuperacionActivos(activos) {
    const byId = new Map(activos.map((a) => [a.id, a]));
    const fin = new Map(); const inicio = new Map(); const estado = new Map(); const ciclos = []; const orden = [];
    const visitar = (id, pila) => {
      if (estado.get(id) === 2) return fin.get(id);
      if (estado.get(id) === 1) { ciclos.push([...pila.slice(pila.indexOf(id)), id]); return 0; }
      const a = byId.get(id); if (!a) return 0;
      estado.set(id, 1); pila.push(id);
      let ini = 0;
      for (const d of a.dependeDe || []) if (byId.has(d)) ini = Math.max(ini, visitar(d, pila));
      pila.pop(); estado.set(id, 2);
      inicio.set(id, ini); fin.set(id, ini + tiempoActivo(a)); orden.push(id);
      return fin.get(id);
    };
    for (const a of activos) visitar(a.id, []);
    return { fin, inicio, orden, ciclos };
  }

  /* ---------- Cálculo principal ---------- */
  function calcular(st, opts = {}) {
    const hoy = opts.hoy || new Date().toISOString().slice(0, 10);
    const funciones = st.funciones || []; const activos = st.activos || []; const proveedores = st.proveedores || [];
    const fById = new Map(funciones.map((f) => [f.id, f]));
    const aById = new Map(activos.map((a) => [a.id, a]));
    const pById = new Map(proveedores.map((p) => [p.id, p]));
    const rec = recuperacionActivos(activos);

    // Activos que necesita una función, incluidos los de sus activos (cierre transitivo)
    const cierreActivos = (ids) => {
      const out = new Set(); const pila = [...ids];
      while (pila.length) { const id = pila.pop(); if (out.has(id) || !aById.has(id)) continue; out.add(id); pila.push(...(aById.get(id).dependeDe || [])); }
      return out;
    };
    // RTO alcanzable de cada función (memoizado; los ciclos entre funciones se detectan)
    const alc = new Map(); const fEstado = new Map(); const ciclosF = [];
    const alcanzable = (id, pila = []) => {
      if (fEstado.get(id) === 2) return alc.get(id);
      if (fEstado.get(id) === 1) { ciclosF.push([...pila.slice(pila.indexOf(id)), id]); return { t: 0, causa: null }; }
      const f = fById.get(id); if (!f) return { t: 0, causa: null };
      fEstado.set(id, 1); pila.push(id);
      const dep = f.dependencias || {};
      let best = { t: 0, causa: null };
      const subir = (t, causa) => { if (t > best.t) best = { t, causa }; };
      for (const aId of dep.activos || []) if (aById.has(aId)) subir(rec.fin.get(aId), { tipo: 'activo', id: aId });
      for (const pId of dep.proveedores || []) { const p = pById.get(pId); const sla = p ? num(p.slaHoras) : null; if (sla !== null) subir(sla, { tipo: 'proveedor', id: pId }); }
      for (const fId of dep.funciones || []) if (fById.has(fId) && fId !== id) subir(alcanzable(fId, pila).t, { tipo: 'funcion', id: fId });
      pila.pop(); fEstado.set(id, 2); alc.set(id, best);
      return best;
    };

    const fx = funciones.map((f) => {
      const curva = curvaImpacto(f);
      const rto = num(f.rto); const rpo = num(f.rpo); const mtpd = num(f.mtpd); const coste = num(f.costeHora, 0);
      const a = alcanzable(f.id);
      const act = cierreActivos((f.dependencias && f.dependencias.activos) || []);
      // RPO alcanzable: la copia menos frecuente entre los activos que guardan datos de la función. Las copias de
      // configuración (red, directorio, servidores sin estado) no determinan la pérdida de datos de negocio.
      let rpoAlc = null; let rpoCausa = null; let sinCopia = null;
      for (const aId of act) {
        const a0 = aById.get(aId); if (a0.datos !== true) continue;
        const b = a0.backup; const fr = b && b.aplica !== false ? num(b.frecuenciaHoras) : null;
        if (fr === null) { sinCopia = sinCopia || aId; continue; }
        if (rpoAlc === null || fr > rpoAlc) { rpoAlc = fr; rpoCausa = aId; }
      }
      const crit = criticidad(curva);
      return {
        id: f.id, nombre: f.nombre, f, curva, criticidad: crit, critica: crit !== 'BAJA',
        mtpdMatriz: mtpdMatriz(curva), rto, rpo, mtpd, costeHora: coste,
        rtoAlcanzable: a.t, rtoCausa: a.causa, rpoAlcanzable: sinCopia ? Infinity : rpoAlc, rpoCausa: sinCopia || rpoCausa, sinCopia,
        activos: [...act],
        cumpleRto: rto === null ? null : a.t <= rto + 1e-9,
        cumpleRpo: rpo === null ? null : sinCopia ? false : rpoAlc === null ? null : rpoAlc <= rpo + 1e-9,
        viable: rto === null || mtpd === null ? null : rto < mtpd,
        exposicion: rto === null ? 0 : Math.max(0, a.t - rto) * coste,
        impactoRto: (rto || 0) * coste,
        impactoAlcanzable: a.t * coste
      };
    });
    const fxById = new Map(fx.map((x) => [x.id, x]));

    // Objetivo que debe cumplir cada activo: el menor RTO y RPO de las funciones que lo necesitan
    const ax = activos.map((a) => {
      const usan = fx.filter((x) => x.activos.includes(a.id));
      const rtos = usan.map((x) => x.rto).filter((v) => v !== null);
      const rpos = usan.map((x) => x.rpo).filter((v) => v !== null);
      return { id: a.id, nombre: a.nombre, a, inicio: rec.inicio.get(a.id) || 0, fin: rec.fin.get(a.id) || 0, tiempo: tiempoActivo(a),
        funciones: usan.map((x) => x.id), critico: usan.some((x) => x.critica),
        rtoObjetivo: rtos.length ? Math.min(...rtos) : null, rpoObjetivo: rpos.length ? Math.min(...rpos) : null };
    });
    // Orden de recuperación: respeta dependencias; a igualdad, primero lo que exige menor RTO
    const pos = new Map(rec.orden.map((id, i) => [id, i]));
    const axOrden = [...ax].sort((p, q) => (p.inicio - q.inicio) || ((p.rtoObjetivo ?? 1e9) - (q.rtoObjetivo ?? 1e9)) || (pos.get(p.id) - pos.get(q.id)));
    axOrden.forEach((x, i) => { x.orden = i + 1; });

    // Pruebas: la más reciente por activo y por función
    const pruebas = (st.pruebas || []).slice().sort((p, q) => String(q.fecha).localeCompare(String(p.fecha)));
    const ultimaPrueba = (id) => pruebas.find((p) => p.resultado !== 'Cancelado' && ((p.activos || []).includes(id) || (p.funciones || []).includes(id)));

    const checks = auditar(st, { fx, fxById, ax, aById, pById, rec, ciclosF, hoy, ultimaPrueba, pruebas });
    const kpi = {
      funciones: fx.length,
      criticas: fx.filter((x) => x.critica).length,
      conObjetivos: fx.filter((x) => x.rto !== null && x.rpo !== null && x.mtpd !== null).length,
      cumplenRto: fx.filter((x) => x.cumpleRto === true).length,
      evaluables: fx.filter((x) => x.cumpleRto !== null).length,
      exposicion: fx.reduce((s, x) => s + x.exposicion, 0),
      peorBrecha: fx.reduce((m, x) => (x.rto !== null ? Math.max(m, x.rtoAlcanzable - x.rto) : m), 0),
      activos: ax.length,
      pruebas: pruebas.length,
      ncMayor: checks.filter((c) => c.sev === 'NC mayor').length,
      ncMenor: checks.filter((c) => c.sev === 'NC menor').length,
      obs: checks.filter((c) => c.sev === 'Observación').length
    };
    kpi.preparacion = kpi.evaluables ? kpi.cumplenRto / kpi.evaluables : 0;
    const ens = estadoEns(st, checks);
    return { hoy, funciones: fx, fxById, activos: ax, ordenRecuperacion: axOrden, ciclos: { activos: rec.ciclos, funciones: ciclosF }, checks, kpi, ens, pruebas };
  }

  /* ---------- Preauditoría: reglas ---------- */
  const REGLAS = [
    ['BIA-01', 'Función crítica sin objetivos de recuperación', 'ISO 22301 § 8.2.3 · ENS op.cont.1'],
    ['BIA-02', 'RTO igual o superior al MTPD', 'ISO 22301 § 8.2.3'],
    ['BIA-03', 'MTPD más largo de lo que admite el impacto', 'ISO 22301 § 8.2.3'],
    ['BIA-04', 'Función sin valoración de impacto', 'ISO 22301 § 8.2.2'],
    ['BIA-05', 'Función sin responsable', 'ISO 22301 § 5.3'],
    ['DEP-01', 'Dependencia que se recupera después de lo que exige la función', 'ISO 22301 § 8.2.2 c'],
    ['DEP-02', 'Dependencias circulares', 'ISO 22301 § 8.2.2 c'],
    ['DEP-03', 'Proveedor con un plazo de servicio mayor que el RTO', 'ISO 22301 § 8.3 · ISO/IEC 27001 A.5.22'],
    ['DEP-04', 'Proveedor crítico sin continuidad verificada', 'ISO/IEC 27001 A.5.22 · A.5.23'],
    ['DRP-01', 'RTO no alcanzable con la estrategia actual', 'ISO 22301 § 8.3 · ENS op.cont.2'],
    ['DRP-02', 'Activo de una función crítica sin estrategia de recuperación', 'ISO 22301 § 8.3 · ENS op.cont.2'],
    ['DRP-03', 'Activo sin procedimiento de recuperación documentado', 'ISO 22301 § 8.4.4'],
    ['BCK-01', 'RPO no alcanzable con la frecuencia de copia', 'ISO/IEC 27001 A.8.13 · ENS mp.info.6'],
    ['BCK-02', 'Sin prueba de restauración reciente', 'ISO/IEC 27001 A.8.13 · ENS mp.info.6'],
    ['BCK-03', 'Copias sin ejemplar fuera de la sede (3-2-1)', 'ISO/IEC 27001 A.8.13'],
    ['BCK-04', 'Copias sin cifrar', 'ISO/IEC 27001 A.8.13 · A.8.24 · ENS mp.info.6'],
    ['BCK-05', 'Sin copia inmutable o desconectada', 'ISO/IEC 27001 A.8.13 · CCN-STIC 817'],
    ['BCP-01', 'Rol del equipo de crisis sin suplente', 'ISO 22301 § 8.4.2'],
    ['BCP-02', 'Criterio de activación ausente o más lento que el RTO', 'ISO 22301 § 8.4.2'],
    ['BCP-03', 'Sin canal de comunicación independiente de los sistemas', 'ISO 22301 § 8.4.3'],
    ['BCP-04', 'Categoría ALTA sin medios alternativos', 'ENS op.cont.4 · ISO 22301 § 8.3'],
    ['BCP-05', 'El sitio alternativo tarda más en activarse que el RTO', 'ENS op.cont.4 · ISO 22301 § 8.3'],
    ['TST-01', 'Función crítica sin ninguna prueba', 'ENS op.cont.3 · ISO 22301 § 8.5'],
    ['TST-02', 'Prueba con RTO o RPO medido peor que el objetivo', 'ENS op.cont.3 · ISO 22301 § 8.5'],
    ['TST-03', 'Prueba fallida o parcial sin acción correctiva', 'ISO 22301 § 10.1'],
    ['TST-04', 'Última prueba hace más de un año', 'ENS op.cont.3 · ISO 22301 § 8.5'],
    ['REV-01', 'Revisión del BIA vencida o sin fecha', 'ISO 22301 § 9.1 · ENS op.cont.1'],
    ['REV-02', 'Plan sin aprobación de la dirección', 'ISO 22301 § 5.1 · § 5.2'],
    ['CTM-01', 'Activo de una función crítica con riesgo de interrupción alto por exposición técnica (CTEM-Nexus)', 'ISO 22301 § 8.2.3 · ENS op.cont.1 · op.exp.4']
  ];
  const REGLA = Object.fromEntries(REGLAS.map(([id, titulo, ref]) => [id, { titulo, ref }]));

  function auditar(st, c) {
    const out = []; const cat = CATEGORIAS.includes(st.meta && st.meta.categoria) ? st.meta.categoria : 'MEDIA';
    const exigeContinuidad = cat !== 'BÁSICA'; // op.cont.2 y op.cont.3 desde MEDIA
    const add = (id, sev, ambito, detalle, recomendacion) => out.push({ id, sev, ambito, titulo: REGLA[id].titulo, detalle, recomendacion, ref: REGLA[id].ref });
    const nf = (id) => (c.fxById.get(id) || { nombre: id }).nombre;
    const na = (id) => (c.aById.get(id) || { nombre: id }).nombre;

    for (const x of c.fx) {
      const f = x.f; const amb = `${x.id} · ${x.nombre}`;
      if (!tieneImpacto(f)) add('BIA-04', 'NC menor', amb, 'No hay impacto valorado en ningún horizonte. Sin él no se puede justificar la criticidad ni el MTPD.', 'Valorar el impacto operativo, legal, reputacional y sobre las personas a 1 h, 4 h, 24 h, 72 h y 7 días.');
      if (x.critica && (x.rto === null || x.rpo === null || x.mtpd === null)) {
        const falta = [x.rto === null && 'RTO', x.rpo === null && 'RPO', x.mtpd === null && 'MTPD'].filter(Boolean).join(', ');
        add('BIA-01', 'NC mayor', amb, `Criticidad ${x.criticidad} sin ${falta}.`, 'Fijar los objetivos con el responsable de la función y aprobarlos con la dirección.');
      }
      if (x.viable === false) add('BIA-02', 'NC mayor', amb, `RTO ${fmtH(x.rto)} frente a un MTPD de ${fmtH(x.mtpd)}: la función se recupera cuando el daño ya es inaceptable.`, 'Reducir el RTO por debajo del MTPD o revisar el MTPD con la dirección.');
      if (x.mtpd !== null && x.mtpdMatriz !== null && x.mtpd > x.mtpdMatriz) add('BIA-03', 'NC menor', amb, `MTPD declarado ${fmtH(x.mtpd)}; la matriz de impacto alcanza «Crítico» a las ${fmtH(x.mtpdMatriz)}.`, `Bajar el MTPD a ${fmtH(x.mtpdMatriz)} o revisar la valoración del impacto.`);
      if (isBlank(f.responsable)) add('BIA-05', 'Observación', amb, 'La función no tiene responsable de negocio asignado.', 'Asignar un responsable que valide el impacto y los objetivos.');
      if (x.rto !== null) {
        for (const fId of (f.dependencias && f.dependencias.funciones) || []) {
          const d = c.fxById.get(fId); if (!d || d.rto === null) continue;
          if (d.rto > x.rto) add('DEP-01', 'NC mayor', amb, `Depende de ${d.id} · ${d.nombre}, con RTO ${fmtH(d.rto)}, mayor que su propio RTO de ${fmtH(x.rto)}.`, `Alinear el RTO de ${d.id} a ${fmtH(x.rto)} como máximo o eliminar la dependencia.`);
        }
        for (const pId of (f.dependencias && f.dependencias.proveedores) || []) {
          const p = c.pById.get(pId); if (!p) continue; const sla = num(p.slaHoras);
          if (sla === null) add('DEP-03', x.critica ? 'NC menor' : 'Observación', amb, `El proveedor ${p.nombre} no tiene plazo de restablecimiento acordado.`, 'Incluir en el contrato un plazo de restablecimiento compatible con el RTO.');
          else if (sla > x.rto) add('DEP-03', x.critica ? 'NC mayor' : 'NC menor', amb, `${p.nombre} se compromete a ${fmtH(sla)}; la función necesita ${fmtH(x.rto)}.`, 'Renegociar el acuerdo de nivel de servicio o disponer de un proveedor o medio alternativo.');
        }
        if (x.cumpleRto === false) {
          const cz = x.rtoCausa; const quien = !cz ? '' : cz.tipo === 'activo' ? `el activo ${cz.id} · ${na(cz.id)}` : cz.tipo === 'proveedor' ? `el proveedor ${(c.pById.get(cz.id) || {}).nombre || cz.id}` : `la función ${cz.id} · ${nf(cz.id)}`;
          add('DRP-01', x.critica ? 'NC mayor' : 'NC menor', amb, `RTO objetivo ${fmtH(x.rto)}; con las estrategias actuales la función vuelve a las ${fmtH(x.rtoAlcanzable)}. Marca el ritmo ${quien}.${x.costeHora ? ` Exposición: ${Math.round(x.exposicion).toLocaleString('es-ES')} € por incidente.` : ''}`, 'Mejorar la estrategia del elemento que marca el ritmo (p. ej. de cold a warm standby) o reconsiderar el RTO.');
        }
      }
      if (x.cumpleRpo === false && x.sinCopia) add('BCK-01', x.critica ? 'NC mayor' : 'NC menor', amb, `RPO objetivo ${fmtH(x.rpo)}; ${c.aById.get(x.sinCopia).nombre} guarda datos de la función y no tiene copia definida.`, `Definir la copia de ${x.sinCopia} con una frecuencia de ${fmtH(x.rpo)} como máximo.`);
      else if (x.cumpleRpo === false) add('BCK-01', x.critica ? 'NC mayor' : 'NC menor', amb, `RPO objetivo ${fmtH(x.rpo)}; la copia de ${c.aById.get(x.rpoCausa).nombre} se hace cada ${fmtH(x.rpoAlcanzable)}.`, `Aumentar la frecuencia de copia o replicar ${x.rpoCausa} para que la pérdida máxima no supere ${fmtH(x.rpo)}.`);
      for (const pId of (f.dependencias && f.dependencias.proveedores) || []) {
        const p = c.pById.get(pId); if (p && x.critica && !p.bcmVerificado) add('DEP-04', 'Observación', `${p.id} · ${p.nombre}`, `Sostiene la función crítica ${x.id} y no se ha verificado su plan de continuidad.`, 'Solicitar evidencias del plan de continuidad del proveedor y de sus pruebas.');
      }
      if (x.critica && exigeContinuidad && !c.ultimaPrueba(x.id) && !x.activos.some((aId) => c.ultimaPrueba(aId))) add('TST-01', 'NC mayor', amb, 'Ninguna prueba registrada sobre la función ni sobre sus activos.', 'Planificar al menos un ejercicio de mesa y una restauración de los activos que la sostienen.');
    }
    for (const cyc of c.rec.ciclos) add('DEP-02', 'NC mayor', cyc.join(' → '), 'Los activos dependen unos de otros en círculo: no existe un orden de recuperación posible.', 'Romper el ciclo identificando qué componente puede arrancar sin el otro.');
    for (const cyc of c.ciclosF) add('DEP-02', 'NC mayor', cyc.join(' → '), 'Las funciones dependen unas de otras en círculo.', 'Revisar el mapa de dependencias con los responsables de cada función.');

    for (const x of c.ax) {
      const a = x.a; const amb = `${a.id} · ${a.nombre}`;
      if (x.critico && (!a.estrategia || a.estrategia === 'ninguna')) add('DRP-02', exigeContinuidad ? 'NC mayor' : 'NC menor', amb, `Sostiene ${x.funciones.join(', ')} y no tiene estrategia de recuperación.`, 'Elegir hot, warm, cold standby o recuperación en la nube según el RTO de las funciones.');
      const pr = a.procedimiento || {};
      if (x.critico && (isBlank(pr.pasos) || isBlank(pr.exito))) add('DRP-03', 'NC menor', amb, `Falta ${[isBlank(pr.pasos) && 'el paso a paso', isBlank(pr.exito) && 'el criterio de éxito'].filter(Boolean).join(' y ')}.`, 'Documentar pasos ejecutables por un técnico sin conocimiento previo y cómo se verifica que funciona.');
      const b = a.backup;
      if (b && b.aplica !== false) {
        const lim = x.critico && a.datos === true ? 30 : 90; // datos de funciones críticas: mensual; configuración y resto: trimestral
        const ult = b.ultimaRestauracion;
        const sevR = x.critico && a.datos === true ? 'NC mayor' : 'NC menor';
        if (!ult) add('BCK-02', sevR, amb, 'No consta ninguna prueba de restauración.', `Restaurar una muestra y registrar fecha, responsable y resultado (al menos cada ${lim} días).`);
        else { const d = diasEntre(ult, c.hoy); if (d > lim) add('BCK-02', sevR, amb, `Última restauración el ${ult}, hace ${d} días (límite: ${lim}).`, 'Repetir la prueba de restauración y registrar el resultado.'); }
        if (b.resultado === 'Fallido') add('BCK-02', 'NC mayor', amb, 'La última prueba de restauración falló.', 'Corregir la causa y repetir la prueba.');
        if (!b.offsite) add('BCK-03', x.critico ? 'NC menor' : 'Observación', amb, 'No hay copia fuera de la sede principal.', 'Aplicar la regla 3-2-1: tres copias, dos soportes, una fuera de la sede.');
        if (!b.cifrado) add('BCK-04', 'NC menor', amb, 'Las copias no están cifradas.', 'Cifrar las copias en tránsito y en reposo y custodiar las claves aparte.');
        if (x.critico && a.datos === true && !b.inmutable) add('BCK-05', 'Observación', amb, 'Ninguna copia inmutable o desconectada: un ransomware podría cifrar también las copias.', 'Mantener al menos una copia inmutable o fuera de línea.');
      }
    }

    // Exposición técnica importada de CTEM-Nexus: un ciberataque es el escenario de interrupción más probable
    const ctem = (st.ctem && st.ctem.activos) || {};
    for (const x of c.ax) {
      const e = ctem[x.a.id];
      if (!e || !x.critico || e.riesgoInterrupcion !== 'alto') continue;
      add('CTM-01', 'NC menor', `${x.a.id} · ${x.a.nombre}`, `Sostiene ${x.funciones.join(', ')}. CTEM-Nexus ve ${e.abiertos} hallazgo${e.abiertos === 1 ? '' : 's'} abierto${e.abiertos === 1 ? '' : 's'} (${e.criticos} crítico${e.criticos === 1 ? '' : 's'}, ${e.kev} explotado${e.kev === 1 ? '' : 's'} activamente) y ${e.rutasDeAtaque} ruta${e.rutasDeAtaque === 1 ? '' : 's'} de ataque${e.peorHallazgo ? `; el peor: ${e.peorHallazgo}` : ''}.`, 'Coordinar con seguridad la corrección de esos hallazgos y ensayar en el BCP el escenario de ciberataque sobre este activo.');
    }

    const bcp = st.bcp || {};
    for (const r of bcp.equipo || []) if (!isBlank(r.titular) && isBlank(r.suplente)) add('BCP-01', exigeContinuidad ? 'NC menor' : 'Observación', r.rol || 'Equipo de crisis', `${r.titular} no tiene suplente: si no está disponible, el plan se detiene.`, 'Designar un suplente con la misma autoridad y formación.');
    if ((bcp.equipo || []).length === 0 || (bcp.equipo || []).every((r) => isBlank(r.titular))) add('BCP-01', exigeContinuidad ? 'NC mayor' : 'NC menor', 'Equipo de crisis', 'No hay equipo de crisis designado.', 'Designar al menos responsable de crisis, de recuperación técnica y de comunicación, con suplentes.');
    const minRtoCrit = Math.min(...c.fx.filter((x) => x.critica && x.rto !== null).map((x) => x.rto));
    const umbral = num(bcp.activacion && bcp.activacion.umbralHoras);
    if (umbral === null || isBlank(bcp.activacion && bcp.activacion.autorizado)) add('BCP-02', exigeContinuidad ? 'NC menor' : 'Observación', 'Activación', 'No hay umbral objetivo de activación o persona autorizada para activar el plan.', 'Fijar un umbral de tiempo sin servicio que active el plan sin esperar a una decisión ad hoc.');
    else if (Number.isFinite(minRtoCrit) && umbral >= minRtoCrit) add('BCP-02', 'NC mayor', 'Activación', `El plan se activa a las ${fmtH(umbral)} y la función crítica más exigente tiene un RTO de ${fmtH(minRtoCrit)}: se activaría con el objetivo ya incumplido.`, `Bajar el umbral de activación por debajo de ${fmtH(minRtoCrit)}.`);
    const com = bcp.comunicacion || {};
    if (isBlank(com.secundario)) add('BCP-03', exigeContinuidad ? 'NC menor' : 'Observación', 'Comunicación', 'No hay canal secundario que funcione con los sistemas caídos.', 'Definir un canal alternativo (telefonía móvil, mensajería externa, lista de contactos impresa).');
    const site = bcp.sitio || {};
    const hayCritica = c.fx.some((x) => x.critica);
    if (cat === 'ALTA' && hayCritica && (!site.tipo || site.tipo === 'ninguno')) add('BCP-04', 'NC mayor', 'Sitio alternativo', 'Sistema de categoría ALTA sin sitio alternativo ni medios alternativos documentados.', 'Disponer de un sitio de recuperación o de medios manuales probados para los servicios esenciales.');
    const rtoSitio = num(site.rtoActivacion);
    if (site.tipo && site.tipo !== 'ninguno' && rtoSitio !== null && Number.isFinite(minRtoCrit) && rtoSitio > minRtoCrit) add('BCP-05', 'NC mayor', 'Sitio alternativo', `Activar el sitio alternativo lleva ${fmtH(rtoSitio)}; la función crítica más exigente necesita ${fmtH(minRtoCrit)}.`, 'Mejorar la preparación del sitio alternativo o revisar qué funciones dependen de él.');

    for (const p of c.pruebas) {
      if (p.resultado === 'Cancelado') continue;
      const amb = `${p.id} · ${(TIPOS_PRUEBA[p.tipo] || {}).label || p.tipo} · ${p.fecha || 'sin fecha'}`;
      const objs = [...(p.funciones || []).map((id) => c.fxById.get(id)).filter(Boolean)];
      const rtoReal = num(p.rtoReal); const rpoReal = num(p.rpoReal);
      const peorRto = objs.filter((x) => x.rto !== null && rtoReal !== null && rtoReal > x.rto);
      const peorRpo = objs.filter((x) => x.rpo !== null && rpoReal !== null && rpoReal > x.rpo);
      if (peorRto.length || peorRpo.length) {
        const txt = [peorRto.length && `RTO medido ${fmtH(rtoReal)} frente a ${peorRto.map((x) => `${fmtH(x.rto)} (${x.id})`).join(', ')}`, peorRpo.length && `RPO medido ${fmtH(rpoReal)} frente a ${peorRpo.map((x) => `${fmtH(x.rpo)} (${x.id})`).join(', ')}`].filter(Boolean).join('; ');
        add('TST-02', isBlank(p.accion) ? 'NC mayor' : 'NC menor', amb, `${txt}.${isBlank(p.accion) ? ' Sin acción correctiva.' : ` Acción en curso: ${p.accion}`}`, 'Corregir la causa, repetir la prueba y actualizar el BIA si el objetivo no es realista.');
      }
      if ((p.resultado === 'Fallido' || p.resultado === 'Parcial') && isBlank(p.accion)) add('TST-03', p.resultado === 'Fallido' ? 'NC mayor' : 'NC menor', amb, `Resultado «${p.resultado}» sin acción correctiva asignada.`, 'Registrar la acción, el responsable y la fecha límite.');
    }
    const ultimaGlobal = c.pruebas.find((p) => p.resultado !== 'Cancelado' && p.fecha);
    if (exigeContinuidad && ultimaGlobal && diasEntre(ultimaGlobal.fecha, c.hoy) > 365) add('TST-04', 'NC menor', 'Programa de pruebas', `La última prueba es del ${ultimaGlobal.fecha}.`, 'Ejecutar al menos un ejercicio al año sobre los servicios críticos.');

    const rv = st.revision || {};
    if (!rv.proxima) add('REV-01', 'NC menor', 'Revisión', 'No hay fecha de próxima revisión.', 'Programar la revisión al menos anual y ante cambios significativos.');
    else if (rv.proxima < c.hoy) add('REV-01', 'NC menor', 'Revisión', `La revisión programada para el ${rv.proxima} está vencida.`, 'Revisar el BIA y el plan y registrar la nueva versión.');
    if (isBlank(rv.aprobadoPor)) add('REV-02', 'NC menor', 'Aprobación', 'No consta quién aprueba el plan.', 'Aprobar el BIA y el plan en el comité de dirección y conservar el acta.');

    const peso = { 'NC mayor': 0, 'NC menor': 1, 'Observación': 2 };
    return out.sort((p, q) => peso[p.sev] - peso[q.sev] || p.id.localeCompare(q.id));
  }

  /* Estado de las medidas de continuidad del ENS (RD 311/2022, Anexo II) según la categoría */
  function estadoEns(st, checks) {
    const cat = CATEGORIAS.includes(st.meta && st.meta.categoria) ? st.meta.categoria : 'MEDIA';
    const reglas = { 'op.cont.1': ['BIA-', 'DEP-', 'REV-'], 'op.cont.2': ['DRP-', 'BCP-01', 'BCP-02', 'BCP-03', 'BCK-'], 'op.cont.3': ['TST-'], 'op.cont.4': ['BCP-04', 'BCP-05'] };
    const nombres = { 'op.cont.1': 'Análisis de impacto', 'op.cont.2': 'Plan de continuidad', 'op.cont.3': 'Pruebas periódicas', 'op.cont.4': 'Medios alternativos' };
    const exig = { 'op.cont.1': ['BÁSICA', 'MEDIA', 'ALTA'], 'op.cont.2': ['MEDIA', 'ALTA'], 'op.cont.3': ['MEDIA', 'ALTA'], 'op.cont.4': ['ALTA'] };
    return Object.keys(nombres).map((code) => {
      const own = checks.filter((ch) => reglas[code].some((p) => ch.id.startsWith(p)));
      const aplica = exig[code].includes(cat);
      const may = own.filter((x) => x.sev === 'NC mayor').length; const men = own.filter((x) => x.sev === 'NC menor').length;
      return { code, nombre: nombres[code], aplica, ncMayor: may, ncMenor: men, estado: !aplica ? 'No exigida' : may ? 'No conforme' : men ? 'Con incidencias' : 'Conforme' };
    });
  }

  /* Instantánea para el historial del panel */
  function instantanea(r) {
    return { preparacion: r.kpi.preparacion, ncMayor: r.kpi.ncMayor, ncMenor: r.kpi.ncMenor, exposicion: Math.round(r.kpi.exposicion) };
  }

  /* ---------- Ecosistema: sobre «yrd-ecosistema» con CTEM-Nexus ---------- */
  const ECO = 'yrd-ecosistema';
  const isO = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const tx = (v, n) => (typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n || 200);
  const ent = (v, max) => { const x = typeof v === 'number' && isFinite(v) ? Math.round(v) : 0; return Math.max(0, Math.min(max || 1e6, x)); };
  /** BIA como sobre «bia»: cada activo con las funciones que lo usan y sus objetivos (CTEM-Nexus calcula la criticidad). */
  function aSobreBia(st, c, version, ahora) {
    const datos = c.activos.map((x) => ({
      activo: x.a.id, nombre: x.a.nombre, tipo: x.a.tipo, responsable: tx(x.a.responsable, 120), dependeDe: [...(x.a.dependeDe || [])],
      funciones: x.funciones.map((id) => { const f = c.fxById.get(id); return { id, nombre: f ? f.nombre : id, rto: f ? f.rto : null, rpo: f ? f.rpo : null, mtpd: f ? f.mtpd : null, costeHora: f ? f.costeHora : 0, criticidad: f ? f.criticidad : null }; })
    }));
    const m = st.meta || {};
    return { format: ECO, version: 1, origen: { herramienta: 'kairos', version: String(version || ''), generado: (ahora || new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z') }, tipo: 'bia', proyecto: tx(m.organizacion || m.nombre, 120), datos };
  }
  /** Riesgo de interrupción que exporta CTEM-Nexus (sobre «activos»), saneado. Devuelve null si no lo es. */
  function desdeCtem(o) {
    if (!isO(o)) return null;
    const sobre = o.format === ECO;
    if (sobre && (o.version !== 1 || !isO(o.origen) || o.origen.herramienta !== 'ctem-nexus' || o.tipo !== 'activos' || !Array.isArray(o.datos))) return null;
    const lista = sobre ? o.datos : isO(o.activos) ? Object.values(o.activos) : null;
    if (!lista) return null;
    const activos = {};
    for (const d of lista.slice(0, 2000)) {
      if (!isO(d) || !/^[\w.-]{1,40}$/.test(tx(d.activo, 40))) continue;
      activos[tx(d.activo, 40)] = { activo: tx(d.activo, 40), nombre: tx(d.nombre, 160), criticidad: ent(d.criticidad, 5), abiertos: ent(d.abiertos), criticos: ent(d.criticos), altos: ent(d.altos), kev: ent(d.kev),
        rutasDeAtaque: ent(d.rutasDeAtaque), puntuacionMaxima: Math.max(0, Math.min(100, Number(d.puntuacionMaxima) || 0)), peorHallazgo: tx(d.peorHallazgo, 200),
        riesgoInterrupcion: ['alto', 'medio', 'bajo'].includes(d.riesgoInterrupcion) ? d.riesgoInterrupcion : 'bajo' };
    }
    return { generado: tx(sobre ? o.origen.generado : o.generado, 40), proyecto: tx(o.proyecto, 120), activos };
  }

  return { aSobreBia, desdeCtem, HORIZONTES, DIMENSIONES, NIVELES, CATEGORIAS, ESTRATEGIAS, TIPOS_ACTIVO, TIPOS_PRUEBA, RESULTADOS, SEV, REGLAS,
    num, isBlank, fmtH, diasEntre, curvaImpacto, mtpdMatriz, criticidad, tiempoActivo, recuperacionActivos, calcular, auditar, estadoEns, instantanea };
});
