import { apiUtils } from '@/api/axios.js';
import { users as usersApi } from '@/api/index.js';
import { USER_POSITIONS } from '@/composables/usePermissions.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useUsersStore = defineStore('users', () => {
    // Estado reactivo
    const state = reactive({
        users: [],
        userStats: null,
        currentUser: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        searchResults: [],
        isSearching: false,
        filters: {
            global: '',
            position: null,
            is_active: null,
            sort_by: 'name',
            sort_direction: 'asc'
        }
    });

    // Computadas
    const allUsers = computed(() => state.users);
    const activeUsers = computed(() => state.users.filter((user) => user.is_active));
    const inactiveUsers = computed(() => state.users.filter((user) => !user.is_active));
    const usersByPosition = computed(() => {
        const grouped = {};
        state.users.forEach((user) => {
            if (!grouped[user.position]) {
                grouped[user.position] = [];
            }
            grouped[user.position].push(user);
        });
        return grouped;
    });

    // Filtros aplicados
    const filteredUsers = computed(() => {
        let filtered = [...state.users];

        // Filtro global (búsqueda en múltiples campos)
        if (state.filters.global) {
            const searchTerm = state.filters.global.toLowerCase();
            filtered = filtered.filter(
                (user) =>
                    user.name.toLowerCase().includes(searchTerm) ||
                    user.dni.includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.nick.toLowerCase().includes(searchTerm) ||
                    user.position.toLowerCase().includes(searchTerm) ||
                    (user.phone && user.phone.includes(searchTerm))
            );
        }

        // Filtro por posición
        if (state.filters.position) {
            filtered = filtered.filter((user) => user.position === state.filters.position);
        }

        // Filtro por estado activo/inactivo
        if (state.filters.is_active !== null) {
            filtered = filtered.filter((user) => user.is_active === state.filters.is_active);
        }

        // Ordenamiento
        if (state.filters.sort_by) {
            filtered.sort((a, b) => {
                const fieldA = a[state.filters.sort_by];
                const fieldB = b[state.filters.sort_by];

                let comparison = 0;
                if (fieldA < fieldB) comparison = -1;
                if (fieldA > fieldB) comparison = 1;

                return state.filters.sort_direction === 'desc' ? -comparison : comparison;
            });
        }

        return filtered;
    });

    // Opciones para dropdowns
    const positionOptions = computed(() => {
        return Object.entries(USER_POSITIONS).map(([_key, value]) => ({
            label: formatPositionLabel(value),
            value: value
        }));
    });

    const statusOptions = computed(() => [
        { label: 'Activos', value: true },
        { label: 'Inactivos', value: false }
    ]);

    const sortOptions = computed(() => [
        { label: 'Nombre', value: 'name' },
        { label: 'DNI', value: 'dni' },
        { label: 'Email', value: 'email' },
        { label: 'Posición', value: 'position' },
        { label: 'Fecha de creación', value: 'created_at' }
    ]);

    // Utilidades
    const formatPositionLabel = (position) => {
        const labels = {
            ADMINISTRACION: 'Administración',
            ADMISION: 'Admisión',
            'ARCHIVO HISTORIAS': 'Archivo Historias',
            'AUDITOR MEDICO': 'Auditor Médico',
            CONSULTORIOS: 'Consultorios',
            CONTABILIDAD: 'Contabilidad',
            'DIRECTOR MEDICO': 'Director Médico',
            EMERGENCIA: 'Emergencia',
            FACTURACION: 'Facturación',
            FARMACIA: 'Farmacia',
            HOSPITALIZACION: 'Hospitalización',
            LABORATORIO: 'Laboratorio',
            LOGISTICA: 'Logística',
            MEDICOS: 'Médicos',
            QUIROFANO: 'Quirófano',
            'RAYOS X': 'Rayos X',
            RRHH: 'RRHH',
            SISTEMAS: 'Sistemas'
        };
        return labels[position] || position;
    };

    const validateUserData = (userData, isEditing = false) => {
        const errors = {};

        // Validar nombre
        if (!userData.name?.trim()) {
            errors.name = ['El nombre es obligatorio'];
        } else if (userData.name.trim().length > 255) {
            errors.name = ['El nombre no puede exceder 255 caracteres'];
        }

        // Validar DNI (solo para creación)
        if (!isEditing) {
            if (!userData.dni?.trim()) {
                errors.dni = ['El DNI es obligatorio'];
            } else if (!/^\d{8}$/.test(userData.dni.trim())) {
                errors.dni = ['El DNI debe tener exactamente 8 dígitos'];
            }
        }

        // Validar email
        if (!userData.email?.trim()) {
            errors.email = ['El email es obligatorio'];
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email.trim())) {
            errors.email = ['El email debe tener un formato válido'];
        }

        // Validar teléfono
        if (!userData.phone?.trim()) {
            errors.phone = ['El teléfono es obligatorio'];
        } else if (!/^\d{9}$/.test(userData.phone.trim())) {
            errors.phone = ['El teléfono debe tener exactamente 9 dígitos'];
        }

        // Validar posición
        if (!userData.position?.trim()) {
            errors.position = ['La posición es obligatoria'];
        }

        // Validar nick
        if (!userData.nick?.trim()) {
            errors.nick = ['El nick es obligatorio'];
        } else if (userData.nick.trim().length < 3 || userData.nick.trim().length > 20) {
            errors.nick = ['El nick debe tener entre 3 y 20 caracteres'];
        } else if (!/^[a-zA-Z0-9_]+$/.test(userData.nick.trim())) {
            errors.nick = ['El nick solo puede contener letras, números y guión bajo'];
        }

        // Validar contraseña (solo para creación)
        if (!isEditing) {
            if (!userData.password) {
                errors.password = ['La contraseña es obligatoria'];
            } else if (userData.password.length < 8) {
                errors.password = ['La contraseña debe tener al menos 8 caracteres'];
            }
            if (userData.password !== userData.password_confirmation) {
                errors.password_confirmation = ['Las contraseñas no coinciden'];
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    // Métodos de API
    const fetchUsers = async (params = {}) => {
        state.isLoading = true;

        try {
            const response = await usersApi.getAll({
                ...state.filters,
                ...params
            });

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);

                // Manejar tanto array directo como objeto con data
                state.users = Array.isArray(data) ? data : data.data || [];
                state.lastFetch = Date.now();
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const searchUsers = async (params = {}) => {
        if (!params.q && !params.position && params.is_active === null) {
            state.searchResults = [];
            return;
        }

        state.isSearching = true;

        try {
            const response = await usersApi.search(params);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.searchResults = data || [];
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            state.searchResults = [];
            throw error;
        } finally {
            state.isSearching = false;
        }
    };

    const fetchUserStats = async () => {
        try {
            const response = await usersApi.getStats();

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.userStats = data;
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            throw error;
        }
    };

    const createUser = async (userData) => {
        // Validar datos
        const validation = validateUserData(userData, false);
        if (!validation.isValid) {
            throw {
                success: false,
                message: 'Datos de entrada inválidos',
                errors: validation.errors
            };
        }

        state.isSaving = true;

        try {
            const cleanData = {
                name: userData.name.trim(),
                dni: userData.dni.trim(),
                email: userData.email.trim().toLowerCase(),
                phone: userData.phone.trim(),
                position: userData.position.trim(),
                nick: userData.nick.trim(),
                password: userData.password,
                password_confirmation: userData.password_confirmation,
                is_active: userData.is_active ?? true,
                url_photo_profile: userData.url_photo_profile?.trim() || null
            };

            const response = await usersApi.create(cleanData);

            if (apiUtils.isSuccess(response)) {
                const newUser = apiUtils.getData(response);
                state.users.push(newUser);
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateUser = async (id, userData) => {
        // Validar datos
        const validation = validateUserData(userData, true);
        if (!validation.isValid) {
            throw {
                success: false,
                message: 'Datos de entrada inválidos',
                errors: validation.errors
            };
        }

        state.isSaving = true;

        try {
            const cleanData = {
                name: userData.name.trim(),
                email: userData.email.trim().toLowerCase(),
                phone: userData.phone.trim(),
                position: userData.position.trim(),
                nick: userData.nick.trim(),
                url_photo_profile: userData.url_photo_profile?.trim() || null
            };

            // Solo incluir campos que han cambiado
            const existingUser = state.users.find((u) => u.id === id);
            const changedData = {};

            if (existingUser) {
                Object.entries(cleanData).forEach(([key, value]) => {
                    if (existingUser[key] !== value) {
                        changedData[key] = value;
                    }
                });
            }

            if (Object.keys(changedData).length === 0) {
                throw {
                    success: false,
                    message: 'No se detectaron cambios en los datos',
                    errors: { general: ['Debe modificar al menos un campo'] }
                };
            }

            const response = await usersApi.update(id, changedData);

            if (apiUtils.isSuccess(response)) {
                const updatedUser = apiUtils.getData(response);
                const index = state.users.findIndex((u) => u.id === id);
                if (index !== -1) {
                    state.users[index] = updatedUser;
                }
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const toggleUserStatus = async (id) => {
        state.isSaving = true;

        try {
            const response = await usersApi.toggleStatus(id);

            if (apiUtils.isSuccess(response)) {
                const updatedUser = apiUtils.getData(response);
                const index = state.users.findIndex((u) => u.id === id);
                if (index !== -1) {
                    state.users[index] = updatedUser;
                }
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteUser = async (id) => {
        state.isDeleting = true;

        try {
            const response = await usersApi.delete(id);

            if (apiUtils.isSuccess(response)) {
                const index = state.users.findIndex((u) => u.id === id);
                if (index !== -1) {
                    state.users.splice(index, 1);
                }
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    // Métodos de filtros
    const setFilter = (key, value) => {
        state.filters[key] = value;
    };

    const clearFilters = () => {
        state.filters = {
            global: '',
            position: null,
            is_active: null,
            sort_by: 'name',
            sort_direction: 'asc'
        };
    };

    const setSort = (field, direction = 'asc') => {
        state.filters.sort_by = field;
        state.filters.sort_direction = direction;
    };

    // Método para resetear el estado
    const resetState = () => {
        state.users = [];
        state.userStats = null;
        state.currentUser = null;
        state.isLoading = false;
        state.isSaving = false;
        state.isDeleting = false;
        state.lastFetch = null;
        state.searchResults = [];
        state.isSearching = false;
        clearFilters();
    };

    return {
        // Estado
        state,

        // Computadas
        allUsers,
        activeUsers,
        inactiveUsers,
        usersByPosition,
        filteredUsers,
        positionOptions,
        statusOptions,
        sortOptions,

        // Métodos de API
        fetchUsers,
        searchUsers,
        fetchUserStats,
        createUser,
        updateUser,
        toggleUserStatus,
        deleteUser,

        // Métodos de filtros
        setFilter,
        clearFilters,
        setSort,

        // Utilidades
        formatPositionLabel,
        validateUserData,
        resetState
    };
});
