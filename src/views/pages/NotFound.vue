<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import Button from 'primevue/button';
</script>

<template>
    <FloatingConfigurator />
    <div class="not-found-page">
        <!-- Background decorativo -->
        <div class="background-decoration">
            <div class="decoration-circle circle-1"></div>
            <div class="decoration-circle circle-2"></div>
            <div class="decoration-circle circle-3"></div>
        </div>

        <div class="content-wrapper">
            <!-- Header con logo -->
            <div class="header-section">
                <img src="/logo-csr.webp" alt="Logo Clínica Santa Rosa" class="clinic-logo" />
                <h2 class="clinic-name">Clínica Santa Rosa</h2>
            </div>

            <!-- Número 404 con diseño médico -->
            <div class="error-section">
                <div class="error-number">
                    <span class="number">4</span>
                    <div class="medical-icon">
                        <i class="pi pi-heart-fill"></i>
                    </div>
                    <span class="number">4</span>
                </div>
                <h1 class="error-title">Página No Encontrada</h1>
                <p class="error-description">
                    Lo sentimos, la página que buscas no está disponible.<br />
                    Es posible que haya sido movida o eliminada.
                </p>
            </div>

            <!-- Botón principal -->
            <div class="main-action">
                <Button as="router-link" to="/" class="home-button" size="large">
                    <i class="pi pi-home"></i>
                    Volver al Inicio
                </Button>
            </div>

            <!-- Footer con información de soporte -->
            <div class="footer-section">
                <div class="support-info">
                    <i class="pi pi-phone"></i>
                    <span>¿Necesitas ayuda? Contacta con soporte técnico</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* Variables específicas para la página 404 */
.not-found-page {
    --csr-primary: #06b6d4;
    --csr-primary-dark: #0891b2;
    --csr-primary-light: #67e8f9;
    --csr-accent: #10b981;
    --csr-error: #ef4444;
    --csr-surface: #ffffff;
    --csr-surface-50: #f8fafc;
    --csr-surface-100: #f1f5f9;
    --csr-surface-200: #e2e8f0;
    --csr-text-primary: #1e293b;
    --csr-text-secondary: #64748b;
    --csr-shadow: 0 10px 25px rgba(6, 182, 212, 0.1);
    --csr-shadow-lg: 0 20px 40px rgba(6, 182, 212, 0.15);
}

/* Layout principal */
.not-found-page {
    min-height: 100vh;
    background: linear-gradient(135deg, var(--csr-surface) 0%, var(--csr-surface-50) 100%);
    position: relative;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Decoración de fondo */
.background-decoration {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
}

.decoration-circle {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--csr-primary-light), var(--csr-primary));
    opacity: 0.1;
}

.circle-1 {
    width: 300px;
    height: 300px;
    top: -150px;
    right: -150px;
    animation: float 6s ease-in-out infinite;
}

.circle-2 {
    width: 200px;
    height: 200px;
    bottom: -100px;
    left: -100px;
    animation: float 8s ease-in-out infinite reverse;
}

.circle-3 {
    width: 150px;
    height: 150px;
    top: 50%;
    left: 10%;
    animation: float 10s ease-in-out infinite;
}

/* Contenedor principal */
.content-wrapper {
    position: relative;
    z-index: 2;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
}

/* Header con logo */
.not-found-page .header-section {
    margin-bottom: 3rem;
    animation: fadeInUp 1s ease-out;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.not-found-page .clinic-logo {
    width: 80px;
    height: 80px;
    object-fit: contain;
    margin-bottom: 1rem;
    filter: drop-shadow(0 4px 8px rgba(6, 182, 212, 0.2));
    display: block;
    margin-left: auto;
    margin-right: auto;
}

.not-found-page .clinic-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    letter-spacing: -0.025em;
}

/* Sección de error con diseño médico */
.not-found-page .error-section {
    margin-bottom: 4rem;
    animation: fadeInUp 1s ease-out 0.2s both;
}

.not-found-page .error-number {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    gap: 1rem;
}

