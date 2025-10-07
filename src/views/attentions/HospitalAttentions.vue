<script setup>
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useHospitalAttentionsStore } from '@/store/hospitalAttentionsStore';
import { usePermissions, USER_POSITIONS } from '@/composables/usePermissions';
import { FilterMatchMode } from '@primevue/core/api';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const hospitalAttentionsStore = useHospitalAttentionsStore();
const { startListening, stopListening } = useRealtimeEvents();
const { hasPosition } = usePermissions();

const attentions = computed(() => hospitalAttentionsStore.allAttentions);
const isLoading = computed(() => hospitalAttentionsStore.isLoading);

// Verificar si el usuario puede editar (solo HOSPITALIZACION y atención activa)
const canEdit = computed(() => hasPosition(USER_POSITIONS.HOSPITALIZACION));

// Verificar si se puede editar la atención de detalles (debe estar activa)
const canEditDetails = computed(() => {
    if (!canEdit.value) return false;
    if (!currentSelectedAttention.value) return false;
    return currentSelectedAttention.value.is_active === true;
});

// Verificar si se puede editar las tareas (debe estar activa)
const canEditTasks = computed(() => {
    if (!canEdit.value) return false;
    if (!currentSelectedAttentionForTasks.value) return false;
    return currentSelectedAttentionForTasks.value.is_active === true;
});

const isDetailsSidebarVisible = ref(false);
const isTasksSidebarVisible = ref(false);
const selectedAttention = ref(null);
const selectedAttentionForTasks = ref(null);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    'patient.name': { value: null, matchMode: FilterMatchMode.CONTAINS },
    'patient.number_document': { value: null, matchMode: FilterMatchMode.CONTAINS },
    doctor: { value: null, matchMode: FilterMatchMode.CONTAINS },
    is_active: { value: null, matchMode: FilterMatchMode.EQUALS }
});

onMounted(async () => {
    await hospitalAttentionsStore.fetchAttentions();

    // Start listening for real-time events
    startListening();
    console.log('[HospitalAttentions] Started listening for real-time events');
});

onUnmounted(() => {
    // Stop listening for real-time events
    stopListening();
    console.log('[HospitalAttentions] Stopped listening for real-time events');
});

const openDetailsSidebar = (attention) => {
    selectedAttention.value = attention;
    isDetailsSidebarVisible.value = true;
};

const openTasksSidebar = (attention) => {
    selectedAttentionForTasks.value = attention;
    isTasksSidebarVisible.value = true;
};

const handleCreateTask = async (taskData) => {
    await hospitalAttentionsStore.createTask(taskData);
};

const handleUpdateTask = async (taskData) => {
    await hospitalAttentionsStore.updateTask(taskData.id, taskData);
};

const handleDeleteTask = async (taskId) => {
    await hospitalAttentionsStore.deleteTask(taskId);
};

const handleCreateDetails = async (detailsData) => {
    await hospitalAttentionsStore.createDetails(detailsData);
};

const handleUpdateDetails = async (detailsId, detailsData) => {
    await hospitalAttentionsStore.updateDetails(detailsId, detailsData);
};

const handleDeleteDetails = async (detailsId) => {
    await hospitalAttentionsStore.deleteDetails(detailsId);
    // also close the sidebar if the detail is deleted
    isDetailsSidebarVisible.value = false;
};

const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (isNaN(date)) return value; // Return original if invalid
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getSeverity = (isActive) => {
    return isActive ? 'success' : 'danger';
};

const formatAge = (ageString) => {
    if (!ageString) return 'N/A';
    // Si ya está en el formato correcto, devolverlo tal como está
    if (typeof ageString === 'string' && ageString.includes('años')) {
        return ageString;
    }
    return ageString || 'N/A';
};

const getBedTagClass = (bedName, roomNumber) => {
    if (!bedName || !roomNumber) return 'bed-tag-default';
    const letter = bedName.replace(roomNumber, '').toUpperCase();
    return `bed-tag-${letter}`;
};

const getTasksSeverity = (tasks) => {
    if (!tasks || tasks.length === 0) return 'secondary';
    const hasPending = tasks.some((task) => task.status === 'pendiente');
    const hasCancelled = tasks.some((task) => task.status === 'anulado');

    if (hasPending) return 'warning';
    if (hasCancelled) return 'danger';
    return 'success';
};

const hasPendingTasks = (tasks) => {
    if (!tasks || tasks.length === 0) return false;
    return tasks.some((task) => task.status === 'pendiente');
};

