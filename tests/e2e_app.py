"""Prueba end-to-end de KAIROS (Playwright + Chromium headless, sin red).

Cubre: primera ejecución y perfil, los tres casos de ejemplo, las nueve vistas del proyecto, navegación por fases,
recálculo en vivo por la cadena de dependencias, impacto y MTPD, copias y RPO, crisis, pruebas, preauditoría,
asistente de nuevo proyecto, exportaciones (Markdown, CSV, JSON y Excel), importación y copia de seguridad,
persistencia, buscador (Ctrl+K), atajos, idioma inglés, tema oscuro, móvil (390 px) y pruebas de ataque
(XSS, prototype pollution, inyección de fórmulas, CSP, localStorage manipulado, ficheros sobredimensionados).
Uso:  python3 tests/e2e_app.py      (deja capturas y ficheros en tests/artifacts/)
"""
import json
import pathlib
import sys
import zipfile

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "dist" / "index.html"
OUT = ROOT / "tests" / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)
checks = []


def ok(cond, msg):
    checks.append((bool(cond), msg))
    print(("  ✔ " if cond else "  ✘ ") + msg)


def offline(page):
    page.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())


VIEWS = ["panel", "funciones", "dependencias", "recuperacion", "copias", "crisis", "pruebas", "preauditoria", "exportar"]
XSS = '<img src=x onerror="window.__pwned=1">"><svg/onload=window.__pwned=1>'

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    ctx.add_init_script("window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI))")
    page = ctx.new_page(); offline(page)
    page.clock.set_fixed_time("2026-10-02T10:00:00")  # los casos tienen fechas: el resultado no debe depender del día
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "net::" not in m.text and "Content Security Policy" not in m.text else None)
    page.on("dialog", lambda d: (errors.append("dialog: " + d.message), d.dismiss()))
    page.goto(APP.as_uri() + "?test"); page.wait_for_selector("#view h1")
    J = lambda js: page.evaluate(js)
    K = "window.__KAIROS__"
    calc = lambda: J(f"{K}.calc")
    fx = lambda fid: J(f"{K}.calc.funciones.find(x => x.id === '{fid}')")

    def download(action):
        with page.expect_download() as d:
            action()
        dl = d.value; path = OUT / dl.suggested_filename; dl.save_as(path); return path

    def set_field(selector, value):
        loc = page.locator(selector).first; loc.fill(str(value)); loc.dispatch_event("change")

    print("Primera ejecución")
    ok(page.locator(".case-card").count() == 3, "Inicio muestra los 3 casos de ejemplo")
    ok(page.locator(".stage.hero .dial").count() == 1, "El inicio muestra el Reloj de recuperación del caso TechServ")
    ok(J("Object.isFrozen(Object.prototype) && Object.isFrozen(Array.prototype)"), "Object.prototype y Array.prototype congelados")
    ok(J("!!document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]')"), "La página declara su Content-Security-Policy")
    ok(page.locator("#top .phases").count() == 0, "Sin proyecto no hay fases en la cabecera")
    page.fill("#ob-nombre", "Yoandy Ramírez Delgado"); page.locator("#ob-nombre").blur()
    page.select_option("#ob-rol", "Consultor/a GRC"); page.click('[data-act="ob-save"]')
    ok(J(f"{K}.ws.profile.nombre") == "Yoandy Ramírez Delgado", "El perfil se guarda desde el inicio")
    page.screenshot(path=str(OUT / "01_inicio.png"))

    print("Caso TechServ y navegación por fases")
    page.click('[data-act="open-case"][data-case="techserv"]'); page.wait_for_selector(".stage .dial")
    k = calc()["kpi"]
    ok(k["funciones"] == 6 and k["cumplenRto"] == 3 and k["ncMayor"] == 14, f"KPI TechServ: 6 funciones, 3 a tiempo, 14 NC mayores ({k['funciones']}, {k['cumplenRto']}, {k['ncMayor']})")
    ok(page.locator(".dial .ring").count() == 6, "El Reloj dibuja un anillo por función con RTO")
    ok(page.locator(".dial .ring .d-late").count() == 3, "Tres anillos con tramo en rojo (funciones fuera del RTO)")
    ok(page.locator(".ring-legend li.bad").count() == 3, "La leyenda marca las tres funciones que llegan tarde")
    ok(page.locator(".demo-banner").count() == 1, "Aviso de caso de ejemplo")
    page.screenshot(path=str(OUT / "02_panel.png"))
    page.click('#top [data-act="phase"][data-phase="analizar"]')
    ok(J(f"{K}.calc") and page.locator("#view h1").inner_text() == "Funciones e impacto", "La fase Analizar abre Funciones e impacto")
    page.click('#top .subnav [data-view="dependencias"]')
    ok(page.locator("#view h1").inner_text() == "Dependencias", "La subnavegación abre Dependencias")
    page.click('#top [data-act="phase"][data-phase="planificar"]'); page.click('#top [data-act="phase"][data-phase="analizar"]')
    ok(page.locator("#view h1").inner_text() == "Dependencias", "Cada fase recuerda la última vista visitada")
    for v in VIEWS:
        J(f"{K}.go('{v}')"); page.wait_for_timeout(40)
        ok(page.locator("#view h1").count() == 1, f"Vista {v}")
        page.screenshot(path=str(OUT / f"03_{v}.png"))
    thumb = J("(() => { const t = document.querySelector('#top .phases .thumb'); const on = document.querySelector('#top .phases [aria-current=page]'); return [t.style.width, on.offsetWidth + 'px', getComputedStyle(t).opacity]; })()")
    ok(thumb[0] == thumb[1] and thumb[2] == "1", "La píldora del control segmentado se ajusta a la fase activa")

    print("Cálculo por la cadena de dependencias")
    ok(fx("F-01")["rtoAlcanzable"] == 25.75 and fx("F-01")["rtoCausa"]["id"] == "F-03", "F-01 vuelve a las 25,75 h y marca el ritmo F-03")
    J(f"{K}.go('recuperacion')"); page.click('[data-act="a-toggle"][data-id="A-07"]')
    i = J(f"{K}.state.activos.findIndex(a => a.id === 'A-07')")
    set_field(f'[data-set="activos.{i}.tiempoRecuperacion"]', 4)
    ok(fx("F-03")["rtoAlcanzable"] == 5.75 and fx("F-01")["rtoAlcanzable"] == 5.75, "Bajar A-07 a 4 h adelanta F-03 y, por dependencia, F-01 a 5,75 h")
    ok(calc()["kpi"]["exposicion"] == 30950, f"La exposición baja de 210.950 € a 30.950 € ({calc()['kpi']['exposicion']})")
    set_field(f'[data-set="activos.{i}.tiempoRecuperacion"]', 24)
    ok(fx("F-03")["rtoAlcanzable"] == 25.75, "Restaurar el valor devuelve el cálculo original")
    J(f"{K}.go('funciones')"); page.click('[data-act="f-toggle"][data-id="F-02"]')
    fi = J(f"{K}.state.funciones.findIndex(f => f.id === 'F-02')")
    page.select_option(f'[data-set="funciones.{fi}.impacto.h4.op"]', "4")
    ok(fx("F-02")["criticidad"] == "ALTA" and fx("F-02")["mtpdMatriz"] == 4, "Impacto crítico a 4 h: criticidad ALTA y MTPD de la matriz 4 h")
    ok(any(c["id"] == "BIA-03" and c["ambito"].startswith("F-02") for c in calc()["checks"]), "BIA-03 avisa de que el MTPD declarado supera el que admite el impacto")
    page.click('[data-act="reset-case"]'); page.wait_for_timeout(100)
    ok(fx("F-02")["mtpdMatriz"] != 4, "Restablecer devuelve el caso a su estado original")

    print("Copias, crisis y pruebas")
    J(f"{K}.go('copias')")
    i5 = J(f"{K}.state.activos.findIndex(a => a.id === 'A-05')")
    set_field(f'[data-set="activos.{i5}.backup.frecuenciaHoras"]', 0)
    ok(fx("F-02")["cumpleRpo"] is True, "Réplica síncrona (frecuencia 0) cumple el RPO 0 de Nóminas")
    J(f"{K}.go('crisis')")
    set_field('[data-set="bcp.activacion.umbralHoras"]', 1)
    ok(not any(c["id"] == "BCP-02" and c["sev"] == "NC mayor" for c in calc()["checks"]), "Umbral de activación por debajo del RTO crítico elimina la NC mayor BCP-02")
    ok(page.locator(".esc-line li").count() == 4, "Línea de escalado con cuatro pasos")
    J(f"{K}.go('pruebas')"); n0 = len(J(f"{K}.state.pruebas")); page.click('[data-act="add-prueba"]')
    ok(len(J(f"{K}.state.pruebas")) == n0 + 1 and page.locator(".row-card.open").count() == 1, "Registrar prueba añade una fila abierta")
    page.click('[data-act="reset-case"]')

    print("Preauditoría y plan de acción")
    J(f"{K}.go('preauditoria')")
    page.click('[data-act="sev-f"][data-sev="NC mayor"]')
    ok(page.locator(".finding").count() == 14, "Filtro de severidad: 14 NC mayores")
    first = page.locator('.finding [data-acc][data-f="responsable"]').first
    first.fill('=HYPERLINK("http://evil","x")'); first.dispatch_event("change")
    csv = download(lambda: (J(f"{K}.go('exportar')"), page.click('[data-act="export-acciones"]'))).read_text(encoding="utf-8-sig")
    ok("'=HYPERLINK" in csv and "\n=HYPERLINK" not in csv and ";=HYPERLINK" not in csv, "CSV del plan de acción neutraliza la inyección de fórmulas")
    J(f"{K}.go('preauditoria')")
    page.click('[data-act="pre-tab"][data-tab="checklist"]')
    ok(page.locator(".cl-list li").count() == 16, "Lista de comprobación de 16 puntos")
    page.click('[data-act="pre-tab"][data-tab="revision"]')
    ok(page.locator('[data-act="pre-tab"][data-tab="revision"][aria-selected="true"]').count() == 1, "Pestaña de revisión y aprobación")

    print("Exportaciones")
    J(f"{K}.go('exportar')")
    plan = download(lambda: page.click('[data-act="export-plan"]')).read_text(encoding="utf-8")
    ok(plan.startswith("# Plan de continuidad") and "## 3. Análisis de impacto (BIA)" in plan and "Yoandy Ramírez Delgado" in plan, "Plan de continuidad en Markdown con BIA y autor")
    inf = download(lambda: page.click('[data-act="export-informe"]')).read_text(encoding="utf-8")
    ok("NC mayor" in inf and "BCK-01" in inf, "Informe de preauditoría con incidencias y reglas")
    pj = json.loads(download(lambda: page.click('[data-act="export-json"]')).read_text(encoding="utf-8"))
    ok(len(pj["funciones"]) == 6 and len(pj["activos"]) == 9, "Proyecto JSON completo (6 funciones, 9 activos)")
    xl = download(lambda: page.click('[data-act="export-xlsx"]'))
    with zipfile.ZipFile(xl) as z:
        sheets = [n for n in z.namelist() if n.startswith("xl/worksheets/sheet")]
        wb = z.read("xl/workbook.xml").decode("utf-8")
    ok(len(sheets) == 7 and "Recuperación" in wb, f"Libro Excel generado sin red con 7 hojas ({len(sheets)})")

    print("Asistente de nuevo proyecto")
    J(f"{K}.go('nuevo')")
    page.click('[data-act="wz-next"]')
    ok(page.locator(".alert.crit").count() == 1, "El asistente exige organización y sistema")
    page.fill("#wz-org", XSS); page.fill("#wz-sis", "Registro y padrón"); page.select_option("#wz-cat", "ALTA")
    page.click('[data-act="wz-next"]')
    page.fill("#wz-f0-n", "Registro electrónico"); page.fill("#wz-f1-n", "Padrón")
    set_field("#wz-f1-rto", 100)
    page.click('[data-act="wz-next"]')
    ok("menor que su MTPD" in page.locator(".alert.crit").inner_text(), "El asistente rechaza un RTO mayor que el MTPD")
    set_field("#wz-f1-rto", 24); page.click('[data-act="wz-next"]')
    ok(page.locator(".ens-line").count() == 4, "Resumen con las cuatro medidas op.cont")
    page.click('[data-act="wz-create"]'); page.wait_for_selector(".row-list")
    ok(page.locator("#view h1").inner_text() == "Funciones e impacto", "Al crear el proyecto se abre Funciones e impacto para valorar el impacto")
    st = J(f"{K}.state")
    ok(st["meta"]["categoria"] == "ALTA" and len(st["funciones"]) == 2, "Proyecto creado con categoría ALTA y dos funciones")
    ok(J("window.__pwned") is None and page.locator("#view img, #top img").count() == 0, "El nombre con XSS se muestra como texto, sin ejecutar nada")

    print("Persistencia, importación y copia de seguridad")
    own_id = J(f"{K}.ws.activeId")
    page.reload(); page.wait_for_selector("#view h1")
    ok(J(f"{K}.ws.activeId") == own_id and J(f"{K}.state.meta.sistema") == "Registro y padrón", "El proyecto propio sobrevive a la recarga")
    evil = {"meta": {"nombre": "Importado", "organizacion": "Org", "categoria": "MEDIA", "__proto__": {"polluted": 1}},
            "__proto__": {"polluted": 1}, "constructor": {"prototype": {"polluted": 1}},
            "funciones": [{"id": "F-01", "nombre": "<script>window.__pwned=1</script>", "rto": "9e999", "rpo": -5, "mtpd": 48,
                           "impacto": {"h1": {"op": 99}}, "dependencias": {"activos": ["A-99"], "funciones": [], "proveedores": []}}],
            "activos": [{"id": "A-01", "nombre": "x" * 5000, "estrategia": "rm -rf", "dependeDe": ["A-01"]}]}
    f = OUT / "evil.json"; f.write_text(json.dumps(evil), encoding="utf-8")
    with page.expect_file_chooser() as fc:
        J(f"{K}.go('exportar')"); page.click('#view [data-act="import-json"]')
    fc.value.set_files(str(f)); page.wait_for_timeout(300)
    st = J(f"{K}.state")
    ok(st["meta"]["nombre"] == "Importado", "Se importa un proyecto JSON")
    ok(J("({}).polluted === undefined && Object.prototype.polluted === undefined"), "La importación no contamina Object.prototype")
    ok(st["funciones"][0]["rto"] is None and st["funciones"][0]["impacto"]["h1"]["op"] <= 4, "Valores imposibles saneados (RTO infinito, nivel 99)")
    ok(len(st["activos"][0]["nombre"]) <= 200 and st["activos"][0]["estrategia"] in ["hot", "warm", "cloud", "cold", "ninguna"], "Textos truncados y enumerados validados")
    ok(J("window.__pwned") is None, "El HTML importado no se ejecuta")
    big = OUT / "big.json"; big.write_text("[" + "0," * (11 * 1024 * 1024) + "0]", encoding="utf-8")
    with page.expect_file_chooser() as fc:
        J(f"{K}.go('exportar')"); page.click('#view [data-act="import-json"]')
    fc.value.set_files(str(big)); page.wait_for_timeout(300)
    ok("demasiado grande" in page.locator("#toast").inner_text() or J(f"{K}.state.meta.nombre") == "Importado", "Ficheros sobredimensionados se rechazan sin romper la app")
    bk = download(lambda: (J(f"{K}.go('ajustes')"), page.click('[data-act="backup"]')))
    ok(len(json.loads(bk.read_text(encoding="utf-8"))["proyectos"]) >= 3, "Copia de seguridad con todos los proyectos")

    print("Datos manipulados en localStorage")
    J("localStorage.setItem('kairos/v1/ws', JSON.stringify({profile: {nombre: '<img src=x onerror=window.__pwned=1>'}, settings: {tema: 'x', acento: 'javascript:'}, projects: [{id: '__proto__'}], activeId: '__proto__'}))")
    page.reload(); page.wait_for_selector("#view h1")
    ok(J("window.__pwned") is None and J("document.documentElement.getAttribute('data-accent')") in ["green", "blue", "teal", "amber", "rose", "graphite"], "Un localStorage manipulado se sanea al arrancar")
    J("localStorage.clear()"); page.reload(); page.wait_for_selector("#view h1"); J(f"{K}.go('inicio')")

    print("Buscador, atajos, menús")
    page.click('[data-act="open-case"][data-case="hospital"]'); page.wait_for_selector(".stage")
    page.keyboard.press("Control+k"); page.keyboard.type("laboratorio")
    ok(page.locator(".pal-item").count() >= 1, "El buscador encuentra funciones y activos")
    page.keyboard.press("Enter"); page.wait_for_timeout(80)
    ok(page.locator("#view h1").inner_text() in ["Funciones e impacto", "Recuperación"], "Enter abre el resultado")
    page.locator("body").click(position={"x": 5, "y": 300}); page.keyboard.press("g"); page.keyboard.press("a")
    ok(page.locator("#view h1").inner_text() == "Preauditoría", "Atajo G A abre la preauditoría")
    page.click('[data-act="menu"][data-menu="proyectos"]')
    ok(page.locator(".menu .menu-item").count() >= 3 and J("document.getElementById('main').inert"), "Menú de proyectos con el resto de la página inerte")
    page.keyboard.press("Escape")
    ok(page.locator(".menu").count() == 0 and J("document.activeElement.dataset.menu") == "proyectos", "Esc cierra el menú y devuelve el foco a su botón")

    print("Inglés y tema oscuro")
    page.click('[data-act="set"][data-k="idioma"][data-v="en"]')
    J(f"{K}.go('panel')")
    ok(page.locator("#view h1").inner_text() == "Continuity dashboard" and J("document.documentElement.lang") == "en", "Interfaz en inglés")
    ok("are back on time" in page.locator(".stage h2").inner_text(), "Los textos con cifras también se traducen")
    J(f"{K}.go('preauditoria')")
    ok("Major NC" in page.locator("#view").inner_text(), "Severidades traducidas en la preauditoría")
    page.screenshot(path=str(OUT / "04_en.png"))
    page.click('[data-act="set"][data-k="idioma"][data-v="es"]')
    page.click('#top [data-act="cycle-theme"]'); page.click('#top [data-act="cycle-theme"]')
    J(f"{K}.go('panel')")
    ok(J("document.documentElement.getAttribute('data-theme')") in ["dark", "light"], "El tema cambia desde la cabecera")
    page.screenshot(path=str(OUT / "05_tema.png"))

    print("Colores del perfil y de acento")
    J(f"{K}.go('perfil')")
    fondos = J("[...document.querySelectorAll('#view .swatch')].map(e => getComputedStyle(e).backgroundColor)")
    ok(len(fondos) == 6 and len(set(fondos)) == 6 and "rgba(0, 0, 0, 0)" not in fondos, f"Perfil: los 6 colores del avatar se ven y son distintos ({fondos})")
    page.click('#view .swatch[data-c="teal"]')
    ok(J("document.documentElement.getAttribute('data-accent')") == "teal" and J(f"{K}.ws.profile.color") == "teal", "Elegir un color de avatar cambia también el acento de la interfaz")
    J(f"{K}.go('ajustes')")
    acentos = J("[...document.querySelectorAll('#view .swatch')].map(e => getComputedStyle(e).backgroundColor)")
    ok(len(acentos) == 6 and len(set(acentos)) == 6 and "rgba(0, 0, 0, 0)" not in acentos, "Ajustes: los 6 colores de acento se ven y son distintos")
    page.click('#view .swatch[data-v="green"]')

    print("Herramientas GRC del autor")
    J(f"{K}.go('ayuda')"); page.click('[data-act="help-tab"][data-tab="acerca"]')
    ok(page.locator(".suite-card").count() == 4, "Acerca de: cuatro tarjetas (ARGOS, Rosetta, ENS Compliance Studio y KAIROS)")
    ok("KAIROS" in page.locator(".suite-card.here").inner_text() and page.locator(".suite-card.here a").count() == 1, "KAIROS aparece como «Estás aquí» y solo enlaza a su código")
    suite = J("[...document.querySelectorAll('.suite a')].map(a => [a.href, a.target, a.rel])")
    hosts = ["heindall92.github.io/argos-grc", "github.com/heindall92/argos-grc", "heindall92.github.io/rosetta_multinorma", "github.com/heindall92/rosetta_multinorma", "heindall92.github.io/grc_ens_compliance_studio", "github.com/heindall92/grc_ens_compliance_studio", "github.com/heindall92/kairos"]
    ok(all(any(h in u for u, _, _ in suite) for h in hosts) and all(t == "_blank" and "noopener" in r for _, t, r in suite), "Enlaces a las apps y repositorios, en pestaña nueva con noopener")

    print("Seguridad del documento")
    ok(J("window.__csp.length") == 0, f"Sin infracciones de la CSP durante toda la sesión ({J('window.__csp')})")
    J("try { const s = document.createElement('script'); s.textContent = 'window.__inj = 1'; document.body.appendChild(s); } catch (e) {}")
    page.wait_for_timeout(50)
    ok(J("window.__inj") is None, "La CSP bloquea scripts inyectados en línea")
    ok(J("[...document.querySelectorAll('script[src]')].length") == 0, "Ningún script externo en la versión autónoma")

    print("Móvil (390 px)")
    m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    mp = m.new_page(); offline(mp); mp.clock.set_fixed_time("2026-10-02T10:00:00")
    mp.goto(APP.as_uri() + "?test"); mp.wait_for_selector("#view h1")
    mp.evaluate(f"{K}.openCase('techserv')"); mp.wait_for_selector(".stage")
    ok(mp.locator("#tabbar button").count() == 5 and mp.locator("#tabbar").is_visible(), "Cápsula de pestañas con 5 destinos")
    ok(not mp.locator("#top .phases").is_visible(), "En móvil las fases pasan a la cápsula inferior")
    for v in VIEWS:
        mp.evaluate(f"{K}.go('{v}')"); mp.wait_for_timeout(30)
        over = mp.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        ok(over <= 0, f"{v}: sin desplazamiento horizontal en 390 px ({over})")
    mp.locator('#tabbar [data-phase="verificar"]').tap()
    ok(mp.locator("#view h1").inner_text() in ["Pruebas", "Preauditoría", "Exportar"], "La cápsula abre la fase Verificar")
    mp.screenshot(path=str(OUT / "06_movil.png"))
    m.close()

    ok(not errors, f"Sin errores de JavaScript ni diálogos ({errors[:3]})")
    b.close()

failed = [m for c, m in checks if not c]
print(f"\n{len(checks) - len(failed)}/{len(checks)} comprobaciones superadas")
sys.exit(1 if failed else 0)
