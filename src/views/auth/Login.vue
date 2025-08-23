<script setup>
import { apiUtils } from '@/api/axios';
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { useAuth } from '@/composables/useAuth';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

// Composables
const { login, isLoading } = useAuth();
const toast = useToast();

// Estado del formulario
const formData = ref({
    dni: '',
    password: '',
    rememberMe: false
});

// Estado de validación
const errors = ref({});
const isSubmitting = ref(false);

// Computadas
const isFormValid = computed(() => {
    return formData.value.dni.trim().length === 8 && formData.value.password.length >= 8 && Object.keys(errors.value).length === 0;
});

// Métodos de validación
const validateField = (field) => {
    const newErrors = { ...errors.value };

    switch (field) {
        case 'dni':
            if (!formData.value.dni) {
                newErrors.dni = 'DNI es requerido';
            } else if (!/^\d{8}$/.test(formData.value.dni.trim())) {
                newErrors.dni = 'DNI debe contener exactamente 8 dígitos';
            } else {
                delete newErrors.dni;
            }
            break;

        case 'password':
            if (!formData.value.password) {
                newErrors.password = 'Contraseña es requerida';
            } else if (formData.value.password.length < 8) {
                newErrors.password = 'Contraseña debe tener al menos 8 caracteres';
            } else {
                delete newErrors.password;
            }
            break;
    }

    errors.value = newErrors;
};

const validateForm = () => {
    validateField('dni');
    validateField('password');
    return Object.keys(errors.value).length === 0;
};

// Manejo del envío del formulario
const handleSubmit = async () => {
    if (!validateForm()) {
        toast.add({
            severity: 'warn',
            summary: 'Formulario Inválido',
            detail: 'Por favor corrija los errores en el formulario',
            life: 4000
        });
        return;
    }

    isSubmitting.value = true;

    try {
        // Debug: log de datos que se envían
        console.log('Datos de login:', {
            dni: formData.value.dni,
            password: '***hidden***'
        });
        
        const result = await login(formData.value.dni, formData.value.password, {
            redirect: true,
            redirectTo: '/dashboard'
        });

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Bienvenido',
                detail: 'Inicio de sesión exitoso',
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error en login:', error);

        // Manejar errores de validación del backend
        if (error.errors && typeof error.errors === 'object') {
            // Limpiar errores previos y agregar nuevos errores del backend
            const newErrors = {};
            Object.entries(error.errors).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                    newErrors[field] = messages[0];
                } else if (typeof messages === 'string') {
                    newErrors[field] = messages;
                }
            });
            errors.value = newErrors;
        }

        // Mostrar mensaje de error general si no hay errores específicos de campo
        if (!error.errors || Object.keys(error.errors).length === 0) {
            const errorMessage = apiUtils.getMessage(error) || 'Error al iniciar sesión';
            toast.add({
                severity: 'error',
                summary: 'Error de Autenticación',
                detail: errorMessage,
                life: 5000
            });
        }

        // Limpiar contraseña en caso de error
        formData.value.password = '';
    } finally {
        isSubmitting.value = false;
    }
};

// Limpiar errores al escribir
const clearFieldError = (field) => {
    if (errors.value[field]) {
        const newErrors = { ...errors.value };
        delete newErrors[field];
        errors.value = newErrors;
    }
};

// Formatear DNI (solo números)
const formatDNI = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 8);
    formData.value.dni = value;
    clearFieldError('dni');
};

onMounted(() => {
    // Focus en el campo DNI al cargar
    document.getElementById('dni')?.focus();
});
</script>

