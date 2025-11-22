<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    doctor: {
        type: Object,
        default: null
    },
    saving: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'save-doctor', 'close']);

// Estado del diálogo
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isEditing = computed(() => !!props.doctor?.id);

const dialogTitle = computed(() => {
    return isEditing.value ? 'Editar Profesional' : 'Nuevo Profesional';
});

// Opciones de select
const documentTypeOptions = [
    { label: 'DNI', value: 'dni' },
    { label: 'CE (Carnet de Extranjería)', value: 'ce' },
    { label: 'Pasaporte', value: 'passport' }
];

const paymentPayrollOptions = [
    { label: 'Total', value: 'total' },
    { label: 'Parcial', value: 'partial' },
    { label: 'Ninguno', value: 'none' }
];

const typeOptions = [
    { label: 'Médico', value: 'medico' },
    { label: 'Odontólogo', value: 'odontologo' },
    { label: 'Obstetriz', value: 'obstetriz' },
    { label: 'Enfermero', value: 'enfermero' },
    { label: 'Nutricionista', value: 'nutricionista' },
    { label: 'Psicólogo', value: 'psicologo' },
    { label: 'Tecnólogo Médico', value: 'tecnologo_medico' },
    { label: 'Químico Farmacéutico', value: 'quimico_farmaceutico' },
    { label: 'Biólogo', value: 'biologo' }
];

const colegioOptions = [
    { label: 'CMP - Colegio Médico del Perú', value: 'cmp' },
    { label: 'COP - Colegio Odontológico del Perú', value: 'cop' },
    { label: 'CQFP - Colegio Químico Farmacéutico del Perú', value: 'cqfp' },
    { label: 'CBP - Colegio de Biólogos del Perú', value: 'cbp' },
    { label: 'COBP - Colegio de Obstetras del Perú', value: 'cobp' },
    { label: 'CEP - Colegio de Enfermeros del Perú', value: 'cep' },
    { label: 'CSP - Colegio de Sociólogos del Perú', value: 'csp' },
    { label: 'CNP - Colegio de Nutricionistas del Perú', value: 'cnp' }
];

// Formulario reactivo
const doctorForm = reactive({
    name: '',
    document_type: 'dni',
    document_number: '',
    type: 'medico',
    colegio: 'cmp',
    numero_colegiatura: '',
    rne: '',
    code: '',
    payment_payroll: 'total'
});

// Computed para verificar si debe mostrar campo RNE
const showRneField = computed(() => {
    return doctorForm.type === 'medico' && doctorForm.colegio === 'cmp';
});

// Estado de validación
const validationErrors = ref({});
const touchedFields = ref({});

// Watchers
watch(
    () => props.doctor,
    (newDoctor) => {
        if (newDoctor && props.visible) {
            loadDoctorData(newDoctor);
        } else if (!newDoctor && props.visible) {
            resetForm();
        }
    },
    { immediate: true, deep: true }
);

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            if (props.doctor) {
                loadDoctorData(props.doctor);
            } else {
                resetForm();
            }
        } else {
            resetValidation();
        }
    }
);

// Métodos de carga y reset
const loadDoctorData = (doctor) => {
    Object.assign(doctorForm, {
        name: doctor.name || '',
        document_type: doctor.document_type || 'dni',
        document_number: doctor.document_number || '',
        type: doctor.type || 'medico',
        colegio: doctor.colegio || 'cmp',
        numero_colegiatura: doctor.numero_colegiatura || '',
        rne: doctor.rne || '',
        code: doctor.code || '',
        payment_payroll: doctor.payment_payroll || 'total'
    });
    resetValidation();
};

const resetForm = () => {
    Object.assign(doctorForm, {
        name: '',
        document_type: 'dni',
        document_number: '',
        type: 'medico',
        colegio: 'cmp',
        numero_colegiatura: '',
        rne: '',
        code: '',
        payment_payroll: 'total'
    });
    resetValidation();
};

const resetValidation = () => {
    validationErrors.value = {};
    touchedFields.value = {};
};

// Métodos de formateo
const formatDocumentNumber = (event) => {
    const value = event.target.value.replace(/\D/g, '');
    doctorForm.document_number = value;
    validateField('document_number');
};

