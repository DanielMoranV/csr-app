<script setup>
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: { type: Boolean, default: false },
    absence: { type: Object, default: null },
    doctors: { type: Array, default: () => [] },
    preselectedDoctorId: { type: Number, default: null },
    preselectedDate: { type: String, default: null },
    saving: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'save-absence', 'delete-absence']);

const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

const isEditing = computed(() => !!props.absence?.id);
const dialogTitle = computed(() => (isEditing.value ? 'Editar Ausencia' : 'Registrar Ausencia'));

const form = ref({
    id_doctor: null,
    date: null,
    is_full_day: true,
    start_time: null,
    end_time: null,
    reason: ''
});

const formErrors = ref({});

watch(
    () => props.visible,
    (val) => {
        if (val) resetForm();
    }
);

const resetForm = () => {
    formErrors.value = {};
    if (props.absence) {
        form.value = {
            id_doctor: props.absence.id_doctor,
            date: props.absence.date ? new Date(props.absence.date + 'T00:00:00') : null,
            is_full_day: props.absence.is_full_day ?? true,
            start_time: parseTimeToDate(props.absence.start_time),
            end_time: parseTimeToDate(props.absence.end_time),
            reason: props.absence.reason || ''
        };
    } else {
        form.value = {
            id_doctor: props.preselectedDoctorId || null,
            date: props.preselectedDate ? new Date(props.preselectedDate + 'T00:00:00') : null,
            is_full_day: true,
            start_time: null,
            end_time: null,
            reason: ''
        };
    }
};

const parseTimeToDate = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return d;
};

const formatDateToTime = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date.substring(0, 5);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

const validate = () => {
    formErrors.value = {};
    if (!form.value.id_doctor) formErrors.value.id_doctor = 'Seleccione un médico';
    if (!form.value.date) formErrors.value.date = 'Seleccione una fecha';
    if (!form.value.is_full_day) {
        if (!form.value.start_time) formErrors.value.start_time = 'Ingrese la hora de inicio';
        if (!form.value.end_time) formErrors.value.end_time = 'Ingrese la hora de fin';
    }
    if (!form.value.reason || form.value.reason.trim().length < 5) {
        formErrors.value.reason = 'El motivo debe tener al menos 5 caracteres';
    }
    return Object.keys(formErrors.value).length === 0;
};

const handleSave = () => {
    if (!validate()) return;

    const dateStr = form.value.date instanceof Date ? form.value.date.toISOString().split('T')[0] : form.value.date;

    const payload = {
        id: props.absence?.id || null,
        id_doctor: form.value.id_doctor,
        date: dateStr,
        is_full_day: form.value.is_full_day,
        reason: form.value.reason.trim()
    };

    if (!form.value.is_full_day) {
        payload.start_time = formatDateToTime(form.value.start_time);
        payload.end_time = formatDateToTime(form.value.end_time);
    }

    emit('save-absence', payload);
};

const handleDelete = () => {
    emit('delete-absence', props.absence);
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :style="{ width: '480px' }" modal :closable="!saving">
        <div class="absence-form">
            <!-- Médico -->
            <div class="form-field">
                <label class="form-label">Médico <span class="required">*</span></label>
                <Select v-model="form.id_doctor" :options="doctors" optionLabel="name" optionValue="id" placeholder="Seleccione un médico" class="w-full" :class="{ 'p-invalid': formErrors.id_doctor }" filter showClear />
                <small v-if="formErrors.id_doctor" class="error-message">{{ formErrors.id_doctor }}</small>
            </div>

            <!-- Fecha -->
            <div class="form-field">
                <label class="form-label">Fecha <span class="required">*</span></label>
                <DatePicker v-model="form.date" dateFormat="dd/mm/yy" placeholder="Seleccione una fecha" showIcon class="w-full" :class="{ 'p-invalid': formErrors.date }" />
                <small v-if="formErrors.date" class="error-message">{{ formErrors.date }}</small>
            </div>

            <!-- Toggle Día Completo -->
            <div class="form-field toggle-field">
                <label class="form-label">Tipo de Ausencia</label>
                <div class="toggle-row">
                    <ToggleSwitch v-model="form.is_full_day" inputId="isFullDay" />
                    <label for="isFullDay" class="toggle-label">
                        <span v-if="form.is_full_day">
                            <i class="pi pi-calendar-times mr-1"></i>
                            Día completo
                        </span>
                        <span v-else>
                            <i class="pi pi-clock mr-1"></i>
                            Parcial (horas específicas)
                        </span>
                    </label>
                </div>
            </div>

            <!-- Horas (solo si no es día completo) -->
            <div v-if="!form.is_full_day" class="form-row">
                <div class="form-field">
                    <label class="form-label">Hora inicio <span class="required">*</span></label>
                    <DatePicker v-model="form.start_time" timeOnly hourFormat="24" placeholder="HH:MM" class="w-full" :class="{ 'p-invalid': formErrors.start_time }" />
                    <small v-if="formErrors.start_time" class="error-message">{{ formErrors.start_time }}</small>
                </div>
                <div class="form-field">
                    <label class="form-label">Hora fin <span class="required">*</span></label>
                    <DatePicker v-model="form.end_time" timeOnly hourFormat="24" placeholder="HH:MM" class="w-full" :class="{ 'p-invalid': formErrors.end_time }" />
                    <small v-if="formErrors.end_time" class="error-message">{{ formErrors.end_time }}</small>
                </div>
            </div>

            <!-- Motivo -->
            <div class="form-field">
                <label class="form-label">Motivo <span class="required">*</span></label>
                <Textarea v-model="form.reason" rows="3" placeholder="Describa el motivo de la ausencia (mínimo 5 caracteres)" class="w-full" :class="{ 'p-invalid': formErrors.reason }" autoResize />
                <small v-if="formErrors.reason" class="error-message">{{ formErrors.reason }}</small>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button v-if="isEditing" label="Eliminar" icon="pi pi-trash" severity="danger" outlined :disabled="saving" @click="handleDelete" />
                <div class="footer-actions">
                    <Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined :disabled="saving" @click="dialogVisible = false" />
                    <Button :label="isEditing ? 'Actualizar' : 'Registrar'" :icon="saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'" :loading="saving" @click="handleSave" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.absence-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.5rem 0;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.form-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color);
}

.required {
    color: #ef4444;
    margin-left: 2px;
}

.error-message {
    color: #ef4444;
    font-size: 0.75rem;
}

.toggle-field {
    background: var(--surface-hover);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

.toggle-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
}

.toggle-label {
    font-size: 0.875rem;
    color: var(--text-color);
    cursor: pointer;
    font-weight: 500;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.footer-actions {
    display: flex;
    gap: 0.5rem;
}
</style>
