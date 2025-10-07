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

    // Operativas
    FACTURACION: 'FACTURACION',
    ADMISION: 'ADMISION',
    LOGISTICA: 'LOGISTICA',

    // Médicas
    MEDICOS: 'MEDICOS',
    EMERGENCIA: 'EMERGENCIA',
    HOSPITALIZACION: 'HOSPITALIZACION',
    QUIROFANO: 'QUIROFANO',
    CONSULTORIOS: 'CONSULTORIOS',

    // Diagnóstico
    LABORATORIO: 'LABORATORIO',
    RAYOS_X: 'RAYOS X',

    // Otras
    FARMACIA: 'FARMACIA',
    ARCHIVO_HISTORIAS: 'ARCHIVO HISTORIAS'
};

// Grupos de permisos predefinidos para facilitar la asignación
export const PERMISSION_GROUPS = {
    // Acceso total al sistema
    ADMIN_FULL: [POSITIONS.SISTEMAS],

    // Alta dirección
    HIGH_MANAGEMENT: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.DIRECTOR_MEDICO],

    // Personal administrativo
    ADMINISTRATIVE: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.RRHH, POSITIONS.CONTABILIDAD],

    // Personal operativo/atención
    OPERATIONAL: [POSITIONS.ADMISION, POSITIONS.FACTURACION],

    // Personal médico
    MEDICAL: [POSITIONS.MEDICOS, POSITIONS.EMERGENCIA, POSITIONS.HOSPITALIZACION, POSITIONS.QUIROFANO, POSITIONS.CONSULTORIOS],

    // Personal de hospitalización
    HOSPITALIZATION_STAFF: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.DIRECTOR_MEDICO, POSITIONS.MEDICOS, POSITIONS.EMERGENCIA, POSITIONS.HOSPITALIZACION],

    // Acceso a información de atenciones
    ATTENTIONS_ACCESS: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMISION, POSITIONS.FACTURACION, POSITIONS.MEDICOS, POSITIONS.EMERGENCIA, POSITIONS.HOSPITALIZACION],

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
        positions: PERMISSION_GROUPS.HIGH_MANAGEMENT,
        label: 'Dashboard',
        icon: 'pi pi-fw pi-home',
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
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.RRHH],
        label: 'Usuarios',
        icon: 'pi pi-fw pi-users',
        menuSection: 'Administración'
    },

    // Estado de hospitalización
    hospitalizacion: {
        name: 'hospitalizacion',
        path: '/hospitalizacion',
        positions: PERMISSION_GROUPS.HOSPITALIZATION_STAFF,
        label: 'Estado Actual',
        icon: 'pi pi-fw pi-th-large',
        menuSection: 'Hospitalización'
    },

    // Atenciones hospitalarias
    hospitalAttentions: {
        name: 'hospital-attentions',
        path: '/hospital-attentions',
        positions: PERMISSION_GROUPS.ATTENTIONS_ACCESS,
        label: 'Atenciones',
        icon: 'pi pi-fw pi-clipboard',
        menuSection: 'Hospitalización'
    },

    // Gestión de habitaciones
    habitaciones: {
        name: 'habitaciones',
        path: '/habitaciones',
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.HOSPITALIZACION],
        label: 'Habitaciones',
        icon: 'pi pi-fw pi-building',
        menuSection: 'Hospitalización'
    },

    // Importación SISCLIN
    sisclinImport: {
        name: 'sisclin-import',
        path: '/sisclin/import',
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION],
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
        positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION],
        label: 'Reglas de Recurrencia',
        icon: 'pi pi-fw pi-sync',
        menuSection: 'Soporte Técnico',
        showInMenu: false // No mostrar en menú, es una subpágina
    }
};

/**
 * Obtiene los permisos de un módulo por su nombre
 * @param {string} moduleName - Nombre del módulo
 * @returns {Array} Array de posiciones permitidas
 */
export function getModulePermissions(moduleName) {
    return MODULE_PERMISSIONS[moduleName]?.positions || [];
}

/**
 * Verifica si una posición tiene acceso a un módulo
 * @param {string} moduleName - Nombre del módulo
 * @param {string} userPosition - Posición del usuario
 * @returns {boolean}
 */
export function hasModuleAccess(moduleName, userPosition) {
    const positions = getModulePermissions(moduleName);

    if (!positions || positions.length === 0) return true;
    if (positions.includes('*')) return true;

    return positions.includes(userPosition);
}

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
            positions: module.positions
        });
    });

    // Convertir a array en el orden deseado
    const sectionOrder = ['Principal', 'Mi Cuenta', 'Administración', 'Hospitalización', 'SISCLIN', 'Soporte Técnico'];

    return sectionOrder
        .filter((section) => sections[section])
        .map((section) => ({
            label: section,
            items: sections[section]
        }));
}
