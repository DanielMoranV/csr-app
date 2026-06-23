import api, { apiUtils } from '@/api/axios.js';
import cache from '@/utils/cache.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { useTicketsStore } from './ticketsStore';
import { useTasksStore } from './tasksStore';

// Configuración de seguridad
const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'currentUser';
// NOTA: REFRESH_THRESHOLD_MINUTES eliminado - tokens ya no expiran automáticamente

export const useAuthStore = defineStore('auth', () => {
    // Estado reactivo
    const state = reactive({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        // tokenExpiresAt: null, // REMOVIDO - tokens ya no expiran
        lastActivity: Date.now(),
        isInitialized: false // Flag para saber si ya se inicializó
    });

    // Computadas
    const getUser = computed(() => state.user);
    const getToken = computed(() => state.token);

    const isLoggedIn = computed(() => state.isAuthenticated && !!state.token);
    const isInitialized = computed(() => state.isInitialized);
    // isTokenExpired y shouldRefreshToken REMOVIDOS - tokens ya no expiran automáticamente

    // Validadores de entrada
    const validateLoginData = (dni, password) => {
        const errors = {};

        if (!dni || typeof dni !== 'string') {
            errors.dni = ['DNI es requerido'];
        } else if (!/^\d{8}$/.test(dni.trim())) {
            errors.dni = ['DNI debe contener exactamente 8 d�gitos'];
        }

        if (!password || typeof password !== 'string') {
            errors.password = ['Contrase�a es requerida'];
        } else if (password.length < 8) {
            errors.password = ['Contrase�a debe tener al menos 8 caracteres'];
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    const validateRegisterData = (userData) => {
        const errors = {};

        // Validar nombre
        if (!userData.name || typeof userData.name !== 'string') {
            errors.name = ['Nombre es requerido'];
        } else if (userData.name.trim().length > 255) {
            errors.name = ['Nombre no puede exceder 255 caracteres'];
        }

        // Validar DNI
        if (!userData.dni || typeof userData.dni !== 'string') {
            errors.dni = ['DNI es requerido'];
        } else if (!/^\d{8}$/.test(userData.dni.trim())) {
            errors.dni = ['DNI debe contener exactamente 8 d�gitos'];
        }

        // Validar email
        if (!userData.email || typeof userData.email !== 'string') {
            errors.email = ['Email es requerido'];
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email.trim())) {
            errors.email = ['Email debe tener un formato v�lido'];
        }

        // Validar contrase�a
        if (!userData.password || typeof userData.password !== 'string') {
            errors.password = ['Contrase�a es requerida'];
        } else {
            const password = userData.password;
            if (password.length < 8) {
                errors.password = ['Contrase�a debe tener al menos 8 caracteres'];
            } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                errors.password = ['Contrase�a debe contener al menos: 1 min�scula, 1 may�scula y 1 n�mero'];
            }
        }

        // Validar confirmaci�n de contrase�a
        if (userData.password !== userData.password_confirmation) {
            errors.password_confirmation = ['Las contrase�as no coinciden'];
        }

        // Validar posici�n
        if (!userData.position || typeof userData.position !== 'string') {
            errors.position = ['Posici�n es requerida'];
        } else if (userData.position.trim().length > 100) {
            errors.position = ['Posici�n no puede exceder 100 caracteres'];
        }

        // Validar nick
        if (!userData.nick || typeof userData.nick !== 'string') {
            errors.nick = ['Nick es requerido'];
        } else if (userData.nick.trim().length > 20) {
            errors.nick = ['Nick no puede exceder 20 caracteres'];
        }

        // Validar tel�fono
        if (!userData.phone || typeof userData.phone !== 'string') {
            errors.phone = ['Tel�fono es requerido'];
        } else if (!/^\d{9}$/.test(userData.phone.trim())) {
            errors.phone = ['Tel�fono debe contener exactamente 9 d�gitos'];
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    // M�todos privados para manejo de tokens
    const saveAuthData = (authData) => {
        try {
            if (!authData || !authData.access_token) {
                throw new Error('Datos de autenticaci�n inv�lidos');
            }

            state.token = authData.access_token;
            state.user = authData.user || null;
            state.isAuthenticated = true;
            state.lastActivity = Date.now();

            // NOTA: Calculo de expiracion removido - tokens ya no expiran automaticamente
            if (import.meta.env.DEV) {
                console.log('[AuthStore] Token guardado (duracion indefinida)');
            }

            // Guardar token de forma compatible con sistema existente
            cache.setItem(TOKEN_STORAGE_KEY, authData.access_token);
            cache.setItem('auth_token', {
                token: authData.access_token
            });

            if (state.user) {
                cache.setItem(USER_STORAGE_KEY, state.user);
            }
        } catch (error) {
            console.error('Error guardando datos de autenticaci�n:', error);
            throw new Error('Error al guardar datos de sesi�n');
        }
    };

    const loadAuthDataFromCache = () => {
        try {
            // Intentar cargar tanto el formato nuevo como el existente
            let tokenData = cache.getItem('auth_token');
            let tokenString = cache.getItem(TOKEN_STORAGE_KEY);
            const userData = cache.getItem(USER_STORAGE_KEY);

            // Si no hay estructura de auth_token pero si token string, usar directamente
            if (!tokenData && tokenString && typeof tokenString === 'string') {
                tokenData = {
                    token: tokenString
                };
            }

            // Verificar que exista token (sin validar expiracion)
            if (tokenData && tokenData.token) {
                state.token = tokenData.token;
                state.user = userData;
                state.isAuthenticated = true;
                state.lastActivity = Date.now();
                return true;
            }

            // Token expirado o inv�lido, limpiar
            clearAuthData();
            return false;
        } catch (error) {
            clearAuthData();
            return false;
        }
    };

    const clearAuthData = () => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        // state.tokenExpiresAt = null; // REMOVIDO - ya no se usa
        state.lastActivity = Date.now();

        // Limpiar cache (tanto claves nuevas como existentes)
        cache.removeItem(TOKEN_STORAGE_KEY);
        cache.removeItem('auth_token');
        cache.removeItem(USER_STORAGE_KEY);
    };

    // Métodos de autenticación
    const login = async (dni, password) => {
        // Validar entrada
        const validation = validateLoginData(dni, password);
        if (!validation.isValid) {
            throw {
                success: false,
                message: 'Datos de entrada inv�lidos',
                data: null,
                errors: validation.errors
            };
        }

        state.isLoading = true;

        try {
            const response = await api.post('/auth/login', {
                dni: dni.trim(),
                password: password
            });

            if (response.success && response.data) {
                saveAuthData(response.data);
                const ticketsStore = useTicketsStore();
                ticketsStore.initEchoListeners();
                const tasksStore = useTasksStore();
                tasksStore.initEchoListeners(response.data.user?.id);
                return {
                    success: true,
                    message: response.message || 'Login exitoso',
                    data: response.data
                };
            } else {
                throw response;
            }
        } catch (error) {
            clearAuthData();
            // Error handling
            if (apiUtils.isConnectionError(error)) {
                throw {
                    ...error,
                    message: 'No se puede conectar al servidor. Verifique que el backend esté disponible.',
                    errors: {
                        ...error.errors,
                        connection_type: 'backend_unavailable'
                    }
                };
            } else if (apiUtils.isServerUnavailable(error)) {
                throw {
                    ...error,
                    message: 'El servidor no está disponible temporalmente. Intente más tarde.',
                    errors: {
                        ...error.errors,
                        connection_type: 'server_maintenance'
                    }
                };
            }

            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const register = async (userData) => {
        // Validar entrada
        const validation = validateRegisterData(userData);
        if (!validation.isValid) {
            throw {
                success: false,
                message: 'Datos de entrada inv�lidos',
                data: null,
                errors: validation.errors
            };
        }

        state.isLoading = true;

        try {
            // Limpiar y preparar datos
            const cleanData = {
                name: userData.name.trim(),
                dni: userData.dni.trim(),
                email: userData.email.trim().toLowerCase(),
                password: userData.password,
                password_confirmation: userData.password_confirmation,
                position: userData.position.trim(),
                nick: userData.nick.trim(),
                phone: userData.phone.trim()
            };

            const response = await api.post('/auth/register', cleanData);

            if (response.success && response.data) {
                saveAuthData(response.data);
                return {
                    success: true,
                    message: response.message || 'Registro exitoso',
                    data: response.data
                };
            } else {
                throw response;
            }
        } catch (error) {
            clearAuthData();
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const logout = async () => {
        state.isLoading = true;

        try {
            // Intentar logout en el servidor
            if (state.token) {
                await api.post('/auth/logout');
            }
        } catch (error) {
            // Error handled
        } finally {
            // Limpiar datos locales siempre — capturar userId antes de clearAuthData
            const userId = state.user?.id;
            const ticketsStore = useTicketsStore();
            ticketsStore.leaveEchoChannels();
            const tasksStore = useTasksStore();
            tasksStore.leaveEchoChannels(userId);
            clearAuthData();
            state.isLoading = false;
        }
    };

    const refreshToken = async () => {
        if (!state.token) {
            throw new Error('No hay token para refrescar');
        }

        state.isLoading = true;

        try {
            const response = await api.post('/auth/refresh');

            if (response.success && response.data) {
                // Actualizar solo el token, mantener datos de usuario
                const authData = {
                    ...response.data,
                    user: state.user // Mantener usuario existente
                };

                saveAuthData(authData);
                return {
                    success: true,
                    message: response.message || 'Token renovado',
                    data: response.data
                };
            } else {
                throw response;
            }
        } catch (error) {
            clearAuthData();
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const getCurrentUser = async () => {
        if (!state.token) {
            throw new Error('No hay token de acceso');
        }

        try {
            const response = await api.get('/auth/me');

            if (response.success && response.data) {
                state.user = response.data;
                cache.setItem(USER_STORAGE_KEY, response.data);
                return response.data;
            } else {
                throw response;
            }
        } catch (error) {
            // Si falla obtener usuario actual, puede ser token inv�lido
            if (error.status === 401) {
                clearAuthData();
            }
            throw error;
        }
    };

    // M�todo para refrescar token autom�ticamente si es necesario
    const checkAndRefreshToken = async () => {
        if (!state.isAuthenticated || !state.token) {
            return false;
        }

        // NOTA: Validacion de expiracion removida - tokens ya no expiran
        // Solo verificamos que exista autenticacion
        return true;
    };

    // M�todo para actualizar actividad del usuario
    const updateActivity = () => {
        if (state.isAuthenticated) {
            state.lastActivity = Date.now();
        }
    };

    // Variable para almacenar el interval de refresh
    let refreshInterval = null;

    // Inicializar store al cargar
    const initialize = async () => {
        const hasSession = loadAuthDataFromCache();

        // NOTA: setInterval auto-refresh removido - tokens ya no expiran
        // No es necesario refrescar periodicamente

        // Forzar refresco de /auth/me para traer permisos/roles actualizados:
        // la sesión cacheada puede ser previa a cambios de RBAC y el menú/rutas
        // ahora se gatean por permiso. Si falla por red, se conserva el usuario
        // cacheado; un 401 limpia la sesión dentro de getCurrentUser().
        if (hasSession && state.token) {
            try {
                await getCurrentUser();
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('[AuthStore] No se pudo refrescar /auth/me al iniciar, se usa la sesión cacheada:', error);
                }
            }
        }

        // Si hay sesión activa (recarga de página), iniciar canales Echo
        if (state.isAuthenticated && state.user?.id) {
            const ticketsStore = useTicketsStore();
            ticketsStore.initEchoListeners();
            const tasksStore = useTasksStore();
            tasksStore.initEchoListeners(state.user.id);
        }

        // Marcar como inicializado
        state.isInitialized = true;

        return refreshInterval;
    };

    // M�todo para limpiar recursos (NO datos de sesión)
    const cleanup = () => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        // NO llamar clearAuthData() - queremos mantener la sesión
    };

    return {
        // Estado
        state,

        // Computadas
        getUser,
        getToken,
        isLoggedIn,
        isInitialized,
        // isTokenExpired y shouldRefreshToken REMOVIDOS

        // M�todos p�blicos
        login,
        register,
        logout,
        refreshToken,
        getCurrentUser,
        checkAndRefreshToken,
        updateActivity,
        clearAuthData,
        initialize,
        cleanup,

        // Utilidades
        validateLoginData,
        validateRegisterData
    };
});