.not-found-page .number {
    font-size: 8rem;
    font-weight: 900;
    color: #06b6d4;
    text-shadow: 0 4px 8px rgba(6, 182, 212, 0.3);
    line-height: 0.8;
}

.not-found-page .medical-icon {
    background: linear-gradient(135deg, #ef4444, #f87171);
    border-radius: 50%;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
    animation: heartbeat 2s ease-in-out infinite;
}

.not-found-page .medical-icon i {
    font-size: 2.5rem;
    color: white;
}

.not-found-page .error-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1rem 0;
    line-height: 1.2;
}

.not-found-page .error-description {
    font-size: 1.1rem;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
    max-width: 500px;
}

/* Botón principal */
.main-action {
    margin-bottom: 3rem;
    animation: fadeInUp 1s ease-out 0.4s both;
}

.not-found-page .home-button {
    background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 1.25rem 2.5rem !important;
    font-size: 1.2rem !important;
    font-weight: 600 !important;
    color: #ffffff !important;
    box-shadow: 0 8px 20px rgba(6, 182, 212, 0.4) !important;
    transition: all 0.3s ease !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.75rem !important;
    text-decoration: none !important;
    min-height: 56px !important;
    cursor: pointer !important;
}

.not-found-page .home-button:hover {
    background: linear-gradient(135deg, #0891b2, #0e7490) !important;
    transform: translateY(-3px) !important;
    box-shadow: 0 12px 24px rgba(6, 182, 212, 0.6) !important;
}

.not-found-page .home-button i {
    font-size: 1.1rem !important;
    color: #ffffff !important;
}

/* Footer */
.not-found-page .footer-section {
    animation: fadeInUp 1s ease-out 0.6s both;
}

.not-found-page .support-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #64748b;
    font-size: 0.9rem;
    padding: 1rem 1.5rem;
    background: #f1f5f9;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.not-found-page .support-info i {
    color: #10b981;
}

/* Animaciones */
@keyframes float {
    0%,
    100% {
        transform: translateY(0px) rotate(0deg);
    }
    50% {
        transform: translateY(-20px) rotate(5deg);
    }
}

@keyframes heartbeat {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
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

/* Responsive Design */
@media (max-width: 768px) {
    .not-found-page .content-wrapper {
        padding: 1rem;
    }

    .not-found-page .number {
        font-size: 6rem;
    }

    .not-found-page .medical-icon {
        width: 60px;
        height: 60px;
    }

    .not-found-page .medical-icon i {
        font-size: 2rem;
    }

    .not-found-page .error-title {
        font-size: 2rem;
    }

    .not-found-page .clinic-logo {
        width: 60px;
        height: 60px;
    }

    .not-found-page .clinic-name {
        font-size: 1.25rem;
    }

    .not-found-page .home-button {
        padding: 1rem 2rem !important;
        font-size: 1.1rem !important;
    }
}

@media (max-width: 480px) {
    .not-found-page .number {
        font-size: 4rem;
    }

    .not-found-page .error-number {
        gap: 0.5rem;
    }

    .not-found-page .medical-icon {
        width: 50px;
        height: 50px;
    }

    .not-found-page .medical-icon i {
        font-size: 1.5rem;
    }

    .not-found-page .error-title {
        font-size: 1.75rem;
    }

    .not-found-page .error-description {
        font-size: 1rem;
    }

    .not-found-page .home-button {
        padding: 0.875rem 1.5rem !important;
        font-size: 1rem !important;
    }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    .not-found-page {
        --csr-surface: #1e293b;
        --csr-surface-50: #334155;
        --csr-surface-100: #475569;
        --csr-surface-200: #64748b;
        --csr-text-primary: #f1f5f9;
        --csr-text-secondary: #94a3b8;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    }

    .not-found-page .clinic-name {
        color: #f1f5f9;
    }

    .not-found-page .error-title {
        color: #f1f5f9;
    }

    .not-found-page .error-description {
        color: #94a3b8;
    }

    .not-found-page .support-info {
        background: #475569;
        border-color: #64748b;
        color: #94a3b8;
    }
}
</style>
