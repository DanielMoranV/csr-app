<script setup>
import { defineEmits, defineProps, ref, watch, computed } from 'vue';

const props = defineProps({
    visible: Boolean,
    room: Object,
    editing: Boolean
});

const emit = defineEmits(['update:visible', 'save']);

const localRoom = ref({});
const errors = ref({});

watch(
    () => props.room,
    (newRoom) => {
        localRoom.value = {
            is_active: true, // Valor por defecto
            ...newRoom
        };
        errors.value = {}; // Limpiar errores al cambiar de habitación
    },
    { immediate: true }
);

// Validación en tiempo real
const validateField = (field) => {
    switch (field) {
        case 'number':
            if (!localRoom.value.number || localRoom.value.number.trim() === '') {
                errors.value.number = 'El número de habitación es obligatorio';
            } else if (localRoom.value.number.length > 255) {
                errors.value.number = 'El número no puede tener más de 255 caracteres';
            } else {
                delete errors.value.number;
            }
            break;
        case 'notes':
            if (!localRoom.value.notes || localRoom.value.notes.trim() === '') {
                errors.value.notes = 'Las notas son obligatorias';
            } else {
                delete errors.value.notes;
            }
            break;
    }
};

// Validar todo el formulario
const validateForm = () => {
    validateField('number');
    validateField('notes');
    return Object.keys(errors.value).length === 0;
};

// Computed para deshabilitar botón guardar
const isFormValid = computed(() => {
    return (
        localRoom.value.number &&
        localRoom.value.number.trim() !== '' &&
        localRoom.value.notes &&
        localRoom.value.notes.trim() !== ''
    );
});

const save = () => {
    if (validateForm()) {
        emit('save', localRoom.value);
    }
};

const close = () => {
    emit('update:visible', false);
    errors.value = {};
};
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '450px' }" :header="editing ? 'Editar Habitación' : 'Nueva Habitación'" :modal="true" class="p-fluid" @update:visible="close">
        <div class="field">
            <label for="number">Número <span class="text-red-500">*</span></label>
            <IconField>
                <InputIcon class="pi pi-hashtag" />
                <InputText id="number" v-model.trim="localRoom.number" required="true" autofocus fluid :invalid="!!errors.number" @blur="validateField('number')" />
            </IconField>
            <small v-if="errors.number" class="text-red-500">{{ errors.number }}</small>
        </div>

        <div class="field mt-3">
            <label for="notes">Notas <span class="text-red-500">*</span></label>
            <IconField>
                <InputIcon class="pi pi-align-left" />
                <Textarea id="notes" v-model="localRoom.notes" rows="3" cols="20" fluid :invalid="!!errors.notes" @blur="validateField('notes')" />
            </IconField>
            <small v-if="errors.notes" class="text-red-500">{{ errors.notes }}</small>
        </div>

        <div class="field mt-3 flex align-items-center">
            <label for="is_active" class="mr-3 mb-0">Estado:</label>
            <ToggleSwitch v-model="localRoom.is_active" inputId="is_active" />
            <span class="ml-3 text-sm">{{ localRoom.is_active ? 'Activa' : 'Inactiva' }}</span>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Guardar" icon="pi pi-check" class="p-button-raised" :disabled="!isFormValid" @click="save" />
        </template>
    </Dialog>
</template>
