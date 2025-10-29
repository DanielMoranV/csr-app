<script setup>
import { ref, onMounted } from 'vue';
import { useTasksStore } from '@/store/tasksStore';
import TasksTable from '@/components/hospitalization/TasksTable.vue';
import TaskDialog from '@/components/hospitalization/TaskDialog.vue';

const store = useTasksStore();
const displayTaskDialog = ref(false);

onMounted(() => {
    store.fetchTasks({ paginate: true, page: 1, per_page: 10 });
});

const openNewTaskDialog = () => {
    store.clearSelectedTask();
    displayTaskDialog.value = true;
};

const onHideDialog = () => {
    displayTaskDialog.value = false;
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <TasksTable @edit-task="displayTaskDialog = true" @new-task="openNewTaskDialog" />
            </div>
            <TaskDialog :visible="displayTaskDialog" @hide="onHideDialog" />
        </div>
    </div>
</template>
