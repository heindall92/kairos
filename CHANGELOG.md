# Cambios

## 1.1.0 · octubre de 2026

**Ecosistema con CTEM-Nexus** (sobre común `yrd-ecosistema`, versión 1).
- **Exportar el BIA:** Exportar → Ecosistema → *BIA para CTEM-Nexus* descarga un sobre `bia` con cada activo, las funciones que lo usan y sus objetivos (RTO, RPO, MTPD, coste por hora y criticidad). CTEM-Nexus lo usa para fijar la criticidad de negocio.
- **Importar la exposición:** el sobre `activos` de CTEM-Nexus trae por activo los hallazgos abiertos, críticos y explotados (KEV), las rutas de ataque, el peor hallazgo y el riesgo de interrupción. Se valida y se sanea; un sobre de otra herramienta se rechaza. «Importar un proyecto» también lo reconoce y no sustituye el proyecto abierto.
- **Recuperación:** los activos expuestos llevan la etiqueta «Exposición alta» o «media» y su ficha enseña el detalle técnico.
- **Regla CTM-01** (NC menor, ISO 22301 § 8.2.3 · ENS op.cont.1 · op.exp.4): activo de una función crítica con riesgo de interrupción alto. Ya son 29 reglas.
- **Herramientas GRC del autor:** el bloque de Acerca de pasa a siete herramientas (se suman CTEM-Nexus, ENS AD Auditor y Norvik) y explica que comparten formato de intercambio.
- **Pruebas:** 3 del motor (18) y 13 de extremo a extremo (102). axe sigue con 0 infracciones, ahora también con la exposición importada.

## 1.0.1 · octubre de 2026

- **Herramientas GRC del autor:** Ayuda → Acerca de muestra tarjetas para abrir ARGOS, Rosetta y ENS Compliance Studio o ver su código; KAIROS figura como «Estás aquí».
- **Perfil:** los seis colores del avatar no se veían. El estilo de los círculos usaba `all: unset` y borraba el fondo que pone cada color; ahora se ven en claro y en oscuro.
- **Pruebas:** 6 comprobaciones nuevas de extremo a extremo (89 en total). Verifican que los colores del avatar y del acento se ven y son distintos, que el color del avatar cambia también el acento y que las tarjetas de herramientas enlazan bien.

## 1.0.0 · octubre de 2026

Primera versión, construida a partir de la plantilla formativa de BIA y BCP del módulo de GRC del máster.

**Cálculo.** Lo que la plantilla solo recoge, KAIROS lo calcula:
- **Ruta crítica de recuperación.** Cada activo empieza cuando terminan aquellos de los que depende. Cada función vuelve cuando terminan sus activos, las funciones de las que depende y el plazo de sus proveedores. De ahí salen el RTO alcanzable, quién marca el ritmo y la exposición económica por incidente.
- **MTPD desde la matriz.** Se calcula a partir de la matriz de impacto: 5 horizontes × 4 dimensiones, sin que el impacto pueda bajar con el tiempo. La criticidad sale de la misma matriz.
- **RPO alcanzable.** Solo cuentan los activos que guardan datos de la función; la frecuencia 0 equivale a réplica síncrona.
- **Preauditoría y estado ENS.** 28 reglas de ISO 22301, ISO/IEC 27001 y ENS, y estado de op.cont.1 a op.cont.4 según la categoría.

**Interfaz.**
- Navegación por fases (Analizar · Planificar · Verificar) y Reloj de recuperación.
- Cápsula de pestañas en móvil.
- Tema claro y oscuro, español e inglés.

**Entregables.**
- Plan de continuidad e informe de preauditoría en Markdown.
- Libro Excel de 7 hojas, plan de acción en CSV y proyecto en JSON.

**Seguridad.**
- Un único HTML autocontenido con CSP por hashes y ninguna petición de red.
- Validación por esquema de todo lo que entra y defensa ante prototype pollution, XSS e inyección de fórmulas.

**Calidad.**
- 15 pruebas del motor y 83 comprobaciones de extremo a extremo.
- axe-core sin infracciones en claro y oscuro, a 1440 y 390 px.
