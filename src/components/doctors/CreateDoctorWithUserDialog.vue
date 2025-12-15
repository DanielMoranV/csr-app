<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { useDoctorsStore } from '@/store/doctorsStore';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Password from 'primevue/password';
import Divider from 'primevue/divider';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits(['update:visible', 'created']);

const toast = useToast();
const doctorsStore = useDoctorsStore();

const isSaving = ref(false);

// Formulario combinado
const formData = reactive({
    // Datos del usuario
    name: '',
    dni: '',
    nick: '',
    position: 'MEDICOS',
    phone: '',
    email: '',
    password: '',
    
    // Datos del médico
    doctor_name: '',
    document_type: 'dni',
    document_number: '',
    type: 'medico',
    colegio: 'cmp',
    numero_colegiatura: '',
    code: '',
    payment_payroll: 'none',
    rne: '',
    commission_percentage: null
});

const touchedFields = reactive({});
const validationErrors = ref({});

// Opciones
const documentTypeOptions = [
    { label: 'DNI', value: 'dni' },
    { label: 'Carnet de Extranjería', value: 'ce' },
    { label: 'Pasaporte', value: 'passport' }
];

const typeOptions = [
    { label: 'Médico', value: 'medico' },
    { label: 'Odontólogo', value: 'odontologo' },
    { label: 'Obstetriz', value: 'obstetriz' },
    { label: 'Psicólogo', value: 'psicologo' },
    { label: 'Tecnólogo Médico', value: 'tecnologo_medico' }
];

const colegioOptions = [
    { label: 'CMP - Colegio Médico del Perú', value: 'cmp' },
    { label: 'COP - Colegio Odontológico del Perú', value: 'cop' },
    { label: 'COBP - Colegio de Obstetras del Perú', value: 'cobp' },
    { label: 'CEP - Colegio de Enfermeros del Perú', value: 'cep' }
];

const paymentPayrollOptions = [
    { label: 'Total', value: 'total' },
    { label: 'Parcial', value: 'partial' },
    { label: 'Ninguno', value: 'none' }
];

const positionOptions = [
    { label: 'Médicos', value: 'MEDICOS' },
    { label: 'Emergencia', value: 'EMERGENCIA' },
    { label: 'Director Médico', value: 'DIRECTOR MEDICO' },
    { label: 'Auditor Médico', value: 'AUDITOR MEDICO' }
];

// Computed
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isFormValid = computed(() => {
    return (
        formData.name.trim() &&
        formData.dni.length === 8 &&
        formData.nick.trim() &&
        formData.phone.length === 9 &&
        formData.password.length >= 8 &&
        formData.doctor_name.trim() &&
        formData.document_number.trim() &&
        formData.numero_colegiatura.trim() &&
        formData.code.trim() &&
        Object.keys(validationErrors.value).length === 0
    );
});

