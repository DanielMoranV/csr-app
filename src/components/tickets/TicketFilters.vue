<script setup>
import { useTicketsStore } from '@/store/ticketsStore';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { onMounted, ref, watch } from 'vue';

const ticketsStore = useTicketsStore();

// Local state for filters, initialized from the store
const localFilters = ref({
    search: ticketsStore.filters.search || '',
    status: ticketsStore.filters.status || null,
    priority: ticketsStore.filters.priority || null
});

const statusOptions = ref([
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'En Proceso', value: 'en proceso' },
    { label: 'Concluido', value: 'concluido' },
    { label: 'Rechazado', value: 'rechazado' },
    { label: 'Anulado', value: 'anulado' }
]);

const priorityOptions = ref([
    { label: 'Baja', value: 'baja' },
    { label: 'Media', value: 'media' },
    { label: 'Alta', value: 'alta' },
    { label: 'Urgente', value: 'urgente' }
]);

// Function to apply filters
const applyFilters = () => {
    ticketsStore.filters.search = localFilters.value.search;
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

// Watch for external changes to store filters (e.g., from another component clearing them)
watch(
    () => ticketsStore.filters,
    (newFilters) => {
        localFilters.value.search = newFilters.search || '';
        localFilters.value.status = newFilters.status || null;
        localFilters.value.priority = newFilters.priority || null;
    },
    { deep: true }
);

// Initial fetch on mount (if not already done by parent)
onMounted(() => {
    // If filters are already set in store, apply them
    if (localFilters.value.search || localFilters.value.status || localFilters.value.priority) {
        applyFilters();
    }
});
</script>

<template>
    <div class="p-fluid grid formgrid">
        <div class="col-12 md:col-6 lg:col-3">
            <div class="p-inputgroup">
                <InputText v-model="localFilters.search" placeholder="Buscar por título o descripción" @input="onFilterChange" />
                <Button icon="pi pi-search" class="p-button-primary" @click="onFilterChange" />
            </div>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
            <Select v-model="localFilters.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Filtrar por estado" :showClear="true" @change="onFilterChange" />
        </div>
        <div class="col-12 md:col-6 lg:col-3">
            <Select v-model="localFilters.priority" :options="priorityOptions" optionLabel="label" optionValue="value" placeholder="Filtrar por prioridad" :showClear="true" @change="onFilterChange" />
        </div>
        <div class="col-12 md:col-6 lg:col-3">
            <Button label="Limpiar Filtros" icon="pi pi-filter-slash" class="p-button-secondary" @click="clearFilters" />
        </div>
    </div>
</template>

<style scoped>
/* Add component-specific styles here if needed */
</style>
