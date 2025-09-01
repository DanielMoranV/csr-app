<script setup>
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import { computed, ref } from 'vue';

const props = defineProps({
    positionOptions: {
        type: Array,
        default: () => []
    },
    statusOptions: {
        type: Array,
        default: () => []
    },
    sortOptions: {
        type: Array,
        default: () => []
    },
    resultCount: {
        type: Number,
        default: null
    },
    totalCount: {
        type: Number,
        default: 0
    },
    isFiltering: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update-global-filter', 'update-position-filter', 'update-status-filter', 'update-sort', 'clear-filters', 'advanced-search']);

// Estado local
const localFilters = ref({
    global: '',
    position: null,
    status: null,
    sortBy: 'name',
    sortDirection: 'asc'
});

// Computadas
const activeFiltersCount = computed(() => {
    let count = 0;
    if (localFilters.value.global) count++;
    if (localFilters.value.position) count++;
    if (localFilters.value.status !== null) count++;
    return count;
});

const resultCountText = computed(() => {
    if (props.resultCount === null) return '';

    if (activeFiltersCount.value === 0) {
        return `Mostrando ${props.resultCount} usuarios en total`;
    } else {
        return `${props.resultCount} de ${props.totalCount} usuarios coinciden con los filtros`;
    }
});

// Métodos de eventos
const onGlobalSearchChange = () => {
    emit('update-global-filter', localFilters.value.global);
};

const onPositionChange = () => {
    emit('update-position-filter', localFilters.value.position);
};

const onStatusChange = () => {
    emit('update-status-filter', localFilters.value.status);
};

const onSortChange = () => {
    emit('update-sort', localFilters.value.sortBy, localFilters.value.sortDirection);
};

const toggleSortDirection = () => {
    localFilters.value.sortDirection = localFilters.value.sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange();
};

const clearAllFilters = () => {
    localFilters.value = {
        global: '',
        position: null,
        status: null,
        sortBy: 'name',
        sortDirection: 'asc'
    };

    emit('clear-filters');
};
</script>

<template>
    <div class="filters-compact">
        <!-- Header compacto -->
        <div class="filters-header">
            <div class="filters-title">
                <i class="pi pi-filter"></i>
                <span>Filtros</span>
                <Badge v-if="activeFiltersCount > 0" :value="activeFiltersCount" severity="info" class="ml-2" />
            </div>
            <div class="filters-actions">
                <Button icon="pi pi-filter-slash" class="clear-btn" @click="clearAllFilters" :disabled="activeFiltersCount === 0" v-tooltip.top="'Limpiar filtros'" text rounded />
            </div>
        </div>

        <!-- Filtros principales en una fila -->
        <div class="filters-row">
            <!-- Búsqueda Global -->
            <div class="filter-item filter-item--search">
                <IconField class="p-input-icon-left">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="localFilters.global" @input="onGlobalSearchChange" placeholder="Buscar usuarios..." class="search-input" />
                </IconField>
            </div>

            <!-- Filtro por Posición -->
            <div class="filter-item">
                <Dropdown v-model="localFilters.position" :options="positionOptions" optionLabel="label" optionValue="value" placeholder="Posición" class="filter-dropdown" :showClear="true" @change="onPositionChange" />
            </div>

            <!-- Filtro por Estado -->
            <div class="filter-item">
                <Dropdown v-model="localFilters.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Estado" class="filter-dropdown" :showClear="true" @change="onStatusChange" />
            </div>

            <!-- Ordenamiento -->
            <div class="filter-item filter-item--sort">
                <div class="sort-controls">
                    <Dropdown v-model="localFilters.sortBy" :options="sortOptions" optionLabel="label" optionValue="value" placeholder="Ordenar" class="sort-dropdown" @change="onSortChange" />
                    <Button
                        :icon="localFilters.sortDirection === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down'"
                        class="sort-direction-btn"
                        @click="toggleSortDirection"
                        v-tooltip.top="localFilters.sortDirection === 'asc' ? 'Ascendente' : 'Descendente'"
                        outlined
                        rounded
                    />
                </div>
            </div>
        </div>

        <!-- Indicador de resultados compacto -->
        <div v-if="resultCount !== null" class="results-indicator">
            <div class="results-text">
                <i class="pi pi-info-circle"></i>
                {{ resultCountText }}
            </div>
            <div v-if="isFiltering" class="filtering-indicator">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Filtrando...</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Contenedor principal mejorado */
.filters-compact {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.05),
        0 4px 12px rgba(0, 0, 0, 0.05),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
}

.filters-compact:hover {
    box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.08),
        0 8px 24px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(255, 255, 255, 0.15) inset;
    transform: translateY(-1px);
}

