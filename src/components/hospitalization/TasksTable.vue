<script setup>
import { useTasksStore } from '@/store/tasksStore';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const emit = defineEmits(['edit-task', 'new-task']);

const store = useTasksStore();
const { tasks, loading, pagination } = storeToRefs(store);

const filters = ref({
    global: { value: null, matchMode: 'contains' }
});

const onPage = (event) => {
    store.fetchTasks({ paginate: true, page: event.page + 1, per_page: event.rows });
};

const editTask = (task) => {
    store.selectTask(task);
    emit('edit-task', task);
};

const newTask = () => {
    emit('new-task');
};

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
    return `${patient.document_type} ${patient.number_document} | ${patient.age_formatted} | ${patient.sex === 'M' ? 'Masculino' : 'Femenino'}`;
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
</script>

<template>
    <div class="card">
        <DataTable
            :value="tasks"
            :loading="loading"
            lazy
            paginator
            :rows="pagination.per_page"
            :totalRecords="pagination.total"
            @page="onPage"
            :rowsPerPageOptions="[10, 20, 50]"
            v-model:filters="filters"
            filterDisplay="row"
            :globalFilterFields="['description', 'hospital_attention.patient.name', 'hospital_attention.number']"
            stripedRows
            size="small"
            class="p-datatable-sm"
        >
            <template #header>
                <div class="flex align-items-center justify-content-between gap-3">
                    <span class="text-xl font-semibold text-900">Tareas de Hospitalización</span>
                    <div class="flex gap-2">
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters.global.value" placeholder="Buscar..." size="small" />
                        </IconField>
                        <Button icon="pi pi-plus" severity="success" size="small" @click="newTask" v-tooltip.top="'Nueva tarea'" />
                    </div>
                </div>
            </template>

            <template #empty>
                <div class="text-center p-3 text-500">
                    <i class="pi pi-inbox text-3xl mb-2"></i>
                    <p>No hay tareas registradas</p>
                </div>
            </template>

            <Column field="id" header="ID" style="width: 60px">
                <template #body="slotProps">
                    <span class="font-semibold text-600">#{{ slotProps.data.id }}</span>
                </template>
            </Column>

            <Column header="Paciente" style="min-width: 200px">
                <template #body="slotProps">
                    <div class="flex align-items-center gap-2">
                        <i class="pi pi-user text-primary" v-tooltip.top="getPatientTooltip(slotProps.data.hospital_attention.patient)"></i>
                        <span class="font-medium">
                            {{ slotProps.data.hospital_attention.patient.name }}
                        </span>
                    </div>
                </template>
            </Column>

            <Column header="Cama" style="width: 100px">
                <template #body="slotProps">
                    <Tag :value="slotProps.data.hospital_attention.bed.name" severity="secondary" v-tooltip.top="getAttentionTooltip(slotProps.data.hospital_attention)" />
                </template>
            </Column>

            <Column header="Doctor" style="min-width: 180px">
                <template #body="slotProps">
                    <div class="flex align-items-center gap-2">
                        <i class="pi pi-user-edit text-600" v-tooltip.top="getDoctorTooltip(slotProps.data.hospital_attention)"></i>
                        <span class="text-sm text-900">
                            {{ slotProps.data.hospital_attention.doctor }}
                        </span>
                    </div>
                </template>
            </Column>

            <Column header="Descripción" style="min-width: 220px">
                <template #body="slotProps">
                    <span class="text-900">{{ slotProps.data.description }}</span>
                </template>
            </Column>

            <Column header="Estado" style="width: 120px">
                <template #body="slotProps">
                    <div class="flex align-items-center gap-2">
                        <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getSeverity(slotProps.data.status)" size="small" />
                        <i v-if="slotProps.data.is_completed_late" class="pi pi-exclamation-triangle text-orange-500" v-tooltip.top="'Completado con retraso'"></i>
                        <i v-else-if="slotProps.data.is_completed_on_time" class="pi pi-check-circle text-green-500" v-tooltip.top="'Completado a tiempo'"></i>
                        <i v-else-if="slotProps.data.is_overdue" class="pi pi-times-circle text-red-500" v-tooltip.top="'Tarea vencida'"></i>
                        <i v-else-if="slotProps.data.is_nearing_due" class="pi pi-clock text-orange-500" v-tooltip.top="'Próxima a vencer'"></i>
                    </div>
                </template>
            </Column>

            <Column header="Vencimiento" style="width: 140px">
                <template #body="slotProps">
                    <div class="flex align-items-center gap-2" v-tooltip.top="getDateTooltip(slotProps.data)">
                        <i class="pi pi-calendar text-600"></i>
                        <div class="flex flex-column">
                            <span class="text-sm font-medium">{{ formatDate(slotProps.data.due_date) }}</span>
                            <span class="text-xs text-500">{{ formatRelativeTime(slotProps.data.due_date) }}</span>
                        </div>
                    </div>
                </template>
            </Column>

            <Column header="Completado" style="width: 140px">
                <template #body="slotProps">
                    <div v-if="slotProps.data.completed_at" class="flex align-items-center gap-2" v-tooltip.top="getDateTooltip(slotProps.data)">
                        <i class="pi pi-check text-green-600"></i>
                        <div class="flex flex-column">
                            <span class="text-sm">{{ formatDate(slotProps.data.completed_at) }}</span>
                            <span class="text-xs text-500">{{ formatRelativeTime(slotProps.data.completed_at) }}</span>
                        </div>
                    </div>
                    <span v-else class="text-400 text-sm">-</span>
                </template>
            </Column>

            <Column :exportable="false" style="width: 80px" frozen alignFrozen="right">
                <template #body="slotProps">
                    <div class="flex gap-1">
                        <Button icon="pi pi-pencil" severity="info" text rounded size="small" v-tooltip.top="'Editar'" @click="editTask(slotProps.data)" />
                        <Button icon="pi pi-eye" severity="secondary" text rounded size="small" v-tooltip.top="'Ver detalles'" />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
:deep(.p-datatable-tbody > tr > td) {
    padding: 0.5rem;
}

:deep(.p-datatable-thead > tr > th) {
    padding: 0.75rem 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
}

:deep(.p-tag) {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
}
</style>
