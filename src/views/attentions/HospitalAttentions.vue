<script setup>
import { useHospitalAttentionsStore } from '@/store/hospitalAttentionsStore';
import { FilterMatchMode } from '@primevue/core/api';

import { computed, onMounted, ref } from 'vue';

const hospitalAttentionsStore = useHospitalAttentionsStore();

const attentions = computed(() => hospitalAttentionsStore.allAttentions);
const isLoading = computed(() => hospitalAttentionsStore.isLoading);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    'patient.name': { value: null, matchMode: FilterMatchMode.CONTAINS },
    'patient.number_document': { value: null, matchMode: FilterMatchMode.CONTAINS },
    doctor: { value: null, matchMode: FilterMatchMode.CONTAINS },
    is_active: { value: null, matchMode: FilterMatchMode.EQUALS }
});

onMounted(() => {
    hospitalAttentionsStore.fetchAttentions();
});

const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (isNaN(date)) return value; // Return original if invalid
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const getSeverity = (isActive) => {
    return isActive ? 'success' : 'danger';
};

const openNew = () => {
    // Logic to open a dialog to create a new attention
    console.log('Open new attention dialog');
};

const editAttention = (attention) => {
    // Logic to open a dialog to edit an attention
    console.log('Edit attention', attention);
};

const confirmDeleteAttention = (attention) => {
    // Logic to open a confirmation dialog to delete an attention
    console.log('Confirm delete attention', attention);
};
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Gestión de Atenciones Hospitalarias</h2>

        <DataTable
            :value="attentions"
            :loading="isLoading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            v-model:filters="filters"
            filterDisplay="menu"
            :globalFilterFields="['number', 'patient.name', 'patient.number_document', 'doctor', 'insurance', 'bed.name', 'bed.room.number']"
            removableSort
            sortMode="multiple"
            class="p-datatable-customers"
            responsiveLayout="scroll"
        >
            <template #header>
                <div class="flex justify-between items-center">
                    <Button label="Nueva Atención" icon="pi pi-plus" class="p-button-success mr-2" @click="openNew" />
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                    </IconField>
                    <!-- <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                    </span> -->
                </div>
            </template>

            <template #empty> No se encontraron atenciones. </template>

            <template #loading> Cargando datos de atenciones... </template>

            <Column field="number" header="Número" sortable style="min-width: 10rem"></Column>

            <Column field="patient.name" header="Paciente" sortable filterField="patient.name" :showFilterMatchModes="false" style="min-width: 18rem">
                <template #body="{ data }">
                    <div>
                        <div class="font-bold">{{ data.patient.name }}</div>
                        <div class="text-sm text-gray-500">{{ data.patient.document_type }}: {{ data.patient.number_document }}</div>
                    </div>
                </template>
                <template #filter="{ filterModel }">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Buscar por paciente" />
                </template>
            </Column>

            <Column field="doctor" header="Médico" sortable filterField="doctor" :showFilterMatchModes="false" style="min-width: 16rem">
                <template #filter="{ filterModel }">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Buscar por médico" />
                </template>
            </Column>

            <Column header="Ubicación" sortable sortField="bed.room.number" style="min-width: 10rem">
                <template #body="{ data }">
                    <div v-if="data.bed && data.bed.room">
                        <span class="font-semibold">{{ data.bed.room.number }}</span> / <span>{{ data.bed.name }}</span>
                    </div>
                </template>
            </Column>

            <Column header="Periodo Estancia" sortable sortField="entry_date" style="min-width: 14rem">
                <template #body="{ data }">
                    <div>
                        <div><span class="font-semibold">Ingreso:</span> {{ formatDate(data.entry_date) }}</div>
                        <div><span class="font-semibold">Salida:</span> {{ formatDate(data.exit_date) }}</div>
                    </div>
                </template>
            </Column>

            <Column field="medical_discharge_type" header="Tipo Alta" sortable style="min-width: 12rem">
                <template #body="{ data }">
                    {{ data.medical_discharge_type?.split('.')[1] || 'N/A' }}
                </template>
            </Column>

            <Column field="is_active" header="Estado" sortable dataType="boolean" style="min-width: 10rem">
                <template #body="{ data }">
                    <Tag :value="data.is_active ? 'Activa' : 'Inactiva'" :severity="getSeverity(data.is_active)" />
                </template>
                <template #filter="{ filterModel }">
                    <div class="flex items-center gap-2">
                        <label for="active-filter">Activa</label>
                        <input type="radio" id="active-filter" :value="true" v-model="filterModel.value" />
                        <label for="inactive-filter">Inactiva</label>
                        <input type="radio" id="inactive-filter" :value="false" v-model="filterModel.value" />
                    </div>
                </template>
            </Column>

            <Column header="Acciones" style="min-width: 10rem" :exportable]="false">
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editAttention(data)" />
                    <Button icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="confirmDeleteAttention(data)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
.p-datatable-customers .p-column-filter {
    width: 100%;
}
</style>
