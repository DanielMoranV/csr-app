<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';

const props = defineProps({
    visible: Boolean,
    room: Object,
    editing: Boolean
});

const emit = defineEmits(['update:visible', 'save']);

const localRoom = ref({});

watch(() => props.room, (newRoom) => {
    localRoom.value = { ...newRoom };
});

const save = () => {
    emit('save', localRoom.value);
};

const close = () => {
    emit('update:visible', false);
};

</script>

<template>
    <Dialog :visible="visible" :header="editing ? 'Editar Habitación' : 'Nueva Habitación'" :modal="true" @update:visible="close">
        <div class="p-fluid">
            <div class="field">
                <label for="number">Número</label>
                <InputText id="number" v-model="localRoom.number" />
            </div>
            <div class="field">
                <label for="notes">Notas</label>
                <Textarea id="notes" v-model="localRoom.notes" rows="3" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Guardar" icon="pi pi-check" @click="save" />
        </template>
    </Dialog>
</template>
