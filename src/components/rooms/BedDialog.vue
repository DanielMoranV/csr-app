<script setup>
import { defineEmits, defineProps, ref, watch } from 'vue';

const props = defineProps({
    visible: Boolean,
    bed: Object,
    editing: Boolean,
    roomId: Number
});

const emit = defineEmits(['update:visible', 'save']);

const localBed = ref({});

watch(
    () => props.bed,
    (newBed) => {
        localBed.value = { ...newBed };
        if (!props.editing) {
            localBed.value.id_rooms = props.roomId;
        }
    }
);

const save = () => {
    emit('save', localBed.value);
};

const close = () => {
    emit('update:visible', false);
};
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '450px' }" :header="editing ? 'Editar Cama' : 'Nueva Cama'" :modal="true" class="p-fluid" @update:visible="close">
        <div class="field">
            <label for="name">Nombre</label>
            <IconField>
                <InputIcon class="pi pi-tag" />
                <InputText id="name" v-model.trim="localBed.name" required="true" autofocus fluid />
            </IconField>
        </div>

        <div class="field mt-3">
            <label for="notes">Notas</label>
            <IconField>
                <InputIcon class="pi pi-align-left" />
                <Textarea id="notes" v-model="localBed.notes" rows="3" cols="20" fluid />
            </IconField>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Guardar" icon="pi pi-check" class="p-button-raised" @click="save" />
        </template>
    </Dialog>
</template>
