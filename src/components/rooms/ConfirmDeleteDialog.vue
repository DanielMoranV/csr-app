<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
    visible: Boolean,
    room: Object
});

const emit = defineEmits(['update:visible', 'confirm']);

const confirm = () => {
    emit('confirm');
};

const close = () => {
    emit('update:visible', false);
};
</script>

<template>
    <Dialog :visible="visible" header="Confirmar Eliminación" :modal="true" @update:visible="close">
        <div class="confirmation-content">
            <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
            <span v-if="room"
                >¿Estás seguro de que quieres eliminar la habitación <b>{{ room.number }}</b
                >?</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Sí, eliminar" icon="pi pi-check" class="p-button-danger" @click="confirm" />
        </template>
    </Dialog>
</template>