/* Header mejorado */
.filters-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
    border-bottom: 1px solid var(--surface-border);
    position: relative;
}

.filters-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--primary-200), transparent);
}

.filters-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: 0.025em;
}

.filters-title i {
    color: var(--primary-500);
    font-size: 1.1rem;
    padding: 0.5rem;
    background: var(--primary-50);
    border-radius: 8px;
    border: 1px solid var(--primary-100);
}

.clear-btn {
    width: 36px;
    height: 36px;
    color: var(--text-color-secondary);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
}

.clear-btn:hover:not(:disabled) {
    color: var(--red-600);
    background: var(--red-50);
    border-color: var(--red-200);
    transform: scale(1.05);
}

.clear-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* Filtros Row con glassmorphism */
.filters-row {
    display: flex;
    align-items: stretch;
    background: rgba(255, 255, 255, 0.02);
    position: relative;
}

.filter-item {
    flex: 1;
    padding: 1.25rem 1.5rem;
    background: var(--surface-card);
    display: flex;
    align-items: center;
    min-width: 0;
    position: relative;
    transition: all 0.2s ease;
}

.filter-item:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 25%;
    bottom: 25%;
    width: 1px;
    background: linear-gradient(to bottom, transparent, var(--surface-border), transparent);
}

.filter-item--search {
    flex: 2.5;
    min-width: 220px;
}

.filter-item--sort {
    flex: 1.8;
    min-width: 200px;
}

.filter-item:hover {
    background: var(--surface-50);
    transform: translateY(-1px);
}

/* Search Input con mejor diseño */
.search-input {
    width: 100%;
    border: 2px solid var(--surface-300);
    border-radius: 12px;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    font-size: 0.9rem;
    font-weight: 500;
    background: var(--surface-0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) inset;
}

.search-input:focus {
    border-color: var(--primary-400);
    box-shadow:
        0 0 0 3px var(--primary-100),
        0 1px 3px rgba(0, 0, 0, 0.05) inset;
    transform: translateY(-1px);
}

.search-input::placeholder {
    color: var(--text-color-secondary);
    font-weight: 400;
}

/* Filter Dropdowns mejorados */
.filter-dropdown {
    width: 100%;
    min-width: 160px;
}

.filter-dropdown :deep(.p-dropdown) {
    border: 2px solid var(--surface-300);
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    background: var(--surface-0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-dropdown :deep(.p-dropdown:hover) {
    border-color: var(--surface-400);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.filter-dropdown :deep(.p-dropdown:focus) {
    border-color: var(--primary-400);
    box-shadow: 0 0 0 3px var(--primary-100);
    transform: translateY(-1px);
}

.filter-dropdown :deep(.p-dropdown-label) {
    padding: 0.75rem 1rem;
    font-weight: 500;
}

/* Sort Controls mejorados */
.sort-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}

.sort-dropdown {
    flex: 1;
    min-width: 140px;
}

.sort-dropdown :deep(.p-dropdown) {
    border: 2px solid var(--surface-300);
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    background: var(--surface-0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sort-dropdown :deep(.p-dropdown:hover) {
    border-color: var(--surface-400);
    transform: translateY(-1px);
}

.sort-dropdown :deep(.p-dropdown-label) {
    padding: 0.75rem 1rem;
    font-weight: 500;
}

.sort-direction-btn {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border: 2px solid var(--surface-300);
    color: var(--text-color-secondary);
    background: var(--surface-0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    position: relative;
    overflow: hidden;
}

.sort-direction-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
}

.sort-direction-btn:hover::before {
    left: 100%;
}

.sort-direction-btn:hover {
    border-color: var(--primary-400);
    color: var(--primary-600);
    background: var(--primary-50);
    transform: translateY(-1px) scale(1.05);
    box-shadow: 0 3px 12px rgba(59, 130, 246, 0.2);
}

/* Results Indicator mejorado */
.results-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
    border-top: 1px solid var(--surface-border);
    font-size: 0.8rem;
    font-weight: 500;
    position: relative;
}

.results-indicator::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--primary-200), transparent);
}

