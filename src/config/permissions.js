/**
 * Configuración centralizada de permisos por módulo/ruta
 *
 * Este archivo define qué posiciones tienen acceso a cada módulo del sistema.
 * Al modificar los permisos aquí, se actualizan automáticamente en el router y el menú.
 */

// Posiciones disponibles en el sistema
export const POSITIONS = {
    // Administrativas
    SISTEMAS: 'SISTEMAS',
    DIRECTOR_MEDICO: 'DIRECTOR MEDICO',
    ADMINISTRACION: 'ADMINISTRACION',
    RRHH: 'RRHH',
    CONTABILIDAD: 'CONTABILIDAD',
    TESORERIA: 'TESORERIA',
    GERENCIA: 'GERENCIA',

    // Operativas
    FACTURACION: 'FACTURACION',
    ADMISION: 'ADMISION',
    LOGISTICA: 'LOGISTICA',

    // Médicas
    MEDICOS: 'MEDICOS',
    EMERGENCIA: 'EMERGENCIA',
    AUDITOR_MEDICO: 'AUDITOR MEDICO',
    HOSPITALIZACION: 'HOSPITALIZACION',
    QUIROFANO: 'QUIROFANO',
    CONSULTORIOS: 'CONSULTORIOS',

    // Diagnóstico
    LABORATORIO: 'LABORATORIO',
    RAYOS_X: 'RAYOS X',

    // Otras
    FARMACIA: 'FARMACIA',
    ARCHIVO_HISTORIAS: 'ARCHIVO HISTORIAS',
    SECRETARIA: 'SECRETARIA',
    COORDINADOR_HOSPITALIZACION: 'COORDINADOR HOSPITALIZACION'
};

// Grupos de permisos predefinidos para facilitar la asignación
export const PERMISSION_GROUPS = {
    // Acceso total al sistema
    ADMIN_FULL: [POSITIONS.SISTEMAS],

    // Alta dirección
    HIGH_MANAGEMENT: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.DIRECTOR_MEDICO, POSITIONS.COORDINADOR_HOSPITALIZACION],

    // Personal administrativo
    ADMINISTRATIVE: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.RRHH, POSITIONS.CONTABILIDAD, POSITIONS.TESORERIA],

    // Personal de tesorería
    TREASURY: [POSITIONS.SISTEMAS, POSITIONS.GERENCIA, POSITIONS.CONTABILIDAD],

    // Personal operativo/atención
    OPERATIONAL: [POSITIONS.ADMISION, POSITIONS.FACTURACION],

    // Personal médico
    MEDICAL: [POSITIONS.MEDICOS, POSITIONS.EMERGENCIA, POSITIONS.AUDITOR_MEDICO, POSITIONS.HOSPITALIZACION, POSITIONS.QUIROFANO, POSITIONS.CONSULTORIOS, POSITIONS.COORDINADOR_HOSPITALIZACION],

    // Personal de hospitalización
    HOSPITALIZATION_STAFF: [
        POSITIONS.SISTEMAS,
        POSITIONS.ADMINISTRACION,
        POSITIONS.DIRECTOR_MEDICO,
        POSITIONS.MEDICOS,
        POSITIONS.EMERGENCIA,
        POSITIONS.HOSPITALIZACION,
        POSITIONS.ADMISION,
        POSITIONS.FARMACIA,
        POSITIONS.LABORATORIO,
        POSITIONS.RAYOS_X,
        POSITIONS.SECRETARIA,
        POSITIONS.COORDINADOR_HOSPITALIZACION,
        POSITIONS.GERENCIA
    ],

    // Acceso a información de atenciones
    ATTENTIONS_ACCESS: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.DIRECTOR_MEDICO, POSITIONS.MEDICOS, POSITIONS.EMERGENCIA, POSITIONS.HOSPITALIZACION, POSITIONS.COORDINADOR_HOSPITALIZACION],

    // Personal con acceso a la gestión de reservas de camas
    BED_RESERVATIONS_STAFF: [
        POSITIONS.SISTEMAS,
        POSITIONS.DIRECTOR_MEDICO,
        POSITIONS.ADMINISTRACION,
        POSITIONS.GERENCIA,
        POSITIONS.MEDICOS,
        POSITIONS.EMERGENCIA,
        POSITIONS.HOSPITALIZACION,
        POSITIONS.QUIROFANO,
        POSITIONS.ADMISION,
        POSITIONS.COORDINADOR_HOSPITALIZACION
    ],

    // Dashboards analíticos (restringido a gerencia y sistemas)
    DASHBOARDS: [POSITIONS.SISTEMAS, POSITIONS.GERENCIA],

    // Todos los usuarios autenticados
    ALL: ['*']
};

