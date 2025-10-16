<script setup>
import { defineEmits, defineProps, ref, watch, computed } from 'vue';

const props = defineProps({
    visible: Boolean,
    bed: Object,
    editing: Boolean,
    roomId: Number
});

const emit = defineEmits(['update:visible', 'save']);

const localBed = ref({});
const errors = ref({});

watch(
    () => props.bed,
    (newBed) => {
        localBed.value = {
            is_active: true, // Valor por defecto
            ...newBed
        };
        if (!props.editing) {
            localBed.value.id_rooms = props.roomId;
        }
        errors.value = {}; // Limpiar errores al cambiar de cama
    },
    { immediate: true }
);

// Validación en tiempo real
const validateField = (field) => {
    switch (field) {
        case 'name':
            if (!localBed.value.name || localBed.value.name.trim() === '') {
                errors.value.name = 'El nombre de la cama es obligatorio';
            } else if (localBed.value.name.length > 255) {
                errors.value.name = 'El nombre no puede tener más de 255 caracteres';
            } else {
                delete errors.value.name;
            }
            break;
    }
};

// Validar todo el formulario
const validateForm = () => {
    validateField('name');
    return Object.keys(errors.value).length === 0;
};

// Computed para deshabilitar botón guardar
const isFormValid = computed(() => {
    return localBed.value.name && localBed.value.name.trim() !== '';
});

const save = () => {
    if (validateForm()) {
        emit('save', localBed.value);
    }
};

const close = () => {
    emit('update:visible', false);
    errors.value = {};
};
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '450px' }" :header="editing ? 'Editar Cama' : 'Nueva Cama'" :modal="true" class="p-fluid" @update:visible="close">
        <div class="field">
            <label for="name">Nombre <span class="text-red-500">*</span></label>
            <IconField>
                <InputIcon class="pi pi-tag" />
                <InputText id="name" v-model.trim="localBed.name" required="true" autofocus fluid :invalid="!!errors.name" @blur="validateField('name')" />
            </IconField>
            <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
        </div>

        <div class="field mt-3">
            <label for="notes">Notas</label>
            <IconField>
                <InputIcon class="pi pi-align-left" />
                <Textarea id="notes" v-model="localBed.notes" rows="3" cols="20" fluid />
            </IconField>
        </div>

        <div class="field mt-3 flex align-items-center">
            <label for="bed_is_active" class="mr-3 mb-0">Estado:</label>
            <ToggleSwitch v-model="localBed.is_active" inputId="bed_is_active" />
            <span class="ml-3 text-sm">{{ localBed.is_active ? 'Activa' : 'Inactiva' }}</span>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="close" />
            <Button label="Guardar" icon="pi pi-check" class="p-button-raised" :disabled="!isFormValid" @click="save" />
        </template>
    </Dialog>
</template>
