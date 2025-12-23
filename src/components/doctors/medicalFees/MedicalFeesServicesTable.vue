<script setup>
import { GLOBAL_FILTER_FIELDS, PAGINATION_CONFIG, STATUS_OPTIONS } from '@/utils/medicalFees/constants';
import { getStatusColor, getStatusLabel, getTypeColor } from '@/utils/medicalFees/formatters';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dropdown from 'primevue/dropdown';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { computed } from 'vue';

const props = defineProps({
    services: {
        type: Array,
        required: true
    },
    filters: {
        type: Object,
        required: true
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['cell-edit-complete', 'update:filters']);

// Computed property para manejar v-model:filters
const localFilters = computed({
    get() {
        return props.filters;
    },
    set(value) {
        emit('update:filters', value);
    }
});

function handleCellEditComplete(event) {
    emit('cell-edit-complete', event);
}
</script>

<template>
    <Card class="services-table-card">
        <template #title> <i class="pi pi-list"></i> Detalle de Servicios </template>
        <template #content>
            <DataTable
                v-model:filters="localFilters"
                :value="services"
                dataKey="id"
                paginator
                :rows="PAGINATION_CONFIG.rows"
                :rowsPerPageOptions="PAGINATION_CONFIG.rowsPerPageOptions"
                :paginatorTemplate="PAGINATION_CONFIG.paginatorTemplate"
                :currentPageReportTemplate="PAGINATION_CONFIG.currentPageReportTemplate"
                class="p-datatable-sm"
                :loading="isLoading"
                stripedRows
                responsiveLayout="scroll"
                filterDisplay="menu"
                :globalFilterFields="GLOBAL_FILTER_FIELDS"
                editMode="cell"
                @cell-edit-complete="handleCellEditComplete"
            >
                <template #header>
                    <div class="flex justify-content-between">
                        <IconField>
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="localFilters['global'].value" placeholder="Buscar..." />
                        </IconField>
                    </div>
                </template>

                <!-- ID -->
                <Column field="id" header="ID" sortable style="min-width: 80px"></Column>

                <!-- Admisión -->
                <Column field="rawData.admision" header="Admisión" sortable style="min-width: 80px">
                    <template #body="slotProps">
                        <span style="font-size: 0.8rem">{{ slotProps.data.rawData?.admision || 'N/A' }}</span>
                    </template>
                    <template #filter="{ filterModel }">
                        <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar admisión" />
                    </template>
                </Column>

                <!-- Paciente -->
                <Column field="patientName" header="Paciente" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="font-medium">{{ slotProps.data.patientName || 'N/A' }}</div>
                    </template>
                    <template #filter="{ filterModel }">
                        <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar paciente" />
                    </template>
                </Column>

                <!-- Fecha y Hora -->
                <Column header="Fecha y Hora" sortable field="date" style="min-width: 150px">
                    <template #body="slotProps">
                        {{ slotProps.data.date }} <br />
                        <small class="text-gray-500">{{ slotProps.data.time }}</small>
                    </template>
                </Column>

                <!-- Médico -->
                <Column field="doctor.name" header="Médico" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="font-medium">{{ slotProps.data.doctor?.name || 'N/A' }}</div>
                    </template>
                    <template #filter="{ filterModel }">
                        <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por médico" />
                    </template>
                </Column>

                <!-- Servicio Medico -->
                <Column field="rawData.segus" header="Servicio Medico" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <div style="display: flex; flex-direction: column; gap: 2px">
                            <span class="font-semibold" style="font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px" v-tooltip.top="slotProps.data.generalTariff?.name">
                                {{ slotProps.data.generalTariff?.name || 'N/A' }}
                            </span>
                            <span style="font-size: 0.75rem; color: #6c757d">
                                {{ slotProps.data.rawData?.segus || 'N/A' }}
                            </span>
                        </div>
                    </template>
                    <template #filter="{ filterModel }">
                        <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por código o nombre" />
                    </template>
                </Column>

                <!-- Cia -->
                <Column field="cia" header="Cia" sortable style="min-width: 120px">
                    <template #body="slotProps">
                        {{ slotProps.data.cia }}
                    </template>
                    <template #filter="{ filterModel }">
                        <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por cia" />
                    </template>
                </Column>

                <!-- Tipo Ate -->
                <Column field="tipoate" header="Tipo Ate" sortable style="min-width: 120px">
                    <template #body="slotProps">
                        {{ slotProps.data.tipoate }}
                    </template>
                    <template #filter="{ filterModel }">
                        <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por tipo ate" />
                    </template>
                </Column>

                <!-- Monto -->
                <Column field="amount" header="Monto" sortable style="min-width: 120px">
                    <template #body="slotProps"> S/ {{ slotProps.data.amount.toFixed(2) }} </template>
                    <template #editor="{ data, field }">
                        <InputNumber v-model="data[field]" mode="currency" currency="PEN" locale="es-PE" :min="0" class="w-full" />
                    </template>
                </Column>

                <!-- Comisión -->
                <Column field="comision" header="Comisión" sortable style="min-width: 120px">
                    <template #body="slotProps">
                        <span :class="{ 'text-green-600 font-bold': slotProps.data.comision > 0 }"> S/ {{ slotProps.data.comision.toFixed(2) }} </span>
                    </template>
                    <template #editor="{ data, field }">
                        <InputNumber v-model="data[field]" mode="currency" currency="PEN" locale="es-PE" :min="0" class="w-full" />
                    </template>
                    <template #filter="{ filterModel }">
                        <InputNumber v-model="filterModel.value" mode="currency" currency="PEN" locale="es-PE" />
                    </template>
                </Column>

                <!-- Tipo -->
                <Column field="serviceType" header="Tipo" sortable :showFilterMatchModes="false" style="min-width: 120px">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.serviceType" :severity="getTypeColor(slotProps.data.serviceType)" />
                    </template>
                    <template #editor="{ data, field }">
                        <Dropdown v-model="data[field]" :options="['PLANILLA', 'RETEN']" class="w-full" />
                    </template>
                    <template #filter="{ filterModel }">
                        <Dropdown v-model="filterModel.value" :options="['PLANILLA', 'RETÉN']" placeholder="Seleccionar" class="p-column-filter" showClear />
                    </template>
                </Column>

                <!-- Estado -->
                <Column field="status" header="Estado" sortable :showFilterMatchModes="false" style="min-width: 150px">
                    <template #body="slotProps">
                        <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getStatusColor(slotProps.data.status)" />
                    </template>
                    <template #editor="{ data, field }">
                        <Dropdown v-model="data[field]" :options="STATUS_OPTIONS" optionLabel="label" optionValue="value" class="w-full" />
                    </template>
                    <template #filter="{ filterModel }">
                        <Dropdown v-model="filterModel.value" :options="STATUS_OPTIONS" optionLabel="label" optionValue="value" placeholder="Seleccionar" class="p-column-filter" showClear />
                    </template>
                </Column>

                <!-- Observaciones -->
                <Column field="serviceTypeReason" header="Observaciones" style="min-width: 250px">
                    <template #body="slotProps">
                        <small>{{ slotProps.data.serviceTypeReason }}</small>
                    </template>
                    <template #filter="{ filterModel }">
                        <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar en observaciones" />
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>
</template>

<style scoped>
.services-table-card {
    margin-top: 2rem;
}
</style>
