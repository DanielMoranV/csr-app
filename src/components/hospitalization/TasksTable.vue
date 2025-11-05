<script setup>
import { useTasksStore } from '@/store/tasksStore';
import { useExcelExport } from '@/composables/useExcelExport';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const store = useTasksStore();
const { tasks, loading } = storeToRefs(store);
const { exportToExcel } = useExcelExport();
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

const exportExcel = () => {
    if (!tasks.value || tasks.value.length === 0) {
        console.warn('No hay datos para exportar');
        return;
    }

    // Preparar los datos con campos calculados
    const dataToExport = tasks.value.map((task) => ({
        ...task,
        patient_name: task.hospital_attention?.patient?.name || '',
        patient_document: task.hospital_attention?.patient?.document_type + ' ' + task.hospital_attention?.patient?.number_document || '',
        bed_name: task.hospital_attention?.bed?.name || '',
        doctor_name: task.hospital_attention?.doctor || '',
        doctor_code: task.hospital_attention?.code_doctor || '',
        status_label: getStatusLabel(task.status),
        created_by_user: getCreatedByUser(task),
        completed_by_user: getCompletedByUser(task) || '',
        is_late: task.is_completed_late ? 'Sí' : 'No',
        is_on_time: task.is_completed_on_time ? 'Sí' : 'No',
        is_overdue_text: task.is_overdue ? 'Sí' : 'No'
    }));

    // Definir las columnas para exportación
    const columns = [
        { field: 'id', header: 'ID', type: 'number', width: 8 },
        { field: 'patient_name', header: 'Paciente', width: 25 },
        { field: 'patient_document', header: 'Documento', width: 18 },
        { field: 'bed_name', header: 'Cama', width: 12 },
        { field: 'doctor_name', header: 'Doctor', width: 25 },
        { field: 'doctor_code', header: 'Código Doctor', width: 15 },
        { field: 'description', header: 'Descripción', width: 40 },
        { field: 'status_label', header: 'Estado', width: 15 },
        { field: 'created_by_user', header: 'Creado Por', width: 18 },
        { field: 'completed_by_user', header: 'Completado Por', width: 18 },
        { field: 'due_date', header: 'Fecha Vencimiento', type: 'date', width: 20 },
        { field: 'completed_at', header: 'Fecha Completado', type: 'date', width: 20 },
        { field: 'is_late', header: 'Completado con Retraso', width: 20 },
        { field: 'is_overdue_text', header: 'Vencida', width: 12 }
    ];

    // Generar nombre del archivo con fecha actual
    const today = format(new Date(), 'yyyy-MM-dd');
    const fileName = `tareas-hospitalizacion-${today}`;

    // Exportar a Excel
    exportToExcel(dataToExport, columns, fileName, {
        sheetName: 'Tareas',
        autoFilter: true,
        freezeHeader: true
    });
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
                        <Button icon="pi pi-file-excel" class="export-button" @click="exportExcel" v-tooltip.top="'Exportar a Excel'" />
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
/* Variables personalizadas para compatibilidad con modo oscuro */
.card {
    --surface-hover: color-mix(in srgb, var(--surface-card) 95%, var(--text-color) 5%);
    --card-shadow: rgba(0, 0, 0, 0.08);
    --card-shadow-hover: rgba(0, 0, 0, 0.12);
}

/* Dark mode adjustments */
:global(.dark) .card,
:global([data-theme='dark']) .card {
    --card-shadow: rgba(0, 0, 0, 0.3);
    --card-shadow-hover: rgba(0, 0, 0, 0.4);
}

/* Modern Table Header */
.table-header-modern {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-bottom: 2px solid color-mix(in srgb, var(--green-500) 20%, var(--surface-border));
    gap: 1rem;
    position: relative;
}

.table-header-modern::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #10b981, #14b8a6, #10b981);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
    0%, 100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
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
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0891b2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 8px rgba(20, 184, 166, 0.2);
    position: relative;
    overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}

.header-icon-badge::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
    0%, 100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}

@keyframes iconPulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 8px rgba(20, 184, 166, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4), 0 3px 10px rgba(20, 184, 166, 0.3);
    }
}

.header-icon-badge i {
    font-size: 1.5rem;
    color: white;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* Dark mode support */
:global(.dark) .header-icon-badge,
:global([data-theme='dark']) .header-icon-badge {
    background: linear-gradient(135deg, #34d399 0%, #2dd4bf 50%, #22d3ee 100%);
    box-shadow: 0 4px 12px rgba(52, 211, 153, 0.4), 0 2px 8px rgba(45, 212, 191, 0.3);
}

:global(.dark) .header-icon-badge::before,
:global([data-theme='dark']) .header-icon-badge::before {
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.header-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.015em;
}

.header-count {
    font-size: 0.813rem;
    font-weight: 600;
    color: #047857;
    background: linear-gradient(135deg, #d1fae5 0%, #ccfbf1 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #6ee7b7;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
}

/* Dark mode support */
:global(.dark) .header-count,
:global([data-theme='dark']) .header-count {
    color: #6ee7b7;
    background: linear-gradient(135deg, #064e3b 0%, #115e59 100%);
    border: 1px solid #34d399;
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
    border: 2px solid var(--surface-border);
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem;
    transition: all 0.3s ease;
    background: var(--surface-ground);
    color: var(--text-color);
}

.search-input-modern:hover {
    border-color: #cbd5e1;
}

.search-input-modern:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.export-button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    width: 40px !important;
    height: 40px !important;
    border-radius: 10px !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3), 0 2px 6px rgba(5, 150, 105, 0.2) !important;
    transition: all 0.3s ease !important;
    color: white !important;
    position: relative;
    overflow: hidden;
}

.export-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.export-button:hover::before {
    transform: translateX(100%);
}

.export-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4), 0 3px 10px rgba(5, 150, 105, 0.3) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}

