<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';

const props = defineProps({
    visible: Boolean,
    bed: Object,
    editing: Boolean,
    roomId: Number
});

const emit = defineEmits(['update:visible', 'save']);

const localBed = ref({});

watch(() => props.bed, (newBed) => {
    localBed.value = { ...newBed };
    if (!props.editing) {
        localBed.value.id_rooms = props.roomId;
    }
});

const save = () => {
    emit('save', localBed.value);
};

const close = () => {
    emit('update:visible', false);
};

</script>

<template>
    <Dialog :visible="visible" :header="editing ? 'Editar Cama' : 'Nueva Cama'" :modal="true" @update:visible="close">
        <div class="p-fluid">
            <div class="field">
                <label for="name">Nombre</label>
                <InputText id="name" v-model="localBed.name" />
            </div>
            <div class="field">
                <label for="notes">Notas</label>
                <Textarea id="notes" v-model="localBed.notes" rows="3" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Guardar" icon="pi pi-check" @click="save" />
        </template>
    </Dialog>
</template>
