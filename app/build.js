#!/usr/bin/env node
/* Construye KAIROS:
 *  - dist/index.html: un único HTML autónomo, con CSP por hashes y la librería de Excel incrustada sin ejecutar.
 *  - dist/artifact/kairos.html: el mismo contenido sin <head>, para alojarlo en plataformas que añaden el suyo
 *    (pide la librería de Excel al CDN con integridad SRI).
 * Uso: node app/build.js */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DIST = path.join(ROOT, '..', 'dist');
const src = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const CASOS = require('./data/casos.js');
const { proyectoDeCaso } = require('./data/proyecto.js');

const DATA = { casos: CASOS.map((c) => ({ id: c.id, icono: c.icono, sector: c.sector, titulo: c.titulo, resumen: c.resumen, retos: c.retos, state: proyectoDeCaso(c) })) };
const DATA_JS = 'window.KAIROS_DATA = ' + JSON.stringify(DATA).replace(/<\//g, '<\\/') + ';';
const APP = '(function () {\n\'use strict\';\ntry { Object.freeze(Object.prototype); Object.freeze(Array.prototype); } catch (e) { /* entorno que no lo permite */ }\n'
  + fs.readdirSync(path.join(ROOT, 'src', 'ui')).filter((f) => f.endsWith('.js')).sort().map((f) => `/* ===== ${f} ===== */\n` + src('ui/' + f)).join('\n') + '\n})();';
const html = src('index.html')
  .replace('/*__STYLES__*/', () => src('styles.css'))
  .replace('/*__DATA__*/', () => DATA_JS)
  .replace('/*__ENGINE__*/', () => src('engine.js'))
  .replace('/*__APP__*/', () => APP);

fs.mkdirSync(path.join(DIST, 'artifact'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'artifact', 'kairos.html'), html.replace('<!--__XLSX__-->', ''));

// Versión autónoma: librería de Excel incrustada como texto (type="text/plain"); 06-io.js la activa al exportar
const lib = fs.readFileSync(path.join(ROOT, 'vendor', 'xlsx.bundle.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const body = html.replace('<!--__XLSX__-->', () => `<!-- xlsx-js-style 1.2.0 · Apache-2.0 · solo escritura -->\n<script type="text/plain" id="xlsx-escribir">${lib}</script>`);
const sha = (t) => "'sha256-" + crypto.createHash('sha256').update(t, 'utf8').digest('base64') + "'";
const scripts = [...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => sha(m[1])).concat([sha(lib)]);
const styles = [...body.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => sha(m[1]));
// Solo se ejecuta el código de este build; sin conexiones salientes ni recursos externos.
// style-src-attr 'unsafe-inline' cubre los atributos style="" de las plantillas y no permite ejecutar código.
const CSP = `default-src 'none'; script-src ${scripts.join(' ')}; style-src ${styles.join(' ')}; style-src-attr 'unsafe-inline'; font-src 'none'; img-src data: blob:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'`;
const icono = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#248A3D"/><circle cx="16" cy="17" r="8.2" fill="none" stroke="#fff" stroke-width="1.9"/><path d="M16 12.6v4.6l3 2" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/><path d="M13.4 6.8h5.2" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/></svg>');
const standalone = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n<meta name="referrer" content="no-referrer">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<link rel="icon" href="' + icono + '">\n'
  + body.replace('<a class="skip"', '</head>\n<body>\n<a class="skip"') + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(DIST, 'index.html'), standalone);
console.log(`OK dist/index.html (autónomo) ${(standalone.length / 1024).toFixed(0)} KB · dist/artifact/kairos.html ${(html.length / 1024).toFixed(0)} KB`);
