<script setup>
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps({
    visible: Boolean,
    room: Object,
    bed: Object,
    type: {
        type: String,
        default: 'room',
        validator: (value) => ['room', 'bed'].includes(value)
    }
});

const emit = defineEmits(['update:visible', 'confirm']);

const itemName = computed(() => {
    if (props.type === 'bed' && props.bed) {
        return props.bed.name;
    }
    if (props.type === 'room' && props.room) {
        return props.room.number;
    }
    return '';
});

const itemType = computed(() => {
    return props.type === 'bed' ? 'la cama' : 'la habitación';
});

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
            <span v-if="itemName"
                >¿Estás seguro de que quieres eliminar {{ itemType }} <b>{{ itemName }}</b
                >?</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Sí, eliminar" icon="pi pi-check" class="p-button-danger" @click="confirm" />
        </template>
    </Dialog>
</template>