<template>
    <FloatingConfigurator />
    <Toast />

    <div class="login-page">
        <div class="login-container">
            <!-- Panel de imagen -->
            <div class="image-panel">
                <div class="image-overlay">
                    <div class="overlay-content">
                        <img src="/logo-csr.webp" alt="Logo Clínica Santa Rosa" class="overlay-logo" />
                        <div class="overlay-text">
                            <h1>Clínica Santa Rosa</h1>
                            <p>Brindando atención médica de calidad con tecnología moderna y personal altamente capacitado</p>
                            <div class="features">
                                <div class="feature">
                                    <i class="pi pi-shield"></i>
                                    <span>Atención médica especializada</span>
                                </div>
                                <div class="feature">
                                    <i class="pi pi-heart"></i>
                                    <span>Compromiso con su salud</span>
                                </div>
                                <div class="feature">
                                    <i class="pi pi-clock"></i>
                                    <span>Disponible 24/7</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <img src="/img_csr.jpg" alt="Clínica Santa Rosa - Instalaciones" class="clinic-image" />
            </div>

            <!-- Panel de formulario -->
            <div class="form-panel">
                <div class="form-content">
                    <div class="form-header">
                        <h2>Iniciar Sesión</h2>
                        <p>Accede al sistema de gestión de atenciones</p>
                    </div>

                    <form @submit.prevent="handleSubmit" class="login-form">
                        <!-- Campo DNI -->
                        <div class="form-group">
                            <label for="dni" class="form-label">
                                <i class="pi pi-user"></i>
                                Número de DNI
                            </label>
                            <div class="input-wrapper">
                                <InputText
                                    id="dni"
                                    :value="formData.dni"
                                    @input="formatDNI"
                                    @blur="validateField('dni')"
                                    placeholder="12345678"
                                    class="form-input"
                                    :class="{ 'input-error': errors.dni }"
                                    maxlength="8"
                                    :disabled="isSubmitting || isLoading"
                                />
                            </div>
                            <small v-if="errors.dni" class="error-message">
                                <i class="pi pi-exclamation-triangle"></i>
                                {{ errors.dni }}
                            </small>
                        </div>

                        <!-- Campo Contraseña -->
                        <div class="form-group">
                            <label for="password" class="form-label">
                                <i class="pi pi-lock"></i>
                                Contraseña
                            </label>
                            <div class="input-wrapper">
                                <Password
                                    id="password"
                                    v-model="formData.password"
                                    @input="clearFieldError('password')"
                                    @blur="validateField('password')"
                                    placeholder="Ingresa tu contraseña"
                                    :toggleMask="true"
                                    class="form-password"
                                    :class="{ 'input-error': errors.password }"
                                    :pt="{
                                        input: { class: 'password-field' },
                                        showIcon: { class: 'password-icon' },
                                        hideIcon: { class: 'password-icon' }
                                    }"
                                    :feedback="false"
                                    :disabled="isSubmitting || isLoading"
                                    fluid
                                />
                            </div>
                            <small v-if="errors.password" class="error-message">
                                <i class="pi pi-exclamation-triangle"></i>
                                {{ errors.password }}
                            </small>
                        </div>

                        <!-- Opciones adicionales -->
                        <div class="form-options">
                            <div class="checkbox-group">
                                <Checkbox v-model="formData.rememberMe" inputId="remember" binary class="custom-checkbox" :disabled="isSubmitting || isLoading" />
                                <label for="remember" class="checkbox-label"> Mantener sesión iniciada </label>
                            </div>
                            <a href="#" class="forgot-password"> ¿Olvidaste tu contraseña? </a>
                        </div>

                        <!-- Botón de login -->
                        <Button type="submit" class="login-button" :disabled="!isFormValid || isSubmitting || isLoading" :loading="isSubmitting || isLoading">
                            <template v-if="isSubmitting || isLoading">
                                <ProgressSpinner class="button-spinner" />
                                Iniciando sesión...
                            </template>
                            <template v-else>
                                <i class="pi pi-sign-in"></i>
                                Iniciar Sesión
                            </template>
                        </Button>
                    </form>

                    <!-- Footer info -->
                    <div class="form-footer">
                        <div class="security-info">
                            <div class="security-item">
                                <i class="pi pi-shield"></i>
                                <span>Conexión SSL segura</span>
                            </div>
                            <div class="security-item">
                                <i class="pi pi-clock"></i>
                                <span>Sesión automática por 60min</span>
                            </div>
                        </div>
                        <div class="support">
                            <p>¿Necesitas ayuda? <a href="#" class="support-link">Contacta con soporte técnico</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Variables CSS */
:root {
    --primary: #06b6d4;
    --primary-dark: #0891b2;
    --primary-light: #67e8f9;
    --surface: #ffffff;
    --surface-50: #f8fafc;
    --surface-100: #f1f5f9;
    --surface-200: #e2e8f0;
    --surface-700: #334155;
    --surface-800: #1e293b;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --error: #ef4444;
    --success: #10b981;
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Layout principal */
.login-page {
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.login-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
}

/* Panel de imagen */
.image-panel {
    position: relative;
    overflow: hidden;
    background: var(--surface-800);
}

.clinic-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
}

.image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.9) 0%, rgba(8, 145, 178, 0.85) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
}

.overlay-content {
    text-align: center;
    color: white;
    max-width: 400px;
    padding: 2rem;
}

.overlay-logo {
    width: 100px;
    height: 100px;
    object-fit: contain;
    margin-bottom: 2rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    padding: 1rem;
    backdrop-filter: blur(10px);
}

.overlay-text h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.overlay-text p {
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 0 0 2rem 0;
    opacity: 0.95;
}

.features {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
}

.feature {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1rem;
}

.feature i {
    width: 20px;
    color: var(--primary-light);
    font-size: 1.1rem;
}

/* Panel de formulario */
.form-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    background: var(--surface);
}

.form-content {
    width: 100%;
    max-width: 420px;
}

.form-header {
    text-align: center;
    margin-bottom: 3rem;
}

.header-logo {
    margin-bottom: 1.5rem;
}

