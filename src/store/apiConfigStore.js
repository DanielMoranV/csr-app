import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

// URLs de las APIs
const CLOUD_API_URL = import.meta.env.VITE_API_URL || 'https://api.csr.net.pe/api';
const LOCAL_API_URL = 'https://192.168.18.50:8443/api';

// Intervalo de verificación de salud (30 segundos)
const HEALTH_CHECK_INTERVAL = 30000;

// Timeout para health check (2 segundos)
const HEALTH_CHECK_TIMEOUT = 2000;

export const useApiConfigStore = defineStore('apiConfig', () => {
    // Estado reactivo
    const state = reactive({
        currentMode: 'cloud', // 'local' o 'cloud'
        currentBaseURL: CLOUD_API_URL,
        isLocalAvailable: false,
        isCheckingHealth: false,
        lastHealthCheck: null,
        healthCheckError: null,
        isInitialized: false
    });

    // Computadas
    const getCurrentMode = computed(() => state.currentMode);
    const getCurrentBaseURL = computed(() => state.currentBaseURL);
    const getIsLocalAvailable = computed(() => state.isLocalAvailable);
    const isInitialized = computed(() => state.isInitialized);

    /**
     * Verifica la salud de la API local
     * @returns {Promise<boolean>} true si la API local está disponible
     */
    const checkLocalHealth = async () => {
        try {
            state.isCheckingHealth = true;
            state.healthCheckError = null;

            // Crear instancia temporal de axios solo para health check
            const healthCheckInstance = axios.create({
                baseURL: LOCAL_API_URL,
                timeout: HEALTH_CHECK_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            });

            const response = await healthCheckInstance.get('/health');

            // Verificar que la respuesta sea válida
            const isHealthy = response.data && response.data.status === 'healthy';

            state.lastHealthCheck = new Date();

            if (import.meta.env.DEV) {
                console.log('[ApiConfig] Health check result:', {
                    isHealthy,
                    response: response.data,
                    timestamp: state.lastHealthCheck
                });
            }

            return isHealthy;
        } catch (error) {
            state.healthCheckError = error.message || 'Health check failed';

            if (import.meta.env.DEV) {
                console.log('[ApiConfig] Health check failed:', {
                    error: error.message,
                    code: error.code
                });
            }

            return false;
        } finally {
            state.isCheckingHealth = false;
        }
    };

    /**
     * Actualiza el modo de API y la URL base
     * @param {string} mode - 'local' o 'cloud'
     */
    const setApiMode = (mode) => {
        const previousMode = state.currentMode;

        if (mode === 'local') {
            state.currentMode = 'local';
            state.currentBaseURL = LOCAL_API_URL;
            state.isLocalAvailable = true;
        } else {
            state.currentMode = 'cloud';
            state.currentBaseURL = CLOUD_API_URL;
            state.isLocalAvailable = false;
        }

        if (import.meta.env.DEV && previousMode !== mode) {
            console.log('[ApiConfig] API mode changed:', {
                from: previousMode,
                to: mode,
                baseURL: state.currentBaseURL
            });
        }
    };

    /**
     * Verifica la salud y actualiza el modo si es necesario
     */
    const checkAndUpdateMode = async () => {
        const isLocalHealthy = await checkLocalHealth();

        // Si la API local está disponible y no estamos en modo local, cambiar
        if (isLocalHealthy && state.currentMode !== 'local') {
            setApiMode('local');
        }
        // Si la API local no está disponible y estamos en modo local, cambiar a cloud
        else if (!isLocalHealthy && state.currentMode === 'local') {
            setApiMode('cloud');
        }
    };

    // Variable para almacenar el interval de health check
    let healthCheckInterval = null;

    /**
     * Inicializa el sistema de configuración de API
     */
    const initialize = async () => {
        if (state.isInitialized) {
            console.warn('[ApiConfig] Already initialized');
            return;
        }

        if (import.meta.env.DEV) {
            console.log('[ApiConfig] Initializing API configuration system...');
        }

        // Verificación inicial de salud
        await checkAndUpdateMode();

        // Configurar verificación periódica
        healthCheckInterval = setInterval(async () => {
            await checkAndUpdateMode();
        }, HEALTH_CHECK_INTERVAL);

        state.isInitialized = true;

        if (import.meta.env.DEV) {
            console.log('[ApiConfig] Initialization complete:', {
                mode: state.currentMode,
                baseURL: state.currentBaseURL,
                checkInterval: `${HEALTH_CHECK_INTERVAL / 1000}s`
            });
        }
    };

    /**
     * Limpia los recursos (detiene el health check periódico)
     */
    const cleanup = () => {
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }

        if (import.meta.env.DEV) {
            console.log('[ApiConfig] Cleanup complete');
        }
    };

    /**
     * Fuerza un modo específico (útil para debugging)
     * @param {string} mode - 'local' o 'cloud'
     */
    const forceMode = (mode) => {
        if (mode !== 'local' && mode !== 'cloud') {
            console.error('[ApiConfig] Invalid mode:', mode);
            return;
        }

        setApiMode(mode);

        if (import.meta.env.DEV) {
            console.log('[ApiConfig] Mode forced to:', mode);
        }
    };

    return {
        // Estado
        state,

        // Computadas
        getCurrentMode,
        getCurrentBaseURL,
        getIsLocalAvailable,
        isInitialized,

        // Métodos públicos
        initialize,
        cleanup,
        checkLocalHealth,
        checkAndUpdateMode,
        forceMode,

        // Constantes (para referencia)
        CLOUD_API_URL,
        LOCAL_API_URL
    };
});
