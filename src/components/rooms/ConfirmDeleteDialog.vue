<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
    visible: Boolean,
    room: Object,
    bed: Object,
    type: {
        type: String,
        default: 'room',
        validator: (value) => ['room', 'bed'].includes(value)
    },
    loading: {
        type: Boolean,
        default: false
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
    if (!props.loading) {
        emit('update:visible', false);
    }
};
</script>

<template>
    <Dialog :visible="visible" header="Confirmar Eliminación" :modal="true" :closable="!loading" @update:visible="close">
        <div class="confirmation-content">
            <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
            <span v-if="itemName"
                >¿Estás seguro de que quieres eliminar {{ itemType }} <b>{{ itemName }}</b
                >?</span
            >
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" class="p-button-text" @click="close" :disabled="loading" />
            <Button label="Sí, eliminar" :icon="loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'" class="p-button-danger" @click="confirm" :loading="loading" :disabled="loading" />
        </template>
    </Dialog>
</template>
