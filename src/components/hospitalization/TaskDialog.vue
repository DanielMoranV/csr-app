<script setup>
import { users as usersApi } from '@/api'; // Import users API directly
import { apiUtils } from '@/api/axios';
import labTestsData from '@/data/laboratorio.json';
import { useTasksStore } from '@/store/tasksStore';
import { useUsersStore } from '@/store/usersStore';
import { storeToRefs } from 'pinia';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import MultiSelect from 'primevue/multiselect';
import { computed, onMounted, ref, watch } from 'vue';
import ProceduresDialog from './ProceduresDialog.vue';

const props = defineProps({
    visible: Boolean,
    attentionId: Number
});

const emit = defineEmits(['hide', 'saved']);

const store = useTasksStore();
const usersStore = useUsersStore();
const { selectedTask } = storeToRefs(store);
const { positionOptions } = storeToRefs(usersStore); // Keep positionOptions from store as it is static

// Local state for users
const usersOptions = ref([]);

// Procedures state
const showProceduresDialog = ref(false);
const selectedProcedures = ref([]);

// Lab tests state
const showLabTestsDialog = ref(false);
const selectedLabTests = ref([]);

const task = ref({
    areas: [],
    assignee_ids: []
});

// Fetch users using the public/list endpoint instead of the restricted store action
onMounted(async () => {
    try {
        const response = await usersApi.list();
        if (apiUtils.isSuccess(response)) {
            usersOptions.value = apiUtils.getData(response);
        }
    } catch (error) {
        console.warn('Failed to fetch users list:', error);
    }
});

watch(selectedTask, (newVal) => {
    if (newVal) {
        task.value = {
            ...newVal,
            due_date: newVal.due_date ? new Date(newVal.due_date) : null,
            areas: newVal.areas || [], // Initialize arrays
            assignee_ids: newVal.assignees ? newVal.assignees.map((u) => u.id) : [] // Map assignees objects to IDs
        };
    } else {
        task.value = {
            id_attentions: props.attentionId, // Set attention ID for new tasks
            status: 'pendiente',
            areas: [],
            assignee_ids: []
        };
    }
});

// Also watch visibility to reset if needed when opening for new task
watch(
    () => props.visible,
    (newVal) => {
        if (newVal && !selectedTask.value) {
            task.value = {
                id_attentions: props.attentionId,
                status: 'pendiente',
                areas: [],
                assignee_ids: []
            };
        }
    }
);

const isNew = computed(() => !task.value.id);

const saveTask = async () => {
    // Validation: At least one area must be selected
    if (!task.value.areas || task.value.areas.length === 0) {
        alert('Debe seleccionar al menos un Área Responsable'); // Simple validation for now
        return;
    }

    const taskData = {
        ...task.value,
        due_date: task.value.due_date ? task.value.due_date.toISOString().slice(0, 19).replace('T', ' ') : null
    };

    try {
        if (isNew.value) {
            await store.createTask(taskData);
        } else {
            await store.updateTask(task.value.id, taskData);
        }
        emit('saved');
        emit('hide');
    } catch (error) {
        console.error(error);
        alert('Error al guardar la tarea');
    }
};

const hideDialog = () => {
    emit('hide');
};

const statuses = ref(['pendiente', 'en_proceso', 'realizado', 'supervisado', 'anulado']);

const filteredStatuses = computed(() => {
    if (isNew.value) {
        return ['pendiente'];
    }
    return statuses.value;
});

// Filter Area Options as per user request (Temporary)
const filteredAreaOptions = computed(() => {
    // Valid departments for now: Laboratorio, Rayos X, Farmacia, Admision
    // TODO: Verify if this filter needs to be removed or expanded in the future
    const allowedAreas = ['LABORATORIO', 'RAYOS X', 'FARMACIA', 'ADMISION'];

    return positionOptions.value.filter((option) => allowedAreas.includes(option.value));
});

// Check if procedures button should be shown
const showProceduresButton = computed(() => {
    if (!task.value.areas || task.value.areas.length === 0) return false;
    return task.value.areas.some((area) => area === 'RAYOS X' || area === 'ADMISION');
});

// Check if lab tests button should be shown
const showLabTestsButton = computed(() => {
    if (!task.value.areas || task.value.areas.length === 0) return false;
    return task.value.areas.includes('LABORATORIO');
});

// Handle procedures selection
const handleProceduresDialogOpen = () => {
    showProceduresDialog.value = true;
};

