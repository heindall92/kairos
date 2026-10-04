"""Accesibilidad con axe-core (WCAG 2.2 A/AA) en todas las vistas, tema claro y oscuro, escritorio y móvil.

Uso:  python3 tests/a11y_app.py     (falla si hay alguna infracción; detalle en tests/artifacts/a11y.json)
axe-core se inyecta con la CSP desactivada solo en este contexto de prueba; la CSP se prueba en e2e_app.py.
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = (ROOT / "dist" / "index.html").as_uri() + "?test"
AXE = ROOT / "tests" / "vendor" / "axe.min.js"
OUT = ROOT / "tests" / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

GLOBAL = ["inicio", "nuevo", "perfil", "ajustes", "ayuda"]
PROJECT = ["panel", "funciones", "dependencias", "recuperacion", "copias", "crisis", "pruebas", "preauditoria", "exportar"]


def states(page):
    """Recorre las vistas y los estados que cambian el DOM: pestañas, filas desplegadas, asistente, menús y buscador."""
    J = page.evaluate
    for v in GLOBAL:
        J(f"window.__KAIROS__.go('{v}')"); yield v
    for t in ["metodo", "glosario", "reglas", "atajos", "faq", "acerca"]:
        J("window.__KAIROS__.go('ayuda')"); page.click(f'[data-act="help-tab"][data-tab="{t}"]'); yield f"ayuda/{t}"
    J("window.__KAIROS__.go('nuevo')")
    page.fill("#wz-org", "Org"); page.fill("#wz-sis", "Sistema")
    for _ in range(2):
        page.click('#view [data-act="wz-next"]'); yield "asistente/siguiente"
    for c in ["techserv", "hospital", "ayuntamiento"]:
        J(f"window.__KAIROS__.openCase('{c}')")
        for v in PROJECT:
            J(f"window.__KAIROS__.go('{v}')"); yield f"{c}/{v}"
    J("window.__KAIROS__.openCase('techserv')")
    J("window.__KAIROS__.go('funciones')"); page.click('[data-act="f-toggle"][data-id="F-01"]'); yield "funciones/F-01"
    J("window.__KAIROS__.go('recuperacion')"); page.click('[data-act="a-toggle"][data-id="A-04"]'); yield "recuperacion/A-04"
    J("window.__KAIROS__.go('pruebas')"); page.locator('[data-act="t-toggle"]').first.click(); yield "pruebas/abierta"
    J("window.__KAIROS__.go('preauditoria')")
    for t in ["checklist", "revision"]:
        page.click(f'[data-act="pre-tab"][data-tab="{t}"]'); yield f"preauditoria/{t}"
    page.click('[data-act="menu"][data-menu="cuenta"]'); yield "menu/cuenta"
    page.keyboard.press("Escape")
    page.click('[data-act="menu"][data-menu="proyectos"]'); yield "menu/proyectos"
    page.keyboard.press("Escape")
    page.keyboard.press("Control+k"); page.keyboard.type("F-0"); yield "buscador"
    page.keyboard.press("Escape")


def main():
    total, report = 0, []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for scheme in ["light", "dark"]:
            for w, h in [(1440, 900), (390, 844)]:
                ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme=scheme, bypass_csp=True, reduced_motion="reduce")
                page = ctx.new_page(); page.clock.set_fixed_time("2026-10-02T10:00:00")
                page.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
                page.goto(APP); page.wait_for_selector("#view h1")
                page.add_script_tag(path=str(AXE))
                for name in states(page):
                    page.wait_for_timeout(60)
                    res = page.evaluate("tags => axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] })", TAGS)
                    for v in res["violations"]:
                        n = len(v["nodes"]); total += n
                        report.append({"tema": scheme, "ancho": w, "estado": name, "regla": v["id"], "nodos": n,
                                       "ejemplo": v["nodes"][0]["target"], "detalle": v["nodes"][0].get("failureSummary", "")[:300]})
                ctx.close()
        b.close()
    (OUT / "a11y.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in report:
        print(f"  ✘ {r['tema']:5} {r['ancho']:4} {r['estado']:28} {r['regla']:24} {r['nodos']:3}  {r['ejemplo']}")
    print(f"\naxe-core: {total} nodos con infracciones en {len(report)} combinaciones")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