/**
 * Configuración de permisos por módulo
 * Cada módulo define:
 * - name: nombre de la ruta
 * - path: ruta URL
 * - positions: array de posiciones permitidas (puede usar PERMISSION_GROUPS o posiciones individuales)
 * - label: etiqueta para mostrar en el menú
 * - icon: ícono PrimeVue para el menú
 * - showInMenu: si debe aparecer en el menú lateral (default: true)
 */
export const MODULE_PERMISSIONS = {
    // Dashboard
    dashboard: {
        name: 'dashboard',
        path: '/dashboard',
        permission: 'dashboards.hospitalization',
        positions: PERMISSION_GROUPS.HIGH_MANAGEMENT,
        label: 'Dashboard Hospitalización',
        icon: 'pi pi-fw pi-home',
        menuSection: 'Principal'
    },

    // Dashboard Emergencia / Tópico
    dashboardEmergencia: {
        name: 'dashboard-emergencia',
        path: '/emergencia',
        permission: 'dashboards.emergency',
        positions: PERMISSION_GROUPS.DASHBOARDS,
        label: 'Dashboard Emergencia',
        icon: 'pi pi-fw pi-bolt',
        menuSection: 'Principal'
    },

    // Dashboard Rayos X
    dashboardRayosX: {
        name: 'dashboard-rayosx',
        path: '/rayos-x',
        permission: 'dashboards.xray',
        positions: PERMISSION_GROUPS.DASHBOARDS,
        label: 'Dashboard Rayos X',
        icon: 'pi pi-fw pi-image',
        menuSection: 'Principal'
    },

    // Dashboard Ecografía
    dashboardEcografia: {
        name: 'dashboard-ecografia',
        path: '/ecografia',
        permission: 'dashboards.ultrasound',
        positions: PERMISSION_GROUPS.DASHBOARDS,
        label: 'Dashboard Ecografía',
        icon: 'pi pi-fw pi-circle',
        menuSection: 'Principal'
    },

    // Dashboard Errores de Admisión
    dashboardErrores: {
        name: 'dashboard-errores',
        path: '/errores-admision',
        permission: 'dashboards.admission-errors',
        positions: PERMISSION_GROUPS.DASHBOARDS,
        label: 'Errores de Admisión',
        icon: 'pi pi-fw pi-exclamation-circle',
        menuSection: 'Principal'
    },

    // Perfil de usuario
    profile: {
        name: 'profile',
        path: '/profile',
        positions: PERMISSION_GROUPS.ALL,
        label: 'Perfil',
        icon: 'pi pi-fw pi-user',
        menuSection: 'Mi Cuenta'
    },

    // Gestión de usuarios
    usuarios: {
        name: 'usuarios',
        path: '/usuarios',
        permission: 'users.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.RRHH],
        label: 'Usuarios',
        icon: 'pi pi-fw pi-users',
        menuSection: 'Administración'
    },

    // Administración de Roles y Permisos (RBAC)
    // El acceso NO se controla por posición sino por el permiso dinámico
    // `roles.manage` (o is_superuser). Ver guard de router y filtro de menú.
    roleManagement: {
        name: 'role-management',
        path: '/admin/roles',
        permission: 'roles.manage',
        label: 'Roles y Permisos',
        icon: 'pi pi-fw pi-shield',
        menuSection: 'Administración'
    },

    // Estado de hospitalización
    hospitalizacion: {
        name: 'hospitalizacion',
        path: '/hospitalizacion',
        permission: 'hospitalization.view',
        positions: PERMISSION_GROUPS.HOSPITALIZATION_STAFF,
        label: 'Estado Actual',
        icon: 'pi pi-fw pi-th-large',
        menuSection: 'Hospitalización'
    },

    // Vista TV de hospitalización
    hospitalizacionStatusTv: {
        name: 'hospitalizacion-status-tv',
        path: '/hospitalizacion-status-tv',
        permission: 'hospitalization.view',
        positions: PERMISSION_GROUPS.HOSPITALIZATION_STAFF,
        label: 'Estado TV',
        icon: 'pi pi-fw pi-desktop',
        menuSection: 'Hospitalización',
        showInMenu: false
    },

    // Vista pública de hospitalización
    hospitalizacionDisplay: {
        name: 'hospitalizacion-display',
        path: '/hospitalizacion-display',
        positions: PERMISSION_GROUPS.ALL,
        label: 'Visualización',
        icon: 'pi pi-fw pi-eye',
        menuSection: 'Hospitalización'
    },

    // Atenciones hospitalarias
    hospitalAttentions: {
        name: 'hospital-attentions',
        path: '/hospital-attentions',
        permission: 'hospital-attentions.view',
        positions: PERMISSION_GROUPS.ATTENTIONS_ACCESS,
        label: 'Atenciones',
        icon: 'pi pi-fw pi-clipboard',
        menuSection: 'Hospitalización'
    },

    // Gestión de habitaciones
    habitaciones: {
        name: 'habitaciones',
        path: '/habitaciones',
        permission: 'rooms.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.HOSPITALIZACION, POSITIONS.ADMISION],
        label: 'Habitaciones',
        icon: 'pi pi-fw pi-building',
        menuSection: 'Hospitalización'
    },

    // Gestión de Reservas de Camas
    bedReservations: {
        name: 'bed-reservations',
        path: '/bed-reservations',
        permission: 'bed-reservations.view',
        positions: PERMISSION_GROUPS.BED_RESERVATIONS_STAFF,
        label: 'Reservas de Camas',
        icon: 'pi pi-fw pi-book',
        menuSection: 'Hospitalización'
    },

    // Gestión de Tareas de Hospitalización
    hospitalTasks: {
        name: 'hospital-tasks',
        path: '/hospital-tasks',
        permission: 'hospital-tasks.view',
        positions: PERMISSION_GROUPS.HOSPITALIZATION_STAFF,
        label: 'Tareas',
        icon: 'pi pi-fw pi-check-square',
        menuSection: 'Hospitalización'
    },

    // Importación SISCLIN
    sisclinImport: {
        name: 'sisclin-import',
        path: '/sisclin/import',
        permission: 'sisclin.import',
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA],
        label: 'Import. Hosp.',
        icon: 'pi pi-fw pi-database',
        menuSection: 'SISCLIN'
    },

    // Gestión de tickets
    tickets: {
        name: 'tickets',
        path: '/tickets',
        positions: PERMISSION_GROUPS.ALL,
        label: 'Gestión de Tickets',
        icon: 'pi pi-fw pi-ticket',
        menuSection: 'Soporte Técnico'
    },

    // Reglas de recurrencia de tickets
    ticketRecurrenceRules: {
        name: 'ticket-recurrence-rules',
        path: '/tickets/recurrence-rules',
        permission: 'tickets.manage-rules',
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA],
        label: 'Reglas de Recurrencia',
        icon: 'pi pi-fw pi-sync',
        menuSection: 'Soporte Técnico',
        showInMenu: false
    },

    // Diagrama de Gantt de tickets
    ticketGantt: {
        name: 'ticket-gantt',
        path: '/tickets/gantt',
        positions: PERMISSION_GROUPS.ALL,
        label: 'Diagrama de Gantt',
        icon: 'pi pi-fw pi-chart-gantt',
        menuSection: 'Soporte Técnico',
        showInMenu: false
    },

    // Gestión Documentaria
    documentManagement: {
        name: 'document-management',
        path: '/documentos',
        positions: PERMISSION_GROUPS.ALL,
        label: 'Gestión Documentaria',
        icon: 'pi pi-fw pi-file-pdf',
        menuSection: 'Soporte Técnico'
    },

    // Firmar y Descargar (firma temporal sin persistencia)
    signAndDownload: {
        name: 'sign-and-download',
        path: '/firmar-descargar',
        positions: PERMISSION_GROUPS.ALL,
        label: 'Firmar y Descargar',
        icon: 'pi pi-fw pi-download',
        menuSection: 'Soporte Técnico'
    },

    // Gestión de Médicos
    doctors: {
        name: 'doctors',
        path: '/medicos',
        permission: 'doctors.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.RRHH],
        label: 'Médicos',
        icon: 'pi pi-fw pi-heart-fill',
        menuSection: 'Personal Médico'
    },

    // Gestión de Especialidades Médicas
    medicalSpecialties: {
        name: 'medical-specialties',
        path: '/especialidades-medicas',
        permission: 'medical-specialties.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.RRHH],
        label: 'Especialidades',
        icon: 'pi pi-fw pi-heart',
        menuSection: 'Personal Médico'
    },

    // Gestión de Horarios de Médicos
    doctorSchedules: {
        name: 'doctor-schedules',
        path: '/horarios-medicos',
        permission: 'doctor-schedules.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.RRHH, POSITIONS.HOSPITALIZACION, POSITIONS.QUIROFANO],
        label: 'Horarios',
        icon: 'pi pi-fw pi-calendar',
        menuSection: 'Personal Médico'
    },

    // Gestión de Honorarios Médicos (Administradores)
    medicalFees: {
        name: 'medical-fees',
        path: '/honorarios-medicos',
        permission: 'medical-fees.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.CONTABILIDAD, POSITIONS.RRHH],
        label: 'Honorarios',
        icon: 'pi pi-fw pi-dollar',
        menuSection: 'Personal Médico'
    },

    // Gestión de Tarifarios
    tariffs: {
        name: 'tariffs',
        path: '/tarifarios',
        permission: 'tariffs.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.CONTABILIDAD],
        label: 'Tarifarios',
        icon: 'pi pi-fw pi-money-bill',
        menuSection: 'Personal Médico'
    },

    // Consulta de Tarifarios (Admisión)
    tariffConsultation: {
        name: 'tariff-consultation',
        path: '/consulta-tarifarios',
        permission: 'tariffs.consult',
        positions: [
            POSITIONS.FACTURACION,
            POSITIONS.FARMACIA,
            POSITIONS.DIRECTOR_MEDICO,
            POSITIONS.ADMINISTRACION,
            POSITIONS.GERENCIA,
            POSITIONS.MEDICOS,
            POSITIONS.EMERGENCIA,
            POSITIONS.HOSPITALIZACION,
            POSITIONS.QUIROFANO,
            POSITIONS.ADMISION,
            POSITIONS.LABORATORIO,
            POSITIONS.RAYOS_X,
            POSITIONS.SISTEMAS
        ],
        label: 'Consulta de Tarifarios',
        icon: 'pi pi-fw pi-search',
        menuSection: 'Personal Médico'
    },

    // Gestión de Reservas (Admisión)
    reservationManagement: {
        name: 'reservation-management',
        path: '/reservations/manage',
        permission: 'reservations.manage',
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMISION, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.DIRECTOR_MEDICO],
        label: 'Gestión de Reservas',
        icon: 'pi pi-fw pi-address-book',
        menuSection: 'Personal Médico'
    },

    // Mis Honorarios Médicos (Vista Personal)
    myMedicalFees: {
        name: 'myMedicalFees',
        path: '/my-medical-fees',
        permission: 'medical-fees.view-own',
        positions: [POSITIONS.MEDICOS, POSITIONS.EMERGENCIA, POSITIONS.DIRECTOR_MEDICO, POSITIONS.AUDITOR_MEDICO],
        label: 'Mis Honorarios',
        icon: 'pi pi-fw pi-user-edit',
        menuSection: 'Personal Médico'
    },

    // Mis Horarios (Vista Personal para Médicos)
    mySchedules: {
        name: 'mySchedules',
        path: '/my-schedules',
        permission: 'doctor-schedules.view-own',
        positions: [POSITIONS.MEDICOS, POSITIONS.EMERGENCIA, POSITIONS.DIRECTOR_MEDICO, POSITIONS.AUDITOR_MEDICO],
        label: 'Mis Horarios',
        icon: 'pi pi-fw pi-calendar-plus',
        menuSection: 'Personal Médico'
    },

    // Tesorería - Bancos
    treasuryBanks: {
        name: 'treasury-banks',
        path: '/tesoreria/bancos',
        permission: 'treasury.view',
        positions: PERMISSION_GROUPS.TREASURY,
        label: 'Bancos',
        icon: 'pi pi-fw pi-building',
        menuSection: 'Tesorería'
    },

    // Tesorería - Cuentas Bancarias
    treasuryBankAccounts: {
        name: 'treasury-bank-accounts',
        path: '/tesoreria/cuentas',
        permission: 'treasury.view',
        positions: PERMISSION_GROUPS.TREASURY,
        label: 'Cuentas Bancarias',
        icon: 'pi pi-fw pi-wallet',
        menuSection: 'Tesorería'
    },

    // Tesorería - Movimientos Bancarios
    treasuryBankMovements: {
        name: 'treasury-bank-movements',
        path: '/tesoreria/movimientos',
        permission: 'treasury.view',
        positions: PERMISSION_GROUPS.TREASURY,
        label: 'Movimientos',
        icon: 'pi pi-fw pi-calculator',
        menuSection: 'Tesorería'
    },

    // Tesorería - Contrapartes
    treasuryCounterparties: {
        name: 'treasury-counterparties',
        path: '/tesoreria/contrapartes',
        permission: 'treasury.view',
        positions: PERMISSION_GROUPS.TREASURY,
        label: 'Terceros / Contrapartes',
        icon: 'pi pi-fw pi-users',
        menuSection: 'Tesorería'
    },

    // Tesorería - Importación Honorarios Médicos
    treasuryMedicalImport: {
        name: 'treasury-medical-import',
        path: '/tesoreria/importar-honorarios',
        permission: 'treasury.view',
        positions: [POSITIONS.SISTEMAS, POSITIONS.GERENCIA, POSITIONS.CONTABILIDAD],
        label: 'Import. Honorarios',
        icon: 'pi pi-fw pi-upload',
        menuSection: 'Tesorería'
    },

    // Tesorería - Resumen Anual
    treasuryYearSummary: {
        name: 'treasury-year-summary',
        path: '/tesoreria/resumen-anual',
        permission: 'treasury.view',
        positions: PERMISSION_GROUPS.TREASURY,
        label: 'Resumen del Año',
        icon: 'pi pi-fw pi-chart-bar',
        menuSection: 'Tesorería'
    },

    // Tesorería - Categorías de Movimiento
    treasuryMovementCategories: {
        name: 'treasury-movement-categories',
        path: '/tesoreria/categorias',
        permission: 'treasury.view',
        positions: PERMISSION_GROUPS.TREASURY,
        label: 'Categorías',
        icon: 'pi pi-fw pi-tags',
        menuSection: 'Tesorería'
    },

    // ── Envío Masivo de Documentos (Boletas) ──────────────────────────────────
    // Visibilidad del menú: `boletas.view` O `boletas.manage`. Las acciones de
    // escritura se gobiernan en la UI con `boletas.manage` (ver useBoletas).

    // Padrón de empleados
    boletasEmployees: {
        name: 'boletas-employees',
        path: '/boletas/empleados',
        permission: ['boletas.view', 'boletas.manage'],
        label: 'Padrón',
        icon: 'pi pi-fw pi-users',
        menuSection: 'Boletas'
    },

    // Plantillas de correo
    boletasTemplates: {
        name: 'boletas-templates',
        path: '/boletas/plantillas',
        permission: ['boletas.view', 'boletas.manage'],
        label: 'Plantillas',
        icon: 'pi pi-fw pi-envelope',
        menuSection: 'Boletas'
    },

    // Archivos PDF (boletas) — el ZIP se sube desde el compose; la vista queda
    // accesible por ruta pero fuera del menú.
    boletasFiles: {
        name: 'boletas-files',
        path: '/boletas/archivos',
        permission: ['boletas.view', 'boletas.manage'],
        label: 'Archivos PDF',
        icon: 'pi pi-fw pi-file-pdf',
        menuSection: 'Boletas',
        showInMenu: false
    },

    // Historial de campañas
    boletasCampaigns: {
        name: 'boletas-campaigns',
        path: '/boletas/campanas',
        permission: ['boletas.view', 'boletas.manage'],
        label: 'Campañas',
        icon: 'pi pi-fw pi-send',
        menuSection: 'Boletas'
    },

    // Nueva campaña (asistente) — solo operación, no aparece en el menú
    boletasCampaignNew: {
        name: 'boletas-campaign-new',
        path: '/boletas/campanas/nueva',
        permission: 'boletas.manage',
        label: 'Nueva Campaña',
        icon: 'pi pi-fw pi-plus',
        menuSection: 'Boletas',
        showInMenu: false
    },

    // Editar campaña corregible (draft/failed) — reutiliza el compose, fuera del menú
    boletasCampaignEdit: {
        name: 'boletas-campaign-edit',
        path: '/boletas/campanas/:id/editar',
        permission: 'boletas.manage',
        label: 'Editar Campaña',
        icon: 'pi pi-fw pi-pencil',
        menuSection: 'Boletas',
        showInMenu: false
    },

    // Detalle / seguimiento de campaña — se accede desde el historial
    boletasCampaignDetail: {
        name: 'boletas-campaign-detail',
        path: '/boletas/campanas/:id',
        permission: ['boletas.view', 'boletas.manage'],
        label: 'Detalle de Campaña',
        icon: 'pi pi-fw pi-chart-line',
        menuSection: 'Boletas',
        showInMenu: false
    },

    // Configuración del correo emisor (SMTP) — requiere boletas.settings
    boletasMailSettings: {
        name: 'boletas-mail-settings',
        path: '/boletas/ajustes-correo',
        permission: 'boletas.settings',
        label: 'Ajustes de correo',
        icon: 'pi pi-fw pi-cog',
        menuSection: 'Boletas'
    }
};

/**
 * Genera la estructura del menú agrupada por secciones
 * @returns {Array} Estructura del menú
 */
export function generateMenuStructure() {
    const sections = {};

    // Agrupar módulos por sección
    Object.values(MODULE_PERMISSIONS).forEach((module) => {
        // Solo incluir módulos que deben mostrarse en el menú
        if (module.showInMenu === false) return;

        const section = module.menuSection;
        if (!sections[section]) {
            sections[section] = [];
        }

        sections[section].push({
            label: module.label,
            icon: module.icon,
            to: module.path,
            permission: module.permission
        });
    });

    // Convertir a array en el orden deseado
    const sectionOrder = ['Principal', 'Mi Cuenta', 'Administración', 'Personal Médico', 'Hospitalización', 'Tesorería', 'Boletas', 'SISCLIN', 'Soporte Técnico'];

    return sectionOrder
        .filter((section) => sections[section])
        .map((section) => ({
            label: section,
            items: sections[section]
        }));
}
