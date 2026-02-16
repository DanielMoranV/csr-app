<script setup>
import { useReservationStore } from '@/stores/reservationStore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    reservation: {
        type: Object,
        default: null
    },
    doctorId: {
        type: Number,
        required: true
    },
    doctorScheduleId: {
        type: Number,
        required: true
    },
    scheduleDate: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:visible', 'saved']);

const store = useReservationStore();
const toast = useToast();

const form = ref({
    notes: '',
    patients: []
});

// Computed properties for UI
const formattedShift = computed(() => {
    if (props.reservation?.schedule) {
        const start = props.reservation.schedule.start_time?.substring(0, 5) || '';
        const end = props.reservation.schedule.end_time?.substring(0, 5) || '';
        return `${start} - ${end}`;
    }
    return 'No asignado';
});

const patientCount = computed(() => form.value.patients.length);

// Initialize form when visible changes or reservation data updates
watch(
    () => props.visible,
    (isVisible) => {
        if (isVisible) {
            if (props.reservation) {
                // Editing existing reservation
                form.value = {
                    notes: props.reservation.notes || '',
                    patients: props.reservation.details ? props.reservation.details.map((p) => ({ ...p })) : []
                };
            } else {
                // Creating new reservation
                form.value = {
                    notes: '',
                    patients: []
                };
            }
        }
    }
);

const addPatient = () => {
    const nextTurn = form.value.patients.length + 1;
    form.value.patients.push({
        patient_name: '',
        turn_number: nextTurn,
        modality: '', // Optional plain text
        observations: '',
        status: 'pending' // Default status for UI
    });
};

const removePatient = (index) => {
    form.value.patients.splice(index, 1);
    // Re-index turns
    form.value.patients.forEach((p, i) => {
        p.turn_number = i + 1;
    });
};

const save = async () => {
    if (form.value.patients.length === 0) {
        toast.add({ severity: 'warn', summary: 'Atención', detail: 'Debe agregar al menos un paciente.', life: 3000 });
        return;
    }

    // Validate patients names
    const invalidPatient = form.value.patients.find((p) => !p.patient_name || p.patient_name.trim() === '');
    if (invalidPatient) {
        toast.add({ severity: 'warn', summary: 'Atención', detail: 'Todos los pacientes deben tener un nombre.', life: 3000 });
        return;
    }

    try {
        const payload = {
            notes: form.value.notes,
            patients: form.value.patients
        };

        if (props.reservation?.id) {
            // Update
            await store.updateReservationList(props.reservation.id, payload);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Lista de reservas actualizada correctamente', life: 3000 });
        } else {
            // Create
            payload.doctor_id = props.doctorId;
            payload.doctor_schedule_id = props.doctorScheduleId;
            await store.createReservationList(payload);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Lista de reservas creada correctamente', life: 3000 });
        }
        emit('saved');
        emit('update:visible', false);
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la reserva.', life: 3000 });
    }
};
</script>

