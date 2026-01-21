<script setup>
import { GLOBAL_FILTER_FIELDS, PAGINATION_CONFIG, STATUS_OPTIONS } from '@/utils/medicalFees/constants';
import { formatDate, formatTime, getStatusColor, getStatusLabel, getTypeColor } from '@/utils/medicalFees/formatters';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';

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

const emit = defineEmits(['cell-edit-complete', 'update:filters', 'update-commission', 'bulk-update-commission', 'bulk-delete-services']);

// Computed property para manejar v-model:filters
const localFilters = computed({
    get() {
        return props.filters;
    },
    set(value) {
        emit('update:filters', value);
    }
});

// Selección de servicios
const selectedServices = ref([]);

// Referencias para componentes
const commissionPopover = ref();
const currentService = ref(null);
const showBulkDialog = ref(false);
const showDeleteDialog = ref(false);

/**
 * Calcula el porcentaje de comisión
 */
function calculatePercentage(service) {
    if (!service.amount || service.amount === 0) return '0.0';
    return ((service.comision / service.amount) * 100).toFixed(1);
}

/**
 * Abre el popover de edición de comisión
 */
function openCommissionEdit(event, service) {
    currentService.value = service;
    commissionPopover.value.show(event);
}

/**
 * Maneja la aplicación de comisión individual
 */
function handleApplyCommission(newCommission) {
    // Actualizar directamente en el array de servicios
    const service = props.services.find((s) => s.id === currentService.value.id);
    if (service) {
        service.comision = newCommission;
    }

    // Emitir evento para guardar en BD
    emit('update-commission', currentService.value.id, newCommission);
}

/**
 * Maneja la aplicación de comisión masiva
 */
function handleBulkApply(percentage) {
    const serviceIds = selectedServices.value.map((s) => s.id);

    // Actualizar directamente en el array de servicios
    selectedServices.value.forEach((selectedService) => {
        const service = props.services.find((s) => s.id === selectedService.id);
        if (service) {
            service.comision = (service.amount * percentage) / 100;
        }
    });

    // Emitir evento para guardar en BD
    emit('bulk-update-commission', serviceIds, percentage);
    selectedServices.value = [];
}

/**
 * Abre el diálogo de confirmación de eliminación
 */
function openDeleteConfirmation() {
    showDeleteDialog.value = true;
}

/**
 * Confirma y ejecuta la eliminación de servicios
 */
function confirmDelete() {
    const serviceIds = selectedServices.value.map((s) => s.id);
    emit('bulk-delete-services', serviceIds);
    selectedServices.value = [];
    showDeleteDialog.value = false;
}

function handleCellEditComplete(event) {
    emit('cell-edit-complete', event);
}
</script>

<template>
    <Card class="services-table-card">
        <template #title> <i class="pi pi-list"></i> Detalle de Servicios </template>
        <template #content>
            <!-- Barra de acciones masivas -->
            <div v-if="selectedServices.length > 0" class="bulk-actions-bar p-3 mb-3 surface-100 border-round">
                <div class="flex align-items-center justify-content-between">
                    <span class="font-semibold">
                        <i class="pi pi-check-circle mr-2"></i>
                        {{ selectedServices.length }} servicio{{ selectedServices.length !== 1 ? 's' : '' }} seleccionado{{ selectedServices.length !== 1 ? 's' : '' }}
                    </span>
                    <div class="flex gap-2">
                        <Button label="Aplicar Comisión" icon="pi pi-percentage" size="small" severity="success" @click="showBulkDialog = true" />
                        <Button label="Eliminar" icon="pi pi-trash" size="small" severity="danger" @click="openDeleteConfirmation" />
                        <Button label="Limpiar" icon="pi pi-times" text size="small" @click="selectedServices = []" />
                    </div>
                </div>
            </div>

            <DataTable
                v-model:filters="localFilters"
                v-model:selection="selectedServices"
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

                <!-- Columna de selección -->
                <Column selectionMode="multiple" headerStyle="width: 3rem" :exportable="false"></Column>

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
                        {{ formatDate(slotProps.data.date) }} <br />
                        <small class="text-gray-500">{{ formatTime(slotProps.data.time) }}</small>
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
                <Column field="comision" header="Comisión" sortable style="min-width: 160px">
                    <template #body="slotProps">
                        <div style="display: flex; flex-direction: column">
                            <div class="flex align-items-center gap-2">
                                <span :class="{ 'text-green-600 font-bold': slotProps.data.comision > 0 }"> S/ {{ slotProps.data.comision.toFixed(2) }} </span>
                                <Button icon="pi pi-pencil" text rounded size="small" severity="secondary" @click="openCommissionEdit($event, slotProps.data)" v-tooltip.top="'Editar comisión'" />
                            </div>
                            <small class="text-400" style="font-size: 0.7rem; display: block">{{ calculatePercentage(slotProps.data) }}%</small>
                        </div>
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

            <!-- Componentes de edición de comisión -->
            <ManualCommissionPopover ref="commissionPopover" :service="currentService" @apply="handleApplyCommission" />

            <BulkManualCommissionDialog v-model:visible="showBulkDialog" :selectedServices="selectedServices" @apply="handleBulkApply" />

            <!-- Diálogo de confirmación de eliminación -->
            <Dialog v-model:visible="showDeleteDialog" header="Confirmar Eliminación" :modal="true" :style="{ width: '450px' }">
                <div class="flex align-items-center gap-3 mb-3">
                    <i class="pi pi-exclamation-triangle text-orange-500" style="font-size: 2rem"></i>
                    <div>
                        <p class="m-0 font-semibold">¿Está seguro de eliminar los servicios seleccionados?</p>
                        <p class="mt-2 mb-0 text-sm text-color-secondary">Se eliminarán {{ selectedServices.length }} servicio{{ selectedServices.length !== 1 ? 's' : '' }}. Esta acción no se puede deshacer.</p>
                    </div>
                </div>

                <template #footer>
                    <Button label="Cancelar" icon="pi pi-times" text @click="showDeleteDialog = false" />
                    <Button label="Eliminar" icon="pi pi-trash" severity="danger" @click="confirmDelete" />
                </template>
            </Dialog>
        </template>
    </Card>
</template>

<style scoped>
.services-table-card {
    margin-top: 2rem;
}
</style>
