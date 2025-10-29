<script setup>
import { useTasksStore } from '@/store/tasksStore';
import { format } from 'date-fns';
import { storeToRefs } from 'pinia';

const emit = defineEmits(['edit-task', 'new-task']);

const store = useTasksStore();
const { tasks, loading, pagination } = storeToRefs(store);

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
</script>

<template>
    <DataTable :value="tasks" :loading="loading" lazy paginator :rows="pagination.per_page" :totalRecords="pagination.total" @page="onPage" tableStyle="min-width: 50rem">
        <template #header>
            <div class="flex flex-wrap align-items-center justify-content-between gap-2">
                <span class="text-xl text-900 font-bold">Tareas de Hospitalización</span>
                <Button icon="pi pi-plus" rounded raised @click="newTask" />
            </div>
        </template>
        <Column field="id" header="ID"></Column>
        <Column field="hospital_attention.patient.name" header="Paciente"></Column>
        <Column field="description" header="Descripción"></Column>
        <Column field="status" header="Estado">
            <template #body="slotProps">
                <Tag :value="slotProps.data.status" :severity="getSeverity(slotProps.data.status)" />
            </template>
        </Column>
        <Column field="due_date" header="Fecha Vencimiento">
            <template #body="slotProps">
                {{ slotProps.data.due_date ? format(new Date(slotProps.data.due_date), 'dd/MM/yyyy HH:mm') : 'N/A' }}
            </template>
        </Column>
        <Column field="id_attentions" header="Atención ID"></Column>
        <Column header="Acciones">
            <template #body="slotProps">
                <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editTask(slotProps.data)" />
            </template>
        </Column>
    </DataTable>
</template>
