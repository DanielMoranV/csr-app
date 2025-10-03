import { computed } from 'vue';
import { useAuth } from './useAuth';

// Definición de todas las posiciones disponibles en la clínica
export const USER_POSITIONS = {
    ADMINISTRACION: 'ADMINISTRACION',
    ADMISION: 'ADMISION',
    ARCHIVO_HISTORIAS: 'ARCHIVO HISTORIAS',
    CONSULTORIOS: 'CONSULTORIOS',
    CONTABILIDAD: 'CONTABILIDAD',
    DIRECTOR_MEDICO: 'DIRECTOR MEDICO',
    EMERGENCIA: 'EMERGENCIA',
    FACTURACION: 'FACTURACION',
    FARMACIA: 'FARMACIA',
    HOSPITALIZACION: 'HOSPITALIZACION',
    LABORATORIO: 'LABORATORIO',
    LOGISTICA: 'LOGISTICA',
    MEDICOS: 'MEDICOS',
    QUIROFANO: 'QUIROFANO',
    RAYOS_X: 'RAYOS X',
    RRHH: 'RRHH',
    SISTEMAS: 'SISTEMAS'
};

// Grupos de permisos para facilitar la gestión
export const PERMISSION_GROUPS = {
    // Personal médico
    MEDICAL_STAFF: [USER_POSITIONS.MEDICOS, USER_POSITIONS.DIRECTOR_MEDICO, USER_POSITIONS.EMERGENCIA],

    // Personal administrativo
    ADMINISTRATIVE_STAFF: [USER_POSITIONS.ADMINISTRACION, USER_POSITIONS.ADMISION, USER_POSITIONS.RRHH, USER_POSITIONS.CONTABILIDAD, USER_POSITIONS.FACTURACION],

    // Personal técnico
    TECHNICAL_STAFF: [USER_POSITIONS.LABORATORIO, USER_POSITIONS.RAYOS_X, USER_POSITIONS.FARMACIA, USER_POSITIONS.QUIROFANO],

    // Personal de apoyo
    SUPPORT_STAFF: [USER_POSITIONS.ARCHIVO_HISTORIAS, USER_POSITIONS.HOSPITALIZACION, USER_POSITIONS.LOGISTICA],

    // Administradores del sistema
    SYSTEM_ADMIN: [USER_POSITIONS.SISTEMAS, USER_POSITIONS.ADMINISTRACION],

    // Acceso completo
    ALL_ACCESS: [USER_POSITIONS.SISTEMAS, USER_POSITIONS.DIRECTOR_MEDICO, USER_POSITIONS.ADMINISTRACION]
};

export function usePermissions() {
    const { user } = useAuth();

    // Posición actual del usuario
    const userPosition = computed(() => {
        return user.value?.position || null;
    });

    // Verificar si el usuario tiene una posición específica
    const hasPosition = (position) => {
        if (!userPosition.value) return false;
        return userPosition.value === position;
    };

    // Verificar si el usuario pertenece a un grupo de posiciones
    const hasAnyPosition = (positions) => {
        if (!userPosition.value) return false;
        if (!Array.isArray(positions)) return false;

        // Si incluye '*', permite todas las posiciones
        if (positions.includes('*')) return true;

        return positions.includes(userPosition.value);
    };

    // Verificar si el usuario pertenece a un grupo de permisos
    const belongsToGroup = (group) => {
        if (!PERMISSION_GROUPS[group]) return false;
        return hasAnyPosition(PERMISSION_GROUPS[group]);
    };

    // Verificar si es administrador del sistema
    const isSystemAdmin = computed(() => {
        return belongsToGroup('SYSTEM_ADMIN');
    });

    // Verificar si tiene acceso completo
    const hasFullAccess = computed(() => {
        return belongsToGroup('ALL_ACCESS');
    });

    // Verificar si es personal médico
    const isMedicalStaff = computed(() => {
        return belongsToGroup('MEDICAL_STAFF');
    });

    // Verificar si es personal administrativo
    const isAdministrativeStaff = computed(() => {
        return belongsToGroup('ADMINISTRATIVE_STAFF');
    });

    // Verificar si es personal técnico
    const isTechnicalStaff = computed(() => {
        return belongsToGroup('TECHNICAL_STAFF');
    });

    // Verificar si es personal de apoyo
    const isSupportStaff = computed(() => {
        return belongsToGroup('SUPPORT_STAFF');
    });

    // Filtrar items de menú basado en permisos
    const filterMenuItems = (items) => {
        if (!Array.isArray(items)) return [];

        return items
            .map((item) => ({ ...item })) // Clonar para evitar mutaciones
            .filter((item) => {
                // Si tiene items hijos, filtrarlos recursivamente primero
                if (item.items && Array.isArray(item.items)) {
                    item.items = filterMenuItems(item.items);
                    // Solo mostrar la sección si tiene items después del filtro
                    return item.items.length > 0;
                }

                // Para items sin hijos, verificar permisos
                if (!item.positions) return true;

                // Verificar si el usuario tiene acceso
                return hasAnyPosition(item.positions);
            });
    };

    // Verificar permisos para rutas
    const canAccessRoute = (routePermissions) => {
        if (!routePermissions) return true;
        return hasAnyPosition(routePermissions);
    };

    return {
        // Datos del usuario
        userPosition,

        // Métodos de verificación
        hasPosition,
        hasAnyPosition,
        belongsToGroup,
        canAccessRoute,

        // Estados computados
        isSystemAdmin,
        hasFullAccess,
        isMedicalStaff,
        isAdministrativeStaff,
        isTechnicalStaff,
        isSupportStaff,

        // Utilidades
        filterMenuItems,

        // Constantes
        USER_POSITIONS,
        PERMISSION_GROUPS
    };
}
