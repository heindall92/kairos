#!/usr/bin/env bash
# Ejecuta todas las pruebas: construcción, motor (Node), app en navegador (Playwright) y accesibilidad (axe-core).
set -euo pipefail
cd "$(dirname "$0")"
echo "== Construcción de la app"; node app/build.js
echo "== Motor · node --test"; node --test tests/engine.test.js
echo "== App en navegador · Playwright"; python3 tests/e2e_app.py
echo "== Accesibilidad · axe-core (WCAG 2.2 AA)"; python3 tests/a11y_app.py
echo "== Todo en verde"