// Validaciones
function validateField(fieldName) {
    touchedFields[fieldName] = true;
    const errors = {};

    // Validaciones de usuario
    if (fieldName === 'dni' && formData.dni.length !== 8) {
        errors.dni = 'El DNI debe tener exactamente 8 caracteres';
    }
    if (fieldName === 'nick' && formData.nick.length > 20) {
        errors.nick = 'El nick no puede tener más de 20 caracteres';
    }
    if (fieldName === 'phone' && formData.phone.length !== 9) {
        errors.phone = 'El teléfono debe tener exactamente 9 caracteres';
    }
    if (fieldName === 'password' && formData.password.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    if (fieldName === 'email' && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Email inválido';
    }

    // Actualizar errores
    if (Object.keys(errors).length > 0) {
        validationErrors.value = { ...validationErrors.value, ...errors };
    } else {
        const newErrors = { ...validationErrors.value };
        delete newErrors[fieldName];
        validationErrors.value = newErrors;
    }
}

function resetForm() {
    Object.assign(formData, {
        name: '',
        dni: '',
        nick: '',
        position: 'MEDICOS',
        phone: '',
        email: '',
        password: '',
        doctor_name: '',
        document_type: 'dni',
        document_number: '',
        type: 'medico',
        colegio: 'cmp',
        numero_colegiatura: '',
        code: '',
        payment_payroll: 'none',
        rne: '',
        commission_percentage: null
    });
    
    Object.keys(touchedFields).forEach(key => delete touchedFields[key]);
    validationErrors.value = {};
}

async function handleSave() {
    if (!isFormValid.value) {
        toast.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'Por favor complete todos los campos requeridos correctamente',
            life: 3000
        });
        return;
    }

    isSaving.value = true;

    try {
        // Preparar payload
        const payload = { ...formData };
        
        // Convertir commission_percentage a número si existe
        if (payload.commission_percentage) {
            payload.commission_percentage = parseFloat(payload.commission_percentage);
        }

        const response = await doctorsStore.createDoctorWithUser(payload);

        if (response.success) {
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Médico y usuario creados y vinculados exitosamente',
                life: 3000
            });

            emit('created', response.data);
            resetForm();
            dialogVisible.value = false;
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Error al crear médico y usuario';
        const errors = error.response?.data?.errors;

        if (errors) {
            // Mostrar errores de validación del backend
            let errorDetails = '';
            Object.keys(errors).forEach(key => {
                errorDetails += `${errors[key].join(', ')}\n`;
            });

            toast.add({
                severity: 'error',
                summary: 'Error de Validación',
                detail: errorDetails,
                life: 5000
            });
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 3000
            });
        }
    } finally {
        isSaving.value = false;
    }
}

function handleClose() {
    if (!isSaving.value) {
        resetForm();
        dialogVisible.value = false;
    }
}

// Watchers
watch(() => props.visible, (newVal) => {
    if (newVal) {
        resetForm();
    }
});
</script>