/* Dark mode support */
:global(.dark) .export-button,
:global([data-theme='dark']) .export-button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(5, 150, 105, 0.3) !important;
}

:global(.dark) .export-button:hover,
:global([data-theme='dark']) .export-button:hover {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%) !important;
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.5), 0 3px 10px rgba(5, 150, 105, 0.4) !important;
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
    background: var(--surface-100);
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-icon-wrapper i {
    font-size: 2.5rem;
    color: var(--text-color-secondary);
    opacity: 0.5;
}

.empty-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
}

.empty-description {
    font-size: 0.938rem;
    color: var(--text-color-secondary);
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
    border-bottom: 1px solid var(--surface-border);
}

.p-datatable-compact :deep(.p-datatable-tbody > tr:hover) {
    background: linear-gradient(135deg, var(--surface-hover) 0%, color-mix(in srgb, var(--surface-hover) 95%, var(--primary-50) 5%) 100%) !important;
    transform: scale(1.002);
    box-shadow: 0 2px 8px var(--card-shadow), 0 0 0 1px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.p-datatable-compact :deep(.p-datatable-thead > tr > th) {
    padding: 0.875rem 0.75rem;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--surface-section);
    color: var(--text-color-secondary);
    border-bottom: 2px solid var(--surface-border);
}

/* ID Badge - Modern Style */
.id-badge {
    display: inline-block;
    font-weight: 700;
    font-size: 0.75rem;
    color: var(--indigo-700);
    background: linear-gradient(135deg, var(--indigo-50) 0%, var(--purple-50) 100%);
    padding: 0.375rem 0.625rem;
    border-radius: 8px;
    border: 1px solid var(--indigo-200);
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px color-mix(in srgb, var(--indigo-500) 10%, transparent);
}

.id-badge:hover {
    background: linear-gradient(135deg, var(--indigo-100) 0%, var(--purple-100) 100%);
    transform: scale(1.05);
    box-shadow: 0 3px 8px color-mix(in srgb, var(--indigo-500) 20%, transparent);
    border-color: var(--indigo-300);
}

/* Cell Content - Enhanced */
.cell-content {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.cell-icon {
    font-size: 1rem;
    color: var(--indigo-600);
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--indigo-50) 0%, var(--purple-50) 100%);
    border-radius: 6px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px color-mix(in srgb, var(--indigo-500) 10%, transparent);
}

.cell-icon:hover {
    background: linear-gradient(135deg, var(--indigo-100) 0%, var(--purple-100) 100%);
    transform: scale(1.1);
    box-shadow: 0 2px 6px color-mix(in srgb, var(--indigo-500) 20%, transparent);
}

.cell-icon-small {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    flex-shrink: 0;
}

.cell-icon-small.success {
    color: var(--green-500);
}

.cell-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
    line-height: 1.4;
}

.cell-text-secondary {
    font-size: 0.813rem;
    font-weight: 500;
    color: var(--text-color-secondary);
    line-height: 1.4;
}

.description-text {
    font-size: 0.875rem;
    color: var(--text-color);
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
    background: var(--yellow-50);
    color: var(--yellow-800);
    border-color: var(--yellow-200);
}

:deep(.p-tag.p-tag-success) {
    background: var(--green-50);
    color: var(--green-800);
    border-color: var(--green-200);
}

:deep(.p-tag.p-tag-info) {
    background: var(--blue-50);
    color: var(--blue-800);
    border-color: var(--blue-200);
}

:deep(.p-tag.p-tag-danger) {
    background: var(--red-50);
    color: var(--red-800);
    border-color: var(--red-200);
}

:deep(.p-tag.p-tag-secondary) {
    background: var(--surface-100);
    color: var(--text-color-secondary);
    border-color: var(--surface-300);
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
    color: var(--orange-500);
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--orange-500) 30%, transparent));
}

.status-icon.success {
    color: var(--green-500);
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--green-500) 30%, transparent));
}

.status-icon.danger {
    color: var(--red-500);
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--red-500) 30%, transparent));
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
    color: var(--text-color);
    line-height: 1.3;
}

.user-completed {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--green-500);
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
    color: var(--text-color);
    line-height: 1.3;
}

.date-secondary {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color-secondary);
    line-height: 1.3;
    font-style: italic;
}

/* Empty Value */
.empty-value {
    font-size: 0.813rem;
    color: var(--text-color-secondary);
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
    background: var(--surface-100);
    border-radius: 4px;
}

.p-datatable-compact :deep(.p-datatable-wrapper::-webkit-scrollbar-thumb) {
    background: var(--surface-300);
    border-radius: 4px;
    transition: background 0.2s ease;
}

.p-datatable-compact :deep(.p-datatable-wrapper::-webkit-scrollbar-thumb:hover) {
    background: var(--surface-400);
}

/* Striped Rows Enhancement */
.p-datatable-compact :deep(.p-datatable-tbody > tr:nth-child(even)) {
    background-color: color-mix(in srgb, var(--surface-ground) 98%, var(--text-color) 2%);
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
