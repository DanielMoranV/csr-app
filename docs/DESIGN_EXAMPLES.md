# Design System - Ejemplos de Código

> Ejemplos completos listos para copiar y usar en tu proyecto

## 📑 Índice

- [Headers y Títulos](#headers-y-títulos)
- [Botones](#botones)
- [Cards](#cards)
- [Banners y Alertas](#banners-y-alertas)
- [Badges y Tags](#badges-y-tags)
- [Filtros](#filtros)
- [Tablas](#tablas)

---

## Headers y Títulos

### Header con Icono Animado

```vue
<template>
    <div class="header-section">
        <div class="header-icon-wrapper">
            <i class="pi pi-list-check"></i>
        </div>
        <div class="header-content">
            <h1 class="header-title">Gestión de Tareas</h1>
            <p class="header-subtitle">
                <i class="pi pi-search mr-2"></i>
                Busca y filtra tareas por múltiples criterios
            </p>
        </div>
    </div>
</template>

<style scoped>
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--surface-border);
    position: relative;
}

.header-section::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100px;
    height: 2px;
    background: linear-gradient(90deg, var(--primary-color), transparent);
}

.header-icon-wrapper {
    width: 70px;
    height: 70px;
    border-radius: 18px;
    background: linear-gradient(135deg, #6366f1 0%, #9333ea 50%, #4338ca 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        0 8px 20px rgba(99, 102, 241, 0.3),
        0 4px 12px rgba(147, 51, 234, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
}

.header-icon-wrapper::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
    0%, 100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        box-shadow:
            0 8px 20px rgba(99, 102, 241, 0.3),
            0 4px 12px rgba(147, 51, 234, 0.4);
    }
    50% {
        transform: scale(1.05);
        box-shadow:
            0 12px 28px rgba(99, 102, 241, 0.4),
            0 6px 18px rgba(147, 51, 234, 0.5);
    }
}

.header-icon-wrapper i {
    font-size: 2rem;
    color: white;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.025em;
}

.header-subtitle {
    font-size: 1rem;
    color: var(--text-color-secondary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Dark mode */
:global(.dark) .header-icon-wrapper {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 50%, #6366f1 100%);
}

/* Responsive */
@media (max-width: 768px) {
    .header-section {
        flex-direction: column;
        align-items: flex-start;
    }

    .header-icon-wrapper {
        width: 60px;
        height: 60px;
    }

    .header-title {
        font-size: 1.5rem;
    }
}
</style>
```

---

## Botones

### Botón Primario con Efecto Shimmer

```vue
<template>
    <Button
        icon="pi pi-search"
        label="Buscar"
        class="btn-primary-animated"
        @click="handleClick"
    />
</template>

<style scoped>
.btn-primary-animated {
    background: linear-gradient(135deg, #6366f1 0%, #9333ea 100%) !important;
    border: none !important;
    padding: 0.625rem 1.5rem !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    box-shadow:
        0 3px 12px rgba(99, 102, 241, 0.3),
        0 2px 8px rgba(147, 51, 234, 0.3) !important;
    transition: all 0.3s ease !important;
    color: white !important;
    position: relative;
    overflow: hidden;
}

.btn-primary-animated::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.btn-primary-animated:hover::before {
    transform: translateX(100%);
}

.btn-primary-animated:hover {
    transform: translateY(-2px) !important;
    box-shadow:
        0 5px 18px rgba(99, 102, 241, 0.4),
        0 3px 12px rgba(147, 51, 234, 0.4) !important;
}

.btn-primary-animated:active {
    transform: translateY(0) !important;
}

/* Dark mode */
:global(.dark) .btn-primary-animated {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 100%) !important;
}
</style>
```

### Botón de Éxito (Excel)

```vue
<template>
    <Button
        icon="pi pi-file-excel"
        class="btn-success-animated"
        v-tooltip.top="'Exportar a Excel'"
        @click="exportExcel"
    />
</template>

<style scoped>
.btn-success-animated {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    width: 40px !important;
    height: 40px !important;
    border-radius: 10px !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3) !important;
    transition: all 0.3s ease !important;
    color: white !important;
    position: relative;
    overflow: hidden;
}

.btn-success-animated::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.btn-success-animated:hover::before {
    transform: translateX(100%);
}

.btn-success-animated:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}

/* Dark mode */
:global(.dark) .btn-success-animated {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
}
</style>
```

### Botón de Peligro

```vue
<template>
    <Button
        icon="pi pi-filter-slash"
        class="btn-danger-animated"
        @click="clearFilters"
    />
</template>

<style scoped>
.btn-danger-animated {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
    border: 2px solid #fca5a5 !important;
    color: #ef4444 !important;
    padding: 0.563rem !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    transition: all 0.3s ease !important;
    min-width: 40px;
    position: relative;
    overflow: hidden;
}

.btn-danger-animated::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(239, 68, 68, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.btn-danger-animated:hover::before {
    opacity: 1;
}

.btn-danger-animated:hover {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%) !important;
    border-color: #f87171 !important;
    color: #dc2626 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 3px 12px rgba(239, 68, 68, 0.2) !important;
}

/* Dark mode */
:global(.dark) .btn-danger-animated {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border: 2px solid #f87171 !important;
    color: #fca5a5 !important;
}

:global(.dark) .btn-danger-animated:hover {
    background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%) !important;
    border-color: #fca5a5 !important;
    color: #fecaca !important;
}
</style>
```

---

## Cards

### Card con Borde Animado

```vue
<template>
    <div class="animated-card">
        <div class="card-header">
            <h3>Título de la Card</h3>
        </div>
        <div class="card-content">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.animated-card {
    background: linear-gradient(145deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow:
        0 4px 20px var(--card-shadow),
        0 0 0 1px color-mix(in srgb, var(--primary-color) 10%, var(--surface-border));
    border: 1px solid color-mix(in srgb, var(--primary-color) 10%, var(--surface-border));
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.animated-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #4f46e5, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
    0%, 100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

.animated-card:hover {
    transform: translateY(-2px);
    box-shadow:
        0 6px 30px var(--card-shadow-hover),
        0 0 0 1px color-mix(in srgb, var(--primary-color) 30%, var(--surface-border));
}

.card-header {
    margin-bottom: 1rem;
}

.card-header h3 {
    margin: 0;
    color: var(--text-color);
    font-weight: 600;
}

.card-content {
    color: var(--text-color);
}

/* Variables para dark mode */
.animated-card {
    --card-shadow: rgba(0, 0, 0, 0.08);
    --card-shadow-hover: rgba(0, 0, 0, 0.12);
}

:global(.dark) .animated-card {
    --card-shadow: rgba(0, 0, 0, 0.3);
    --card-shadow-hover: rgba(0, 0, 0, 0.4);
}
</style>
```

---

## Banners y Alertas

### Info Banner Completo

```vue
<template>
    <div class="info-banner" v-if="visible">
        <div class="info-icon-wrapper">
            <i class="pi pi-info-circle"></i>
        </div>
        <div class="info-content">
            <div class="info-title">{{ title }}</div>
            <div class="info-description">{{ description }}</div>
            <div class="info-filters" v-if="filters">
                <span
                    v-for="(filter, index) in filters"
                    :key="index"
                    class="filter-badge"
                >
                    <i :class="filter.icon"></i>
                    {{ filter.label }}
                </span>
            </div>
        </div>
        <Button
            icon="pi pi-times"
            text
            rounded
            class="close-button"
            @click="visible = false"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
    title: String,
    description: String,
    filters: Array
});

const visible = ref(true);
</script>

<style scoped>
.info-banner {
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    border-radius: 14px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    border: 2px solid rgba(96, 165, 250, 0.5);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
    position: relative;
    overflow: hidden;
    animation: slideIn 0.4s ease-out;
}

.info-banner::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes gradientShift {
    0%, 100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

.info-icon-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    position: relative;
    z-index: 1;
}

.info-icon-wrapper i {
    font-size: 1.25rem;
    color: white;
}

.info-content {
    flex: 1;
}

.info-title {
    font-weight: 700;
    font-size: 0.875rem;
    color: #1d4ed8;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.info-description {
    font-size: 0.875rem;
    color: #1e40af;
    margin-bottom: 0.5rem;
}

.info-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
    margin-top: 0.75rem;
}

.filter-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: linear-gradient(135deg, white 0%, #dbeafe 100%);
    padding: 0.438rem 0.875rem;
    border-radius: 8px;
    font-size: 0.813rem;
    font-weight: 600;
    color: #1d4ed8;
    border: 1px solid #93c5fd;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
    transition: all 0.2s ease;
}

.filter-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.filter-badge i {
    font-size: 0.75rem;
}

.close-button {
    color: #64748b !important;
}

.close-button:hover {
    color: #1d4ed8 !important;
}

/* Dark mode */
:global(.dark) .info-banner {
    background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
    border: 2px solid rgba(147, 197, 253, 0.3);
}

:global(.dark) .info-icon-wrapper {
    background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
}

:global(.dark) .info-title {
    color: #93c5fd;
}

:global(.dark) .info-description {
    color: #bfdbfe;
}

:global(.dark) .filter-badge {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    color: #93c5fd;
    border: 1px solid #60a5fa;
}
</style>
```

---

## Badges y Tags

### Badge Colorido

```vue
<template>
    <span :class="['status-badge', severityClass]">
        <i :class="icon"></i>
        {{ label }}
    </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    label: String,
    severity: {
        type: String,
        default: 'info' // 'info', 'success', 'warning', 'danger'
    }
});

const severityClass = computed(() => `badge-${props.severity}`);
const icon = computed(() => {
    const icons = {
        info: 'pi pi-info-circle',
        success: 'pi pi-check-circle',
        warning: 'pi pi-exclamation-triangle',
        danger: 'pi pi-times-circle'
    };
    return icons[props.severity] || icons.info;
});
</script>

<style scoped>
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.438rem 0.875rem;
    border-radius: 8px;
    font-size: 0.813rem;
    font-weight: 600;
    border: 1px solid;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
}

.status-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.badge-info {
    background: linear-gradient(135deg, white 0%, #dbeafe 100%);
    color: #1d4ed8;
    border-color: #93c5fd;
}

.badge-success {
    background: linear-gradient(135deg, white 0%, #d1fae5 100%);
    color: #047857;
    border-color: #6ee7b7;
}

.badge-warning {
    background: linear-gradient(135deg, white 0%, #fef3c7 100%);
    color: #92400e;
    border-color: #fcd34d;
}

.badge-danger {
    background: linear-gradient(135deg, white 0%, #fee2e2 100%);
    color: #991b1b;
    border-color: #fca5a5;
}

/* Dark mode */
:global(.dark) .badge-info {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    color: #93c5fd;
    border-color: #60a5fa;
}

:global(.dark) .badge-success {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
    color: #6ee7b7;
    border-color: #34d399;
}

:global(.dark) .badge-warning {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
    color: #fcd34d;
    border-color: #fbbf24;
}

:global(.dark) .badge-danger {
    background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%);
    color: #fca5a5;
    border-color: #f87171;
}
</style>
```

---

## Filtros

### Card de Filtros Completa

```vue
<template>
    <div class="filters-card">
        <div class="filters-header" @click="toggleFilters">
            <div class="filters-header-left">
                <i class="pi pi-filter-fill"></i>
                <span>Filtros de Búsqueda</span>
            </div>
            <Button
                :icon="filtersVisible ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                text
                rounded
                class="toggle-button"
            />
        </div>

        <transition name="filter-expand">
            <div v-show="filtersVisible" class="filters-content">
                <slot />
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const filtersVisible = ref(true);

const toggleFilters = () => {
    filtersVisible.value = !filtersVisible.value;
};
</script>

<style scoped>
.filters-card {
    background: linear-gradient(145deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-radius: 16px;
    padding: 1.25rem 1.75rem;
    margin-bottom: 1.5rem;
    box-shadow:
        0 4px 20px var(--card-shadow),
        0 0 0 1px color-mix(in srgb, var(--primary-color) 20%, var(--surface-border));
    border: 1px solid color-mix(in srgb, var(--primary-color) 10%, var(--surface-border));
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.filters-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #4f46e5, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
    0%, 100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

.filters-card:hover {
    box-shadow:
        0 6px 30px var(--card-shadow-hover),
        0 0 0 1px color-mix(in srgb, var(--primary-color) 30%, var(--surface-border));
    transform: translateY(-2px);
}

.filters-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
    padding-bottom: 0.25rem;
    transition: all 0.2s ease;
}

.filters-header:hover .filters-header-left span {
    color: var(--primary-color);
}

.filters-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
}

.filters-header-left i {
    color: var(--primary-color);
    font-size: 1.25rem;
}

.toggle-button {
    color: var(--text-color-secondary) !important;
    transition: all 0.3s ease !important;
}

.toggle-button:hover {
    color: var(--primary-color) !important;
    background: var(--primary-50) !important;
}

.filters-content {
    margin-top: 1rem;
}

/* Transiciones */
.filter-expand-enter-active,
.filter-expand-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.filter-expand-enter-from,
.filter-expand-leave-to {
    opacity: 0;
    max-height: 0;
    margin-top: 0;
    transform: translateY(-10px);
}

.filter-expand-enter-to,
.filter-expand-leave-from {
    opacity: 1;
    max-height: 400px;
    margin-top: 1rem;
    transform: translateY(0);
}

/* Variables */
.filters-card {
    --card-shadow: rgba(0, 0, 0, 0.08);
    --card-shadow-hover: rgba(0, 0, 0, 0.12);
}

:global(.dark) .filters-card {
    --card-shadow: rgba(0, 0, 0, 0.3);
    --card-shadow-hover: rgba(0, 0, 0, 0.4);
}
</style>
```

---

## Tablas

### Header de Tabla Animado

```vue
<template>
    <div class="table-header-modern">
        <div class="header-left">
            <div class="header-icon-badge">
                <i class="pi pi-list-check"></i>
            </div>
            <div class="header-info">
                <span class="header-title">{{ title }}</span>
                <span class="header-count" v-if="count">
                    {{ count }} {{ count === 1 ? 'registro' : 'registros' }}
                </span>
            </div>
        </div>
        <div class="header-actions-modern">
            <slot name="actions" />
        </div>
    </div>
</template>

<script setup>
defineProps({
    title: String,
    count: Number
});
</script>

<style scoped>
.table-header-modern {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-bottom: 2px solid color-mix(in srgb, var(--green-500) 20%, var(--surface-border));
    gap: 1rem;
    position: relative;
}

.table-header-modern::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #10b981, #14b8a6, #10b981);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
    0%, 100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-icon-badge {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0891b2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    position: relative;
    overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}

.header-icon-badge::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
    0%, 100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}

@keyframes iconPulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

.header-icon-badge i {
    font-size: 1.5rem;
    color: white;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.header-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.015em;
}

.header-count {
    font-size: 0.813rem;
    font-weight: 600;
    color: #047857;
    background: linear-gradient(135deg, #d1fae5 0%, #ccfbf1 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #6ee7b7;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
}

.header-actions-modern {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

/* Dark mode */
:global(.dark) .header-icon-badge {
    background: linear-gradient(135deg, #34d399 0%, #2dd4bf 50%, #22d3ee 100%);
}

:global(.dark) .header-count {
    color: #6ee7b7;
    background: linear-gradient(135deg, #064e3b 0%, #115e59 100%);
    border: 1px solid #34d399;
}

/* Responsive */
@media (max-width: 1024px) {
    .table-header-modern {
        flex-direction: column;
        align-items: stretch;
    }

    .header-actions-modern {
        width: 100%;
    }
}
</style>
```

---

Para más información, consulta:
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Guía completa
- [DESIGN_QUICK_REFERENCE.md](./DESIGN_QUICK_REFERENCE.md) - Referencia rápida
