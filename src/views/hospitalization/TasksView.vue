<script setup>
import TasksTable from '@/components/hospitalization/TasksTable.vue';
import { useTasksStore } from '@/store/tasksStore';
import { format } from 'date-fns';
import { onMounted, ref } from 'vue';

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
                <!-- Header Section -->
                <div class="mb-4 pb-3 border-bottom-1 surface-border">
                    <h2 class="text-3xl font-semibold text-900 m-0 mb-2">
                        <i class="pi pi-list-check mr-3 text-primary"></i>
                        Gestión de Tareas
                    </h2>
                    <p class="text-600 m-0">Busca y filtra tareas por rango de fechas</p>
                </div>

                <!-- Filters Section -->
                <div class="surface-50 border-round-lg p-4 mb-4 shadow-1">
                    <div class="flex flex-wrap gap-3 align-items-end">
                        <div class="flex-1" style="min-width: 200px">
                            <label for="start_date" class="block text-900 font-medium mb-2">
                                <i class="pi pi-calendar-plus mr-2 text-500"></i>
                                Fecha de inicio
                            </label>
                            <Calendar v-model="startDate" inputId="start_date" dateFormat="dd/mm/yy" showIcon iconDisplay="input" class="w-full" placeholder="Seleccionar fecha" />
                        </div>

                        <div class="flex-1" style="min-width: 200px">
                            <label for="end_date" class="block text-900 font-medium mb-2">
                                <i class="pi pi-calendar-times mr-2 text-500"></i>
                                Fecha de fin
                            </label>
                            <Calendar v-model="endDate" inputId="end_date" dateFormat="dd/mm/yy" showIcon iconDisplay="input" class="w-full" placeholder="Seleccionar fecha" />
                        </div>

                        <div>
                            <Button label="Buscar" icon="pi pi-search" class="p-button-primary p-button-lg" @click="fetchTasks" :disabled="!startDate || !endDate" />
                        </div>
                    </div>
                </div>

                <!-- Info Banner -->
                <div class="surface-100 border-round p-3 mb-4 flex align-items-center gap-3" v-if="startDate && endDate">
                    <i class="pi pi-info-circle text-primary text-xl"></i>
                    <div class="text-700">
                        Mostrando tareas desde
                        <strong class="text-900">{{ format(startDate, 'dd/MM/yyyy') }}</strong>
                        hasta
                        <strong class="text-900">{{ format(endDate, 'dd/MM/yyyy') }}</strong>
                    </div>
                </div>

                <!-- Table Section -->
                <TasksTable />
            </div>
        </div>
    </div>
</template>

<style scoped>
.card {
    transition: all 0.3s ease;
}

:deep(.p-calendar) {
    width: 100%;
}

:deep(.p-calendar .p-inputtext) {
    padding: 0.75rem 1rem;
    border-radius: 6px;
}

:deep(.p-button) {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
}

:deep(.p-button:hover:not(:disabled)) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.p-button:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