.logo-small {
    width: 60px;
    height: 60px;
    object-fit: contain;
}

.form-header h2 {
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
    letter-spacing: -0.025em;
}

.form-header p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin: 0;
    font-weight: 400;
}

/* Formulario */
.login-form {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    margin-bottom: 2.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.form-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.9rem;
}

.form-label i {
    color: var(--primary);
    font-size: 0.9rem;
}

.input-wrapper {
    position: relative;
}

.form-input {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--surface-200);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--surface-50);
    transition: all 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: var(--primary);
    background: var(--surface);
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
}

.form-input.input-error {
    border-color: var(--error);
    background: #fef2f2;
}

.form-password {
    width: 100%;
}

.form-password :deep(.password-field) {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--surface-200);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--surface-50);
    transition: all 0.3s ease;
}

.form-password :deep(.password-field:focus) {
    outline: none;
    border-color: var(--primary);
    background: var(--surface);
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
}

.form-password.input-error :deep(.password-field) {
    border-color: var(--error);
    background: #fef2f2;
}

.form-password :deep(.password-icon) {
    color: var(--text-secondary);
}

.error-message {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--error);
    font-size: 0.875rem;
}

.error-message i {
    font-size: 0.75rem;
}

/* Opciones del formulario */
.form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.75rem 0 1.5rem 0;
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.checkbox-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    cursor: pointer;
}

.forgot-password {
    font-size: 0.9rem;
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
}

.forgot-password:hover {
    text-decoration: underline;
}

/* Botón de login */
.login-button {
    width: 100%;
    padding: 1.25rem 1.5rem;
    background: #06b6d4 !important;
    border: none !important;
    border-radius: 12px;
    color: #ffffff !important;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    box-shadow: 0 2px 8px 0 rgba(6, 182, 212, 0.2);
    min-height: 56px;
    position: relative;
    overflow: hidden;
}

.login-button:not(:disabled):hover {
    background: #0891b2 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px 0 rgba(6, 182, 212, 0.3);
}

.login-button:disabled {
    background: var(--surface-200) !important;
    color: var(--text-secondary) !important;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.button-spinner {
    width: 20px;
    height: 20px;
}

/* Footer */
.form-footer {
    border-top: 1px solid var(--surface-200);
    padding-top: 2rem;
    margin-top: 1rem;
}

.security-info {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
}

.security-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.security-item i {
    color: var(--success);
    font-size: 0.8rem;
}

.support {
    text-align: center;
}

.support p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.support-link {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
}

.support-link:hover {
    text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .login-container {
        grid-template-columns: 1fr;
    }

    .image-panel {
        min-height: 40vh;
        order: -1;
    }

    .overlay-text h1 {
        font-size: 2rem;
    }

    .overlay-text p {
        font-size: 1rem;
    }

    .features {
        flex-direction: row;
        justify-content: center;
        gap: 1.5rem;
    }

    .feature {
        flex-direction: column;
        text-align: center;
        gap: 0.5rem;
    }

    .feature span {
        font-size: 0.875rem;
    }
}

@media (max-width: 768px) {
    .form-panel {
        padding: 1.5rem;
    }

    .form-content {
        max-width: none;
    }

    .image-panel {
        min-height: 35vh;
    }

    .overlay-content {
        padding: 1.5rem;
    }

    .overlay-logo {
        width: 80px;
        height: 80px;
        margin-bottom: 1.5rem;
    }

    .overlay-text h1 {
        font-size: 1.75rem;
    }

    .features {
        gap: 1rem;
    }

    .form-header h2 {
        font-size: 1.75rem;
    }

    .security-info {
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
    }
}

@media (max-width: 480px) {
    .form-panel {
        padding: 1rem;
    }

    .image-panel {
        min-height: 30vh;
    }

    .overlay-text h1 {
        font-size: 1.5rem;
    }

    .overlay-text p {
        font-size: 0.9rem;
    }

    .features {
        flex-direction: column;
        gap: 0.75rem;
    }

    .feature {
        flex-direction: row;
        text-align: left;
        justify-content: center;
    }

    .form-options {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    :root {
        --surface: #1e293b;
        --surface-50: #334155;
        --surface-100: #475569;
        --surface-200: #64748b;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
    }

    .form-panel {
        background: var(--surface);
    }

    .form-input,
    .form-password :deep(.password-field) {
        background: var(--surface-50);
        border-color: var(--surface-200);
        color: var(--text-primary);
    }

    .form-input:focus,
    .form-password :deep(.password-field:focus) {
        background: var(--surface);
    }

    .form-footer {
        border-color: var(--surface-200);
    }
}

/* Animaciones */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(30px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.form-content {
    animation: slideIn 0.6s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.overlay-content {
    animation: fadeInUp 0.8s ease-out;
}
</style>
