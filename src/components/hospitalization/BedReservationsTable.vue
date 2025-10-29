<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';

defineProps({
    reservations: {
        type: Array,
        default: () => []
    }
});

defineEmits(['edit-reservation', 'delete-reservation']);

// comentario para probar git hooks

const getStatusSeverity = (status) => {
    switch (status) {
        case 'confirmada':
            return 'success';
        case 'pendiente':
            return 'warning';
        case 'cancelada':
            return 'danger';
        default:
            return 'info';
    }
};
</script>

<template>
    <DataTable :value="reservations" :paginator="true" :rows="10" dataKey="id" responsiveLayout="scroll">
        <Column field="id" header="ID" :sortable="true"></Column>
        <Column field="user.name" header="Reservado por" :sortable="true"></Column>
        <Column field="bed.name" header="Cama" :sortable="true"></Column>
        <Column field="notes" header="Notas" :sortable="true"></Column>
        <Column field="created_at" header="Fecha de Reserva" :sortable="true">
            <template #body="{ data }">
                {{ new Date(data.created_at).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
            </template>
        </Column>
        <Column field="status" header="Estado" :sortable="true">
            <template #body="{ data }">
                <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
            </template>
        </Column>
        <Column headerStyle="width: 8rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
            <template #body="{ data }">
                <Button type="button" icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="$emit('edit-reservation', data)"></Button>
                <Button type="button" icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="$emit('delete-reservation', data)"></Button>
            </template>
        </Column>
    </DataTable>
</template>
