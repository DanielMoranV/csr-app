<script setup>
import { defineEmits, defineProps, ref, watch } from 'vue';

const props = defineProps({
    visible: Boolean,
    room: Object,
    editing: Boolean
});

const emit = defineEmits(['update:visible', 'save']);

const localRoom = ref({});

watch(
    () => props.room,
    (newRoom) => {
        localRoom.value = { ...newRoom };
    }
);

const save = () => {
    emit('save', localRoom.value);
};

const close = () => {
    emit('update:visible', false);
};
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '450px' }" :header="editing ? 'Editar Habitación' : 'Nueva Habitación'" :modal="true" class="p-fluid" @update:visible="close">
        <div class="field">
            <label for="number">Número</label>
            <IconField>
                <InputIcon class="pi pi-hashtag" />
                <InputText id="number" v-model.trim="localRoom.number" required="true" autofocus fluid />
            </IconField>
            <!-- Small text for validation errors can be added here -->
        </div>

        <div class="field mt-3">
            <label for="notes">Notas</label>
            <IconField>
                <InputIcon class="pi pi-align-left" />
                <Textarea id="notes" v-model="localRoom.notes" rows="3" cols="20" fluid />
            </IconField>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Guardar" icon="pi pi-check" class="p-button-raised" @click="save" />
        </template>
    </Dialog>
</template>
