<script setup>
import { useTasksStore } from '@/store/tasksStore';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const store = useTasksStore();
const { tasks, loading } = storeToRefs(store);
const dt = ref();

const filters = ref({
    global: { value: null, matchMode: 'contains' }
});

const getSeverity = (status) => {
    switch (status) {
        case 'pendiente':
            return 'warning';
        case 'realizado':
            return 'success';
        case 'supervisado':
            return 'info';
        case 'anulado':
            return 'danger';
        default:
            return null;
    }
};

const getStatusLabel = (status) => {
    const labels = {
        pendiente: 'Pendiente',
        realizado: 'Realizado',
        supervisado: 'Supervisado',
        anulado: 'Anulado'
    };
    return labels[status] || status;
};

const formatDate = (date) => {
    return date ? format(new Date(date), 'dd/MM/yy HH:mm') : 'N/A';
};

const formatRelativeTime = (date) => {
    return date ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: es }) : '';
};

const getPatientTooltip = (patient) => {
    return `${patient.document_type} ${patient.number_document}\n${patient.age_formatted} - ${patient.sex === 'M' ? 'Masculino' : 'Femenino'}`;
};

const getAttentionTooltip = (attention) => {
    return `Atención: ${attention.number}\nIngreso: ${formatDate(attention.entry_at)}\nTipo: ${attention.type_attention}`;
};

const getDoctorTooltip = (attention) => {
    return `${attention.doctor}\nCódigo: ${attention.code_doctor}`;
};

const getDateTooltip = (task) => {
    let tooltip = `Vencimiento: ${formatDate(task.due_date)}\n${formatRelativeTime(task.due_date)}`;
    if (task.completed_at) {
        tooltip += `\n\nCompletado: ${formatDate(task.completed_at)}\n${formatRelativeTime(task.completed_at)}`;
        tooltip += task.is_completed_late ? '\n⚠️ Completado con retraso' : '\n✓ Completado a tiempo';
    }
    return tooltip;
};

const getCreatedByUser = (task) => {
    const createdHistory = task.status_history?.find((h) => h.new_status === 'pendiente' && h.reason === 'Tarea creada');
    return createdHistory?.changed_by?.nick || 'N/A';
};

const getCompletedByUser = (task) => {
    const completedHistory = task.status_history?.find((h) => h.new_status === 'realizado');
    return completedHistory?.changed_by?.nick || null;
};

const getLastUpdatedByUser = (task) => {
    if (task.status_history && task.status_history.length > 0) {
        const lastHistory = task.status_history[task.status_history.length - 1];
        return lastHistory.changed_by?.nick || 'N/A';
    }
    return 'N/A';
};

const getUsersTooltip = (task) => {
    const createdBy = getCreatedByUser(task);
    const completedBy = getCompletedByUser(task);
    const lastUpdatedBy = getLastUpdatedByUser(task);

    let tooltip = `Creado por: ${createdBy}`;

    if (completedBy) {
        tooltip += `\nCompletado por: ${completedBy}`;
    }

    if (lastUpdatedBy !== completedBy && lastUpdatedBy !== createdBy) {
        tooltip += `\nÚltima actualización: ${lastUpdatedBy}`;
    }

    return tooltip;
};

const exportCSV = () => {
    dt.value.exportCSV();
};
</script>