// Watch para mantener selectedAttention sincronizada con los datos actualizados
watch(
    attentions,
    (newAttentions) => {
        if (newAttentions.length > 0) {
            // Actualizar selectedAttention para detalles
            if (selectedAttention.value) {
                const updatedAttention = newAttentions.find((attention) => attention.id === selectedAttention.value.id);

                if (updatedAttention) {
                    selectedAttention.value = updatedAttention;
                }
            }

            // Actualizar selectedAttentionForTasks para tareas
            if (selectedAttentionForTasks.value) {
                const updatedAttentionForTasks = newAttentions.find((attention) => attention.id === selectedAttentionForTasks.value.id);

                if (updatedAttentionForTasks) {
                    selectedAttentionForTasks.value = updatedAttentionForTasks;
                }
            }
        }
    },
    { deep: true }
);

// Computed para obtener la atención seleccionada siempre actualizada (para detalles)
const currentSelectedAttention = computed(() => {
    if (!selectedAttention.value) return null;

    // Buscar en el store la versión más actualizada
    const updated = attentions.value.find((attention) => attention.id === selectedAttention.value.id);

    return updated || selectedAttention.value;
});

// Computed para obtener la atención seleccionada siempre actualizada (para tareas)
const currentSelectedAttentionForTasks = computed(() => {
    if (!selectedAttentionForTasks.value) return null;

    // Buscar en el store la versión más actualizada
    const updated = attentions.value.find((attention) => attention.id === selectedAttentionForTasks.value.id);

    return updated || selectedAttentionForTasks.value;
});
</script>
<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Gestión de Atenciones Hospitalarias</h2>

        <DataTable
            :value="attentions"
            :loading="isLoading"
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
            v-model:filters="filters"
            filterDisplay="menu"
            :globalFilterFields="['number', 'patient.cod_patient', 'patient.name', 'patient.number_document', 'doctor', 'insurance', 'bed.name', 'bed.room.number', 'cie10_names']"
            removableSort
            sortMode="multiple"
            class="p-datatable-customers"
            responsiveLayout="scroll"
            scrollable
            scrollHeight="600px"
        >
            <template #header>
                <div class="flex justify-between items-center">
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                    </IconField>
                </div>
            </template>

            <template #empty> No se encontraron atenciones. </template>
            <template #loading> Cargando datos de atenciones... </template>

            <Column field="number" header="Admisión" sortable style="min-width: 6rem"></Column>

            <Column field="patient.name" header="Paciente" sortable filterField="patient.name" :showFilterMatchModes="false" style="min-width: 20rem">
                <template #body="{ data }">
                    <div>
                        <div class="font-bold">HC: {{ data.patient?.cod_patient }} - {{ data.patient?.name }}</div>
                        <div class="text-sm text-gray-500">{{ data.patient?.document_type }}: {{ data.patient?.number_document }}</div>
                        <div class="text-sm">Edad: {{ formatAge(data.patient?.age_formatted) }}</div>
                    </div>
                </template>
                <template #filter="{ filterModel }">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Buscar por paciente" />
                </template>
            </Column>

            <Column field="doctor" header="Médico" sortable filterField="doctor" :showFilterMatchModes="false" style="min-width: 16rem">
                <template #body="{ data }">
                    <div>
                        <div class="font-medium">{{ data.doctor }}</div>
                        <div v-if="data.code_doctor" class="text-xs text-gray-500">Código: {{ data.code_doctor }}</div>
                    </div>
                </template>
            </Column>
            <Column header="Seguro & Tipo" sortable style="min-width: 12rem">
                <template #body="{ data }">
                    <div class="text-xs">
                        <div class="font-medium">{{ data.insurance }}</div>
                        <div v-if="data.type_attention" class="mt-1">
                            <Tag :value="data.type_attention" severity="info" class="text-xs" />
                        </div>
                        <div v-if="data.origin_attention" class="text-gray-600 mt-1">Origen: {{ data.origin_attention }}</div>
                    </div>
                </template>
            </Column>

            <Column header="Habitación" sortable sortField="bed.room.number" style="min-width: 10rem">
                <template #body="{ data }">
                    <div v-if="data.bed && data.bed.room" class="flex items-center">
                        <span class="font-bold mr-2">{{ data.bed.room.number }}</span>
                        <Tag :value="data.bed.name.replace(data.bed.room.number, '')" :class="getBedTagClass(data.bed.name, data.bed.room.number)" />
                    </div>
                    <div v-else>N/A</div>
                </template>
            </Column>

            <Column header="Periodo Estancia" sortable sortField="entry_at" style="min-width: 16rem">
                <template #body="{ data }">
                    <div class="text-xs">
                        <div><span class="font-semibold">Ingreso:</span> {{ formatDate(data.entry_at) }}</div>
                        <div><span class="font-semibold">Salida:</span> {{ formatDate(data.exit_at) }}</div>
                        <div v-if="data.duration_days" class="text-gray-600 mt-1">
                            <i class="pi pi-calendar mr-1"></i>
                            <span>Duración: {{ Math.ceil(data.duration_days) }} días</span>
                        </div>
                        <div v-if="data.request_at" class="text-gray-600">
                            <i class="pi pi-send mr-1"></i>
                            <span>Solicitado: {{ formatDate(data.request_at) }}</span>
                        </div>
                    </div>
                </template>
            </Column>

            <Column header="Diagnósticos CIE-10" field="cie10_names" sortable style="min-width: 20rem">
                <template #body="{ data }">
                    <div v-if="data.cie10_names && data.cie10_names.length" class="flex flex-wrap gap-1">
                        <Tag v-for="name in data.cie10_names" :key="name" :value="name" severity="warning" class="text-xs" />
                    </div>
                    <div v-else class="text-xs text-gray-500">Sin diagnósticos</div>
                </template>
            </Column>

            <Column field="is_active" header="Estado" sortable dataType="boolean" style="min-width: 12rem">
                <template #body="{ data }">
                    <div class="space-y-1">
                        <Tag :value="data.is_active ? 'Activa' : 'Cerrada'" :severity="getSeverity(data.is_active)" />
                        <div v-if="!data.is_active && data.medical_discharge_type" class="text-xs text-gray-600">
                            {{ data.medical_discharge_type }}
                        </div>
                        <div v-if="data.cie10_count" class="text-xs flex items-center text-blue-600">
                            <i class="pi pi-list mr-1"></i>
                            CIE10: {{ data.cie10_count }}
                        </div>
                    </div>
                </template>
                <template #filter="{ filterModel }">
                    <div class="flex items-center gap-2">
                        <label for="active-filter">Activa</label>
                        <input type="radio" id="active-filter" :value="true" v-model="filterModel.value" />
                        <label for="inactive-filter">Cerrada</label>
                        <input type="radio" id="inactive-filter" :value="false" v-model="filterModel.value" />
                    </div>
                </template>
            </Column>

            <Column header="Acciones" style="min-width: 12rem">
                <template #body="{ data }">
                    <div class="flex items-center gap-1">
                        <Button icon="pi pi-eye" class="p-button-rounded p-button-info p-button-sm" @click="openDetailsSidebar(data)" v-tooltip.top="'Ver Detalles de Atención'" />
                        <Button icon="pi pi-list-check" class="p-button-rounded p-button-secondary p-button-sm" @click="openTasksSidebar(data)" v-tooltip.top="'Ver Tareas'" />
                        <div v-if="data.tasks && data.tasks.length > 0" class="flex items-center gap-1 ml-1">
                            <Tag :value="data.tasks.length" :severity="getTasksSeverity(data.tasks)" class="text-xs" v-tooltip.top="'Número de tareas'" />
                            <i v-if="hasPendingTasks(data.tasks)" class="pi pi-exclamation-triangle text-warning" v-tooltip.top="'Tiene tareas pendientes'"></i>
                        </div>
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Drawer para Detalles de Atención -->
        <Drawer v-model:visible="isDetailsSidebarVisible" position="right" class="!w-full md:!w-[48rem] lg:!w-[56rem] xl:!w-[64rem]">
            <template #header>
                <div v-if="currentSelectedAttention" class="flex flex-col gap-2">
                    <h3 class="text-xl font-bold flex items-center gap-2">
                        <i class="pi pi-file-edit text-blue-600"></i>
                        Detalles de Atención
                    </h3>
                    <div class="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <div class="flex items-center">
                            <i class="pi pi-user mr-1"></i>
                            {{ formatAge(currentSelectedAttention.patient.age_formatted) }}
                        </div>
                        <div class="flex items-center">
                            <i class="pi pi-ticket mr-1"></i>
                            {{ currentSelectedAttention.number }}
                        </div>
                        <div v-if="currentSelectedAttention.bed && currentSelectedAttention.bed.room" class="flex items-center">
                            <i class="pi pi-inbox mr-1"></i>
                            {{ currentSelectedAttention.bed.name }}
                        </div>
                        <div class="flex items-center">
                            <i class="pi pi-shield mr-1"></i>
                            {{ currentSelectedAttention.insurance }}
                        </div>
                        <div v-if="currentSelectedAttention.doctor" class="flex items-center col-span-2">
                            <i class="pi pi-user-plus mr-1"></i>
                            Dr. {{ currentSelectedAttention.doctor }}
                        </div>
                    </div>

                    <!-- Status Indicators -->
                    <div class="flex items-center gap-2 mt-2">
                        <Tag :value="currentSelectedAttention.is_active ? 'Activa' : 'Cerrada'" :severity="getSeverity(currentSelectedAttention.is_active)" class="text-xs" />
                        <Tag v-if="currentSelectedAttention.type_attention" :value="currentSelectedAttention.type_attention" severity="info" class="text-xs" />
                    </div>
                </div>
            </template>
            <div v-if="currentSelectedAttention">
                <AttentionDetails :details="currentSelectedAttention.details_attention" :attention-id="currentSelectedAttention.id" :read-only="!canEditDetails" @create-details="handleCreateDetails" @update-details="handleUpdateDetails" @delete-details="handleDeleteDetails" />
            </div>
        </Drawer>

        <!-- Drawer para Tareas -->
        <Drawer v-model:visible="isTasksSidebarVisible" position="right" class="!w-full md:!w-[40rem] lg:!w-[48rem] xl:!w-[56rem]">
            <template #header>
                <div v-if="currentSelectedAttentionForTasks" class="flex flex-col gap-2">
                    <h3 class="text-xl font-bold flex items-center gap-2">
                        <i class="pi pi-list-check text-green-600"></i>
                        Tareas de Atención
                    </h3>
                    <div class="text-sm font-medium text-gray-700">{{ currentSelectedAttentionForTasks.patient.name }}</div>
                    <div class="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <div class="flex items-center">
                            <i class="pi pi-user mr-1"></i>
                            {{ formatAge(currentSelectedAttentionForTasks.patient.age_formatted) }}
                        </div>
                        <div class="flex items-center">
                            <i class="pi pi-ticket mr-1"></i>
                            {{ currentSelectedAttentionForTasks.number }}
                        </div>
                        <div v-if="currentSelectedAttentionForTasks.bed && currentSelectedAttentionForTasks.bed.room" class="flex items-center">
                            <i class="pi pi-inbox mr-1"></i>
                            {{ currentSelectedAttentionForTasks.bed.name }}
                        </div>
                        <div class="flex items-center">
                            <i class="pi pi-shield mr-1"></i>
                            {{ currentSelectedAttentionForTasks.insurance }}
                        </div>
                        <div v-if="currentSelectedAttentionForTasks.doctor" class="flex items-center col-span-2">
                            <i class="pi pi-user-plus mr-1"></i>
                            Dr. {{ currentSelectedAttentionForTasks.doctor }}
                        </div>
                    </div>

                    <!-- Tasks Status Indicators -->
                    <div class="flex items-center gap-2 mt-2">
                        <Tag :value="currentSelectedAttentionForTasks.is_active ? 'Activa' : 'Cerrada'" :severity="getSeverity(currentSelectedAttentionForTasks.is_active)" class="text-xs" />
                        <div v-if="currentSelectedAttentionForTasks.tasks && currentSelectedAttentionForTasks.tasks.length > 0" class="flex items-center gap-1">
                            <Tag :value="`${currentSelectedAttentionForTasks.tasks.length} tareas`" :severity="getTasksSeverity(currentSelectedAttentionForTasks.tasks)" class="text-xs" />
                            <i v-if="hasPendingTasks(currentSelectedAttentionForTasks.tasks)" class="pi pi-exclamation-triangle text-orange-500 text-xs"></i>
                        </div>
                    </div>
                </div>
            </template>
            <div v-if="currentSelectedAttentionForTasks">
                <AttentionTasks :tasks="currentSelectedAttentionForTasks.tasks" :attention-id="currentSelectedAttentionForTasks.id" :read-only="!canEditTasks" @create-task="handleCreateTask" @update-task="handleUpdateTask" @delete-task="handleDeleteTask" />
            </div>
        </Drawer>
    </div>
</template>

<style scoped>
.p-datatable-customers .p-column-filter {
    width: 100%;
}

:deep(.bed-tag-A) {
    background-color: #4caf50 !important;
}
:deep(.bed-tag-B) {
    background-color: #2196f3 !important;
}
:deep(.bed-tag-C) {
    background-color: #ffc107 !important;
    color: #000000 !important;
}
:deep(.bed-tag-D) {
    background-color: #f44336 !important;
}
:deep(.bed-tag-E) {
    background-color: #9c27b0 !important;
}
:deep(.bed-tag-F) {
    background-color: #e91e63 !important;
}
:deep(.bed-tag-G) {
    background-color: #009688 !important;
}
:deep(.bed-tag-H) {
    background-color: #607d8b !important;
}
:deep(.bed-tag-default) {
    background-color: #9e9e9e !important;
}

/* Enhanced button styles */
.p-button-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
}

.p-button-sm .pi {
    font-size: 0.875rem;
}

/* Task status indicators */
.text-warning {
    color: #f59e0b;
}

/* Grid enhancements for sidebar header */
.grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.col-span-2 {
    grid-column: span 2 / span 2;
}
</style>