const formatNumeroColegiatura = (event) => {
    const value = event.target.value.replace(/\D/g, '');
    doctorForm.numero_colegiatura = value;
    validateField('numero_colegiatura');
};

const formatCode = (event) => {
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    doctorForm.code = value;
    validateField('code');
};

// Validaciones
const validateField = (fieldName) => {
    touchedFields.value[fieldName] = true;

    switch (fieldName) {
        case 'name':
            if (!doctorForm.name.trim()) {
                validationErrors.value.name = 'El nombre es obligatorio';
            } else if (doctorForm.name.trim().length < 2) {
                validationErrors.value.name = 'El nombre debe tener al menos 2 caracteres';
            } else if (doctorForm.name.trim().length > 255) {
                validationErrors.value.name = 'El nombre no puede exceder 255 caracteres';
            } else {
                delete validationErrors.value.name;
            }
            break;

        case 'document_number':
            if (!doctorForm.document_number) {
                validationErrors.value.document_number = 'El número de documento es obligatorio';
            } else if (doctorForm.document_type === 'dni' && doctorForm.document_number.length !== 8) {
                validationErrors.value.document_number = 'El DNI debe tener 8 dígitos';
            } else if (doctorForm.document_type === 'ce' && doctorForm.document_number.length !== 9) {
                validationErrors.value.document_number = 'El CE debe tener 9 dígitos';
            } else {
                delete validationErrors.value.document_number;
            }
            break;

        case 'numero_colegiatura':
            if (!doctorForm.numero_colegiatura) {
                validationErrors.value.numero_colegiatura = 'El número de colegiatura es obligatorio';
            } else if (doctorForm.numero_colegiatura.length < 4) {
                validationErrors.value.numero_colegiatura = 'El número de colegiatura debe tener al menos 4 dígitos';
            } else {
                delete validationErrors.value.numero_colegiatura;
            }
            break;

        case 'code':
            if (!doctorForm.code) {
                validationErrors.value.code = 'El código del médico es obligatorio';
            } else if (doctorForm.code.length < 3) {
                validationErrors.value.code = 'El código debe tener al menos 3 caracteres';
            } else {
                delete validationErrors.value.code;
            }
            break;

        default:
            break;
    }
};

// Validar todos los campos
const validateAllFields = () => {
    validateField('name');
    validateField('document_number');
    validateField('numero_colegiatura');
    validateField('code');
    return Object.keys(validationErrors.value).length === 0;
};

// Validación en tiempo real
const isFormValid = computed(() => {
    return (
        doctorForm.name.trim() &&
        doctorForm.document_number &&
        doctorForm.numero_colegiatura &&
        doctorForm.code &&
        Object.keys(validationErrors.value).length === 0
    );
});

// Guardar
const handleSave = () => {
    // Marcar todos los campos como tocados
    Object.keys(doctorForm).forEach((field) => {
        touchedFields.value[field] = true;
    });

    if (!validateAllFields()) {
        return;
    }

    const doctorData = {
        ...doctorForm,
        rne: doctorForm.rne || null
    };

    emit('save-doctor', doctorData);
};

// Cerrar diálogo
const handleClose = () => {
    emit('close');
    emit('update:visible', false);
};
</script>

