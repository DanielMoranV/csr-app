<script setup>
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    schedule: {
        type: Object,
        default: null
    },
    medicalShifts: {
        type: Array,
        default: () => []
    },
    doctors: {
        type: Array,
        default: () => []
    },
    saving: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'save-schedule', 'close', 'delete-schedule']); // Added 'delete-schedule'

// Estado del diálogo
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isEditing = computed(() => !!props.schedule?.id);

const dialogTitle = computed(() => {
    return isEditing.value ? 'Editar Horario' : 'Nuevo Horario';
});

// Opciones
const categoryOptions = [
    { label: 'Emergencia', value: 'emergency' },
    { label: 'Ambulatorio', value: 'ambulatory' },
    { label: 'Hospitalario', value: 'hospitable' }
];

const statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Confirmado', value: 'confirmed' },
    { label: 'Cancelado', value: 'cancelled' },
    { label: 'Completado', value: 'completed' }
];

const shiftOptions = computed(() => {
    return [
        { label: 'Personalizado (sin turno)', value: null },
        ...props.medicalShifts.map((shift) => ({
            label: `${shift.description} (${shift.start_time} - ${shift.end_time})`,
            value: shift.id
        }))
    ];
});

// Formulario reactivo
const scheduleForm = reactive({
    id_doctors: null,
    id_medical_shift: null,
    date: null,
    start_time: '',
    end_time: '',
    category: 'ambulatory',
    status: 'pending',
    is_payment_payroll: true,
    notes: ''
});

// Estado de validación
const validationErrors = ref({});
const touchedFields = ref({});

// Control de horario personalizado
const useCustomTime = ref(false);

// Watchers
watch(
    () => props.schedule,
    (newSchedule) => {
        if (newSchedule && props.visible) {
            loadScheduleData(newSchedule);
        } else if (!newSchedule && props.visible) {
            resetForm();
        }
    },
    { immediate: true, deep: true }
);

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            if (props.schedule) {
                loadScheduleData(props.schedule);
            } else {
                resetForm();
            }
        } else {
            resetValidation();
        }
    }
);

// Watch para cambio de turno médico
watch(
    () => scheduleForm.id_medical_shift,
    (shiftId) => {
        if (shiftId && !useCustomTime.value) {
            const shift = props.medicalShifts.find((s) => s.id === shiftId);
            if (shift) {
                scheduleForm.start_time = shift.start_time.substring(0, 5); // HH:MM
                scheduleForm.end_time = shift.end_time.substring(0, 5); // HH:MM
            }
        } else if (!shiftId) {
            useCustomTime.value = true;
        }
    }
);

// Métodos de carga y reset
const loadScheduleData = (schedule) => {
    Object.assign(scheduleForm, {
        id_doctors: schedule.id_doctors,
        id_medical_shift: schedule.id_medical_shift,
        date: schedule.date ? new Date(schedule.date) : null,
        start_time: schedule.start_time?.substring(0, 5) || '',
        end_time: schedule.end_time?.substring(0, 5) || '',
        category: schedule.category || 'ambulatory',
        status: schedule.status || 'pending',
        is_payment_payroll: schedule.is_payment_payroll ?? true,
        notes: schedule.notes || ''
    });
    useCustomTime.value = !schedule.id_medical_shift;
    resetValidation();
};

const resetForm = () => {
    Object.assign(scheduleForm, {
        id_doctors: null,
        id_medical_shift: null,
        date: null,
        start_time: '',
        end_time: '',
        category: 'ambulatory',
        status: 'pending',
        is_payment_payroll: true,
        notes: ''
    });
    useCustomTime.value = false;
    resetValidation();
};

const resetValidation = () => {
    validationErrors.value = {};
    touchedFields.value = {};
};

// Validaciones
const validateField = (fieldName) => {
    touchedFields.value[fieldName] = true;

    switch (fieldName) {
        case 'id_doctors':
            if (!scheduleForm.id_doctors) {
                validationErrors.value.id_doctors = 'Debe seleccionar un médico';
            } else {
                delete validationErrors.value.id_doctors;
            }
            break;

        case 'date':
            if (!scheduleForm.date) {
                validationErrors.value.date = 'La fecha es obligatoria';
            } else {
                delete validationErrors.value.date;
            }
            break;

        case 'start_time':
            if (!scheduleForm.start_time) {
                validationErrors.value.start_time = 'La hora de inicio es obligatoria';
            } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleForm.start_time)) {
                validationErrors.value.start_time = 'Formato de hora inválido (HH:MM)';
            } else {
                delete validationErrors.value.start_time;
            }
            break;

        case 'end_time':
            if (!scheduleForm.end_time) {
                validationErrors.value.end_time = 'La hora de fin es obligatoria';
            } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleForm.end_time)) {
                validationErrors.value.end_time = 'Formato de hora inválido (HH:MM)';
            } else {
                delete validationErrors.value.end_time;
            }
            break;

        default:
            break;
    }
};

// Validar todos los campos
const validateAllFields = () => {
    validateField('id_doctors');
    validateField('date');
    validateField('start_time');
    validateField('end_time');
    return Object.keys(validationErrors.value).length === 0;
};

// Validación en tiempo real
const isFormValid = computed(() => {
    return (
        scheduleForm.id_doctors &&
        scheduleForm.date &&
        scheduleForm.start_time &&
        scheduleForm.end_time &&
        Object.keys(validationErrors.value).length === 0
    );
});

