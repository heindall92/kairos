/* Casos de ejemplo (datos ficticios con fines formativos).
 * El impacto se escribe compacto: para cada horizonte (1 h, 4 h, 24 h, 72 h, 7 días) los niveles 0–4 de
 * [operativo, legal, reputación, personas]. build.js lo expande al formato del proyecto. */
'use strict';

const techserv = {
  id: 'techserv', icono: 'server', sector: 'Proveedor TIC de la Administración', titulo: 'TechServ Administración',
  resumen: 'El caso de clase: proveedor TIC de categoría ALTA con sede electrónica, nóminas y expedientes de tres consejerías. El plan existe y tiene sitio alternativo, pero los tiempos no encajan entre sí.',
  retos: ['El plan se activa cuando el RTO ya ha vencido', 'RPO de nóminas imposible con la copia actual', 'La sede depende de un sistema en cold standby'],
  meta: { nombre: 'TechServ · PSTA', organizacion: 'TechServ Administración, S.L. (ficticia)', sistema: 'PSTA – Plataforma de Servicios TIC para la Administración Autonómica', categoria: 'ALTA',
    responsable: 'Responsable de continuidad (BCM Manager)', alcance: 'Servicios prestados a tres consejerías desde el CPD principal de Valladolid: sede electrónica, gestión de expedientes, nóminas, acceso remoto y correo.' },
  funciones: [
    { id: 'F-01', nombre: 'Sede electrónica', descripcion: 'Registro electrónico, trámites y notificaciones a la ciudadanía.', responsable: 'Jefa de Servicios Digitales', rto: 2, rpo: 1, mtpd: 8, costeHora: 6000,
      imp: [[2, 2, 2, 0], [3, 3, 3, 1], [4, 4, 3, 1], [4, 4, 4, 2], [4, 4, 4, 2]], manual: 'Registro presencial en las oficinas de asistencia en materia de registro.',
      dep: { activos: ['A-03', 'A-04'], funciones: ['F-03'], proveedores: ['P-01'] } },
    { id: 'F-02', nombre: 'Nóminas', descripcion: 'Cálculo y pago de la nómina de 4.200 empleados públicos.', responsable: 'Responsable de RR. HH.', rto: 8, rpo: 0, mtpd: 72, costeHora: 1500,
      imp: [[1, 0, 0, 0], [1, 1, 1, 0], [2, 2, 2, 1], [3, 4, 3, 2], [4, 4, 4, 3]], manual: 'Pago por transferencia con la nómina del mes anterior y regularización posterior.',
      dep: { activos: ['A-06'], funciones: [], proveedores: [] } },
    { id: 'F-03', nombre: 'Gestión de expedientes', descripcion: 'Tramitación interna de expedientes administrativos.', responsable: 'Jefe de Área de Tramitación', rto: 4, rpo: 1, mtpd: 24, costeHora: 3000,
      imp: [[1, 1, 0, 0], [2, 2, 1, 0], [3, 4, 2, 0], [4, 4, 3, 1], [4, 4, 4, 1]], manual: '',
      dep: { activos: ['A-04', 'A-07'], funciones: [], proveedores: [] } },
    { id: 'F-04', nombre: 'Acceso remoto (VPN)', descripcion: 'Teletrabajo y administración remota de sistemas.', responsable: 'Responsable de Sistemas', rto: 4, rpo: 24, mtpd: 48, costeHora: 800,
      imp: [[1, 0, 0, 0], [2, 0, 1, 0], [3, 1, 1, 0], [3, 2, 2, 0], [4, 2, 2, 0]], manual: 'Trabajo presencial en sede.',
      dep: { activos: ['A-08'], funciones: [], proveedores: ['P-02'] } },
    { id: 'F-05', nombre: 'Correo electrónico', descripcion: 'Correo corporativo y calendario.', responsable: 'Responsable de Sistemas', rto: 24, rpo: 24, mtpd: 72, costeHora: 400,
      imp: [[1, 0, 0, 0], [1, 0, 1, 0], [2, 1, 2, 0], [3, 2, 2, 0], [3, 2, 3, 0]], manual: 'Telefonía y mensajería del comité de crisis.',
      dep: { activos: ['A-09'], funciones: [], proveedores: ['P-03'] } },
    { id: 'F-06', nombre: 'Centro de atención a usuarios', descripcion: 'Soporte de primer nivel a las consejerías.', responsable: 'Coordinadora del CAU', rto: 48, rpo: 24, mtpd: 168, costeHora: 150,
      imp: [[0, 0, 0, 0], [1, 0, 0, 0], [1, 0, 1, 0], [2, 0, 1, 0], [2, 1, 2, 0]], manual: 'Atención telefónica con registro en papel.',
      dep: { activos: [], funciones: ['F-05'], proveedores: [] } }
  ],
  activos: [
    { id: 'A-01', datos: false, nombre: 'Active Directory y DNS', tipo: 'Identidad', estrategia: 'hot', tiempoRecuperacion: 1, dependeDe: ['A-02'], ubicacion: 'DC01 (CPD principal) y DC02 (sitio alternativo)', responsable: 'Responsable de Sistemas',
      procedimiento: { pasos: '1. Comprobar el controlador réplica (ping dc02).\n2. Confirmar la replicación (repadmin /showrepl).\n3. Si DC01 no responde, transferir los roles FSMO a DC02.\n4. Actualizar el DNS primario de los clientes si hace falta.\n5. Probar el inicio de sesión con un usuario estándar y uno privilegiado.', exito: 'Inicio de sesión correcto de cinco usuarios de prueba en tres segmentos de red; el DNS resuelve techserv.local.', credenciales: 'Bóveda: «AD-DR / cuentas de emergencia»' },
      backup: { aplica: true, tipo: 'Estado del sistema', frecuenciaHoras: 24, retencionDias: 30, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-09-10', resultado: 'OK' } },
    { id: 'A-02', datos: false, nombre: 'Red troncal y cortafuegos', tipo: 'Red', estrategia: 'hot', tiempoRecuperacion: 0.25, dependeDe: [], ubicacion: 'Par activo-pasivo en ambos CPD', responsable: 'Responsable de Comunicaciones',
      procedimiento: { pasos: '1. Verificar la conmutación del par activo-pasivo.\n2. Comprobar la VPN entre sedes.\n3. Revisar la tabla de rutas del ISP de respaldo.', exito: 'Tráfico de la sede electrónica fluye por el nodo superviviente.', credenciales: 'Bóveda: «Red / consolas»' },
      backup: { aplica: true, tipo: 'Configuración', frecuenciaHoras: 24, retencionDias: 90, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-06-01', resultado: 'OK' } },
    { id: 'A-03', datos: false, nombre: 'Servidores web de la sede', tipo: 'Servidor', estrategia: 'hot', tiempoRecuperacion: 0.5, dependeDe: ['A-01', 'A-02'], ubicacion: 'Clúster VMware con réplica en el sitio alternativo', responsable: 'Responsable de Sistemas',
      procedimiento: { pasos: '1. Activar las máquinas réplica en el sitio alternativo.\n2. Cambiar el registro DNS público.\n3. Comprobar el certificado y el acceso con Cl@ve.', exito: 'Un trámite completo de prueba se registra con justificante.', credenciales: 'Bóveda: «vCenter DR»' },
      backup: { aplica: true, tipo: 'Réplica de máquinas', frecuenciaHoras: 1, retencionDias: 14, offsite: true, cifrado: true, inmutable: true, ultimaRestauracion: '2026-09-18', resultado: 'OK' } },
    { id: 'A-04', datos: true, nombre: 'Base de datos de expedientes', tipo: 'Base de datos', estrategia: 'warm', tiempoRecuperacion: 1.5, dependeDe: ['A-02'], ubicacion: 'PostgreSQL con réplica en streaming', responsable: 'Administrador de bases de datos',
      procedimiento: { pasos: '1. Promover la réplica (pg_ctl promote).\n2. Apuntar las aplicaciones al nuevo primario.\n3. Verificar los últimos registros.', exito: 'Consulta de los expedientes registrados la última hora.', credenciales: 'Bóveda: «PostgreSQL / postgres»' },
      backup: { aplica: true, tipo: 'Completa diaria + WAL', frecuenciaHoras: 1, retencionDias: 35, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-09-02', resultado: 'OK' } },
    { id: 'A-05', datos: true, nombre: 'Base de datos de nóminas', tipo: 'Base de datos', estrategia: 'warm', tiempoRecuperacion: 4, dependeDe: ['A-01'], ubicacion: 'SQL Server en espera en el sitio alternativo', responsable: 'Administrador de bases de datos',
      procedimiento: { pasos: '1. Identificar la última copia válida en \\\\backup-srv\\nominas.\n2. RESTORE DATABASE Nominas WITH NORECOVERY.\n3. Aplicar los registros de transacciones hasta el último disponible.\n4. DBCC CHECKDB(\'Nominas\').\n5. Actualizar la cadena de conexión del ERP.\n6. Generar una nómina de prueba del mes en curso.', exito: 'CHECKDB sin errores y nómina de prueba correcta.', credenciales: 'Bóveda: «SQL / sa-dr»' },
      backup: { aplica: true, tipo: 'Completa diaria + registro cada 30 min', frecuenciaHoras: 0.5, retencionDias: 90, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-09-25', resultado: 'OK' } },
    { id: 'A-06', datos: false, nombre: 'ERP de nóminas', tipo: 'Aplicación', estrategia: 'warm', tiempoRecuperacion: 2, dependeDe: ['A-05'], ubicacion: 'Servidor de aplicaciones en espera', responsable: 'Responsable de Aplicaciones',
      procedimiento: { pasos: '1. Arrancar el servidor de aplicaciones en espera.\n2. Actualizar web.config con la nueva base de datos.\n3. Validar el acceso de un usuario de RR. HH.', exito: 'Consulta de la nómina del mes anterior.', credenciales: '' },
      backup: { aplica: true, tipo: 'Imagen semanal', frecuenciaHoras: 168, retencionDias: 60, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-05-20', resultado: 'OK' } },
    { id: 'A-07', datos: true, nombre: 'Gestor documental', tipo: 'Aplicación', estrategia: 'cold', tiempoRecuperacion: 24, dependeDe: ['A-04'], ubicacion: 'Servidor único en el CPD principal', responsable: 'Responsable de Aplicaciones',
      procedimiento: { pasos: '', exito: '', credenciales: '' },
      backup: { aplica: true, tipo: 'Completa diaria', frecuenciaHoras: 24, retencionDias: 30, offsite: false, cifrado: false, inmutable: false, ultimaRestauracion: '', resultado: 'Pendiente' } },
    { id: 'A-08', datos: false, nombre: 'Concentrador VPN', tipo: 'Red', estrategia: 'warm', tiempoRecuperacion: 1, dependeDe: ['A-01', 'A-02'], ubicacion: 'Appliance en espera en el sitio alternativo', responsable: 'Responsable de Comunicaciones',
      procedimiento: { pasos: '1. Activar el appliance en espera.\n2. Cambiar el registro DNS de vpn.techserv.es.', exito: 'Conexión de un usuario con doble factor.', credenciales: 'Bóveda: «VPN / admin»' },
      backup: { aplica: true, tipo: 'Configuración', frecuenciaHoras: 24, retencionDias: 90, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-09-01', resultado: 'OK' } },
    { id: 'A-09', datos: true, nombre: 'Microsoft 365', tipo: 'Nube', estrategia: 'cloud', tiempoRecuperacion: 0, dependeDe: [], ubicacion: 'Servicio en la nube (UE)', responsable: 'Responsable de Sistemas',
      procedimiento: { pasos: 'Servicio gestionado por el proveedor. Seguir su panel de estado y activar el canal alternativo del comité.', exito: 'Envío y recepción de un correo externo.', credenciales: '' },
      backup: { aplica: true, tipo: 'Copia de terceros', frecuenciaHoras: 24, retencionDias: 365, offsite: true, cifrado: true, inmutable: true, ultimaRestauracion: '2026-08-14', resultado: 'OK' } }
  ],
  proveedores: [
    { id: 'P-01', nombre: 'Operador de fibra principal', servicio: 'Conectividad a Internet de la sede', contacto: 'NOC 24 h · 900 000 001', slaHoras: 4, contrato: 'C-2024-118', bcmVerificado: true },
    { id: 'P-02', nombre: 'Proveedor de doble factor', servicio: 'Autenticación MFA en la nube', contacto: 'soporte@mfa.example', slaHoras: 8, contrato: 'C-2025-031', bcmVerificado: false },
    { id: 'P-03', nombre: 'Microsoft', servicio: 'Microsoft 365', contacto: 'Portal de administración', slaHoras: 4, contrato: 'EA-2025', bcmVerificado: true }
  ],
  bcp: {
    equipo: [
      { rol: 'Responsable de crisis', titular: 'Director de Operaciones', suplente: 'Responsable de Seguridad', telefono: '600 000 101', responsabilidades: 'Activa el plan, decide y responde ante las consejerías.' },
      { rol: 'Responsable de recuperación técnica', titular: 'Responsable de Sistemas', suplente: '', telefono: '600 000 102', responsabilidades: 'Coordina el DRP y el sitio alternativo.' },
      { rol: 'Responsable de comunicación', titular: 'Responsable de Comunicación', suplente: 'Jefa de Atención al Cliente', telefono: '600 000 103', responsabilidades: 'Comunicados a las consejerías, a la ciudadanía y a los medios.' }
    ],
    activacion: { umbralHoras: 2, autorizado: 'Responsable de crisis o su suplente', escenarios: '1. Caída de la sede electrónica más de 2 h sin solución a la vista.\n2. Desastre físico en el CPD (incendio, inundación, corte eléctrico de más de 4 h).\n3. Fallo de un proveedor crítico sin plazo de resolución.\n4. Incidente de seguridad con impacto en la disponibilidad.' },
    comunicacion: { primario: 'Microsoft Teams (canal del comité)', secundario: 'Telefonía móvil y lista de contactos impresa', externo: 'Web corporativa y correo a las consejerías',
      plantilla: 'ASUNTO: [INCIDENTE] Servicios de TechServ — [FECHA] [HORA]\n\nSe ha detectado un incidente que afecta a [SERVICIOS].\nEstado: [EN INVESTIGACIÓN / EN RECUPERACIÓN / RESTABLECIDO PARCIALMENTE]\nVuelta estimada del servicio: [HORA]\nAlternativa disponible: [SÍ / NO — cuál]\nPróxima actualización: [HORA]\nUrgencias: [TELÉFONO]' },
    sitio: { tipo: 'warm', ubicacion: 'CPD secundario en Zaragoza (ficticio)', distanciaKm: 300, rtoActivacion: 4, capacidad: 'DR-01 VMware 32 núcleos / 256 GB; DR-02 SQL Server 16 núcleos / 128 GB; NAS 20 TB; cortafuegos en alta disponibilidad; fibra 1 Gbps y respaldo 4G.' }
  },
  pruebas: [
    { id: 'T-01', fecha: '2026-09-25', tipo: 'restauracion', funciones: ['F-02'], activos: ['A-05'], rtoReal: 3.5, rpoReal: 0.5, resultado: 'OK', gaps: 'Se perdió media hora de registros: la copia del registro de transacciones no es continua.', accion: '', responsable: 'Administrador de bases de datos' },
    { id: 'T-02', fecha: '2026-03-12', tipo: 'tabletop', funciones: ['F-01', 'F-03'], activos: [], rtoReal: null, rpoReal: null, resultado: 'Parcial', gaps: 'Nadie sabía quién redacta el comunicado a las consejerías.', accion: '', responsable: 'Responsable de continuidad' },
    { id: 'T-03', fecha: '2025-11-20', tipo: 'simulacro', funciones: [], activos: ['A-01', 'A-02'], rtoReal: 0.75, rpoReal: 0, resultado: 'OK', gaps: '', accion: '', responsable: 'Responsable de Sistemas' }
  ],
  revision: { version: '1.2', fecha: '2026-02-01', proxima: '2026-08-01', aprobadoPor: 'Comité de Dirección (acta 2026/02)', disparadores: 'Cambio de CPD, alta de un servicio crítico, incidente que active el plan, cambio normativo.',
    historial: [{ version: '1.0', fecha: '2025-01-15', motivo: 'Versión inicial', responsable: 'Responsable de continuidad', aprobado: 'Comité de Dirección' }, { version: '1.2', fecha: '2026-02-01', motivo: 'Nuevo sitio alternativo', responsable: 'Responsable de continuidad', aprobado: 'Comité de Dirección' }] }
};

const hospital = {
  id: 'hospital', icono: 'hospital', sector: 'Sanidad pública', titulo: 'Hospital Comarcal Sierra Norte',
  resumen: 'Hospital de 220 camas, categoría ALTA. La historia clínica y urgencias están bien protegidas; el laboratorio depende de un proveedor sin plazo acordado y las pruebas no miden el RPO.',
  retos: ['Proveedor del laboratorio sin plazo de restablecimiento', 'Farmacia sin procedimiento documentado', 'Pruebas sin RPO medido'],
  meta: { nombre: 'Hospital Sierra Norte', organizacion: 'Hospital Comarcal Sierra Norte (ficticio)', sistema: 'Sistemas de información clínica', categoria: 'ALTA', responsable: 'Subdirección de Sistemas de Información', alcance: 'Historia clínica, urgencias, imagen médica, laboratorio y farmacia.' },
  funciones: [
    { id: 'F-01', nombre: 'Historia clínica electrónica', descripcion: 'Consulta y registro de la historia clínica en planta, consultas y quirófano.', responsable: 'Dirección Médica', rto: 1, rpo: 0.25, mtpd: 4, costeHora: 9000,
      imp: [[3, 2, 2, 3], [4, 3, 3, 4], [4, 4, 4, 4], [4, 4, 4, 4], [4, 4, 4, 4]], manual: 'Hojas de evolución en papel y carpetas de contingencia por unidad.', dep: { activos: ['A-01', 'A-02'], funciones: [], proveedores: [] } },
    { id: 'F-02', nombre: 'Urgencias (triaje y admisión)', descripcion: 'Admisión, triaje Manchester y circuito de urgencias.', responsable: 'Jefatura de Urgencias', rto: 0.5, rpo: 0.25, mtpd: 2, costeHora: 7000,
      imp: [[4, 3, 3, 4], [4, 4, 4, 4], [4, 4, 4, 4], [4, 4, 4, 4], [4, 4, 4, 4]], manual: 'Admisión en papel con etiquetas preimpresas.', dep: { activos: ['A-01'], funciones: [], proveedores: [] } },
    { id: 'F-03', nombre: 'Imagen médica (PACS)', descripcion: 'Almacenamiento y visualización de radiología y TAC.', responsable: 'Jefatura de Radiología', rto: 4, rpo: 1, mtpd: 24, costeHora: 2500,
      imp: [[2, 1, 1, 2], [3, 2, 2, 3], [4, 3, 3, 4], [4, 4, 4, 4], [4, 4, 4, 4]], manual: 'Lectura en las consolas de las modalidades.', dep: { activos: ['A-03'], funciones: [], proveedores: [] } },
    { id: 'F-04', nombre: 'Laboratorio', descripcion: 'Peticiones y resultados de análisis clínicos.', responsable: 'Jefatura de Análisis Clínicos', rto: 2, rpo: 0.5, mtpd: 8, costeHora: 3000,
      imp: [[2, 1, 1, 2], [3, 2, 2, 3], [4, 3, 3, 4], [4, 4, 4, 4], [4, 4, 4, 4]], manual: 'Petición y entrega de resultados en papel.', dep: { activos: ['A-04'], funciones: ['F-01'], proveedores: ['P-01'] } },
    { id: 'F-05', nombre: 'Farmacia hospitalaria', descripcion: 'Validación y dispensación de tratamientos.', responsable: 'Jefatura de Farmacia', rto: 4, rpo: 1, mtpd: 24, costeHora: 1200,
      imp: [[1, 1, 0, 2], [2, 2, 1, 3], [3, 3, 2, 4], [4, 4, 3, 4], [4, 4, 4, 4]], manual: 'Dispensación con la última orden impresa.', dep: { activos: ['A-05'], funciones: ['F-01'], proveedores: [] } }
  ],
  activos: [
    { id: 'A-01', datos: true, nombre: 'Clúster de historia clínica', tipo: 'Base de datos', estrategia: 'hot', tiempoRecuperacion: 0.25, dependeDe: ['A-06'], ubicacion: 'Oracle RAC con Data Guard síncrono', responsable: 'Jefe de Sistemas',
      procedimiento: { pasos: '1. Comprobar el estado de Data Guard.\n2. Ejecutar switchover al nodo secundario.\n3. Validar el acceso desde una planta.', exito: 'Un médico abre y firma una nota de evolución.', credenciales: 'Bóveda: «HCE-DR»' },
      backup: { aplica: true, tipo: 'Réplica síncrona + completa diaria', frecuenciaHoras: 0, retencionDias: 90, offsite: true, cifrado: true, inmutable: true, ultimaRestauracion: '2026-09-21', resultado: 'OK' } },
    { id: 'A-02', datos: false, nombre: 'Estaciones clínicas virtualizadas', tipo: 'Puesto de trabajo', estrategia: 'hot', tiempoRecuperacion: 0.5, dependeDe: ['A-06'], ubicacion: 'VDI con dos sitios', responsable: 'Jefe de Sistemas',
      procedimiento: { pasos: '1. Redirigir el bróker de conexiones al sitio B.\n2. Comprobar el inicio de sesión con tarjeta.', exito: 'Inicio de sesión con tarjeta en tres plantas.', credenciales: '' },
      backup: { aplica: false } },
    { id: 'A-03', datos: true, nombre: 'PACS', tipo: 'Almacenamiento', estrategia: 'warm', tiempoRecuperacion: 3, dependeDe: ['A-06'], ubicacion: 'Cabina con réplica asíncrona', responsable: 'Técnico de Imagen',
      procedimiento: { pasos: '1. Montar la réplica.\n2. Reconfigurar el visor.\n3. Recuperar los estudios del día.', exito: 'Abrir un TAC del día en el visor diagnóstico.', credenciales: '' },
      backup: { aplica: true, tipo: 'Réplica asíncrona', frecuenciaHoras: 1, retencionDias: 3650, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-09-15', resultado: 'OK' } },
    { id: 'A-04', datos: true, nombre: 'Sistema del laboratorio', tipo: 'Aplicación', estrategia: 'cloud', tiempoRecuperacion: 2, dependeDe: ['A-06'], ubicacion: 'Servicio del proveedor', responsable: 'Jefatura de Análisis Clínicos',
      procedimiento: { pasos: 'Escalar al proveedor y activar el circuito en papel.', exito: 'Recepción de resultados en la historia clínica.', credenciales: '' },
      backup: { aplica: true, tipo: 'Gestionada por el proveedor', frecuenciaHoras: 0.5, retencionDias: 365, offsite: true, cifrado: true, inmutable: true, ultimaRestauracion: '2026-07-30', resultado: 'OK' } },
    { id: 'A-05', datos: true, nombre: 'Sistema de farmacia', tipo: 'Aplicación', estrategia: 'warm', tiempoRecuperacion: 2, dependeDe: ['A-06'], ubicacion: 'Servidor en espera', responsable: 'Jefe de Sistemas',
      procedimiento: { pasos: '', exito: '', credenciales: '' },
      backup: { aplica: true, tipo: 'Completa diaria + registro horario', frecuenciaHoras: 1, retencionDias: 60, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-09-15', resultado: 'OK' } },
    { id: 'A-06', datos: false, nombre: 'Red clínica', tipo: 'Red', estrategia: 'hot', tiempoRecuperacion: 0.1, dependeDe: [], ubicacion: 'Núcleo redundante', responsable: 'Responsable de Comunicaciones',
      procedimiento: { pasos: 'Conmutación automática del núcleo; comprobar los enlaces de planta.', exito: 'Ping a los servidores clínicos desde las cinco plantas.', credenciales: '' },
      backup: { aplica: true, tipo: 'Configuración', frecuenciaHoras: 24, retencionDias: 90, offsite: true, cifrado: true, inmutable: false, ultimaRestauracion: '2026-09-20', resultado: 'OK' } }
  ],
  proveedores: [{ id: 'P-01', nombre: 'Proveedor del laboratorio', servicio: 'Software del laboratorio en la nube', contacto: 'Centro de soporte 24 h', slaHoras: null, contrato: 'Concurso 2023/14', bcmVerificado: false }],
  bcp: {
    equipo: [
      { rol: 'Responsable de crisis', titular: 'Gerente', suplente: 'Director Médico', telefono: '600 000 201', responsabilidades: 'Activa el plan y coordina con el Servicio de Salud.' },
      { rol: 'Responsable de recuperación técnica', titular: 'Subdirector de Sistemas', suplente: 'Jefe de Sistemas', telefono: '600 000 202', responsabilidades: 'Dirige la recuperación de los sistemas clínicos.' },
      { rol: 'Responsable asistencial', titular: 'Directora de Enfermería', suplente: 'Supervisor de guardia', telefono: '600 000 203', responsabilidades: 'Activa los circuitos en papel en las unidades.' },
      { rol: 'Responsable de comunicación', titular: 'Gabinete de prensa', suplente: 'Atención al paciente', telefono: '600 000 204', responsabilidades: 'Pacientes, familiares y medios.' }
    ],
    activacion: { umbralHoras: 0.25, autorizado: 'Gerente o director médico de guardia', escenarios: '1. Caída de la historia clínica más de 15 minutos.\n2. Caída de urgencias.\n3. Ransomware en cualquier sistema clínico.' },
    comunicacion: { primario: 'Megafonía y mensajería interna', secundario: 'Walkie-talkies y teléfonos de emergencia analógicos', externo: 'Servicio de Salud y web del hospital', plantilla: '' },
    sitio: { tipo: 'hot', ubicacion: 'Sala técnica del edificio B', distanciaKm: 1, rtoActivacion: 0.25, capacidad: 'Segundo CPD con capacidad completa para los sistemas clínicos.' }
  },
  pruebas: [
    { id: 'T-01', fecha: '2026-09-21', tipo: 'failover', funciones: ['F-01', 'F-02'], activos: ['A-01', 'A-06'], rtoReal: 0.3, rpoReal: null, resultado: 'OK', gaps: '', accion: '', responsable: 'Subdirector de Sistemas' },
    { id: 'T-02', fecha: '2026-06-10', tipo: 'tabletop', funciones: ['F-04', 'F-05'], activos: [], rtoReal: null, rpoReal: null, resultado: 'Parcial', gaps: 'El circuito en papel de farmacia no estaba actualizado.', accion: 'Actualizar el circuito y formar a los supervisores antes de diciembre.', responsable: 'Jefatura de Farmacia' }
  ],
  revision: { version: '3.0', fecha: '2026-06-30', proxima: '2027-06-30', aprobadoPor: 'Comisión de Dirección', disparadores: 'Cambio de sistema clínico, obras en el CPD, incidente grave.', historial: [{ version: '3.0', fecha: '2026-06-30', motivo: 'Revisión anual', responsable: 'Subdirección de Sistemas', aprobado: 'Comisión de Dirección' }] }
};

const ayuntamiento = {
  id: 'ayuntamiento', icono: 'landmark', sector: 'Administración local', titulo: 'Ayuntamiento de Valdemora',
  resumen: 'Municipio de 38.000 habitantes, categoría MEDIA. Tiene BIA pero no plan de continuidad: sin equipo de crisis, sin pruebas y con las copias en la misma sala que los servidores.',
  retos: ['Sin equipo de crisis', 'Copias en el mismo CPD y sin cifrar', 'Ninguna prueba registrada'],
  meta: { nombre: 'Ayuntamiento de Valdemora', organizacion: 'Ayuntamiento de Valdemora (ficticio)', sistema: 'Administración electrónica municipal', categoria: 'MEDIA', responsable: 'Secretaría General', alcance: 'Sede electrónica, padrón, registro y tributos.' },
  funciones: [
    { id: 'F-01', nombre: 'Sede electrónica y registro', descripcion: 'Registro de entrada y trámites en línea.', responsable: 'Secretaría General', rto: 8, rpo: 4, mtpd: 48, costeHora: 600,
      imp: [[1, 1, 1, 0], [2, 2, 1, 0], [3, 3, 2, 0], [4, 4, 3, 0], [4, 4, 3, 0]], manual: 'Registro presencial en la Oficina de Atención Ciudadana.', dep: { activos: ['A-01', 'A-02'], funciones: [], proveedores: ['P-01'] } },
    { id: 'F-02', nombre: 'Padrón municipal', descripcion: 'Altas, bajas y certificados de empadronamiento.', responsable: 'Estadística', rto: 24, rpo: 24, mtpd: 120, costeHora: 200,
      imp: [[0, 0, 0, 0], [1, 0, 0, 0], [2, 1, 1, 0], [3, 2, 2, 0], [3, 3, 2, 0]], manual: '', dep: { activos: ['A-02'], funciones: [], proveedores: [] } },
    { id: 'F-03', nombre: 'Gestión tributaria', descripcion: 'Liquidaciones, recibos y cobro en periodo voluntario.', responsable: 'Tesorería', rto: 48, rpo: 24, mtpd: 168, costeHora: 350,
      imp: [[0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 0], [2, 2, 1, 0], [3, 3, 2, 0]], manual: '', dep: { activos: ['A-02', 'A-03'], funciones: [], proveedores: [] } }
  ],
  activos: [
    { id: 'A-01', datos: false, nombre: 'Plataforma de sede electrónica', tipo: 'Nube', estrategia: 'cloud', tiempoRecuperacion: 4, dependeDe: [], ubicacion: 'Servicio de la Diputación', responsable: 'Técnico informático',
      procedimiento: { pasos: 'Abrir incidencia con la Diputación y publicar aviso en la web.', exito: 'Registro de un trámite de prueba.', credenciales: '' }, backup: { aplica: false } },
    { id: 'A-02', datos: true, nombre: 'Servidor de aplicaciones municipales', tipo: 'Servidor', estrategia: 'cold', tiempoRecuperacion: 12, dependeDe: [], ubicacion: 'Sala técnica del ayuntamiento', responsable: 'Técnico informático',
      procedimiento: { pasos: '1. Reinstalar el sistema en el servidor de reserva.\n2. Restaurar la copia más reciente desde la NAS.', exito: '', credenciales: '' },
      backup: { aplica: true, tipo: 'Completa diaria en NAS', frecuenciaHoras: 24, retencionDias: 15, offsite: false, cifrado: false, inmutable: false, ultimaRestauracion: '', resultado: 'Pendiente' } },
    { id: 'A-03', datos: true, nombre: 'Aplicación de tributos', tipo: 'Aplicación', estrategia: 'cold', tiempoRecuperacion: 8, dependeDe: ['A-02'], ubicacion: 'Sala técnica del ayuntamiento', responsable: 'Técnico informático',
      procedimiento: { pasos: '', exito: '', credenciales: '' }, backup: { aplica: true, tipo: 'Completa diaria en NAS', frecuenciaHoras: 24, retencionDias: 15, offsite: false, cifrado: false, inmutable: false, ultimaRestauracion: '', resultado: 'Pendiente' } }
  ],
  proveedores: [{ id: 'P-01', nombre: 'Diputación Provincial', servicio: 'Plataforma de administración electrónica', contacto: 'CAU de la Diputación', slaHoras: 8, contrato: 'Convenio 2022', bcmVerificado: true }],
  bcp: { equipo: [], activacion: { umbralHoras: null, autorizado: '', escenarios: '' }, comunicacion: { primario: 'Correo electrónico', secundario: '', externo: 'Web municipal', plantilla: '' }, sitio: { tipo: 'ninguno', ubicacion: '', distanciaKm: null, rtoActivacion: null, capacidad: '' } },
  pruebas: [],
  revision: { version: '0.9', fecha: '2026-04-15', proxima: '2027-04-15', aprobadoPor: '', disparadores: '', historial: [] }
};

module.exports = [techserv, hospital, ayuntamiento];
