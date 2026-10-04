"""Regenera las capturas del README (docs/img/readme/) con la app construida.

Uso:  python3 docs/capturas.py      (requiere playwright; usa dist/index.html)
Fecha fija para que los casos de ejemplo den siempre el mismo resultado y espera a que termine la animación del Reloj.
"""
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = (ROOT / "dist" / "index.html").as_uri() + "?test"
OUT = ROOT / "docs" / "img" / "readme"
OUT.mkdir(parents=True, exist_ok=True)
K = "window.__KAIROS__"

TOMAS = [  # (fichero, vista, preparación, ancho, alto, esquema)
    ("inicio", "inicio", None, 1440, 860, "light"),
    ("panel", "panel", None, 1440, 1180, "light"),
    ("panel-dark", "panel", None, 1440, 1180, "dark"),
    ("funciones", "funciones", "F-01", 1440, 1500, "light"),
    ("dependencias", "dependencias", None, 1440, 1000, "light"),
    ("recuperacion", "recuperacion", None, 1440, 900, "light"),
    ("crisis", "crisis", None, 1440, 1000, "light"),
    ("preauditoria", "preauditoria", None, 1440, 1000, "light"),
    ("movil", "panel", None, 390, 844, "dark"),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, vista, abrir, w, h, esquema in TOMAS:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if w < 600 else 1, color_scheme=esquema)
        page = ctx.new_page(); page.clock.set_fixed_time("2026-10-02T10:00:00")
        page.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
        page.goto(APP); page.wait_for_selector("#view h1")
        page.evaluate(f"{K}.ws.profile.nombre = 'Yoandy Ramírez Delgado'; {K}.ws.profile.rol = 'Consultor/a GRC'; {K}.ws.onboarded = true; {K}.openCase('techserv')")
        page.evaluate(f"{K}.go('{vista}')")
        if abrir:
            page.click(f'[data-act="f-toggle"][data-id="{abrir}"]')
        page.evaluate("document.getElementById('toast').hidden = true")
        page.mouse.move(w - 5, h - 5); page.wait_for_timeout(1900)
        page.screenshot(path=str(OUT / f"{nombre}.png"))
        ctx.close()
        print("✓", nombre)
    b.close()
