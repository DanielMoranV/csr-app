<script setup>
import { useReservationStore } from '@/stores/reservationStore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
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

const modalities = ref(['Presencial', 'Virtual']);

// Computed
const formattedShift = computed(() => {
    if (props.reservation?.schedule) {
        const start = props.reservation.schedule.start_time?.substring(0, 5) || '';
        const end = props.reservation.schedule.end_time?.substring(0, 5) || '';
        return `${start} - ${end}`;
    }
    return 'No asignado';
});

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
        modality: 'Presencial',
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
    <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" modal :header="reservation ? 'Editar Lista de Reservas' : 'Nueva Lista de Reservas'" :style="{ width: '80vw', maxWidth: '1000px' }" :closable="true">
        <div class="reservation-form">
            <div class="header-info mb-3 p-3 border-round surface-ground">
                <div class="flex flex-column lg:flex-row gap-4 align-items-stretch lg:align-items-center justify-content-between">
                    <!-- Metadata Block -->
                    <div class="flex flex-wrap gap-4 align-items-center">
                        <!-- Date -->
                        <div class="flex align-items-center gap-2">
                            <span class="flex align-items-center justify-content-center bg-blue-100 text-blue-600 border-circle w-2rem h-2rem">
                                <i class="pi pi-calendar text-sm"></i>
                            </span>
                            <div class="flex flex-column">
                                <span class="text-xs text-500 font-medium uppercase">Fecha</span>
                                <span class="font-semibold text-700">{{ scheduleDate }}</span>
                            </div>
                        </div>

                        <!-- Shift -->
                        <div class="flex align-items-center gap-2">
                            <span class="flex align-items-center justify-content-center bg-orange-100 text-orange-600 border-circle w-2rem h-2rem">
                                <i class="pi pi-clock text-sm"></i>
                            </span>
                            <div class="flex flex-column">
                                <span class="text-xs text-500 font-medium uppercase">Turno</span>
                                <span class="font-semibold text-700">{{ formattedShift }}</span>
                            </div>
                        </div>

                        <!-- Status -->
                        <div class="flex align-items-center gap-2">
                            <span class="flex align-items-center justify-content-center bg-green-100 text-green-600 border-circle w-2rem h-2rem">
                                <i class="pi pi-tag text-sm"></i>
                            </span>
                            <div class="flex flex-column">
                                <span class="text-xs text-500 font-medium uppercase">Estado</span>
                                <span :class="reservation ? 'text-green-600' : 'text-blue-600'" class="font-bold text-sm">
                                    {{ reservation ? 'REGISTRADO' : 'NUEVO' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Notes Divider (visible on large screens) -->
                    <div class="hidden lg:block w-1px h-3rem bg-300 mx-2"></div>

                    <!-- Notes Input -->
                    <div class="flex-grow-1">
                        <span class="p-float-label w-full">
                            <Textarea id="notes" v-model="form.notes" rows="1" autoResize class="w-full" style="min-height: 2.5rem; padding-top: 1rem" />
                            <label for="notes">Notas generales de la reserva...</label>
                        </span>
                    </div>
                </div>
            </div>

            <div class="patients-section">
                <div class="flex justify-content-between align-items-center mb-3">
                    <h3 class="m-0">Pacientes</h3>
                    <Button label="Agregar Paciente" icon="pi pi-plus" size="small" @click="addPatient" />
                </div>

                <DataTable :value="form.patients" editMode="cell" class="editable-cells-table" responsiveLayout="scroll" showGridlines stripedRows>
                    <Column field="turn_number" header="Turno" style="width: 80px" class="text-center font-bold"></Column>

                    <Column field="patient_name" header="Nombre del Paciente">
                        <template #body="{ data, field }">
                            <InputText v-model="data[field]" class="w-full" placeholder="Nombre completo" />
                        </template>
                    </Column>

                    <Column field="modality" header="Modalidad" style="width: 150px">
                        <template #body="{ data, field }">
                            <Dropdown v-model="data[field]" :options="modalities" class="w-full" />
                        </template>
                    </Column>

                    <Column field="observations" header="Observaciones">
                        <template #body="{ data, field }">
                            <InputText v-model="data[field]" class="w-full" placeholder="Opcional" />
                        </template>
                    </Column>

                    <Column header="Acciones" style="width: 80px; text-align: center">
                        <template #body="{ index }">
                            <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-text" @click="removePatient(index)" />
                        </template>
                    </Column>

                    <template #empty>
                        <div class="text-center p-4 text-gray-500">No hay pacientes agregados. Haga clic en "Agregar Paciente".</div>
                    </template>
                </DataTable>
            </div>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="emit('update:visible', false)" />
            <Button label="Guardar Lista" icon="pi pi-save" class="p-button-primary" @click="save" :loading="store.loading" />
        </template>
    </Dialog>
</template>

<style scoped>
.header-info {
    border: 1px solid var(--surface-border);
}
</style>
