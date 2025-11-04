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
            :value="tasks || []"
            :loading="loading"
            v-model:filters="filters"
            filterDisplay="row"
            :globalFilterFields="['description', 'hospital_attention.patient.name', 'hospital_attention.number']"
            stripedRows
            size="small"
            class="p-datatable-compact"
        >
            <template #header>
                <div class="table-header-modern">
                    <div class="header-left">
                        <div class="header-icon-badge">
                            <i class="pi pi-list-check"></i>
                        </div>
                        <div class="header-info">
                            <span class="header-title">Tareas de Hospitalización</span>
                            <span class="header-count" v-if="tasks && tasks.length">{{ tasks.length }} {{ tasks.length === 1 ? 'tarea' : 'tareas' }}</span>
                        </div>
                    </div>
                    <div class="header-actions-modern">
                        <IconField iconPosition="left" class="search-field">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters.global.value" placeholder="Buscar en la tabla..." class="search-input-modern" />
                        </IconField>
                        <Button icon="pi pi-file-excel" class="export-button" @click="exportCSV" v-tooltip.top="'Exportar a Excel'" />
                    </div>
                </div>
            </template>

            <template #empty>
                <div class="empty-state-modern">
                    <div class="empty-icon-wrapper">
                        <i class="pi pi-inbox"></i>
                    </div>
                    <h3 class="empty-title">No se encontraron tareas</h3>
                    <p class="empty-description">No hay tareas que coincidan con tus filtros actuales</p>
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
/* Modern Table Header */
.table-header-modern {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    border-bottom: 2px solid #e9ecef;
    gap: 1rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-icon-badge {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981, #059669);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.header-icon-badge i {
    font-size: 1.5rem;
    color: white;
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.header-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1e293b;
    letter-spacing: -0.015em;
}

.header-count {
    font-size: 0.813rem;
    font-weight: 600;
    color: #64748b;
    background: #f1f5f9;
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
}

.header-actions-modern {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.search-field {
    width: 280px;
}

.search-input-modern {
    border-radius: 10px;
    border: 2px solid #e2e8f0;
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem;
    transition: all 0.3s ease;
    background: white;
}

.search-input-modern:hover {
    border-color: #cbd5e1;
}

.search-input-modern:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.export-button {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    border: none !important;
    width: 40px !important;
    height: 40px !important;
    border-radius: 10px !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3) !important;
    transition: all 0.3s ease !important;
}

.export-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4) !important;
}

/* Modern Empty State */
.empty-state-modern {
    text-align: center;
    padding: 4rem 2rem;
    animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.empty-icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-icon-wrapper i {
    font-size: 2.5rem;
    color: #94a3b8;
}

.empty-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #334155;
    margin: 0 0 0.5rem 0;
}

.empty-description {
    font-size: 0.938rem;
    color: #64748b;
    margin: 0;
}

/* Enhanced Table Styling */
.p-datatable-compact :deep(.p-datatable-wrapper) {
    border-radius: 12px;
    overflow: hidden;
}

.p-datatable-compact :deep(.p-datatable-tbody > tr) {
    transition: all 0.2s ease;
}

.p-datatable-compact :deep(.p-datatable-tbody > tr > td) {
    padding: 0.875rem 0.75rem;
    font-size: 0.875rem;
    border-bottom: 1px solid #f1f5f9;
}

.p-datatable-compact :deep(.p-datatable-tbody > tr:hover) {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
    transform: scale(1.002);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.p-datatable-compact :deep(.p-datatable-thead > tr > th) {
    padding: 0.875rem 0.75rem;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f5f9 100%);
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
}

