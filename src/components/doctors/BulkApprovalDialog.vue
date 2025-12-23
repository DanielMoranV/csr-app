<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    services: {
        type: Array,
        default: () => []
    },
    doctorName: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:visible', 'approve']);

// Estado local
const selectedServices = ref([]);
const selectAll = ref(false);
const selectedStatus = ref('aprobado');
const observation = ref('');

// Opciones de estado
const statusOptions = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Revisado', value: 'revisado' },
    { label: 'Aprobado', value: 'aprobado' },
    { label: 'Rechazado', value: 'rechazado' }
];

// Servicios editables (excluir aprobados y rechazados)
const editableServices = computed(() => {
    return props.services.filter((s) => s.status !== 'aprobado' && s.status !== 'rechazado');
});

// Contador de servicios seleccionados
const selectedCount = computed(() => selectedServices.value.length);

// Watch para manejar seleccionar/deseleccionar todos
watch(selectAll, (newValue) => {
    if (newValue) {
        selectedServices.value = [...editableServices.value];
    } else {
        selectedServices.value = [];
    }
});

// Watch para actualizar selectAll cuando cambian las selecciones individuales
watch(
    () => selectedServices.value.length,
    (newLength) => {
        selectAll.value = newLength === editableServices.value.length && newLength > 0;
    }
);

// Funciones de color para estados
function getStatusColor(status) {
    const statusColors = {
        pendiente: 'warn',
        revisado: 'info',
        aprobado: 'success',
        rechazado: 'danger'
    };
    return statusColors[status] || 'secondary';
}

function getStatusLabel(status) {
    const statusLabels = {
        pendiente: 'Pendiente',
        revisado: 'Revisado',
        aprobado: 'Aprobado',
        rechazado: 'Rechazado'
    };
    return statusLabels[status] || status;
}

// Cerrar modal
function closeDialog() {
    emit('update:visible', false);
    // Reset
    selectedServices.value = [];
    selectAll.value = false;
    selectedStatus.value = 'aprobado';
    observation.value = '';
}

// Confirmar aprobación
function handleApprove() {
    if (selectedServices.value.length === 0) {
        return;
    }

    const ids = selectedServices.value.map((s) => s.id);

    emit('approve', {
        ids,
        status: selectedStatus.value,
        observation: observation.value || null
    });

    // No cerrar inmediatamente - el padre cerrará el diálogo después de mostrar el toast
}
</script>

<template>
    <Dialog :visible="visible" @update:visible="closeDialog" modal :header="`Aprobar/Rechazar Atenciones - ${doctorName}`" :style="{ width: '90vw', maxWidth: '1200px' }" :closable="true">
        <div class="bulk-approval-content">
            <!-- Información y controles superiores -->
            <div class="controls-section">
                <div class="info-card">
                    <i class="pi pi-info-circle"></i>
                    <div>
                        <strong>{{ editableServices.length }}</strong> atenciones disponibles para modificar
                        <br />
                        <small class="text-muted"> (Se excluyen atenciones ya aprobadas o rechazadas) </small>
                    </div>
                </div>

                <div class="action-controls">
                    <div class="control-group">
                        <label>Nuevo Estado:</label>
                        <Dropdown v-model="selectedStatus" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Seleccionar estado" class="status-dropdown" />
                    </div>

                    <div class="control-group full-width">
                        <label>Observación (opcional):</label>
                        <Textarea v-model="observation" rows="2" placeholder="Agregar observación..." class="w-full" />
                    </div>
                </div>
            </div>

            <!-- Tabla de servicios -->
            <div class="services-table-section">
                <DataTable v-model:selection="selectedServices" :value="editableServices" dataKey="id" :paginator="true" :rows="10" :rowsPerPageOptions="[10, 20, 50]" class="p-datatable-sm" stripedRows responsiveLayout="scroll">
                    <template #header>
                        <div class="table-header">
                            <div class="flex align-items-center gap-2">
                                <Checkbox v-model="selectAll" :binary="true" inputId="selectAll" />
                                <label for="selectAll" class="cursor-pointer font-semibold">
                                    {{ selectAll ? 'Deseleccionar Todos' : 'Seleccionar Todos' }}
                                </label>
                            </div>
                            <Tag :value="`${selectedCount} seleccionados`" :severity="selectedCount > 0 ? 'success' : 'secondary'" />
                        </div>
                    </template>

                    <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                    <Column field="id" header="ID" sortable style="min-width: 80px"></Column>

                    <Column field="date" header="Fecha" sortable style="min-width: 100px">
                        <template #body="slotProps">
                            {{ slotProps.data.date }}
                        </template>
                    </Column>

                    <Column field="patientName" header="Paciente" sortable style="min-width: 200px">
                        <template #body="slotProps">
                            <div class="font-medium">{{ slotProps.data.patientName || 'N/A' }}</div>
                        </template>
                    </Column>

                    <Column field="serviceName" header="Servicio" style="min-width: 200px">
                        <template #body="slotProps">
                            <small>{{ slotProps.data.generalTariff?.name || slotProps.data.serviceName || 'N/A' }}</small>
                        </template>
                    </Column>

                    <Column field="amount" header="Monto" sortable style="min-width: 100px">
                        <template #body="slotProps"> S/ {{ slotProps.data.amount.toFixed(2) }} </template>
                    </Column>

                    <Column field="serviceType" header="Tipo" sortable style="min-width: 100px">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.serviceType" :severity="slotProps.data.serviceType === 'PLANILLA' ? 'success' : 'warning'" />
                        </template>
                    </Column>

                    <Column field="status" header="Estado Actual" sortable style="min-width: 120px">
                        <template #body="slotProps">
                            <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getStatusColor(slotProps.data.status)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button label="Cancelar" icon="pi pi-times" @click="closeDialog" severity="secondary" outlined />
                <Button :label="`Actualizar ${selectedCount} atención${selectedCount !== 1 ? 'es' : ''}`" icon="pi pi-check" @click="handleApprove" :disabled="selectedCount === 0" severity="success" />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.bulk-approval-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.controls-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.info-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--blue-50);
    border-left: 4px solid var(--blue-500);
    border-radius: 8px;
}

:global(.dark) .info-card {
    background: rgba(59, 130, 246, 0.1);
}

.info-card i {
    font-size: 1.5rem;
    color: var(--blue-500);
}

.text-muted {
    color: var(--text-color-secondary);
    font-size: 0.875rem;
}

.action-controls {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 8px;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.control-group.full-width {
    grid-column: 1 / -1;
}

.control-group label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color);
}

.status-dropdown {
    width: 100%;
}

.services-table-section {
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    overflow: hidden;
}

.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
}

.cursor-pointer {
    cursor: pointer;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
    .action-controls {
        grid-template-columns: 1fr;
    }

    .control-group.full-width {
        grid-column: 1;
    }
}
</style>
