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
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
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

const formatAge = (ageString) => {
    if (!ageString || !ageString.includes('años')) return ageString || 'N/A';
    try {
        const yearPart = ageString.split('.')[0];
        const rest = ageString.substring(ageString.indexOf('años'));
        return `${yearPart} ${rest}`;
    } catch (e) {
        return ageString; // return original string if something goes wrong
    }
};

const getBedTagClass = (bedName, roomNumber) => {
    if (!bedName || !roomNumber) return 'bed-tag-default';
    const letter = bedName.replace(roomNumber, '').toUpperCase();
    return `bed-tag-${letter}`;
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
            :globalFilterFields="['number', 'patient.cod_patient', 'patient.name', 'patient.number_document', 'doctor', 'insurance', 'bed.name', 'bed.room.number', 'cie10']"
            removableSort
            sortMode="multiple"
            class="p-datatable-customers"
            responsiveLayout="scroll"
            scrollable
            scrollHeight="600px"
        >
            <template #header>
                <div class="flex justify-between items-center">
                    <!-- <Button label="Nueva Atención" icon="pi pi-plus" class="p-button-success mr-2" @click="openNew" /> -->
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                    </IconField>
                </div>
            </template>

            <template #empty> No se encontraron atenciones. </template>

            <template #loading> Cargando datos de atenciones... </template>

            <Column field="number" header="Admisión" sortable style="min-width: 6rem"></Column>

            <Column field="patient.name" header="Paciente" sortable filterField="patient.name" :showFilterMatchModes="false" style="min-width: 20rem">
                <template #body="{ data }">
                    <div>
                        <div class="font-bold">HC: {{ data.patient.cod_patient }} - {{ data.patient.name }}</div>
                        <div class="text-sm text-gray-500">{{ data.patient.document_type }}: {{ data.patient.number_document }}</div>
                        <div class="text-sm">Edad: {{ formatAge(data.patient.age_formatted) }}</div>
                    </div>
                </template>
                <template #filter="{ filterModel }">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Buscar por paciente" />
                </template>
            </Column>

            <Column field="doctor" header="Médico" sortable filterField="doctor" :showFilterMatchModes="false" style="min-width: 16rem"></Column>

            <Column field="insurance" header="Seguro" sortable style="min-width: 10rem"></Column>

            <Column header="Habitación" sortable sortField="bed.room.number" style="min-width: 10rem">
                <template #body="{ data }">
                    <div v-if="data.bed && data.bed.room" class="flex items-center">
                        <span class="font-bold mr-2">{{ data.bed.room.number }}</span>
                        <Tag :value="data.bed.name.replace(data.bed.room.number, '')" :class="getBedTagClass(data.bed.name, data.bed.room.number)" />
                    </div>
                    <div v-else>N/A</div>
                </template>
            </Column>

            <Column header="Periodo Estancia" sortable sortField="entry_at" style="min-width: 14rem">
                <template #body="{ data }">
                    <div class="text-xs">
                        <div><span class="font-semibold">Ingreso:</span> {{ formatDate(data.entry_at) }}</div>
                        <div><span class="font-semibold">Salida:</span> {{ formatDate(data.exit_at) }}</div>
                    </div>
                </template>
            </Column>

            <Column field="duration_days" header="Días Est." sortable style="min-width: 8rem">
                <template #body="{ data }">
                    {{ data.duration_days ? data.duration_days.toFixed(2) : 'N/A' }}
                </template>
            </Column>

            <Column field="cie10" header="Diagnósticos" style="min-width: 12rem">
                <template #body="{ data }">
                    <div v-if="data.cie10 && data.cie10.length > 0">
                        <span v-for="(dx, index) in data.cie10" :key="index" class="p-tag p-tag-info mr-1 mb-1">{{ dx }}</span>
                    </div>
                    <div v-else>N/A</div>
                </template>
            </Column>

            <Column field="medical_discharge_type" header="Tipo Alta" sortable style="min-width: 12rem">
                <template #body="{ data }">
                    {{ data.medical_discharge_type?.split('.')[1] || 'N/A' }}
                </template>
            </Column>

            <Column field="is_active" header="Estado" sortable dataType="boolean" style="min-width: 10rem">
                <template #body="{ data }">
                    <Tag :value="data.is_active ? 'Activa' : 'Cerrada'" :severity="getSeverity(data.is_active)" />
                </template>
                <template #filter="{ filterModel }">
                    <div class="flex items-center gap-2">
                        <label for="active-filter">Activa</label>
                        <input type="radio" id="active-filter" :value="true" v-model="filterModel.value" />
                        <label for="inactive-filter">Cerrada</label>
                        <input type="radio" id="inactive-filter" :value="false" v-model="filterModel.value" />
                    </div>
                </template>
            </Column>

            <!-- <Column header="Acciones" style="min-width: 10rem" :exportable="false">
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editAttention(data)" />
                    <Button icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="confirmDeleteAttention(data)" />
                </template>
            </Column> -->
        </DataTable>
    </div>
</template>

<style scoped>
.p-datatable-customers .p-column-filter {
    width: 100%;
}

:deep(.bed-tag-A) {
    background-color: #4caf50 !important;
}
:deep(.bed-tag-B) {
    background-color: #2196f3 !important;
}
:deep(.bed-tag-C) {
    background-color: #ffc107 !important;
    color: #000000 !important;
}
:deep(.bed-tag-D) {
    background-color: #f44336 !important;
}
:deep(.bed-tag-E) {
    background-color: #9c27b0 !important;
}
:deep(.bed-tag-F) {
    background-color: #e91e63 !important;
}
:deep(.bed-tag-G) {
    background-color: #009688 !important;
}
:deep(.bed-tag-H) {
    background-color: #607d8b !important;
}
:deep(.bed-tag-default) {
    background-color: #9e9e9e !important;
}
</style>