<template>
    <div class="card">
        <DataTable
            ref="dt"
            :value="tasks"
            :loading="loading"
            v-model:filters="filters"
            filterDisplay="row"
            :globalFilterFields="['description', 'hospital_attention.patient.name', 'hospital_attention.number']"
            stripedRows
            size="small"
            class="p-datatable-compact"
        >
            <template #header>
                <div class="table-header">
                    <div class="header-title">
                        <i class="pi pi-list-check"></i>
                        <span>Tareas de Hospitalización</span>
                    </div>
                    <div class="header-actions">
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters.global.value" placeholder="Buscar..." size="small" class="search-input" />
                        </IconField>
                        <Button icon="pi pi-file-excel" severity="success" size="small" @click="exportCSV" v-tooltip.top="'Exportar a Excel'" />
                    </div>
                </div>
            </template>

            <template #empty>
                <div class="empty-state">
                    <i class="pi pi-inbox"></i>
                    <p>No hay tareas registradas</p>
                </div>
            </template>

            <Column field="id" header="ID" style="width: 50px">
                <template #body="slotProps">
                    <span class="id-badge">#{{ slotProps.data.id }}</span>
                </template>
            </Column>

            <Column header="Paciente" style="min-width: 180px">
                <template #body="slotProps">
                    <div class="cell-content">
                        <i class="pi pi-user cell-icon" v-tooltip.top="getPatientTooltip(slotProps.data.hospital_attention.patient)"></i>
                        <span class="cell-text">
                            {{ slotProps.data.hospital_attention.patient.name }}
                        </span>
                    </div>
                </template>
            </Column>

            <Column header="Cama" style="width: 90px">
                <template #body="slotProps">
                    <Tag :value="slotProps.data.hospital_attention.bed.name" severity="secondary" class="compact-tag" v-tooltip.top="getAttentionTooltip(slotProps.data.hospital_attention)" />
                </template>
            </Column>

            <Column header="Doctor" style="min-width: 160px">
                <template #body="slotProps">
                    <div class="cell-content">
                        <i class="pi pi-user-edit cell-icon" v-tooltip.top="getDoctorTooltip(slotProps.data.hospital_attention)"></i>
                        <span class="cell-text-secondary">
                            {{ slotProps.data.hospital_attention.doctor }}
                        </span>
                    </div>
                </template>
            </Column>

            <Column header="Descripción" style="min-width: 200px">
                <template #body="slotProps">
                    <span class="description-text">{{ slotProps.data.description }}</span>
                </template>
            </Column>

            <Column header="Estado" style="width: 110px">
                <template #body="slotProps">
                    <div class="status-cell">
                        <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getSeverity(slotProps.data.status)" class="compact-tag" />
                        <i v-if="slotProps.data.is_completed_late" class="pi pi-exclamation-triangle status-icon warning" v-tooltip.top="'Completado con retraso'"></i>
                        <i v-else-if="slotProps.data.is_completed_on_time" class="pi pi-check-circle status-icon success" v-tooltip.top="'Completado a tiempo'"></i>
                        <i v-else-if="slotProps.data.is_overdue" class="pi pi-times-circle status-icon danger" v-tooltip.top="'Tarea vencida'"></i>
                        <i v-else-if="slotProps.data.is_nearing_due" class="pi pi-clock status-icon warning" v-tooltip.top="'Próxima a vencer'"></i>
                    </div>
                </template>
            </Column>

            <Column header="Usuario" style="width: 100px">
                <template #body="slotProps">
                    <div class="user-cell" v-tooltip.top="getUsersTooltip(slotProps.data)">
                        <i class="pi pi-users cell-icon-small"></i>
                        <div class="user-info">
                            <span class="user-name">{{ getCreatedByUser(slotProps.data) }}</span>
                            <span v-if="getCompletedByUser(slotProps.data)" class="user-completed"> ✓ {{ getCompletedByUser(slotProps.data) }} </span>
                        </div>
                    </div>
                </template>
            </Column>

            <Column header="Vencimiento" style="width: 120px">
                <template #body="slotProps">
                    <div class="date-cell" v-tooltip.top="getDateTooltip(slotProps.data)">
                        <i class="pi pi-calendar cell-icon-small"></i>
                        <div class="date-info">
                            <span class="date-primary">{{ formatDate(slotProps.data.due_date) }}</span>
                            <span class="date-secondary">{{ formatRelativeTime(slotProps.data.due_date) }}</span>
                        </div>
                    </div>
                </template>
            </Column>

            <Column header="Completado" style="width: 120px">
                <template #body="slotProps">
                    <div v-if="slotProps.data.completed_at" class="date-cell" v-tooltip.top="getDateTooltip(slotProps.data)">
                        <i class="pi pi-check cell-icon-small success"></i>
                        <div class="date-info">
                            <span class="date-primary">{{ formatDate(slotProps.data.completed_at) }}</span>
                            <span class="date-secondary">{{ formatRelativeTime(slotProps.data.completed_at) }}</span>
                        </div>
                    </div>
                    <span v-else class="empty-value">-</span>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
/* Header */
.table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    gap: 1rem;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
}

.header-title i {
    font-size: 1.25rem;
    color: var(--primary-color);
}

.header-actions {
    display: flex;
    gap: 0.5rem;
}

.search-input {
    font-size: 0.813rem;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-color-secondary);
}

.empty-state i {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
}

.empty-state p {
    font-size: 0.875rem;
    margin: 0;
}

/* Table Cells */
.p-datatable-compact :deep(.p-datatable-tbody > tr > td) {
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
}

.p-datatable-compact :deep(.p-datatable-thead > tr > th) {
    padding: 0.625rem 0.5rem;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    background-color: var(--surface-50);
    color: var(--text-color-secondary);
}

/* ID Badge */
.id-badge {
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    background: var(--surface-100);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
}

/* Cell Content */
.cell-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.cell-icon {
    font-size: 0.875rem;
    color: var(--primary-color);
    flex-shrink: 0;
}

.cell-icon-small {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    flex-shrink: 0;
}

.cell-icon-small.success {
    color: #22c55e;
}

.cell-text {
    font-size: 0.813rem;
    font-weight: 500;
    color: var(--text-color);
    line-height: 1.3;
}

.cell-text-secondary {
    font-size: 0.75rem;
    color: var(--text-color);
    line-height: 1.3;
}

.description-text {
    font-size: 0.813rem;
    color: var(--text-color);
    line-height: 1.4;
}

/* Tags */
.compact-tag {
    font-size: 0.688rem;
    padding: 0.188rem 0.438rem;
    font-weight: 500;
}

/* Status Cell */
.status-cell {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.status-icon {
    font-size: 0.813rem;
}

.status-icon.warning {
    color: #f59e0b;
}

.status-icon.success {
    color: #22c55e;
}

.status-icon.danger {
    color: #ef4444;
}

/* User Cell */
.user-cell {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.user-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.user-name {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color);
    line-height: 1.2;
}

.user-completed {
    font-size: 0.688rem;
    color: #22c55e;
    line-height: 1.2;
}

/* Date Cell */
.date-cell {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.date-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.date-primary {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color);
    line-height: 1.2;
}

.date-secondary {
    font-size: 0.688rem;
    color: var(--text-color-secondary);
    line-height: 1.2;
}

/* Empty Value */
.empty-value {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    opacity: 0.5;
}

/* Action Buttons */
.action-buttons {
    display: flex;
    gap: 0.25rem;
}

.action-buttons :deep(.p-button) {
    width: 1.75rem;
    height: 1.75rem;
}

.action-buttons :deep(.p-button .p-button-icon) {
    font-size: 0.813rem;
}

/* Hover Effects */
.p-datatable-compact :deep(.p-datatable-tbody > tr:hover) {
    background-color: var(--surface-50);
}

/* Responsive */
@media (max-width: 768px) {
    .table-header {
        flex-direction: column;
        align-items: stretch;
    }

    .header-actions {
        width: 100%;
    }

    .search-input {
        flex: 1;
    }
}
</style>
