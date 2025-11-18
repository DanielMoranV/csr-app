<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    doctors: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    emptyMessage: {
        type: String,
        default: 'No se encontraron médicos con los filtros aplicados'
    },
    rowsPerPage: {
        type: Number,
        default: 25
    }
});

const emit = defineEmits(['view-doctor', 'edit-doctor', 'delete-doctor', 'manage-specialties', 'manage-schedules', 'refresh']);

const toast = useToast();

// Métodos de utilidad
const getInitials = (name) => {
    return name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
};

const getDocumentTypeLabel = (type) => {
    const labels = {
        dni: 'DNI',
        ce: 'CE',
        passport: 'Pasaporte'
    };
    return labels[type] || type;
};

const getPaymentPayrollLabel = (type) => {
    const labels = {
        total: 'Total',
        partial: 'Parcial',
        none: 'Ninguno'
    };
    return labels[type] || type;
};

const getPaymentPayrollSeverity = (type) => {
    const severityMap = {
        total: 'success',
        partial: 'warn',
        none: 'secondary'
    };
    return severityMap[type] || 'secondary';
};

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.add({
            severity: 'success',
            summary: '✅ Copiado',
            detail: `${text} copiado al portapapeles`,
            life: 2000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo copiar al portapapeles',
            life: 3000
        });
    }
};

// Acciones de tabla
const handleViewDoctor = (doctor) => {
    emit('view-doctor', doctor);
};

const handleEditDoctor = (doctor) => {
    emit('edit-doctor', doctor);
};

const handleDeleteDoctor = (doctor) => {
    emit('delete-doctor', doctor);
};

const handleManageSpecialties = (doctor) => {
    emit('manage-specialties', doctor);
};

const handleManageSchedules = (doctor) => {
    emit('manage-schedules', doctor);
};
</script>

<template>
    <DataTable
        :value="doctors"
        :loading="loading"
        :rows="rowsPerPage"
        :paginator="doctors.length > rowsPerPage"
        :rowsPerPageOptions="[10, 25, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} médicos"
        responsiveLayout="scroll"
        :emptyMessage="emptyMessage"
        stripedRows
        class="p-datatable-sm"
    >
        <!-- Médico -->
        <Column field="name" header="Médico" :sortable="true" style="min-width: 250px">
            <template #body="{ data }">
                <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-semibold">
                        {{ getInitials(data.name) }}
                    </div>
                    <div class="flex flex-col">
                        <span class="font-semibold">{{ data.name }}</span>
                        <span class="text-sm text-muted">Código: {{ data.code }}</span>
                    </div>
                </div>
            </template>
        </Column>

        <!-- Documento -->
        <Column header="Documento" style="min-width: 150px">
            <template #body="{ data }">
                <div class="flex flex-col">
                    <span class="font-medium">{{ data.document_number }}</span>
                    <span class="text-sm text-muted">{{ getDocumentTypeLabel(data.document_type) }}</span>
                </div>
            </template>
        </Column>

        <!-- CMP -->
        <Column field="cmp" header="CMP" :sortable="true" style="min-width: 120px">
            <template #body="{ data }">
                <div class="flex items-center gap-2">
                    <span class="font-medium">{{ data.cmp }}</span>
                    <Button
                        icon="pi pi-copy"
                        size="small"
                        text
                        rounded
                        class="p-button-sm"
                        @click="copyToClipboard(data.cmp)"
                        v-tooltip.top="'Copiar CMP'"
                    />
                </div>
            </template>
        </Column>

        <!-- RNE -->
        <Column field="rne" header="RNE" style="min-width: 120px">
            <template #body="{ data }">
                <span v-if="data.rne" class="font-medium">{{ data.rne }}</span>
                <span v-else class="text-muted">-</span>
            </template>
        </Column>

        <!-- Tipo de Pago -->
        <Column field="payment_payroll" header="Pago" :sortable="true" style="min-width: 130px">
            <template #body="{ data }">
                <Tag :value="getPaymentPayrollLabel(data.payment_payroll)" :severity="getPaymentPayrollSeverity(data.payment_payroll)" />
            </template>
        </Column>

        <!-- Especialidades -->
        <Column header="Especialidades" style="min-width: 150px">
            <template #body="{ data }">
                <div class="flex items-center gap-2">
                    <Tag v-if="data.specialties_count > 0" :value="`${data.specialties_count} esp.`" severity="info" />
                    <span v-else class="text-muted text-sm">Sin especialidades</span>
                </div>
            </template>
        </Column>

        <!-- Atenciones Activas -->
        <Column header="Atenciones" style="min-width: 130px">
            <template #body="{ data }">
                <div class="flex items-center gap-2">
                    <Tag v-if="data.active_hospital_attentions_count > 0" :value="`${data.active_hospital_attentions_count} activas`" severity="success" />
                    <span v-else class="text-muted text-sm">Sin atenciones</span>
                </div>
            </template>
        </Column>

        <!-- Acciones -->
        <Column header="Acciones" style="min-width: 200px">
            <template #body="{ data }">
                <div class="flex gap-1">
                    <Button
                        icon="pi pi-calendar"
                        size="small"
                        rounded
                        severity="info"
                        outlined
                        v-tooltip.top="'Gestionar Horarios'"
                        @click="handleManageSchedules(data)"
                    />
                    <Button
                        icon="pi pi-heart"
                        size="small"
                        rounded
                        severity="secondary"
                        outlined
                        v-tooltip.top="'Gestionar Especialidades'"
                        @click="handleManageSpecialties(data)"
                    />
                    <Button icon="pi pi-pencil" size="small" rounded severity="success" outlined v-tooltip.top="'Editar'" @click="handleEditDoctor(data)" />
                    <Button icon="pi pi-trash" size="small" rounded severity="danger" outlined v-tooltip.top="'Eliminar'" @click="handleDeleteDoctor(data)" />
                </div>
            </template>
        </Column>
    </DataTable>
</template>

<style scoped>
.text-muted {
    color: var(--text-color-secondary);
}

:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.75rem;
}
</style>