.results-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
}

.results-text i {
    color: var(--blue-500);
    font-size: 0.9rem;
    padding: 0.25rem;
    background: var(--blue-50);
    border-radius: 4px;
}

.filtering-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--primary-600);
    font-weight: 600;
    padding: 0.5rem 0.75rem;
    background: var(--primary-50);
    border-radius: 8px;
    border: 1px solid var(--primary-100);
}

.filtering-indicator i {
    font-size: 0.9rem;
}

/* Responsive Design mejorado */
@media (max-width: 1200px) {
    .filter-item--search {
        min-width: 200px;
    }

    .filter-item--sort {
        min-width: 180px;
    }
}

@media (max-width: 1024px) {
    .filter-item--search {
        min-width: 180px;
        flex: 2.2;
    }

    .filter-item--sort {
        min-width: 160px;
        flex: 1.6;
    }

    .filters-header {
        padding: 1rem 1.25rem;
    }

    .filter-item {
        padding: 1rem 1.25rem;
    }
}

@media (max-width: 768px) {
    .filters-row {
        flex-direction: column;
        background: var(--surface-card);
    }

    .filter-item {
        border-bottom: 1px solid var(--surface-border);
        padding: 1rem 1.25rem;
        margin: 0;
    }

    .filter-item:not(:last-child)::after {
        display: none;
    }

    .filter-item:last-child {
        border-bottom: none;
    }

    .filter-item--search,
    .filter-item--sort {
        min-width: auto;
        flex: 1;
    }

    .sort-controls {
        gap: 1rem;
    }

    .sort-direction-btn {
        width: 44px;
        height: 44px;
    }

    .search-input {
        padding: 0.75rem 1rem 0.75rem 2.5rem;
    }
}

@media (max-width: 576px) {
    .filters-header {
        padding: 1rem;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .filter-item {
        padding: 0.875rem 1rem;
    }

    .results-indicator {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
    }

    .search-input {
        padding: 0.75rem 0.875rem 0.75rem 2.25rem;
        font-size: 0.875rem;
    }

    .sort-direction-btn {
        width: 40px;
        height: 40px;
    }

    .filters-title {
        font-size: 0.85rem;
    }

    .clear-btn {
        width: 32px;
        height: 32px;
    }
}

/* Estados especiales mejorados */
.clear-btn:focus,
.sort-direction-btn:focus {
    outline: 3px solid var(--primary-300);
    outline-offset: 2px;
    box-shadow: 0 0 0 1px var(--surface-card);
}

.filter-dropdown :deep(.p-dropdown:focus),
.sort-dropdown :deep(.p-dropdown:focus) {
    outline: none;
}

.search-input:focus {
    outline: none;
}

/* Estados de carga mejorados */
.filters-compact[data-loading='true'] {
    opacity: 0.6;
    pointer-events: none;
    position: relative;
}

.filters-compact[data-loading='true']::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--surface-0);
    opacity: 0.1;
    z-index: 1;
}

/* Animaciones */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.filters-compact {
    animation: slideIn 0.3s ease-out;
}

/* Modo oscuro mejorado */
@media (prefers-color-scheme: dark) {
    .filters-compact {
        border-color: var(--surface-600);
        box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.2),
            0 4px 12px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    }

    .filters-compact:hover {
        box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.25),
            0 8px 24px rgba(0, 0, 0, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    }

    .filters-header {
        background: linear-gradient(135deg, var(--surface-700) 0%, var(--surface-600) 100%);
        border-bottom-color: var(--surface-500);
    }

    .search-input,
    .filter-dropdown :deep(.p-dropdown),
    .sort-dropdown :deep(.p-dropdown),
    .sort-direction-btn {
        background: var(--surface-800);
        border-color: var(--surface-500);
    }
}
</style>
