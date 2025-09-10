<script setup>
import { defineEmits, defineProps, ref } from 'vue';

defineProps({
    rooms: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['edit-room', 'delete-room', 'toggle-status', 'add-bed', 'edit-bed', 'delete-bed', 'toggle-bed-status']);
const expandedRows = ref([]);

const editRoom = (room) => emit('edit-room', room);
const deleteRoom = (room) => emit('delete-room', room);
const toggleStatus = (room) => emit('toggle-status', room);

const addBed = (roomId) => emit('add-bed', roomId);
const editBed = (bed) => emit('edit-bed', bed);
const deleteBed = (bed) => emit('delete-bed', bed);
const toggleBedStatus = (bed) => emit('toggle-bed-status', bed);

const getSeverity = (isActive) => (isActive ? 'success' : 'danger');
const getBedSeverity = (isActive) => (isActive ? 'success' : 'warning');
</script>

<template>
    <DataTable :value="rooms" :loading="loading" paginator :rows="10" responsiveLayout="scroll" v-model:expandedRows="expandedRows" dataKey="id">
        <template #empty> No se encontraron habitaciones. </template>
        <template #loading> Cargando habitaciones... </template>

        <Column :expander="true" headerStyle="width: 3rem" />
        <Column field="number" header="Número" sortable></Column>
        <Column header="Camas">
            <template #body="{ data }">
                {{ data.beds.length }}
            </template>
        </Column>
        <Column field="notes" header="Notas" style="min-width: 20rem"></Column>
        <Column field="is_active" header="Estado" sortable>
            <template #body="{ data }">
                <Tag :value="data.is_active ? 'Activa' : 'Inactiva'" :severity="getSeverity(data.is_active)" />
            </template>
        </Column>
        <Column header="Acciones" style="min-width: 12rem">
            <template #body="{ data }">
                <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editRoom(data)" />
                <Button icon="pi pi-power-off" class="p-button-rounded p-button-warning mr-2" @click="toggleStatus(data)" v-tooltip.bottom="data.is_active ? 'Desactivar' : 'Activar'" />
                <Button icon="pi pi-trash" class="p-button-rounded p-button-danger" @click="deleteRoom(data)" />
            </template>
        </Column>

        <template #expansion="{ data }">
            <div class="p-3">
                <div class="flex justify-between items-center mb-2">
                    <h5>Camas en la Habitación {{ data.number }}</h5>
                    <Button icon="pi pi-plus" label="Añadir Cama" class="p-button-sm" @click="addBed(data.id)" />
                </div>
                <DataTable :value="data.beds">
                    <Column field="name" header="Cama"></Column>
                    <Column field="is_active" header="Estado">
                        <template #body="{ data: bedData }">
                            <Tag :value="bedData.is_active ? 'Libre' : 'Ocupada'" :severity="getBedSeverity(bedData.is_active)" />
                        </template>
                    </Column>
                    <Column header="Acciones">
                        <template #body="{ data: bedData }">
                            <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editBed(bedData)" />
                            <Button icon="pi pi-power-off" class="p-button-rounded p-button-warning mr-2" @click="toggleBedStatus(bedData)" v-tooltip.bottom="bedData.is_active ? 'Marcar Ocupada' : 'Marcar Libre'" />
                            <Button icon="pi pi-trash" class="p-button-rounded p-button-danger" @click="deleteBed(bedData)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </template>
    </DataTable>
</template>
