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
    },
    canDelete: {
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
</script>

<template>
    <DataTable :value="rooms" :loading="loading" paginator :rows="10" responsiveLayout="stack" v-model:expandedRows="expandedRows" dataKey="id">
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
                <InputSwitch :modelValue="data.is_active" @update:modelValue="toggleStatus(data)" class="mr-2" />
                <Button icon="pi pi-trash" class="p-button-rounded p-button-danger" @click="deleteRoom(data)" v-if="canDelete" />
            </template>
        </Column>

        <template #expansion="{ data }">
            <div class="p-3">
                <div class="flex justify-between items-center mb-2">
                    <h5>Camas en la Habitación {{ data.number }}</h5>
                    <Button icon="pi pi-plus" label="Añadir Cama" class="p-button-sm" @click="addBed(data.id)" />
                </div>
                <DataTable :value="data.beds" responsiveLayout="stack">
                    <Column field="name" header="Cama"></Column>
                    <Column field="is_occupied" header="Estado Ocupación">
                        <template #body="{ data: bedData }">
                            <Tag :value="bedData.is_occupied ? 'Ocupada' : 'Libre'" :severity="bedData.is_occupied ? 'danger' : 'success'" />
                        </template>
                    </Column>
                    <Column header="Activa">
                        <template #body="{ data: bedData }">
                            <InputSwitch :modelValue="bedData.is_active" @update:modelValue="toggleBedStatus(bedData)" :disabled="bedData.is_occupied" />
                        </template>
                    </Column>
                    <Column header="Acciones">
                        <template #body="{ data: bedData }">
                            <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editBed(bedData)" />
                            <Button
                                icon="pi pi-trash"
                                class="p-button-rounded p-button-danger"
                                @click="deleteBed(bedData)"
                                :disabled="bedData.is_occupied"
                                v-tooltip.bottom="bedData.is_occupied ? 'No se puede eliminar una cama ocupada' : 'Eliminar cama'"
                                v-if="canDelete"
                            />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </template>
    </DataTable>
</template>