<template>
    <Dialog
        v-model:visible="dialogVisible"
        header="Crear Médico con Usuario Vinculado"
        :modal="true"
        :closable="!isSaving"
        :style="{ width: '800px', maxHeight: '90vh' }"
        @hide="handleClose"
    >
        <div class="create-doctor-user-form">
            <!-- Sección Usuario -->
            <div class="section-header">
                <i class="pi pi-user"></i>
                <h3>Datos del Usuario</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <!-- Nombre Usuario -->
                <div class="field col-span-2">
                    <label for="user-name" class="font-semibold">
                        Nombre Completo <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="user-name"
                        v-model="formData.name"
                        class="w-full"
                        :disabled="isSaving"
                        @blur="validateField('name')"
                    />
                </div>

                <!-- DNI -->
                <div class="field">
                    <label for="dni" class="font-semibold">
                        DNI <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="dni"
                        v-model="formData.dni"
                        maxlength="8"
                        class="w-full"
                        :disabled="isSaving"
                        @blur="validateField('dni')"
                    />
                    <small v-if="touchedFields.dni && validationErrors.dni" class="p-error">
                        {{ validationErrors.dni }}
                    </small>
                </div>

                <!-- Nick -->
                <div class="field">
                    <label for="nick" class="font-semibold">
                        Usuario (Nick) <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="nick"
                        v-model="formData.nick"
                        maxlength="20"
                        class="w-full"
                        :disabled="isSaving"
                        @blur="validateField('nick')"
                    />
                    <small v-if="touchedFields.nick && validationErrors.nick" class="p-error">
                        {{ validationErrors.nick }}
                    </small>
                </div>

                <!-- Posición -->
                <div class="field">
                    <label for="position" class="font-semibold">
                        Posición <span class="text-red-500">*</span>
                    </label>
                    <Select
                        id="position"
                        v-model="formData.position"
                        :options="positionOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Teléfono -->
                <div class="field">
                    <label for="phone" class="font-semibold">
                        Teléfono <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="phone"
                        v-model="formData.phone"
                        maxlength="9"
                        class="w-full"
                        :disabled="isSaving"
                        @blur="validateField('phone')"
                    />
                    <small v-if="touchedFields.phone && validationErrors.phone" class="p-error">
                        {{ validationErrors.phone }}
                    </small>
                </div>

                <!-- Email -->
                <div class="field">
                    <label for="email" class="font-semibold">Email</label>
                    <InputText
                        id="email"
                        v-model="formData.email"
                        type="email"
                        class="w-full"
                        :disabled="isSaving"
                        @blur="validateField('email')"
                    />
                    <small v-if="touchedFields.email && validationErrors.email" class="p-error">
                        {{ validationErrors.email }}
                    </small>
                </div>

                <!-- Contraseña -->
                <div class="field">
                    <label for="password" class="font-semibold">
                        Contraseña <span class="text-red-500">*</span>
                    </label>
                    <Password
                        id="password"
                        v-model="formData.password"
                        class="w-full"
                        :disabled="isSaving"
                        :feedback="false"
                        toggleMask
                        @blur="validateField('password')"
                    />
                    <small v-if="touchedFields.password && validationErrors.password" class="p-error">
                        {{ validationErrors.password }}
                    </small>
                </div>
            </div>

            <Divider />

            <!-- Sección Médico -->
            <div class="section-header">
                <i class="pi pi-id-card"></i>
                <h3>Datos del Médico</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Nombre Médico -->
                <div class="field col-span-2">
                    <label for="doctor-name" class="font-semibold">
                        Nombre Profesional <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="doctor-name"
                        v-model="formData.doctor_name"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Tipo Documento -->
                <div class="field">
                    <label for="doc-type" class="font-semibold">
                        Tipo de Documento <span class="text-red-500">*</span>
                    </label>
                    <Select
                        id="doc-type"
                        v-model="formData.document_type"
                        :options="documentTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Número Documento -->
                <div class="field">
                    <label for="doc-number" class="font-semibold">
                        Número de Documento <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="doc-number"
                        v-model="formData.document_number"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Tipo Profesional -->
                <div class="field">
                    <label for="type" class="font-semibold">
                        Tipo Profesional <span class="text-red-500">*</span>
                    </label>
                    <Select
                        id="type"
                        v-model="formData.type"
                        :options="typeOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Colegio -->
                <div class="field">
                    <label for="colegio" class="font-semibold">
                        Colegio <span class="text-red-500">*</span>
                    </label>
                    <Select
                        id="colegio"
                        v-model="formData.colegio"
                        :options="colegioOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Número Colegiatura -->
                <div class="field">
                    <label for="numero-colegiatura" class="font-semibold">
                        Número de Colegiatura <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="numero-colegiatura"
                        v-model="formData.numero_colegiatura"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Código -->
                <div class="field">
                    <label for="code" class="font-semibold">
                        Código <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="code"
                        v-model="formData.code"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- RNE -->
                <div class="field">
                    <label for="rne" class="font-semibold">RNE</label>
                    <InputText
                        id="rne"
                        v-model="formData.rne"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Tipo Planilla -->
                <div class="field">
                    <label for="payment-payroll" class="font-semibold">
                        Tipo de Planilla <span class="text-red-500">*</span>
                    </label>
                    <Select
                        id="payment-payroll"
                        v-model="formData.payment_payroll"
                        :options="paymentPayrollOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>

                <!-- Comisión -->
                <div class="field">
                    <label for="commission" class="font-semibold">Comisión (%)</label>
                    <InputText
                        id="commission"
                        v-model="formData.commission_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-end gap-2">
                <Button
                    label="Cancelar"
                    icon="pi pi-times"
                    severity="secondary"
                    @click="handleClose"
                    :disabled="isSaving"
                />
                <Button
                    label="Crear Médico con Usuario"
                    icon="pi pi-check"
                    severity="success"
                    @click="handleSave"
                    :loading="isSaving"
                    :disabled="!isFormValid"
                />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.create-doctor-user-form {
    padding: 0.5rem 0;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    color: var(--primary-color);
}

.section-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.section-header i {
    font-size: 1.2rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field label {
    font-size: 0.875rem;
}

.p-error {
    color: var(--red-500);
    font-size: 0.75rem;
}

:deep(.p-password) {
    width: 100%;
}

:deep(.p-password input) {
    width: 100%;
}
</style>