/* ID Badge - Modern Style */
.id-badge {
    display: inline-block;
    font-weight: 700;
    font-size: 0.75rem;
    color: #6366f1;
    background: linear-gradient(135deg, #eef2ff, #e0e7ff);
    padding: 0.375rem 0.625rem;
    border-radius: 8px;
    border: 1px solid #c7d2fe;
    transition: all 0.2s ease;
}

.id-badge:hover {
    background: linear-gradient(135deg, #e0e7ff, #ddd6fe);
    transform: scale(1.05);
}

/* Cell Content - Enhanced */
.cell-content {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.cell-icon {
    font-size: 1rem;
    color: #6366f1;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef2ff;
    border-radius: 6px;
}

.cell-icon-small {
    font-size: 0.875rem;
    color: #64748b;
    flex-shrink: 0;
}

.cell-icon-small.success {
    color: #10b981;
}

.cell-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.4;
}

.cell-text-secondary {
    font-size: 0.813rem;
    font-weight: 500;
    color: #475569;
    line-height: 1.4;
}

.description-text {
    font-size: 0.875rem;
    color: #334155;
    line-height: 1.5;
    font-weight: 500;
}

/* Modern Tags */
.compact-tag {
    font-size: 0.75rem;
    padding: 0.313rem 0.625rem;
    font-weight: 600;
    border-radius: 8px;
    letter-spacing: 0.015em;
    border: 1px solid transparent;
}

:deep(.p-tag.p-tag-warning) {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    color: #92400e;
    border-color: #fcd34d;
}

:deep(.p-tag.p-tag-success) {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    color: #065f46;
    border-color: #6ee7b7;
}

:deep(.p-tag.p-tag-info) {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    color: #1e40af;
    border-color: #93c5fd;
}

:deep(.p-tag.p-tag-danger) {
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    color: #991b1b;
    border-color: #fca5a5;
}

:deep(.p-tag.p-tag-secondary) {
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    color: #475569;
    border-color: #cbd5e1;
}

/* Status Cell - Enhanced */
.status-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.status-icon {
    font-size: 1rem;
    animation: fadeIn 0.3s ease-in;
}

.status-icon.warning {
    color: #f59e0b;
    filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.3));
}

.status-icon.success {
    color: #10b981;
    filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.3));
}

.status-icon.danger {
    color: #ef4444;
    filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.3));
    animation: pulse 2s ease-in-out infinite;
}

/* User Cell - Enhanced */
.user-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
}

.user-info {
    display: flex;
    flex-direction: column;
    gap: 0.188rem;
}

.user-name {
    font-size: 0.813rem;
    font-weight: 600;
    color: #334155;
    line-height: 1.3;
}

.user-completed {
    font-size: 0.75rem;
    font-weight: 600;
    color: #10b981;
    line-height: 1.3;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

/* Date Cell - Enhanced */
.date-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-info {
    display: flex;
    flex-direction: column;
    gap: 0.188rem;
}

.date-primary {
    font-size: 0.813rem;
    font-weight: 600;
    color: #334155;
    line-height: 1.3;
}

.date-secondary {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    line-height: 1.3;
    font-style: italic;
}

/* Empty Value */
.empty-value {
    font-size: 0.813rem;
    color: #94a3b8;
    opacity: 0.7;
    font-style: italic;
}

/* Loading State */
.p-datatable-compact :deep(.p-datatable-loading-icon) {
    color: var(--primary-color);
}

/* Scrollbar Styling */
.p-datatable-compact :deep(.p-datatable-wrapper::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
}

.p-datatable-compact :deep(.p-datatable-wrapper::-webkit-scrollbar-track) {
    background: #f1f5f9;
    border-radius: 4px;
}

.p-datatable-compact :deep(.p-datatable-wrapper::-webkit-scrollbar-thumb) {
    background: #cbd5e1;
    border-radius: 4px;
    transition: background 0.2s ease;
}

.p-datatable-compact :deep(.p-datatable-wrapper::-webkit-scrollbar-thumb:hover) {
    background: #94a3b8;
}

/* Striped Rows Enhancement */
.p-datatable-compact :deep(.p-datatable-tbody > tr:nth-child(even)) {
    background-color: #fafbfc;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .table-header-modern {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .header-actions-modern {
        flex-direction: column;
        width: 100%;
    }

    .search-field {
        width: 100%;
    }

    .export-button {
        width: 100% !important;
    }
}

@media (max-width: 768px) {
    .table-header-modern {
        padding: 1rem;
    }

    .header-icon-badge {
        width: 40px;
        height: 40px;
    }

    .header-icon-badge i {
        font-size: 1.25rem;
    }

    .header-title {
        font-size: 1rem;
    }

    .p-datatable-compact :deep(.p-datatable-tbody > tr > td),
    .p-datatable-compact :deep(.p-datatable-thead > tr > th) {
        padding: 0.625rem 0.5rem;
        font-size: 0.813rem;
    }
}

/* Animation Keyframes */
@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}
</style>
