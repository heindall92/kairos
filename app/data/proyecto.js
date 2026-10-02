/* Convierte un caso de ejemplo al formato de proyecto de Kairos (el mismo que guarda la app). */
'use strict';
const E = require('../src/engine.js');

function expandirImpacto(imp) {
  const out = {};
  E.HORIZONTES.forEach((hz, i) => { const fila = (imp && imp[i]) || [0, 0, 0, 0]; out[hz.k] = Object.fromEntries(E.DIMENSIONES.map((d, j) => [d.k, fila[j] || 0])); });
  return out;
}
function proyectoDeCaso(c) {
  return {
    version: 1, caseId: c.id, meta: { ...c.meta },
    funciones: c.funciones.map((f) => ({ id: f.id, nombre: f.nombre, descripcion: f.descripcion, responsable: f.responsable, rto: f.rto, rpo: f.rpo, mtpd: f.mtpd, costeHora: f.costeHora,
      impacto: expandirImpacto(f.imp), alternativa: f.manual || '', dependencias: { activos: [...f.dep.activos], funciones: [...f.dep.funciones], proveedores: [...f.dep.proveedores] } })),
    activos: c.activos.map((a) => JSON.parse(JSON.stringify(a))),
    proveedores: c.proveedores.map((p) => ({ ...p })),
    bcp: JSON.parse(JSON.stringify(c.bcp)),
    pruebas: c.pruebas.map((p) => JSON.parse(JSON.stringify(p))),
    revision: JSON.parse(JSON.stringify(c.revision)),
    acciones: {}, historial: []
  };
}
module.exports = { proyectoDeCaso, expandirImpacto };