<template>
    <Dialog
        v-model:visible="dialogVisible"
        :header="dialogTitle"
        :modal="true"
        :closable="!saving"
        :closeOnEscape="!saving"
        class="w-full md:w-[600px]"
        @hide="handleClose"
    >
        <div class="flex flex-col gap-6 py-4">
            <!-- Nombre -->
            <div class="field">
                <label for="name" class="font-semibold mb-2 block"> Nombre Completo <span class="text-red-500">*</span> </label>
                <InputText
                    id="name"
                    v-model="doctorForm.name"
                    placeholder="Ej: Dr. Juan Pérez García"
                    class="w-full"
                    :class="{ 'p-invalid': touchedFields.name && validationErrors.name }"
                    :disabled="saving"
                    @blur="validateField('name')"
                    @input="validateField('name')"
                />
                <small v-if="touchedFields.name && validationErrors.name" class="p-error">
                    {{ validationErrors.name }}
                </small>
            </div>

            <!-- Tipo y Número de Documento -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="document_type" class="font-semibold mb-2 block"> Tipo de Documento <span class="text-red-500">*</span> </label>
                    <Select
                        id="document_type"
                        v-model="doctorForm.document_type"
                        :options="documentTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar"
                        class="w-full"
                        :disabled="saving"
                        @change="validateField('document_number')"
                    />
                </div>

                <div class="field">
                    <label for="document_number" class="font-semibold mb-2 block"> Número de Documento <span class="text-red-500">*</span> </label>
                    <InputText
                        id="document_number"
                        v-model="doctorForm.document_number"
                        placeholder="Ej: 12345678"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.document_number && validationErrors.document_number }"
                        :disabled="saving"
                        @input="formatDocumentNumber"
                        @blur="validateField('document_number')"
                    />
                    <small v-if="touchedFields.document_number && validationErrors.document_number" class="p-error">
                        {{ validationErrors.document_number }}
                    </small>
                </div>
            </div>

            <!-- Tipo de Profesional y Colegio -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="type" class="font-semibold mb-2 block"> Tipo de Profesional <span class="text-red-500">*</span> </label>
                    <Select
                        id="type"
                        v-model="doctorForm.type"
                        :options="typeOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar"
                        class="w-full"
                        :disabled="saving"
                    />
                </div>

                <div class="field">
                    <label for="colegio" class="font-semibold mb-2 block"> Colegio Profesional <span class="text-red-500">*</span> </label>
                    <Select
                        id="colegio"
                        v-model="doctorForm.colegio"
                        :options="colegioOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar"
                        class="w-full"
                        :disabled="saving"
                    />
                </div>
            </div>

            <!-- Número de Colegiatura y RNE -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="numero_colegiatura" class="font-semibold mb-2 block"> Número de Colegiatura <span class="text-red-500">*</span> </label>
                    <InputText
                        id="numero_colegiatura"
                        v-model="doctorForm.numero_colegiatura"
                        placeholder="Ej: 54321"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.numero_colegiatura && validationErrors.numero_colegiatura }"
                        :disabled="saving"
                        @input="formatNumeroColegiatura"
                        @blur="validateField('numero_colegiatura')"
                    />
                    <small v-if="touchedFields.numero_colegiatura && validationErrors.numero_colegiatura" class="p-error">
                        {{ validationErrors.numero_colegiatura }}
                    </small>
                    <small class="text-muted">Número único de colegiatura</small>
                </div>

                <div class="field" v-if="showRneField">
                    <label for="rne" class="font-semibold mb-2 block"> RNE </label>
                    <InputText id="rne" v-model="doctorForm.rne" placeholder="Ej: 123456 (Opcional)" class="w-full" :disabled="saving" />
                    <small class="text-muted">Registro Nacional de Especialidad</small>
                </div>
            </div>

            <!-- Código y Tipo de Pago -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="code" class="font-semibold mb-2 block"> Código <span class="text-red-500">*</span> </label>
                    <InputText
                        id="code"
                        v-model="doctorForm.code"
                        placeholder="Ej: MED001"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.code && validationErrors.code }"
                        :disabled="saving"
                        @input="formatCode"
                        @blur="validateField('code')"
                    />
                    <small v-if="touchedFields.code && validationErrors.code" class="p-error">
                        {{ validationErrors.code }}
                    </small>
                    <small class="text-muted">Código único del médico</small>
                </div>

                <div class="field">
                    <label for="payment_payroll" class="font-semibold mb-2 block"> Tipo de Pago <span class="text-red-500">*</span> </label>
                    <Select
                        id="payment_payroll"
                        v-model="doctorForm.payment_payroll"
                        :options="paymentPayrollOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar"
                        class="w-full"
                        :disabled="saving"
                    />
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancelar" severity="secondary" @click="handleClose" :disabled="saving" />
                <Button :label="isEditing ? 'Actualizar' : 'Guardar'" :loading="saving" :disabled="!isFormValid || saving" @click="handleSave" />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.field {
    display: flex;
    flex-direction: column;
}

.text-muted {
    color: var(--text-color-secondary);
    font-size: 0.875rem;
}
</style>