// Guardar
const handleSave = () => {
    // Marcar todos los campos como tocados
    Object.keys(scheduleForm).forEach((field) => {
        touchedFields.value[field] = true;
    });

    if (!validateAllFields()) {
        return;
    }

    // Formatear fecha
    const dateStr = scheduleForm.date instanceof Date ? scheduleForm.date.toISOString().split('T')[0] : scheduleForm.date;

    const scheduleData = {
        id_doctors: scheduleForm.id_doctors,
        id_medical_shift: useCustomTime.value ? null : scheduleForm.id_medical_shift,
        date: dateStr,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        category: scheduleForm.category,
        status: scheduleForm.status,
        is_payment_payroll: scheduleForm.is_payment_payroll,
        notes: scheduleForm.notes || null
    };

    emit('save-schedule', scheduleData);
};

// Eliminar
const handleDelete = () => {
    emit('delete-schedule', props.schedule);
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
        class="w-full md:w-[700px]"
        @hide="handleClose"
    >
        <div class="flex flex-col gap-6 py-4">
            <!-- Médico y Fecha -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="doctor" class="font-semibold mb-2 block"> Médico <span class="text-red-500">*</span> </label>
                    <Select
                        id="doctor"
                        v-model="scheduleForm.id_doctors"
                        :options="doctors"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Seleccionar médico"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.id_doctors && validationErrors.id_doctors }"
                        :disabled="saving"
                        filter
                        @blur="validateField('id_doctors')"
                    />
                    <small v-if="touchedFields.id_doctors && validationErrors.id_doctors" class="p-error">
                        {{ validationErrors.id_doctors }}
                    </small>
                </div>

                <div class="field">
                    <label for="date" class="font-semibold mb-2 block"> Fecha <span class="text-red-500">*</span> </label>
                    <DatePicker
                        id="date"
                        v-model="scheduleForm.date"
                        dateFormat="dd/mm/yy"
                        placeholder="dd/mm/aaaa"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.date && validationErrors.date }"
                        :disabled="saving"
                        @blur="validateField('date')"
                        showIcon
                    />
                    <small v-if="touchedFields.date && validationErrors.date" class="p-error">
                        {{ validationErrors.date }}
                    </small>
                </div>
            </div>

            <!-- Turno Médico -->
            <div class="field">
                <label for="shift" class="font-semibold mb-2 block"> Turno Médico </label>
                <Select
                    id="shift"
                    v-model="scheduleForm.id_medical_shift"
                    :options="shiftOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Seleccionar turno o personalizado"
                    class="w-full"
                    :disabled="saving || useCustomTime"
                />
                <div class="mt-2">
                    <Checkbox v-model="useCustomTime" inputId="customTime" binary :disabled="saving" />
                    <label for="customTime" class="ml-2 cursor-pointer">Usar horario personalizado</label>
                </div>
            </div>

            <!-- Horarios -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="start_time" class="font-semibold mb-2 block"> Hora de Inicio <span class="text-red-500">*</span> </label>
                    <InputText
                        id="start_time"
                        v-model="scheduleForm.start_time"
                        type="time"
                        placeholder="HH:MM"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.start_time && validationErrors.start_time }"
                        :disabled="saving || (!useCustomTime && !!scheduleForm.id_medical_shift)"
                        @blur="validateField('start_time')"
                    />
                    <small v-if="touchedFields.start_time && validationErrors.start_time" class="p-error">
                        {{ validationErrors.start_time }}
                    </small>
                </div>

                <div class="field">
                    <label for="end_time" class="font-semibold mb-2 block"> Hora de Fin <span class="text-red-500">*</span> </label>
                    <InputText
                        id="end_time"
                        v-model="scheduleForm.end_time"
                        type="time"
                        placeholder="HH:MM"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.end_time && validationErrors.end_time }"
                        :disabled="saving || (!useCustomTime && !!scheduleForm.id_medical_shift)"
                        @blur="validateField('end_time')"
                    />
                    <small v-if="touchedFields.end_time && validationErrors.end_time" class="p-error">
                        {{ validationErrors.end_time }}
                    </small>
                </div>
            </div>

            <!-- Categoría y Estado -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="category" class="font-semibold mb-2 block"> Categoría <span class="text-red-500">*</span> </label>
                    <Select
                        id="category"
                        v-model="scheduleForm.category"
                        :options="categoryOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar categoría"
                        class="w-full"
                        :disabled="saving"
                    />
                </div>

                <div class="field">
                    <label for="status" class="font-semibold mb-2 block"> Estado <span class="text-red-500">*</span> </label>
                    <Select
                        id="status"
                        v-model="scheduleForm.status"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar estado"
                        class="w-full"
                        :disabled="saving"
                    />
                </div>
            </div>

            <!-- Pago en Planilla -->
            <div class="field">
                <div class="flex items-center gap-2">
                    <Checkbox v-model="scheduleForm.is_payment_payroll" inputId="paymentPayroll" binary :disabled="saving" />
                    <label for="paymentPayroll" class="font-semibold cursor-pointer">Incluir en planilla de pagos</label>
                </div>
            </div>

            <!-- Notas -->
            <div class="field">
                <label for="notes" class="font-semibold mb-2 block"> Notas </label>
                <Textarea id="notes" v-model="scheduleForm.notes" rows="3" placeholder="Notas adicionales (opcional)" class="w-full" :disabled="saving" />
            </div>
        </div>

        <template #footer>
            <div class="flex justify-between w-full">
                <Button
                    v-if="isEditing"
                    label="Eliminar"
                    icon="pi pi-trash"
                    severity="danger"
                    outlined
                    @click="handleDelete"
                    :disabled="saving"
                />
                <div class="flex justify-end gap-2" :class="{ 'w-full': !isEditing }">
                    <Button label="Cancelar" severity="secondary" @click="handleClose" :disabled="saving" />
                    <Button :label="isEditing ? 'Actualizar' : 'Guardar'" :loading="saving" :disabled="!isFormValid || saving" @click="handleSave" />
                </div>
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
