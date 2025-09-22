import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

export const api_url = import.meta.env.VITE_API_URL;

const instance = axios.create({
    baseURL: api_url,
    timeout: 90000000, // 30 segundos (reducido de 90000000)
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip' // Para compresión automática
    }
});

// Request interceptor - Agregar token automáticamente
instance.interceptors.request.use(
    (config) => {
        console.log('Request Axios:', config);
        const authStore = useAuthStore();
        const token = authStore.getToken;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log para debugging (remover en producción)
        if (import.meta.env.DEV) {
            console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
                headers: config.headers,
                data: config.data
            });
        }

        return config;
    },
    (error) => {
        console.error('[API] Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - Manejar respuestas estandarizadas
instance.interceptors.response.use(
    function (response) {
        // Para respuestas blob (archivos), devolver respuesta completa
        if (response.config.responseType === 'blob') {
            return response;
        }

        console.log('Response Axios:', response);

        const data = response.data;

        // Validar formato de respuesta estandarizado
        if (typeof data === 'object' && data !== null) {
            if (!Object.prototype.hasOwnProperty.call(data, 'success')) {
                console.warn('[API] Respuesta no sigue formato estandarizado:', data);
            }

            // Log para debugging (remover en producción)
            if (import.meta.env.DEV && data.success === false) {
                console.warn('[API] Backend error response:', data);
            }
        }

        // Devolver solo la data del backend (que ya está estandarizada)
        return data;
    },
    async function (error) {
        const originalRequest = error.config;

        // Auto-refresh en 401 (excepto endpoints de auth)
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
            originalRequest._retry = true;

            try {
                const authStore = useAuthStore();
                console.log('[Auth] Intentando refresh automático...');

                await authStore.refreshToken();
                const newToken = authStore.getToken;

                if (newToken) {
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    console.log('[Auth] Reintentando request con nuevo token');
                    return instance(originalRequest);
                }
            } catch (refreshError) {
                console.warn('[Auth] Refresh automático falló:', refreshError);
                const { clearAuthData } = useAuthStore();
                clearAuthData();

                // Redirigir a login
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }

                return Promise.reject(createErrorResponse(401, 'Sesión expirada', refreshError));
            }
        }

        // Procesar respuesta de error del backend
        return Promise.reject(processBackendError(error));
    }
);

/**
 * Procesa errores del backend manteniendo formato estandarizado
 */
function processBackendError(error) {
    const backendData = error.response?.data;

    // Si el backend ya devolvió formato estandarizado, usarlo
    if (backendData && typeof backendData === 'object' && Object.prototype.hasOwnProperty.call(backendData, 'success')) {
        // Agregar información adicional útil para debugging
        const enhancedError = {
            ...backendData,
            status: error.response?.status || 0,
            statusText: error.response?.statusText || 'Unknown Error'
        };

        // Log detallado en desarrollo
        if (import.meta.env.DEV) {
            console.error('[API] Backend Error Response:', {
                url: error.config?.url,
                method: error.config?.method?.toUpperCase(),
                status: error.response?.status,
                data: backendData
            });
        }

        return enhancedError;
    }

    // Si no hay respuesta del backend, crear formato estandarizado
    return createErrorResponse(error.response?.status || 0, getErrorMessage(error), error);
}

/**
 * Crea respuesta de error en formato estandarizado
 */
function createErrorResponse(status, message, originalError) {
    const errorResponse = {
        success: false,
        message: message,
        data: null,
        errors: {
            type: originalError?.name || 'NetworkError',
            original_message: originalError?.message || 'Unknown error'
        },
        status: status,
        statusText: originalError?.response?.statusText || 'Network Error'
    };

    // Log en desarrollo
    if (import.meta.env.DEV) {
        console.error('[API] Network/Unexpected Error:', {
            status,
            message,
            originalError
        });
    }

    return errorResponse;
}

/**
 * Obtiene mensaje de error amigable según el tipo/código
 */
function getErrorMessage(error) {
    if (!error.response) {
        if (error.code === 'ECONNABORTED') {
            return 'La solicitud tardó demasiado tiempo. Intente nuevamente.';
        }
        return 'Error de conexión. Verifique su conexión a internet.';
    }

    const status = error.response.status;
    const backendMessage = error.response.data?.message;

    // Si el backend envió un mensaje, usarlo
    if (backendMessage && typeof backendMessage === 'string') {
        return backendMessage;
    }

    // Mensajes por defecto según código HTTP
    switch (status) {
        case 401:
            return 'Credenciales incorrectas o sesión expirada.';
        case 403:
            return 'No tiene permisos para realizar esta acción.';
        case 404:
            return 'El recurso solicitado no fue encontrado.';
        case 422:
            return 'Los datos proporcionados no son válidos.';
        case 429:
            return 'Demasiadas solicitudes. Espere un momento antes de intentar nuevamente.';
        case 500:
            return 'Error interno del servidor. Intente más tarde.';
        case 503:
            return 'Servicio temporalmente no disponible.';
        default:
            return `Error ${status}: ${error.response.statusText || 'Error del servidor'}`;
    }
}

// Funciones de utilidad para el frontend
export const apiUtils = {
    /**
     * Verifica si una respuesta es exitosa
     */
    isSuccess: (response) => {
        return response && response.success === true;
    },

    /**
     * Obtiene los datos de una respuesta exitosa
     */
    getData: (response) => {
        return apiUtils.isSuccess(response) ? response.data : null;
    },

    /**
     * Obtiene el mensaje de una respuesta (éxito o error)
     */
    getMessage: (response) => {
        return response?.message || 'Respuesta sin mensaje';
    },

    /**
     * Obtiene errores de validación de una respuesta de error
     */
    getValidationErrors: (errorResponse) => {
        if (!errorResponse || errorResponse.success !== false) {
            return {};
        }

        const errors = errorResponse.errors || {};

        // Si errors es un objeto plano con arrays de mensajes
        if (typeof errors === 'object' && !Array.isArray(errors)) {
            return errors;
        }

        return {};
    },

    /**
     * Convierte errores de validación a array de strings
     */
    getValidationErrorsFlat: (errorResponse) => {
        const errors = apiUtils.getValidationErrors(errorResponse);
        const flatErrors = [];

        Object.entries(errors).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
                messages.forEach((message) => {
                    flatErrors.push(`${field}: ${message}`);
                });
            } else if (typeof messages === 'string') {
                flatErrors.push(`${field}: ${messages}`);
            }
        });

        return flatErrors;
    },

    /**
     * Verifica si un error es de rate limiting
     */
    isRateLimited: (errorResponse) => {
        return errorResponse?.status === 429 || (errorResponse?.errors && typeof errorResponse.errors === 'object' && Object.keys(errorResponse.errors).some((key) => key.includes('rate_limit')));
    }
};

export default instance;
