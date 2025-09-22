<script setup>
import { useTicketsStore } from '@/store/ticketsStore';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { computed, onMounted, ref, watch } from 'vue';

const ticketsStore = useTicketsStore();

// Local state for filters, initialized from the store
const localFilters = ref({
    search: ticketsStore.filters.search || '',
    status: ticketsStore.filters.status || null,
    priority: ticketsStore.filters.priority || null
});

const statusOptions = ref([
    { label: 'Pendiente', value: 'pendiente', icon: 'pi-clock', color: '#f59e0b' },
    { label: 'En Proceso', value: 'en proceso', icon: 'pi-spin pi-spinner', color: '#3b82f6' },
    { label: 'Concluido', value: 'concluido', icon: 'pi-check-circle', color: '#10b981' },
    { label: 'Rechazado', value: 'rechazado', icon: 'pi-times-circle', color: '#ef4444' },
    { label: 'Anulado', value: 'anulado', icon: 'pi-ban', color: '#6b7280' }
]);

const priorityOptions = ref([
    { label: 'Baja', value: 'baja', icon: 'pi-arrow-down', color: '#10b981' },
    { label: 'Media', value: 'media', icon: 'pi-minus', color: '#f59e0b' },
    { label: 'Alta', value: 'alta', icon: 'pi-arrow-up', color: '#f97316' },
    { label: 'Urgente', value: 'urgente', icon: 'pi-exclamation-triangle', color: '#ef4444' }
]);

// Computed property to check if any filter is active
const hasActiveFilters = computed(() => {
    return localFilters.value.search || localFilters.value.status || localFilters.value.priority;
});

// Function to apply filters
const applyFilters = () => {
    const searchTerm = localFilters.value.search.trim();

    // Check if searchTerm is a positive integer, and use the appropriate filter
    if (/^\d+$/.test(searchTerm)) {
        ticketsStore.filters.ticket_id = searchTerm;
        ticketsStore.filters.search = ''; // Clear the other search type
    } else {
        ticketsStore.filters.ticket_id = null; // Clear the other search type
        ticketsStore.filters.search = searchTerm;
    }

    ticketsStore.filters.status = localFilters.value.status;
    ticketsStore.filters.priority = localFilters.value.priority;
    ticketsStore.fetchTickets();
};

// Debounce filter changes to avoid too many API calls
let debounceTimeout = null;
const onFilterChange = () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        applyFilters();
    }, 500); // 500ms debounce
};

const clearFilters = () => {
    localFilters.value = {
        search: '',
        status: null,
        priority: null
    };
    applyFilters();
};

// Watch for external changes to store filters
watch(
    () => ticketsStore.filters,
    (newFilters) => {
        localFilters.value.search = newFilters.search || '';
        localFilters.value.status = newFilters.status || null;
        localFilters.value.priority = newFilters.priority || null;
    },
    { deep: true }
);

// Initial fetch on mount
onMounted(() => {
    if (localFilters.value.search || localFilters.value.status || localFilters.value.priority) {
        applyFilters();
    }
});
</script>

<template>
    <Card class="filter-card">
        <template #header>
            <div class="filter-header">
                <div class="filter-title">
                    <i class="pi pi-filter filter-icon"></i>
                    <span>Filtros de Búsqueda</span>
                </div>
                <div class="filter-status" v-if="hasActiveFilters">
                    <i class="pi pi-check-circle"></i>
                    <span>Filtros activos</span>
                </div>
            </div>
        </template>

        <template #content>
            <div class="filter-grid">
                <!-- Search Input -->
                <div class="filter-item search-item">
                    <label class="filter-label">
                        <i class="pi pi-search"></i>
                        Buscar
                    </label>
                    <div class="search-container">
                        <InputText v-model="localFilters.search" placeholder="Buscar por título o descripción..." class="search-input" @input="onFilterChange" />
                        <Button icon="pi pi-search" class="search-button" @click="onFilterChange" :disabled="!localFilters.search" />
                    </div>
                </div>

                <!-- Status Filter -->
                <div class="filter-item">
                    <label class="filter-label">
                        <i class="pi pi-flag"></i>
                        Estado
                    </label>
                    <Select v-model="localFilters.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Seleccionar estado..." class="status-select" :showClear="true" @change="onFilterChange">
                        <template #option="slotProps">
                            <div class="select-option">
                                <i :class="['pi', slotProps.option.icon]" :style="{ color: slotProps.option.color }"></i>
                                <span>{{ slotProps.option.label }}</span>
                            </div>
                        </template>
                        <template #value="slotProps">
                            <div v-if="slotProps.value" class="select-value">
                                <i :class="['pi', statusOptions.find((opt) => opt.value === slotProps.value)?.icon]" :style="{ color: statusOptions.find((opt) => opt.value === slotProps.value)?.color }"></i>
                                <span>{{ statusOptions.find((opt) => opt.value === slotProps.value)?.label }}</span>
                            </div>
                        </template>
                    </Select>
                </div>

                <!-- Priority Filter -->
                <div class="filter-item">
                    <label class="filter-label">
                        <i class="pi pi-star"></i>
                        Prioridad
                    </label>
                    <Select v-model="localFilters.priority" :options="priorityOptions" optionLabel="label" optionValue="value" placeholder="Seleccionar prioridad..." class="priority-select" :showClear="true" @change="onFilterChange">
                        <template #option="slotProps">
                            <div class="select-option">
                                <i :class="['pi', slotProps.option.icon]" :style="{ color: slotProps.option.color }"></i>
                                <span>{{ slotProps.option.label }}</span>
                            </div>
                        </template>
                        <template #value="slotProps">
                            <div v-if="slotProps.value" class="select-value">
                                <i :class="['pi', priorityOptions.find((opt) => opt.value === slotProps.value)?.icon]" :style="{ color: priorityOptions.find((opt) => opt.value === slotProps.value)?.color }"></i>
                                <span>{{ priorityOptions.find((opt) => opt.value === slotProps.value)?.label }}</span>
                            </div>
                        </template>
                    </Select>
                </div>

                <!-- Clear Filters Button -->
                <div class="filter-item clear-item">
                    <Button label="Limpiar Filtros" icon="pi pi-filter-slash" class="clear-button" :class="{ 'clear-button-active': hasActiveFilters }" @click="clearFilters" :disabled="!hasActiveFilters" />
                </div>
            </div>
        </template>
    </Card>
