<script setup>
import { ref, onMounted } from 'vue';
import { useTasksStore } from '@/store/tasksStore';
import TasksTable from '@/components/hospitalization/TasksTable.vue';
import { format } from 'date-fns';

const store = useTasksStore();
const startDate = ref();
const endDate = ref();

onMounted(() => {
    const today = new Date();
    endDate.value = today;
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    startDate.value = oneMonthAgo;

    fetchTasks();
});

const fetchTasks = () => {
    if (startDate.value && endDate.value) {
        const formattedStartDate = format(startDate.value, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate.value, 'yyyy-MM-dd');
        store.fetchTasksByDateRange(formattedStartDate, formattedEndDate);
    }
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <Toolbar class="mb-4">
                    <template #start>
                        <div class="flex flex-wrap gap-2">
                            <div class="flex flex-column gap-2">
                                <label for="start_date">Fecha de inicio</label>
                                <Calendar v-model="startDate" dateFormat="dd/mm/yy" showIcon />
                            </div>
                            <div class="flex flex-column gap-2">
                                <label for="end_date">Fecha de fin</label>
                                <Calendar v-model="endDate" dateFormat="dd/mm/yy" showIcon />
                            </div>
                            <Button label="Buscar" icon="pi pi-search" class="p-button-primary mt-4" @click="fetchTasks" />
                        </div>
                    </template>
                </Toolbar>
                <TasksTable />
            </div>
        </div>
    </div>
</template>
