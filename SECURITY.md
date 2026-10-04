# Seguridad

Un plan de continuidad describe qué servicios son críticos, cuánto tiempo aguantan sin funcionar, qué proveedores los sostienen y quién decide en una crisis. Es información sensible. KAIROS está diseñado para que **ningún dato salga del navegador** y para que **cualquier fichero importado se trate como hostil**.

## Modelo de amenazas

| Vector | Ejemplo | Defensa |
|---|---|---|
| XSS almacenado | Un proyecto JSON con `"><img onerror=…>` en el nombre de una función o activo | Todo texto se escapa al pintar (`esc`). Los valores que acaban en clases o atributos pasan por listas blancas. El tooltip usa `textContent`. |
| Prototype pollution | Claves `__proto__`, `constructor` o `prototype` en el JSON importado o en rutas de edición | Se eliminan al parsear (`safeParse`). Las rutas de escritura se bloquean (`setPath`). `Object.prototype` y `Array.prototype` se congelan al arrancar. |
| Datos fuera de esquema | RTO `9e999`, nivel de impacto 99, estrategia inexistente, dependencias a activos que no existen | `sanitizeState` normaliza cada campo: tipos, rangos (horas entre 0 y 8.760, niveles de 0 a 4), enumeraciones, identificadores, integridad referencial y longitud de los textos. |
| Inyección de fórmulas | Un responsable llamado `=HYPERLINK("http://…")` que se exporta al plan de acción en CSV | Toda celda que empieza por `= + - @` (también tras espacios, NBSP o caracteres invisibles, y en sus variantes de ancho completo), tabulador o salto de línea se prefija con `'`. En Excel las celdas se escriben como texto. |
| HTML y Markdown en los documentos | Texto con `<script>`, una imagen remota (baliza) o `## falso` en el plan de continuidad | `<` y `>` se escapan; énfasis, enlaces, imágenes, saltos de línea y barras de tabla se neutralizan (`mdSafe`, `mdBlock`). |
| `localStorage` manipulado | Otra pestaña del mismo origen altera la configuración o los proyectos | El espacio de trabajo y los proyectos se revalidan en cada carga (`sanitizeWs`, `sanitizeState`). |
| Denegación de servicio | Un JSON de cientos de megas | Límite de 20 MB por fichero y de longitud por campo y por lista. |
| Ejecución de código inyectado | Un fallo de escapado que deje pasar `<img onerror=…>` | CSP por hashes generada en el build: solo se ejecutan los bloques que salen de `app/build.js`. Sin `'unsafe-inline'` ni `'unsafe-eval'` para código. |
| Exfiltración | Código inyectado que intenta enviar el plan fuera | `default-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'`. La versión autónoma no hace ninguna petición de red. |
| Cadena de suministro | Una copia alterada de la librería de Excel en el CDN | `dist/index.html` lleva la librería dentro, inerte hasta que se exporta. La versión para artefactos la pide a jsDelivr con integridad SRI (`sha384`). |
| Acceso al estado desde la página | Una extensión que lee `window` | El estado solo se expone en `window.__KAIROS__` cuando la URL lleva `?test` (pruebas automáticas). |

## Verificación automática

`tests/e2e_app.py` comprueba en cada pasada:

- la importación de un proyecto con XSS, claves `__proto__` y valores imposibles: no se ejecuta nada y `Object.prototype` sigue limpio;
- la neutralización de una fórmula en el CSV del plan de acción;
- el saneamiento de un `localStorage` manipulado al recargar;
- el rechazo de un fichero de más de 20 MB;
- que la CSP no registra ninguna violación en el uso normal y bloquea un script inyectado;
- que no se carga ningún script externo.

`tests/a11y_app.py` pasa axe-core (WCAG 2.2 A/AA) por todas las vistas en claro y oscuro, a 1440 y 390 px, y falla con una sola infracción.

## Privacidad

KAIROS no tiene servidor ni cuentas. Los proyectos, el perfil y los ajustes se guardan solo en el almacenamiento local del navegador, **sin cifrar**. Cualquier página del mismo origen puede leerlos: todos los HTML abiertos desde el disco (`file://`) y todos los proyectos publicados en `heindall92.github.io`. Con datos reales de una organización, usa el fichero descargado en un equipo y perfil de navegador propios, y borra los datos al terminar (*Ajustes → Borrar todos los datos*).

## Informar de una vulnerabilidad

Escribe a **yoandyramirezdelgado@gmail.com** con el asunto `KAIROS · seguridad`, una descripción y, si puedes, una prueba de concepto. No abras una incidencia pública hasta que esté corregida. Respuesta en un máximo de 7 días.