</template>

<style scoped>
.filter-card {
    margin-bottom: 1.5rem;
    border-radius: 12px;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid var(--surface-border);
    transition: all 0.3s ease;
}

.filter-card:hover {
    box-shadow:
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
    border-radius: 12px 12px 0 0;
    border-bottom: 1px solid var(--surface-border);
}

.filter-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--primary-700);
    font-size: 1.1rem;
}

.filter-icon {
    font-size: 1.2rem;
}

.filter-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--green-600);
    font-size: 0.9rem;
    font-weight: 500;
    background: var(--green-50);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    border: 1px solid var(--green-200);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}

.filter-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: 1.5rem;
    align-items: end;
    padding: 1.5rem;
}

@media (max-width: 1024px) {
    .filter-grid {
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .search-item {
        grid-column: 1 / -1;
    }
}

@media (max-width: 768px) {
    .filter-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
}

.filter-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    margin-bottom: 0.25rem;
}

.filter-label i {
    font-size: 0.9rem;
    color: var(--primary-500);
}

.search-container {
    display: flex;
    gap: 0.5rem;
    position: relative;
}

.search-input {
    flex: 1;
    border-radius: 8px;
    border: 2px solid var(--surface-border);
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    transition: all 0.3s ease;
}

.search-input:focus {
    border-color: var(--primary-400);
    box-shadow: 0 0 0 3px var(--primary-50);
}

.search-button {
    border-radius: 8px;
    padding: 0.75rem 1rem;
    transition: all 0.3s ease;
}

.search-button:enabled:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.status-select,
.priority-select {
    border-radius: 8px;
    transition: all 0.3s ease;
}

.status-select:focus-within,
.priority-select:focus-within {
    transform: translateY(-1px);
}

.select-option,
.select-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
}

.select-option i,
.select-value i {
    font-size: 0.9rem;
    width: 16px;
}

.clear-button {
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    transition: all 0.3s ease;
    background: var(--surface-100);
    border: 2px solid var(--surface-200);
    color: var(--text-color-secondary);
}

.clear-button:enabled:hover {
    background: var(--red-50);
    border-color: var(--red-200);
    color: var(--red-600);
    transform: translateY(-1px);
}

.clear-button-active {
    background: var(--red-50);
    border-color: var(--red-300);
    color: var(--red-600);
}

.clear-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Animaciones de entrada */
.filter-item {
    animation: slideInUp 0.4s ease-out;
    animation-fill-mode: backwards;
}

.filter-item:nth-child(1) {
    animation-delay: 0.1s;
}
.filter-item:nth-child(2) {
    animation-delay: 0.2s;
}
.filter-item:nth-child(3) {
    animation-delay: 0.3s;
}
.filter-item:nth-child(4) {
    animation-delay: 0.4s;
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Mejoras para modo oscuro */
@media (prefers-color-scheme: dark) {
    .filter-header {
        background: linear-gradient(135deg, var(--primary-900) 0%, var(--primary-800) 100%);
    }

    .filter-title {
        color: var(--primary-300);
    }

    .filter-status {
        background: var(--green-900);
        color: var(--green-300);
        border-color: var(--green-700);
    }
}
</style>
