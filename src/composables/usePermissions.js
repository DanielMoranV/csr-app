import { POSITIONS } from '@/config/permissions';
import { computed } from 'vue';
import { useAuth } from './useAuth';

// Re-exportar POSITIONS para uso directo desde este composable
export { POSITIONS };

// Grupos de permisos para facilitar la gestión
export const PERMISSION_GROUPS = {
    // Personal médico
    MEDICAL_STAFF: [POSITIONS.MEDICOS, POSITIONS.DIRECTOR_MEDICO, POSITIONS.EMERGENCIA, POSITIONS.AUDITOR_MEDICO, POSITIONS.COORDINADOR_HOSPITALIZACION],

    // Personal administrativo
    ADMINISTRATIVE_STAFF: [POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA, POSITIONS.ADMISION, POSITIONS.RRHH, POSITIONS.CONTABILIDAD, POSITIONS.FACTURACION],

    // Personal técnico
    TECHNICAL_STAFF: [POSITIONS.LABORATORIO, POSITIONS.RAYOS_X, POSITIONS.FARMACIA, POSITIONS.QUIROFANO],

    // Personal de apoyo
    SUPPORT_STAFF: [POSITIONS.ARCHIVO_HISTORIAS, POSITIONS.HOSPITALIZACION, POSITIONS.LOGISTICA],

    // Administradores del sistema
    SYSTEM_ADMIN: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA],

    // Acceso completo
    ALL_ACCESS: [POSITIONS.SISTEMAS, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMINISTRACION, POSITIONS.GERENCIA],

    // Acciones peligrosas (eliminar, etc.)
    // Para modificar o añadir más posiciones de usuario con permisos para realizar acciones peligrosas,
    // edita este array. Por ejemplo, para incluir a 'ADMINISTRACION':
    // DANGER_ZONE: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION]
    DANGER_ZONE: [POSITIONS.SISTEMAS]
};

export function usePermissions() {
    const { user, hasPermission, hasAnyPermission, isSuperuser } = useAuth();

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

    // Verificar si el usuario puede realizar acciones peligrosas
    const canPerformDangerousActions = computed(() => {
        return belongsToGroup('DANGER_ZONE');
    });

    // Verificar si es Secretaria
    const isSecretaria = computed(() => {
        return hasPosition(POSITIONS.SECRETARIA);
    });

    // Verificar si es Coordinador de Hospitalización
    const isCoordinadorHospitalizacion = computed(() => {
        return hasPosition(POSITIONS.COORDINADOR_HOSPITALIZACION);
    });

    // Verificar si puede liberar una cama anticipadamente (antes del alta programada)
    const canEarlyRelease = computed(() => {
        return hasAnyPosition([POSITIONS.HOSPITALIZACION, POSITIONS.COORDINADOR_HOSPITALIZACION, POSITIONS.DIRECTOR_MEDICO, POSITIONS.ADMINISTRACION, POSITIONS.ADMISION]);
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

                // Items controlados por permiso dinámico (RBAC) tienen prioridad
                // sobre la verificación por posición. `permission` puede ser un
                // slug (string) o un arreglo de slugs ("cualquiera de").
                if (item.permission) {
                    if (isSuperuser.value) return true;
                    return Array.isArray(item.permission) ? hasAnyPermission(item.permission) : hasPermission(item.permission);
                }

                // Para items sin hijos, verificar permisos por posición
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
        canPerformDangerousActions,
        isSecretaria,
        isCoordinadorHospitalizacion,
        canEarlyRelease,

        // Utilidades
        filterMenuItems,

        // Constantes
        POSITIONS,
        PERMISSION_GROUPS
    };
}