const handleProceduresSave = (procedures) => {
    selectedProcedures.value = procedures;
    updateDescriptionWithProcedures();
};

const updateDescriptionWithProcedures = () => {
    if (selectedProcedures.value.length === 0) {
        // If no procedures selected, don't modify description
        return;
    }

    // Create a formatted list of procedures
    const proceduresList = selectedProcedures.value.map((proc) => `• ${proc.name} (${proc.code})`).join('\n');

    // Get current description without procedure list
    let currentDesc = task.value.description || '';

    // Remove old procedure list if exists (lines starting with •)
    const lines = currentDesc.split('\n');
    const nonProcedureLines = lines.filter((line) => !line.trim().startsWith('•'));
    const baseDescription = nonProcedureLines.join('\n').trim();

    // Combine base description with new procedures list
    if (baseDescription) {
        task.value.description = `${baseDescription}\n\n${proceduresList}`;
    } else {
        task.value.description = proceduresList;
    }
};

// Handle lab tests selection
const handleLabTestsDialogOpen = () => {
    showLabTestsDialog.value = true;
};

const handleLabTestsSave = (tests) => {
    selectedLabTests.value = tests;
    updateDescriptionWithLabTests();
};

const updateDescriptionWithLabTests = () => {
    if (selectedLabTests.value.length === 0) {
        return;
    }

    // Group items by category
    const grouped = selectedLabTests.value.reduce((acc, item) => {
        const cat = item.category || 'Varios';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    // Build the formatted list
    let testsList = '';
    for (const category in grouped) {
        const header = category.replace(/_/g, ' ').toUpperCase();
        testsList += `${header}:\n`;

        const items = grouped[category]
            .map((test) => {
                let text = `• ${test.nom_sgp}`;
                if (test.isProfile && test.description) {
                    text += ` (${test.description})`;
                }
                return text;
            })
            .join('\n');

        testsList += items + '\n\n';
    }
    testsList = testsList.trim(); // Remove trailing newlines

    // Get current description without test list
    let currentDesc = task.value.description || '';

    // Identify known headers to strip
    const knownHeaders = Object.keys(labTestsData).map((k) => k.replace(/_/g, ' ').toUpperCase() + ':');

    // Remove old lists if exists (lines starting with • or known headers)
    const lines = currentDesc.split('\n');
    const nonListLines = lines.filter((line) => {
        const trimmed = line.trim();
        return !trimmed.startsWith('•') && !knownHeaders.includes(trimmed);
    });
    const baseDescription = nonListLines.join('\n').trim();

    // Combine base description with new tests list
    if (baseDescription) {
        task.value.description = `${baseDescription}\n\n${testsList}`;
    } else {
        task.value.description = testsList;
    }
};

// Watch for procedure deselection through description editing
watch(
    () => task.value.description,
    (newDesc) => {
        if (!newDesc || selectedProcedures.value.length === 0) return;

        // Check if any selected procedure was removed from description
        const removedProcedures = selectedProcedures.value.filter((proc) => {
            const procText = `• ${proc.name} (${proc.code})`;
            return !newDesc.includes(procText);
        });

        if (removedProcedures.length > 0) {
            // Remove from selected procedures
            selectedProcedures.value = selectedProcedures.value.filter((proc) => !removedProcedures.find((removed) => removed.id === proc.id));
        }
    }
);

// Watch for lab test deselection through description editing
// Watch for lab test deselection through description editing
watch(
    () => task.value.description,
    (newDesc) => {
        if (!newDesc || selectedLabTests.value.length === 0) return;

        // Check if any selected test was removed from description
        const removedTests = selectedLabTests.value.filter((test) => {
            // Match exactly the formatted string used in description
            const testText = `• ${test.nom_sgp}`;
            return !newDesc.includes(testText);
        });

        if (removedTests.length > 0) {
            // Remove from selected tests
            // Use unique ID if available, otherwise fallback to nom_sgp matching
            selectedLabTests.value = selectedLabTests.value.filter((test) => !removedTests.find((removed) => (test.id && removed.id ? test.id === removed.id : test.nom_sgp === removed.nom_sgp)));
        }
    }
);
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '700px', maxHeight: '90vh' }" :header="isNew ? 'Nueva Tarea' : 'Editar Tarea'" :modal="true" class="p-fluid ticket-dialog" @update:visible="hideDialog">
        <template #header>
            <div class="flex align-items-center gap-2">
                <i :class="isNew ? 'pi pi-plus-circle text-green-600' : 'pi pi-pencil text-blue-600'" class="text-xl"></i>
                <span class="font-semibold">{{ isNew ? 'Nueva Tarea' : 'Editar Tarea' }}</span>
            </div>
        </template>

        <div class="formgrid grid compact-form mt-2">
            <!-- Row 2: Areas & Assignees -->
            <div class="col-12 md:col-6">
                <div class="field">
                    <label for="areas" class="compact-label">
                        <i class="pi pi-sitemap text-purple-500 mr-2"></i>
                        Áreas Responsables *
                    </label>
                    <MultiSelect id="areas" v-model="task.areas" :options="filteredAreaOptions" optionLabel="label" optionValue="value" placeholder="Seleccione áreas" display="chip" filter class="compact-input-select" fluid />
                    <small class="field-help text-500">Departamentos encargados</small>
                </div>
            </div>

            <!-- Row 1: Description -->
            <div class="col-12">
                <div class="field">
                    <label for="description" class="compact-label">
                        <i class="pi pi-clipboard text-primary-500 mr-2"></i>
                        Descripción *
                    </label>
                    <Textarea id="description" v-model.trim="task.description" required="true" autofocus rows="2" placeholder="Describa la tarea a realizar" class="compact-input" fluid />
                    <small class="field-help text-500">Detalle breve y claro de la actividad a realizar</small>
                    <!-- Procedimientos Button -->
                    <div v-if="showProceduresButton" class="mt-2">
                        <Button label="Procedimientos" icon="pi pi-list" class="p-button-sm p-button-outlined" @click="handleProceduresDialogOpen">
                            <template #default>
                                <i class="pi pi-list mr-2"></i>
                                Procedimientos
                                <Badge v-if="selectedProcedures.length > 0" :value="selectedProcedures.length" severity="info" class="ml-2" />
                            </template>
                        </Button>
                    </div>
                    <!-- Lab Tests Button -->
                    <div v-if="showLabTestsButton" class="mt-2">
                        <Button label="Análisis de Laboratorio" icon="pi pi-flask" class="p-button-sm p-button-outlined" @click="handleLabTestsDialogOpen">
                            <template #default>
                                <i class="pi pi-flask mr-2"></i>
                                Análisis de Laboratorio
                                <Badge v-if="selectedLabTests.length > 0" :value="selectedLabTests.length" severity="info" class="ml-2" />
                            </template>
                        </Button>
                    </div>
                </div>
            </div>
            <!-- <div class="col-12 md:col-6">
                <div class="field">
                    <label for="assignees" class="compact-label">
                        <i class="pi pi-users text-blue-500 mr-2"></i>
                        Asignar a Personas (Opcional)
                    </label>
                    <MultiSelect id="assignees" v-model="task.assignee_ids" :options="usersOptions" optionLabel="name" optionValue="id" placeholder="Seleccione usuarios" display="chip" filter class="compact-input-select" fluid />
                    <small class="field-help text-500">Si vacío, visible para toda el área</small>
                </div>
            </div> -->

            <!-- Row 3: Due Date & Status -->
            <div class="col-12 md:col-6">
                <div class="field">
                    <label for="due_date" class="compact-label">
                        <i class="pi pi-calendar text-orange-500 mr-2"></i>
                        Fecha Vencimiento
                    </label>
                    <Calendar id="due_date" v-model="task.due_date" showTime hourFormat="24" :showIcon="true" placeholder="Opcional" class="compact-input-select" fluid />
                    <small class="field-help text-500">Cuándo debe completarse</small>
                </div>
            </div>
            <div class="col-12 md:col-6">
                <div class="field">
                    <label for="status" class="compact-label">
                        <i class="pi pi-flag text-red-500 mr-2"></i>
                        Estado
                    </label>
                    <Select id="status" v-model="task.status" :options="filteredStatuses" placeholder="Seleccione estado" class="compact-input-select" fluid :disabled="isNew">
                        <template #option="slotProps">
                            <Tag :value="slotProps.option" :severity="slotProps.option === 'en_proceso' ? 'info' : slotProps.option === 'pendiente' ? 'warning' : 'success'" />
                        </template>
                        <template #value="slotProps">
                            <Tag v-if="slotProps.value" :value="slotProps.value" :severity="slotProps.value === 'en_proceso' ? 'info' : slotProps.value === 'pendiente' ? 'warning' : 'success'" />
                            <span v-else>{{ slotProps.placeholder }}</span>
                        </template>
                    </Select>
                    <small class="field-help text-500">Estado actual de la tarea</small>
                </div>
            </div>

            <!-- Row 4: Reason (Conditional) -->
            <div class="col-12" v-if="!isNew && task.status !== 'pendiente' && task.status !== 'en_proceso'">
                <div class="field">
                    <label for="reason" class="compact-label">
                        <i class="pi pi-comment text-gray-500 mr-2"></i>
                        Razón del cambio de estado
                    </label>
                    <InputText id="reason" v-model.trim="task.reason" placeholder="Motivo finalización/cancelación" class="compact-input" fluid />
                </div>
            </div>

            <!-- Row 5: Details Section -->
            <div class="col-12 mt-2 mb-1">
                <div class="text-xs font-bold text-500 uppercase tracking-wide border-bottom-1 border-200 pb-1">Detalles Adicionales</div>
            </div>

            <div class="col-12">
                <div class="field">
                    <label for="observations" class="compact-label">
                        <i class="pi pi-align-left text-primary-500 mr-2"></i>
                        Observaciones
                    </label>
                    <Textarea id="observations" v-model="task.observations" rows="2" placeholder="Notas adicionales o contexto" class="compact-input" fluid />
                </div>
            </div>

            <div class="col-12">
                <div class="field">
                    <label for="url_file" class="compact-label">
                        <i class="pi pi-link text-blue-500 mr-2"></i>
                        Adjuntar Enlace
                    </label>
                    <IconField>
                        <InputIcon class="pi pi-globe" />
                        <InputText id="url_file" v-model="task.url_file" class="compact-input" fluid />
                    </IconField>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-end gap-2 pt-3 border-top-1 border-200">
                <Button label="Cancelar" icon="pi pi-times" class="p-button-text p-button-sm" @click="hideDialog" />
                <Button label="Guardar Tarea" icon="pi pi-check" @click="saveTask" class="p-button-sm" />
            </div>
        </template>
    </Dialog>
    <!-- Procedures Dialog -->
    <ProceduresDialog :visible="showProceduresDialog" :selectedProcedures="selectedProcedures" @hide="showProceduresDialog = false" @save="handleProceduresSave" />
    <!-- Lab Tests Dialog -->
    <LabTestsDialog :visible="showLabTestsDialog" :selectedLabTests="selectedLabTests" @hide="showLabTestsDialog = false" @save="handleLabTestsSave" />
</template>

<style scoped>
/* Layout compacto principal */
.ticket-dialog {
    max-width: 92vw;
    max-height: 85vh;
    overflow: hidden;
}

:deep(.p-dialog-content) {
    padding: 0.75rem 1.25rem;
    overflow-y: auto;
}

.compact-form {
    gap: 0;
}

/* Labels compactos */
.compact-label {
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.35rem;
    display: flex;
    align-items: center;
    font-size: 0.85rem;
}

/* Inputs compactos */
.compact-input,
:deep(.compact-input) {
    padding: 0.5rem 0.75rem !important;
    font-size: 0.9rem !important;
}

.compact-input-select,
:deep(.compact-input-select) {
    font-size: 0.9rem !important;
}

:deep(.p-inputtext.compact-input) {
    padding: 0.5rem 0.75rem;
}

:deep(.p-dropdown.compact-input-select),
:deep(.p-multiselect.compact-input-select) {
    display: flex;
    align-items: center;
}

:deep(.p-dropdown.compact-input-select .p-dropdown-label),
:deep(.p-multiselect.compact-input-select .p-multiselect-label) {
    padding: 0.5rem 0.75rem;
}

:deep(.p-textarea.compact-input) {
    min-height: 5rem;
}

.field {
    margin-bottom: 1rem;
}

/* Textos de ayuda */
.field-help {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    margin-top: 0.35rem;
    display: block;
    line-height: 1.3;
}

/* Header styling */
:deep(.p-dialog-header) {
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, var(--surface-0) 0%, var(--surface-50) 100%);
    border-bottom: 1px solid var(--surface-200);
}

/* Footer styling */
:deep(.p-dialog-footer) {
    padding: 1rem 1.25rem;
    background: var(--surface-0);
}

/* Buttons */
:deep(.p-button-sm) {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
}

/* Responsive */
@media (max-width: 768px) {
    .ticket-dialog {
        max-width: 100vw;
        margin: 0.5rem;
    }

    :deep(.p-dialog-content) {
        padding: 0.75rem;
    }

    .field {
        margin-bottom: 0.75rem;
    }
}
</style>
