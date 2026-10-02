/* ---------- Idioma de la interfaz (es / en) ----------
 * La interfaz se escribe en español; en inglés se traduce el DOM ya pintado con un diccionario de textos
 * exactos (EN) y patrones para los textos con números (EN_RE). Los datos de los proyectos no se traducen. */
function lang() { return (typeof ws !== 'undefined' && ws && ws.settings && ws.settings.idioma === 'en') ? 'en' : 'es'; }
function locale() { return lang() === 'en' ? 'en-GB' : 'es-ES'; }

const EN = {

};
const EN_RE = [

];

function tr(s) {
  if (s == null || lang() !== 'en') return s;
  const raw = String(s); const key = raw.trim();
  if (!key) return raw;
  if (Object.prototype.hasOwnProperty.call(EN, key)) { const i = raw.indexOf(key); return raw.slice(0, i) + EN[key] + raw.slice(i + key.length); }
  for (const [re, rep] of EN_RE) if (re.test(key)) { const at = raw.indexOf(key); return raw.slice(0, at) + key.replace(re, rep) + raw.slice(at + key.length); }
  return raw;
}
function translateDom(root) {
  if (!root || lang() !== 'en') return;
  const blocked = new Set();
  root.querySelectorAll('script, style, textarea, .f-amb, .f-d, .f-r, .no-tr').forEach((el) => { blocked.add(el); el.querySelectorAll('*').forEach((n) => blocked.add(n)); });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) { if (n.parentElement && blocked.has(n.parentElement)) continue; const next = tr(n.nodeValue); if (next !== n.nodeValue) n.nodeValue = next; }
  root.querySelectorAll('[placeholder], [aria-label], [title], [data-tip]').forEach((el) => {
    if (el.closest('script, style, .no-tr')) return;
    for (const attr of ['placeholder', 'aria-label', 'title']) { if (!el.hasAttribute(attr)) continue; const next = tr(el.getAttribute(attr)); if (next !== el.getAttribute(attr)) el.setAttribute(attr, next); }
  });
}
function localize() {
  if (lang() !== 'en') return;
  for (const id of ['top', 'view', 'palette', 'toast', 'tabbar']) { const el = document.getElementById(id); if (el) translateDom(el); }
}
