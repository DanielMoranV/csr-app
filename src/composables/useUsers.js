import { apiUtils } from '@/api/axios.js';
import { useUsersStore } from '@/store/usersStore.js';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

/**
 * Composable para manejo de usuarios con lógica de negocio
 * Proporciona métodos de alto nivel para operaciones CRUD
 */
export function useUsers() {
    const usersStore = useUsersStore();
    const toast = useToast();

    // Estados locales para operaciones específicas
    const isInitialized = ref(false);
    const operationInProgress = ref(false);

    // Computadas del store
    const users = computed(() => usersStore.filteredUsers);
    const allUsers = computed(() => usersStore.allUsers);
    const isLoading = computed(() => usersStore.state.isLoading);
    const isSaving = computed(() => usersStore.state.isSaving);
    const isDeleting = computed(() => usersStore.state.isDeleting);
    const userStats = computed(() => usersStore.state.userStats);
    const positionOptions = computed(() => usersStore.positionOptions);
    const statusOptions = computed(() => usersStore.statusOptions);
    const sortOptions = computed(() => usersStore.sortOptions);

    // Métodos de inicialización
    const initializeUsers = async (showLoading = true) => {
        if (isInitialized.value && usersStore.state.lastFetch) {
            // Si ya está inicializado y tiene datos recientes, no recargar
            const timeSinceLastFetch = Date.now() - usersStore.state.lastFetch;
            if (timeSinceLastFetch < 300000) {
                // 5 minutos
                return;
            }
        }

        try {
            await loadUsers(showLoading);
            isInitialized.value = true;
        } catch (error) {
            handleError(error, 'Error al inicializar usuarios');
            throw error;
        }
    };

    const loadUsers = async (showLoading = true) => {
        try {
            const response = await usersStore.fetchUsers();

            if (!showLoading) return response;

            const message = apiUtils.getMessage(response);
            if (message && message !== 'Usuarios obtenidos exitosamente') {
                toast.add({
                    severity: 'success',
                    summary: 'Usuarios Cargados',
                    detail: message,
                    life: 3000
                });
            }

            return response;
        } catch (error) {
            handleError(error, 'Error al cargar usuarios');
            throw error;
        }
    };

    const refreshUsers = async () => {
        try {
            usersStore.state.lastFetch = null; // Force refresh
            await loadUsers(false);

            toast.add({
                severity: 'info',
                summary: 'Lista Actualizada',
                detail: 'Los usuarios han sido actualizados correctamente',
                life: 2000
            });
        } catch (error) {
            handleError(error, 'Error al actualizar usuarios');
        }
    };

    // Métodos CRUD con manejo de errores y feedback
    const createUser = async (userData) => {
        operationInProgress.value = true;

        try {
            const response = await usersStore.createUser(userData);
            const message = apiUtils.getMessage(response);

            // Actualizar estadísticas después de crear usuario
            await loadUserStats();

            toast.add({
                severity: 'success',
                summary: 'Usuario Creado',
                detail: message || 'El usuario se ha creado correctamente',
                life: 4000
            });

            return response;
        } catch (error) {
            handleError(error, 'Error al crear usuario', true);
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateUser = async (id, userData) => {
        operationInProgress.value = true;

        try {
            const response = await usersStore.updateUser(id, userData);
            const message = apiUtils.getMessage(response);

            toast.add({
                severity: 'success',
                summary: 'Usuario Actualizado',
                detail: message || 'El usuario se ha actualizado correctamente',
                life: 4000
            });

            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar usuario', true);
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const toggleUserStatus = async (user) => {
        const action = user.is_active ? 'desactivar' : 'activar';
        operationInProgress.value = true;

        try {
            const response = await usersStore.toggleUserStatus(user.id);
            const updatedUser = apiUtils.getData(response);
            const status = updatedUser.is_active ? 'activado' : 'desactivado';

            // Actualizar estadísticas después del cambio de estado
            await loadUserStats();

            toast.add({
                severity: 'info',
                summary: 'Estado Actualizado',
                detail: `${user.name} ha sido ${status} correctamente`,
                life: 4000
            });

            return response;
        } catch (error) {
            const errorMessage = apiUtils.getMessage(error);

            // Mensaje específico para error de auto-modificación
            if (error.status === 400 && errorMessage.includes('propio estado')) {
                toast.add({
                    severity: 'warn',
                    summary: 'Acción no permitida',
                    detail: 'No puedes cambiar tu propio estado de usuario',
                    life: 4000
                });
            } else {
                handleError(error, `Error al ${action} usuario`);
            }
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteUser = async (user) => {
        operationInProgress.value = true;

        try {
            const response = await usersStore.deleteUser(user.id);

            // Actualizar estadísticas después de eliminar usuario
            await loadUserStats();

            toast.add({
                severity: 'success',
                summary: 'Usuario Eliminado',
                detail: `${user.name} ha sido eliminado del sistema`,
                life: 4000
            });

            return response;
        } catch (error) {
            const errorMessage = apiUtils.getMessage(error);

            // Mensaje específico para error de auto-eliminación
            if (error.status === 400 && errorMessage.includes('propia cuenta')) {
                toast.add({
                    severity: 'warn',
                    summary: 'Acción no permitida',
                    detail: 'No puedes eliminar tu propia cuenta de usuario',
                    life: 4000
                });
            } else {
                handleError(error, 'Error al eliminar usuario');
            }
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    // Método para resetear contraseña (simulado)
    const resetUserPassword = async (user) => {
        operationInProgress.value = true;

        try {
            // Simular llamada API (el endpoint no está definido en la documentación)
            await new Promise((resolve) => setTimeout(resolve, 1500));

            toast.add({
                severity: 'success',
                summary: 'Contraseña Reseteada',
                detail: `Se ha enviado una nueva contraseña a ${user.email}`,
                life: 5000
            });

            return { success: true };
        } catch (error) {
            handleError(error, 'Error al resetear contraseña');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    // Métodos de búsqueda y filtrado
    const searchUsers = async (searchParams) => {
        try {
            const response = await usersStore.searchUsers(searchParams);
            return response;
        } catch (error) {
            handleError(error, 'Error en la búsqueda de usuarios');
            throw error;
        }
    };

    const setGlobalFilter = (value) => {
        usersStore.setFilter('global', value);
    };

    const setPositionFilter = (position) => {
        usersStore.setFilter('position', position);
    };

    const setStatusFilter = (status) => {
        usersStore.setFilter('is_active', status);
    };

    const setSorting = (field, direction = 'asc') => {
        usersStore.setSort(field, direction);
    };

    const clearAllFilters = () => {
        usersStore.clearFilters();
        toast.add({
            severity: 'info',
            summary: 'Filtros Limpiados',
            detail: 'Se han restablecido todos los filtros',
            life: 2000
        });
    };

    // Métodos de estadísticas
    const loadUserStats = async () => {
        try {
            const response = await usersStore.fetchUserStats();
            return response;
        } catch (error) {
            console.warn('Error al cargar estadísticas:', error);
            // No mostrar error al usuario para estadísticas
            return null;
        }
    };

    // Utilidades
    const getUserById = (id) => {
        return usersStore.allUsers.find((user) => user.id === id);
    };

    const getUsersByPosition = (position) => {
        return usersStore.allUsers.filter((user) => user.position === position);
    };

    const validateUserData = (userData, isEditing = false) => {
        return usersStore.validateUserData(userData, isEditing);
    };

    const formatPositionLabel = (position) => {
        return usersStore.formatPositionLabel(position);
    };

    const getPositionSeverity = (position) => {
        const severityMap = {
            SISTEMAS: 'info',
            'DIRECTOR MEDICO': 'success',
            ADMINISTRACION: 'warning',
            RRHH: 'warning',
            MEDICOS: 'success',
            EMERGENCIA: 'danger',
            FARMACIA: 'info',
            LABORATORIO: 'success',
            'RAYOS X': 'info'
        };
        return severityMap[position] || 'secondary';
    };

    // Manejo de errores centralizado
    const handleError = (error, defaultMessage, showValidationErrors = false) => {
        console.error(defaultMessage, error);

        const errorMessage = apiUtils.getMessage(error) || defaultMessage;

        if (showValidationErrors && error.errors && typeof error.errors === 'object') {
            const validationErrors = apiUtils.getValidationErrorsFlat(error);

            toast.add({
                severity: 'error',
                summary: 'Errores de Validación',
                detail: validationErrors.length > 0 ? validationErrors.join(', ') : errorMessage,
                life: 6000
            });
        } else if (error.status === 429 || apiUtils.isRateLimited(error)) {
            toast.add({
                severity: 'warn',
                summary: 'Demasiadas Solicitudes',
                detail: 'Por favor, espere un momento antes de intentar nuevamente',
                life: 5000
            });
        } else if (error.status === 403) {
            toast.add({
                severity: 'warn',
                summary: 'Sin Permisos',
                detail: 'No tiene permisos para realizar esta acción',
                life: 4000
            });
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 5000
            });
        }
    };

    return {
        // Estados
        users,
        allUsers,
        isLoading,
        isSaving,
        isDeleting,
        userStats,
        isInitialized,
        operationInProgress,

        // Opciones
        positionOptions,
        statusOptions,
        sortOptions,

        // Métodos de inicialización
        initializeUsers,
        loadUsers,
        refreshUsers,

        // Métodos CRUD
        createUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        resetUserPassword,

        // Métodos de búsqueda y filtrado
        searchUsers,
        setGlobalFilter,
        setPositionFilter,
        setStatusFilter,
        setSorting,
        clearAllFilters,

        // Métodos de estadísticas
        loadUserStats,

        // Utilidades
        getUserById,
        getUsersByPosition,
        validateUserData,
        formatPositionLabel,
        getPositionSeverity,
        handleError
    };
}
