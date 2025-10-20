import api, { apiUtils } from '@/api/axios.js';
import cache from '@/utils/cache.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { useTicketsStore } from './ticketsStore';

// Configuración de seguridad
const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'currentUser';
const REFRESH_THRESHOLD_MINUTES = 5; // Refrescar token 5 minutos antes de expirar

export const useAuthStore = defineStore('auth', () => {
    // Estado reactivo
    const state = reactive({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        tokenExpiresAt: null,
        lastActivity: Date.now(),
        isInitialized: false // Flag para saber si ya se inicializó
    });

    // Computadas
    const getUser = computed(() => state.user);
    const getToken = computed(() => state.token);

    const isLoggedIn = computed(() => state.isAuthenticated && !!state.token);
    const isInitialized = computed(() => state.isInitialized);
    const isTokenExpired = computed(() => {
        if (!state.tokenExpiresAt) return true;
        return Date.now() >= state.tokenExpiresAt;
    });
    const shouldRefreshToken = computed(() => {
        if (!state.tokenExpiresAt) return false;
        const thresholdMs = REFRESH_THRESHOLD_MINUTES * 60 * 1000;
        return state.tokenExpiresAt - Date.now() <= thresholdMs;
    });

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

            // Calcular tiempo de expiraci�n con validaci�n mejorada
            let expiresInSeconds = authData.expires_in;

            // Validar que expires_in est� presente y sea v�lido
            if (!expiresInSeconds || typeof expiresInSeconds !== 'number' || expiresInSeconds <= 0) {
                console.warn('⚠️ [AuthStore] expires_in no proporcionado o inv�lido, usando 3600s (1 hora) por defecto');
                expiresInSeconds = 3600; // Default: 1 hora
            } else if (import.meta.env.DEV) {
                console.log(`[AuthStore] Token expira en ${expiresInSeconds} segundos (${Math.round(expiresInSeconds / 60)} minutos)`);
            }

            const expiresInMs = expiresInSeconds * 1000;
            state.tokenExpiresAt = Date.now() + expiresInMs;
            state.lastActivity = Date.now();

            // Guardar token de forma compatible con sistema existente
            cache.setItem(TOKEN_STORAGE_KEY, authData.access_token);
            cache.setItem('auth_token', {
                token: authData.access_token,
                expiresAt: state.tokenExpiresAt
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

            // Si no hay estructura de auth_token pero sí token string, crear estructura
            if (!tokenData && tokenString && typeof tokenString === 'string') {
                // Asumir token válido por 1 hora desde ahora si no hay expiración
                tokenData = {
                    token: tokenString,
                    expiresAt: Date.now() + 3600 * 1000 // 1 hora
                };
            }

            if (tokenData && tokenData.token && tokenData.expiresAt) {
                const now = Date.now();
                const isExpired = now >= tokenData.expiresAt;

                // Verificar si el token no ha expirado
                if (!isExpired) {
                    state.token = tokenData.token;
                    state.tokenExpiresAt = tokenData.expiresAt;
                    state.user = userData;
                    state.isAuthenticated = true;
                    state.lastActivity = Date.now();
                    return true;
                }
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
        state.tokenExpiresAt = null;
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

            // Mejorar el mensaje de error según el tipo
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
            // Log del error pero continuar con logout local
            console.warn('Error en logout del servidor:', error);
        } finally {
            // Limpiar datos locales siempre
            const ticketsStore = useTicketsStore();
            ticketsStore.leaveEchoChannels();
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

        if (isTokenExpired.value) {
            clearAuthData();
            return false;
        }

        if (shouldRefreshToken.value) {
            try {
                await refreshToken();
                return true;
            } catch (error) {
                clearAuthData();
                return false;
            }
        }

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
    const initialize = () => {
        loadAuthDataFromCache();

        // Limpiar interval previo si existe
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // Auto-refrescar token peri�dicamente
        refreshInterval = setInterval(async () => {
            if (state.isAuthenticated && shouldRefreshToken.value) {
                try {
                    await refreshToken();
                } catch (error) {
                    clearInterval(refreshInterval);
                    refreshInterval = null;
                }
            }
        }, 60000); // Cada minuto

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
        isTokenExpired,
        shouldRefreshToken,

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
