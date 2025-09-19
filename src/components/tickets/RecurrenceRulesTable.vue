<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';

defineProps({
    rules: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
});

defineEmits(['edit-rule', 'delete-rule']);

const frequencyMap = {
    daily: 'Día(s)',
    weekly: 'Semana(s)',
    monthly: 'Mes(es)',
    yearly: 'Año(s)'
};

const formatFrequency = (frequency, interval) => {
    if (!frequency) return 'N/A';
    const label = frequencyMap[frequency] || frequency;
    return `Cada ${interval} ${label}`;
};
</script>

<template>
    <DataTable :value="rules" :loading="loading" responsiveLayout="scroll">
        <Column field="id" header="ID" :sortable="true"></Column>
        <Column field="title" header="Título" :sortable="true"></Column>
        <Column field="frequency" header="Frecuencia" :sortable="true">
            <template #body="{ data }">
                <span>{{ formatFrequency(data.frequency, data.interval) }}</span>
            </template>
        </Column>
        <Column field="next_generation_date" header="Próxima Generación" :sortable="true">
            <template #body="{ data }">
                <span>{{ new Date(data.next_generation_date).toLocaleDateString() }}</span>
            </template>
        </Column>
        <Column field="is_active" header="Activo" :sortable="true">
            <template #body="{ data }">
                <i class="pi" :class="{ 'pi-check-circle text-green-500': data.is_active, 'pi-times-circle text-red-400': !data.is_active }"></i>
            </template>
        </Column>
        <Column header="Acciones">
            <template #body="{ data }">
                <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="$emit('edit-rule', data)" />
                <Button icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="$emit('delete-rule', data)" />
            </template>
        </Column>
    </DataTable>
</template>
