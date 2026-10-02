/* Pruebas del motor de Kairos (node --test). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../app/src/engine.js');
const CASOS = require('../app/data/casos.js');
const { proyectoDeCaso, expandirImpacto } = require('../app/data/proyecto.js');

const HOY = '2026-10-02';
const caso = (id) => proyectoDeCaso(CASOS.find((c) => c.id === id));
const ids = (r) => r.checks.map((c) => `${c.id}|${c.ambito.split(' ')[0]}`).sort();
const base = () => ({
  meta: { categoria: 'MEDIA' }, funciones: [], activos: [], proveedores: [],
  bcp: { equipo: [{ rol: 'Crisis', titular: 'A', suplente: 'B' }], activacion: { umbralHoras: 0.5, autorizado: 'A' }, comunicacion: { secundario: 'Móvil' }, sitio: { tipo: 'ninguno' } },
  pruebas: [], revision: { proxima: '2027-01-01', aprobadoPor: 'Dirección' }
});
const fn = (id, extra = {}) => ({ id, nombre: id, responsable: 'R', rto: 4, rpo: 1, mtpd: 24, costeHora: 100, impacto: expandirImpacto([[1, 0, 0, 0], [3, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0]]), dependencias: { activos: [], funciones: [], proveedores: [] }, ...extra });
const ac = (id, extra = {}) => ({ id, nombre: id, tipo: 'Servidor', estrategia: 'warm', dependeDe: [], procedimiento: { pasos: 'x', exito: 'y' }, ...extra });

test('formato de horas', () => {
  assert.equal(E.fmtH(0.25), '15 min');
  assert.equal(E.fmtH(2), '2 h');
  assert.equal(E.fmtH(25.75), '25,75 h');
  assert.equal(E.fmtH(72), '3 días');
  assert.equal(E.fmtH(null), '—');
});

test('curva de impacto: máximo por horizonte y nunca decreciente; MTPD y criticidad', () => {
  const f = { impacto: expandirImpacto([[0, 2, 0, 0], [1, 1, 3, 0], [0, 0, 0, 0], [4, 0, 0, 0], [0, 0, 0, 0]]) };
  const c = E.curvaImpacto(f);
  assert.deepEqual(c, [2, 3, 3, 4, 4]);
  assert.equal(E.mtpdMatriz(c), 72);
  assert.equal(E.criticidad(c), 'ALTA'); // alto a las 4 h
  assert.equal(E.criticidad([0, 1, 2, 3, 4]), 'MEDIA');
  assert.equal(E.criticidad([0, 0, 1, 2, 2]), 'BAJA');
  assert.equal(E.mtpdMatriz([0, 1, 2, 3, 3]), null);
});

test('ruta crítica de recuperación: los activos esperan a sus dependencias', () => {
  const r = E.recuperacionActivos([ac('RED', { estrategia: 'hot', tiempoRecuperacion: 0.25 }), ac('AD', { tiempoRecuperacion: 1, dependeDe: ['RED'] }), ac('APP', { tiempoRecuperacion: 2, dependeDe: ['AD', 'RED'] })]);
  assert.equal(r.fin.get('RED'), 0.25);
  assert.equal(r.inicio.get('AD'), 0.25);
  assert.equal(r.fin.get('APP'), 3.25);
  assert.deepEqual(r.orden, ['RED', 'AD', 'APP']);
  assert.deepEqual(r.ciclos, []);
});

test('sin tiempo propio se usa el típico de la estrategia', () => {
  assert.equal(E.tiempoActivo({ estrategia: 'cold' }), 24);
  assert.equal(E.tiempoActivo({ estrategia: 'hot' }), 0.25);
  assert.equal(E.tiempoActivo({}), 72);
  assert.equal(E.tiempoActivo({ estrategia: 'cold', tiempoRecuperacion: 6 }), 6);
});

test('detecta ciclos de dependencias entre activos', () => {
  const st = base();
  st.activos = [ac('A', { dependeDe: ['B'] }), ac('B', { dependeDe: ['A'] })];
  const r = E.calcular(st, { hoy: HOY });
  assert.ok(r.checks.some((c) => c.id === 'DEP-02' && c.sev === 'NC mayor'));
});

test('el RTO alcanzable recorre activos, proveedores y funciones de las que se depende', () => {
  const st = base();
  st.activos = [ac('A1', { tiempoRecuperacion: 1 }), ac('A2', { tiempoRecuperacion: 6, dependeDe: ['A1'] })];
  st.proveedores = [{ id: 'P1', nombre: 'Proveedor', slaHoras: 3, bcmVerificado: true }];
  st.funciones = [fn('F1', { rto: 8, dependencias: { activos: ['A2'], funciones: [], proveedores: [] } }), fn('F2', { rto: 4, dependencias: { activos: ['A1'], funciones: ['F1'], proveedores: ['P1'] } })];
  const r = E.calcular(st, { hoy: HOY });
  const f1 = r.fxById.get('F1'); const f2 = r.fxById.get('F2');
  assert.equal(f1.rtoAlcanzable, 7);
  assert.equal(f1.cumpleRto, true);
  assert.equal(f2.rtoAlcanzable, 7);
  assert.deepEqual(f2.rtoCausa, { tipo: 'funcion', id: 'F1' });
  assert.equal(f2.cumpleRto, false);
  assert.equal(f2.exposicion, 300); // 3 h por encima del RTO × 100 €/h
  assert.ok(r.checks.some((c) => c.id === 'DRP-01' && c.ambito.startsWith('F2')));
  assert.ok(r.checks.some((c) => c.id === 'DEP-01' && c.ambito.startsWith('F2')), 'F2 depende de una función con RTO mayor');
  assert.deepEqual(r.ordenRecuperacion.map((x) => x.id), ['A1', 'A2']);
});

test('el RPO solo lo determinan los activos que guardan datos', () => {
  const st = base();
  st.activos = [ac('RED', { datos: false, backup: { frecuenciaHoras: 168, offsite: true, cifrado: true, inmutable: true, ultimaRestauracion: '2026-09-30' } }),
    ac('BD', { datos: true, dependeDe: ['RED'], backup: { frecuenciaHoras: 4, offsite: true, cifrado: true, inmutable: true, ultimaRestauracion: '2026-09-30' } })];
  st.funciones = [fn('F1', { rpo: 1, dependencias: { activos: ['BD'], funciones: [], proveedores: [] } })];
  let r = E.calcular(st, { hoy: HOY });
  assert.equal(r.fxById.get('F1').rpoAlcanzable, 4);
  assert.equal(r.fxById.get('F1').rpoCausa, 'BD');
  assert.ok(r.checks.some((c) => c.id === 'BCK-01'));
  st.activos[1].backup.frecuenciaHoras = 0; // réplica síncrona
  r = E.calcular(st, { hoy: HOY });
  assert.equal(r.fxById.get('F1').cumpleRpo, true);
  assert.ok(!r.checks.some((c) => c.id === 'BCK-01'));
  st.activos[1].backup = { aplica: false };
  r = E.calcular(st, { hoy: HOY });
  assert.equal(r.fxById.get('F1').cumpleRpo, false, 'un activo con datos y sin copia no cumple ningún RPO');
});

test('RTO ≥ MTPD es inviable; MTPD por encima de la matriz es incoherente', () => {
  const st = base();
  st.funciones = [fn('F1', { rto: 24, mtpd: 24 }), fn('F2', { rto: 4, mtpd: 72 })];
  const r = E.calcular(st, { hoy: HOY });
  assert.ok(r.checks.some((c) => c.id === 'BIA-02' && c.ambito.startsWith('F1') && c.sev === 'NC mayor'));
  assert.ok(r.checks.some((c) => c.id === 'BIA-03' && c.ambito.startsWith('F2')), 'la matriz llega a «Crítico» a las 24 h');
});

test('el plan que se activa después del RTO más exigente es una NC mayor', () => {
  const st = base();
  st.funciones = [fn('F1', { rto: 2 })];
  st.bcp.activacion = { umbralHoras: 2, autorizado: 'Crisis' };
  const r = E.calcular(st, { hoy: HOY });
  const c = r.checks.find((x) => x.id === 'BCP-02');
  assert.equal(c.sev, 'NC mayor');
});

test('las exigencias dependen de la categoría del ENS', () => {
  const st = base();
  st.funciones = [fn('F1', { dependencias: { activos: ['A1'], funciones: [], proveedores: [] } })];
  st.activos = [ac('A1', { tiempoRecuperacion: 1 })];
  st.meta.categoria = 'ALTA';
  let r = E.calcular(st, { hoy: HOY });
  assert.ok(r.checks.some((c) => c.id === 'BCP-04'), 'ALTA exige medios alternativos');
  assert.ok(r.checks.some((c) => c.id === 'TST-01'));
  assert.equal(r.ens.find((e) => e.code === 'op.cont.4').aplica, true);
  st.meta.categoria = 'BÁSICA';
  r = E.calcular(st, { hoy: HOY });
  assert.ok(!r.checks.some((c) => c.id === 'BCP-04' || c.id === 'TST-01'));
  assert.deepEqual(r.ens.map((e) => e.aplica), [true, false, false, false]);
});

test('pruebas: RTO medido peor que el objetivo y resultados sin acción', () => {
  const st = base();
  st.funciones = [fn('F1', { rto: 2, rpo: 1 })];
  st.pruebas = [{ id: 'T-01', fecha: '2026-09-01', tipo: 'simulacro', funciones: ['F1'], activos: [], rtoReal: 3, rpoReal: 0.5, resultado: 'Parcial', accion: '' }];
  let r = E.calcular(st, { hoy: HOY });
  assert.equal(r.checks.find((c) => c.id === 'TST-02').sev, 'NC mayor');
  assert.ok(r.checks.some((c) => c.id === 'TST-03'));
  st.pruebas[0].accion = 'Ampliar la réplica';
  r = E.calcular(st, { hoy: HOY });
  assert.equal(r.checks.find((c) => c.id === 'TST-02').sev, 'NC menor');
  assert.ok(!r.checks.some((c) => c.id === 'TST-03'));
});

test('caso TechServ: hallazgos esperados', () => {
  const r = E.calcular(caso('techserv'), { hoy: HOY });
  const got = ids(r);
  for (const exp of ['BCP-02|Activación', 'BCP-05|Sitio', 'DEP-01|F-01', 'DRP-01|F-01', 'DRP-01|F-03', 'BCK-01|F-02', 'TST-02|T-01', 'REV-01|Revisión', 'BCP-01|Responsable'])
    assert.ok(got.includes(exp), `falta ${exp}`);
  const f1 = r.fxById.get('F-01');
  assert.equal(f1.rtoAlcanzable, 25.75, 'la sede espera al gestor documental en cold standby a través de expedientes');
  assert.deepEqual(f1.rtoCausa, { tipo: 'funcion', id: 'F-03' });
  assert.equal(r.fxById.get('F-02').rpoAlcanzable, 0.5);
  assert.equal(r.ordenRecuperacion[0].id, 'A-02', 'la red se recupera primero');
  assert.equal(r.kpi.ncMayor, 14);
  assert.deepEqual(r.ens.map((e) => e.estado), ['No conforme', 'No conforme', 'No conforme', 'No conforme']);
});

test('caso Hospital: el laboratorio pierde el RTO por 6 minutos', () => {
  const r = E.calcular(caso('hospital'), { hoy: HOY });
  const lab = r.fxById.get('F-04');
  assert.ok(Math.abs(lab.rtoAlcanzable - 2.1) < 1e-9);
  assert.equal(lab.cumpleRto, false);
  assert.ok(ids(r).includes('BIA-03|F-02'));
  assert.equal(r.ens.find((e) => e.code === 'op.cont.4').estado, 'Conforme');
});

test('caso Ayuntamiento: categoría MEDIA, sin equipo ni pruebas', () => {
  const r = E.calcular(caso('ayuntamiento'), { hoy: HOY });
  const got = ids(r);
  assert.ok(got.includes('BCP-01|Equipo'));
  assert.ok(got.includes('TST-01|F-01'));
  assert.ok(!got.some((x) => x.startsWith('BCP-04')), 'op.cont.4 no se exige en MEDIA');
  assert.equal(r.ens.find((e) => e.code === 'op.cont.4').estado, 'No exigida');
});

test('todas las reglas citan su referencia y no hay identificadores repetidos', () => {
  const seen = new Set();
  for (const [id, titulo, ref] of E.REGLAS) { assert.ok(!seen.has(id)); seen.add(id); assert.ok(titulo.length > 10 && /ISO|ENS|CCN/.test(ref), id); }
  for (const c of CASOS) for (const ch of E.calcular(proyectoDeCaso(c), { hoy: HOY }).checks) assert.ok(seen.has(ch.id) && E.SEV.includes(ch.sev));
});
