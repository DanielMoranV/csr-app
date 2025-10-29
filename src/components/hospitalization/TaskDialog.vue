<script setup>
import { ref, watch, computed } from 'vue';
import { useTasksStore } from '@/store/tasksStore';
import { storeToRefs } from 'pinia';

const props = defineProps({
    visible: Boolean
});

const emit = defineEmits(['hide']);

const store = useTasksStore();
const { selectedTask } = storeToRefs(store);

const task = ref({});

watch(selectedTask, (newVal) => {
    task.value = newVal ? { ...newVal, due_date: newVal.due_date ? new Date(newVal.due_date) : null } : { status: 'pendiente' };
});

const isNew = computed(() => !task.value.id);

const saveTask = () => {
    const taskData = {
        ...task.value,
        due_date: task.value.due_date ? task.value.due_date.toISOString().slice(0, 19).replace('T', ' ') : null
    };

    if (isNew.value) {
        store.createTask(taskData);
    } else {
        store.updateTask(task.value.id, taskData);
    }
    emit('hide');
};

const hideDialog = () => {
    emit('hide');
};

const statuses = ref(['pendiente', 'realizado', 'supervisado', 'anulado']);
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '450px' }" :header="isNew ? 'Nueva Tarea' : 'Editar Tarea'" :modal="true" class="p-fluid" @update:visible="hideDialog">
        <div class="field">
            <label for="description">Descripción</label>
            <Textarea id="description" v-model.trim="task.description" required="true" autofocus rows="3" />
        </div>
        <div class="field">
            <label for="id_attentions">ID de Atención</label>
            <InputNumber id="id_attentions" v-model.number="task.id_attentions" required="true" />
        </div>
        <div class="field">
            <label for="due_date">Fecha Vencimiento</label>
            <Calendar id="due_date" v-model="task.due_date" showTime hourFormat="24" />
        </div>
        <div class="field">
            <label for="status">Estado</label>
            <Dropdown id="status" v-model="task.status" :options="statuses" placeholder="Seleccione un estado" />
        </div>
        <div class="field" v-if="!isNew && task.status !== 'pendiente'">
            <label for="reason">Razón del cambio de estado</label>
            <InputText id="reason" v-model.trim="task.reason" />
        </div>
        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
            <Button label="Guardar" icon="pi pi-check" class="p-button-text" @click="saveTask" />
        </template>
    </Dialog>
</template>