<template>
    <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" modal :style="{ width: '90vw', maxWidth: '1200px' }" :breakpoints="{ '1400px': '95vw', '960px': '98vw' }" :closable="true" class="reservation-modal">
        <template #header>
            <div class="modal-header-container w-full">
                <div class="flex flex-column md:flex-row justify-content-between gap-3 mb-3">
                    <div class="flex align-items-start gap-2">
                        <i class="pi pi-calendar-plus text-primary text-2xl mt-1"></i>
                        <div>
                            <h3 class="m-0 text-xl font-bold text-900">Lista de Reservas</h3>
                            <p class="m-0 text-sm text-500 line-height-2">{{ scheduleDate }} • Turno: {{ formattedShift }}</p>
                        </div>
                    </div>

                    <div class="flex align-items-center gap-2">
                        <Tag :severity="reservation ? 'success' : 'info'" :value="reservation ? 'REGISTRADO' : 'NUEVO'" class="px-3 py-1"></Tag>
                    </div>
                </div>

                <!-- Notes Input Integrated -->
                <div class="mt-2">
                    <span class="p-input-icon-left w-full">
                        <i class="pi pi-align-left" />
                        <InputText v-model="form.notes" placeholder="Notas generales para esta lista de reservas..." class="w-full p-inputtext-sm" />
                    </span>
                </div>
            </div>
        </template>

        <div class="modal-content py-2">
            <!-- Toolbar -->
            <div class="flex justify-content-end mb-3">
                <Button label="Agregar Paciente" icon="pi pi-user-plus" severity="primary" size="small" @click="addPatient" />
            </div>

            <!-- Data Table -->
            <DataTable :value="form.patients" editMode="cell" class="editable-cells-table p-datatable-sm" responsiveLayout="scroll" showGridlines stripedRows scrollable scrollHeight="400px">
                <Column field="turn_number" header="Turno" style="min-width: 80px; width: 80px" class="text-center">
                    <template #body="{ data }">
                        <div class="flex align-items-center justify-content-center">
                            <span class="font-mono font-bold text-700 bg-gray-100 border-round px-2 py-1">{{ data.turn_number }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="patient_name" header="Paciente" style="min-width: 250px">
                    <template #body="{ data, field }">
                        <div class="flex align-items-center gap-2">
                            <i class="pi pi-user text-primary-500"></i>
                            <InputText v-model="data[field]" class="w-full p-inputtext-sm border-none shadow-none" placeholder="Nombre completo" />
                        </div>
                    </template>
                </Column>

                <Column field="modality" header="Modalidad" style="min-width: 150px; width: 180px">
                    <template #body="{ data, field }">
                        <InputText v-model="data[field]" class="w-full p-inputtext-sm border-none shadow-none" placeholder="Opcional" />
                    </template>
                </Column>

                <Column field="observations" header="Observaciones" style="min-width: 200px">
                    <template #body="{ data, field }">
                        <InputText v-model="data[field]" class="w-full p-inputtext-sm border-none shadow-none" placeholder="Opcional" />
                    </template>
                </Column>

                <Column header="Acciones" style="width: 80px; min-width: 80px; text-align: center">
                    <template #body="{ index }">
                        <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-text" @click="removePatient(index)" v-tooltip="'Eliminar'" />
                    </template>
                </Column>

                <template #empty>
                    <div class="flex flex-column align-items-center justify-content-center p-5 text-gray-500">
                        <i class="pi pi-users text-4xl mb-3 text-gray-300"></i>
                        <span class="font-medium">No hay pacientes en la lista</span>
                        <span class="text-sm mt-1">Haga clic en "Agregar Paciente" para comenzar</span>
                    </div>
                </template>
            </DataTable>
        </div>

        <template #footer>
            <div class="flex justify-content-between align-items-center w-full">
                <div class="text-sm text-500">
                    <i class="pi pi-info-circle mr-1"></i>
                    <span
                        >Total: <strong>{{ patientCount }}</strong> pacientes</span
                    >
                </div>
                <div class="flex gap-2">
                    <Button label="Cancelar" icon="pi pi-times" text severity="secondary" @click="emit('update:visible', false)" />
                    <Button label="Guardar Lista" icon="pi pi-save" @click="save" :loading="store.loading" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* Custom DataTable Styling to match ShiftDialog */
:deep(.p-datatable-sm .p-datatable-thead > tr > th) {
    background-color: var(--surface-50);
    color: var(--text-color);
    font-weight: 600;
}

:deep(.p-dialog-header) {
    padding-bottom: 0.5rem;
}

:deep(.p-dialog-content) {
    padding-top: 0;
}

/* Input Styles for Clean Table Edit */
:deep(.p-inputtext.border-none:focus) {
    box-shadow: none;
    border-bottom: 1px solid var(--primary-color) !important;
    border-radius: 0;
}
</style>
