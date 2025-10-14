<script setup>
import AttentionDetails from '@/components/attentions/AttentionDetails.vue';
import AttentionTasks from '@/components/attentions/AttentionTasks.vue';
import DailyMedicalAudits from '@/components/attentions/DailyMedicalAudits.vue';
import DetailsTimeline from '@/components/attentions/DetailsTimeline.vue';
import { usePermissions, USER_POSITIONS } from '@/composables/usePermissions';
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useHospitalAttentionsStore } from '@/store/hospitalAttentionsStore';
import { FilterMatchMode } from '@primevue/core/api';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const hospitalAttentionsStore = useHospitalAttentionsStore();
const { startListening, stopListening } = useRealtimeEvents();
const { hasPosition } = usePermissions();

const attentions = computed(() => hospitalAttentionsStore.allAttentions);
const isLoading = computed(() => hospitalAttentionsStore.isLoading);

// ============================================================================
// CONFIGURACIÓN DE PERMISOS POR FUNCIONALIDAD
// ============================================================================
// PERMISOS DE EDICIÓN: HOSPITALIZACION, DIRECTOR_MEDICO y MEDICOS pueden editar detalles y tareas de atención
const canEdit = computed(() => hasPosition(USER_POSITIONS.HOSPITALIZACION) || hasPosition(USER_POSITIONS.DIRECTOR_MEDICO) || hasPosition(USER_POSITIONS.MEDICOS));

// PERMISOS DE AUDITORÍA: Solo DIRECTOR_MEDICO puede registrar/editar auditorías médicas diarias
const canEditAudits = computed(() => hasPosition(USER_POSITIONS.DIRECTOR_MEDICO));

// PERMISOS DE APROBACIÓN: Solo DIRECTOR_MEDICO puede aprobar alta de atención
const isDirectorMedico = computed(() => hasPosition(USER_POSITIONS.DIRECTOR_MEDICO));

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
const isAuditsSidebarVisible = ref(false);
const selectedAttention = ref(null);
const selectedAttentionForTasks = ref(null);
const selectedAttentionForAudits = ref(null);
const selectedDate = ref(null); // Para controlar la fecha seleccionada en detalles
const isApproveDialogVisible = ref(false);
const attentionToApprove = ref(null);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    'patient.name': { value: null, matchMode: FilterMatchMode.CONTAINS },
    'patient.number_document': { value: null, matchMode: FilterMatchMode.CONTAINS },
    doctor: { value: null, matchMode: FilterMatchMode.CONTAINS },
    is_active: { value: null, matchMode: FilterMatchMode.EQUALS },
    entry_at: { value: null, matchMode: FilterMatchMode.DATE_IS },
    exit_at: { value: null, matchMode: FilterMatchMode.DATE_IS }
});

// Filtros de rango de fechas
const dateRangeFilter = ref({
    startDate: null,
    endDate: null
});

const applyDateRangeFilter = () => {
    // Este computed filtrará las atenciones por rango de fechas
    // No se usa el sistema de filtros de PrimeVue para esto
};

const clearDateRangeFilter = () => {
    dateRangeFilter.value.startDate = null;
    dateRangeFilter.value.endDate = null;
};

// Computed para filtrar atenciones por rango de fechas
const filteredAttentionsByDate = computed(() => {
    if (!dateRangeFilter.value.startDate && !dateRangeFilter.value.endDate) {
        return attentions.value;
    }

    return attentions.value.filter((attention) => {
        const entryDate = attention.entry_at ? new Date(attention.entry_at) : null;

        if (!entryDate) return false;

        // Filtrar por fecha de inicio
        if (dateRangeFilter.value.startDate) {
            const startDate = new Date(dateRangeFilter.value.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (entryDate < startDate) return false;
        }

        // Filtrar por fecha de fin
        if (dateRangeFilter.value.endDate) {
            const endDate = new Date(dateRangeFilter.value.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (entryDate > endDate) return false;
        }

        return true;
    });
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
    selectedDate.value = null; // Reset date selection
    isDetailsSidebarVisible.value = true;
};

const handleDateSelected = (date) => {
    selectedDate.value = date;
};

const handleCreateNewDetail = (date) => {
    selectedDate.value = date;
    // Asegurarse de que el sidebar esté abierto
    if (!isDetailsSidebarVisible.value) {
        isDetailsSidebarVisible.value = true;
    }
    // El componente AttentionDetails detectará que no hay detalle para esa fecha y mostrará el formulario
};

const openTasksSidebar = (attention) => {
    selectedAttentionForTasks.value = attention;
    isTasksSidebarVisible.value = true;
};

const openAuditsSidebar = (attention) => {
    selectedAttentionForAudits.value = attention;
    isAuditsSidebarVisible.value = true;
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

const openApproveDialog = (attention) => {
    attentionToApprove.value = attention;
    isApproveDialogVisible.value = true;
};

const handleApproveAttention = async () => {
    if (!attentionToApprove.value) return;

    try {
        await hospitalAttentionsStore.approveAttention(attentionToApprove.value.id);
        isApproveDialogVisible.value = false;
        attentionToApprove.value = null;
    } catch (error) {
        console.error('Error al aprobar la atención:', error);
        // Aquí podrías mostrar un mensaje de error con toast o similar
    }
};

const handleCreateAudit = async (auditData) => {
    try {
        await hospitalAttentionsStore.createAudit(auditData);
    } catch (error) {
        // Re-throw para que el componente hijo lo capture
        throw error;
    }
};

const handleUpdateAudit = async (auditId, auditData) => {
    try {
        await hospitalAttentionsStore.updateAudit(auditId, auditData);
    } catch (error) {
        // Re-throw para que el componente hijo lo capture
        throw error;
    }
};

const handleDeleteAudit = async (auditId) => {
    await hospitalAttentionsStore.deleteAudit(auditId);
};

const handleMarkAuditAsAudited = async (auditId) => {
    await hospitalAttentionsStore.markAuditAsAudited(auditId);
};

const canApproveAttention = (attention) => {
    // Solo el director médico puede aprobar
    if (!isDirectorMedico.value) return false;
    // No se puede aprobar si ya está aprobada
    if (attention.is_approved_by_director) return false;
    return true;
};

const formatDate = (value) => {
    if (!value) return 'N/A';
    try {
        let date;
        // Si la fecha es solo YYYY-MM-DD sin hora, parsear como fecha local
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = value.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(value);
        }

        if (isNaN(date)) return value; // Return original if invalid
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return value;
    }
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

const parseCie10Names = (names) => {
    if (typeof names === 'string') {
        try {
            const parsed = JSON.parse(names);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error parsing cie10_names:', e);
            return [];
        }
    }
    return Array.isArray(names) ? names : [];
};

const calculateDurationDays = (attention) => {
    if (!attention.entry_at) return null;

    const entryDate = new Date(attention.entry_at);
    const endDate = attention.exit_at ? new Date(attention.exit_at) : new Date();

    // Calcular diferencia en milisegundos y convertir a días
    const diffTime = Math.abs(endDate - entryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

const cie10Severities = ['success', 'info', 'warning', 'danger', 'secondary', 'contrast'];

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

            // Actualizar selectedAttentionForAudits para auditorías
            if (selectedAttentionForAudits.value) {
                const updatedAttentionForAudits = newAttentions.find((attention) => attention.id === selectedAttentionForAudits.value.id);

                if (updatedAttentionForAudits) {
                    selectedAttentionForAudits.value = updatedAttentionForAudits;
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

// Computed para obtener la atención seleccionada siempre actualizada (para auditorías)
const currentSelectedAttentionForAudits = computed(() => {
    if (!selectedAttentionForAudits.value) return null;

    // Buscar en el store la versión más actualizada
    const updated = attentions.value.find((attention) => attention.id === selectedAttentionForAudits.value.id);

    return updated || selectedAttentionForAudits.value;
});

// Computed para obtener los detalles como array (siempre array en nuevo formato)
const currentDetailsArray = computed(() => {
    if (!currentSelectedAttention.value) return [];
    const details = currentSelectedAttention.value.details_attention;

    // Validar que sea un array
    if (!Array.isArray(details)) {
        console.error('details_attention debe ser un array, recibido:', typeof details);
        return [];
    }

    return details;
});

// Computed para obtener las auditorías como array (siempre array en nuevo formato)
const currentAuditsArray = computed(() => {
    if (!currentSelectedAttentionForAudits.value) return [];

    const audits = currentSelectedAttentionForAudits.value.daily_medical_audits;

    // Si el backend no envía daily_medical_audits, inicializar array vacío
    if (!audits) {
        console.warn('⚠️ El backend no está enviando daily_medical_audits. Verifica que el modelo HospitalAttention incluya esta relación.');
        return [];
    }

    // Validar que sea un array
    if (!Array.isArray(audits)) {
        console.error('daily_medical_audits debe ser un array, recibido:', typeof audits);
        return [];
    }

    return audits;
});
</script>
<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Gestión de Atenciones Hospitalarias</h2>

        <DataTable
            :value="filteredAttentionsByDate"
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
                <div class="flex flex-col gap-3">
                    <!-- Búsqueda global -->
                    <div class="flex justify-between items-center">
                        <IconField>
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                        </IconField>
                    </div>

                    <!-- Filtros de rango de fechas -->
                    <div class="flex items-center gap-3 flex-wrap p-3 bg-surface-50 rounded-lg border border-surface-200">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-calendar text-primary"></i>
                            <span class="font-semibold text-sm">Filtrar por Periodo de Ingreso:</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <label for="start-date" class="text-sm">Desde:</label>
                            <Calendar id="start-date" v-model="dateRangeFilter.startDate" dateFormat="yy-mm-dd" :showIcon="true" placeholder="Fecha inicio" class="w-auto" />
                        </div>
                        <div class="flex items-center gap-2">
                            <label for="end-date" class="text-sm">Hasta:</label>
                            <Calendar id="end-date" v-model="dateRangeFilter.endDate" dateFormat="yy-mm-dd" :showIcon="true" placeholder="Fecha fin" class="w-auto" />
                        </div>
                        <Button v-if="dateRangeFilter.startDate || dateRangeFilter.endDate" label="Limpiar" icon="pi pi-times" severity="secondary" size="small" text @click="clearDateRangeFilter" />
                        <div v-if="dateRangeFilter.startDate || dateRangeFilter.endDate" class="ml-auto">
                            <Tag :value="`${filteredAttentionsByDate.length} registros`" severity="info" />
                        </div>
                    </div>
                </div>
            </template>

            <template #empty> No se encontraron atenciones. </template>
            <template #loading> Cargando datos de atenciones... </template>

            <Column field="number" header="Admisión" sortable style="min-width: 6rem">
                <template #body="{ data }">
                    <span v-tooltip.top="'Número de Admisión'">{{ data.number }}</span>
                </template>
            </Column>

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
                        <div v-if="data.code_doctor" class="text-xs text-gray-500" v-tooltip.top="'Código del Médico'">Código: {{ data.code_doctor }}</div>
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
                        <span class="font-bold mr-2" v-tooltip.top="'Habitación'">{{ data.bed.room.number }}</span>
                        <Tag :value="data.bed.name.replace(data.bed.room.number, '')" :class="getBedTagClass(data.bed.name, data.bed.room.number)" v-tooltip.top="'Cama'" />
                    </div>
                    <div v-else>N/A</div>
                </template>
            </Column>

            <Column header="Periodo Estancia" sortable sortField="entry_at" style="min-width: 16rem">
                <template #body="{ data }">
                    <div class="text-xs">
                        <div><span class="font-semibold">Ingreso:</span> {{ formatDate(data.entry_at) }}</div>
                        <div><span class="font-semibold">Salida:</span> {{ formatDate(data.exit_at) }}</div>
                        <div v-if="calculateDurationDays(data)" class="text-gray-600 mt-1">
                            <i class="pi pi-calendar mr-1"></i>
                            <span>Duración: {{ calculateDurationDays(data) }} {{ calculateDurationDays(data) === 1 ? 'día' : 'días' }}</span>
                            <span v-if="!data.exit_at" class="ml-1 text-blue-600 font-medium">(en curso)</span>
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
                    <div v-if="data.cie10_names && parseCie10Names(data.cie10_names).length > 0" class="flex flex-wrap gap-1">
                        <Tag v-for="(name, index) in parseCie10Names(data.cie10_names)" :key="name" :value="name" :severity="cie10Severities[index % cie10Severities.length]" class="text-xs" />
                    </div>
                    <div v-else class="text-xs text-gray-500">Sin diagnósticos</div>
                </template>
            </Column>

            <Column field="is_active" header="Estado" sortable dataType="boolean" style="min-width: 12rem">
                <template #body="{ data }">
                    <div class="space-y-1">
                        <Tag :severity="getSeverity(data.is_active)" :icon="data.is_active ? 'pi pi-check-circle' : 'pi pi-times-circle'" v-tooltip.top="data.is_active ? 'Activa' : 'Cerrada'" />
                        <div v-if="!data.is_active && data.medical_discharge_type" class="text-xs text-gray-600">
                            {{ data.medical_discharge_type }}
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

            <Column header="Aprobación Director" sortable sortField="is_approved_by_director" style="min-width: 14rem">
                <template #body="{ data }">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <Tag v-if="data.is_approved_by_director" value="Aprobada" severity="success" icon="pi pi-check-circle" class="text-xs" v-tooltip.top="'Aprobada por Director Médico'" />
                            <Tag v-else value="Pendiente" severity="warning" icon="pi pi-clock" class="text-xs" v-tooltip.top="'Pendiente de aprobación'" />
                        </div>
                        <div v-if="data.is_approved_by_director && data.medical_director_approved_by" class="text-xs text-gray-600">
                            <i class="pi pi-user mr-1"></i>
                            {{ data.medical_director_approved_by }}
                        </div>
                        <div v-if="data.is_approved_by_director && data.medical_director_approved_at" class="text-xs text-gray-600">
                            <i class="pi pi-calendar mr-1"></i>
                            {{ formatDate(data.medical_director_approved_at) }}
                        </div>
                    </div>
                </template>
            </Column>

            <Column header="Acciones" style="min-width: 20rem">
                <template #body="{ data }">
                    <div class="flex items-center gap-1 flex-wrap">
                        <Button icon="pi pi-eye" class="p-button-rounded p-button-info p-button-sm" @click="openDetailsSidebar(data)" v-tooltip.top="'Ver Detalles de Atención'" />
                        <Button icon="pi pi-list-check" class="p-button-rounded p-button-secondary p-button-sm" @click="openTasksSidebar(data)" v-tooltip.top="'Ver Tareas'" />
                        <Button icon="pi pi-check-square" class="p-button-rounded p-button-help p-button-sm" @click="openAuditsSidebar(data)" v-tooltip.top="'Ver Auditorías Médicas'" />
                        <Button v-if="canApproveAttention(data)" icon="pi pi-check" class="p-button-rounded p-button-success p-button-sm" @click="openApproveDialog(data)" v-tooltip.top="'Aprobar alta de atención'" />
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
            <div v-if="currentSelectedAttention" class="details-drawer-content">
                <!-- Timeline de fechas -->
                <div class="details-sidebar-left">
                    <DetailsTimeline :details="currentDetailsArray" :selected-date="selectedDate" :attention-active="currentSelectedAttention.is_active" @date-selected="handleDateSelected" @create-new="handleCreateNewDetail" />
                </div>

                <!-- Detalles del día seleccionado -->
                <div class="details-sidebar-right">
                    <AttentionDetails
                        :details="currentDetailsArray"
                        :attention-id="currentSelectedAttention.id"
                        :selected-date="selectedDate"
                        :read-only="!canEditDetails"
                        @create-details="handleCreateDetails"
                        @update-details="handleUpdateDetails"
                        @delete-details="handleDeleteDetails"
                    />
                </div>
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
                <AttentionTasks
                    :tasks="currentSelectedAttentionForTasks.tasks"
                    :attention-id="currentSelectedAttentionForTasks.id"
                    :read-only="!canEditTasks"
                    @create-task="handleCreateTask"
                    @update-task="handleUpdateTask"
                    @delete-task="handleDeleteTask"
                />
            </div>
        </Drawer>

        <!-- Drawer para Auditorías Médicas -->
        <Drawer v-model:visible="isAuditsSidebarVisible" position="right" class="!w-full md:!w-[48rem] lg:!w-[56rem] xl:!w-[64rem]">
            <template #header>
                <div v-if="currentSelectedAttentionForAudits" class="flex flex-col gap-2">
                    <h3 class="text-xl font-bold flex items-center gap-2">
                        <i class="pi pi-check-square text-purple-600"></i>
                        Auditorías Médicas Diarias
                    </h3>
                    <div class="text-sm font-medium text-gray-700">{{ currentSelectedAttentionForAudits.patient.name }}</div>
                    <div class="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <div class="flex items-center">
                            <i class="pi pi-user mr-1"></i>
                            {{ formatAge(currentSelectedAttentionForAudits.patient.age_formatted) }}
                        </div>
                        <div class="flex items-center">
                            <i class="pi pi-ticket mr-1"></i>
                            {{ currentSelectedAttentionForAudits.number }}
                        </div>
                        <div v-if="currentSelectedAttentionForAudits.bed && currentSelectedAttentionForAudits.bed.room" class="flex items-center">
                            <i class="pi pi-inbox mr-1"></i>
                            {{ currentSelectedAttentionForAudits.bed.name }}
                        </div>
                        <div class="flex items-center">
                            <i class="pi pi-shield mr-1"></i>
                            {{ currentSelectedAttentionForAudits.insurance }}
                        </div>
                        <div v-if="currentSelectedAttentionForAudits.doctor" class="flex items-center col-span-2">
                            <i class="pi pi-user-plus mr-1"></i>
                            Dr. {{ currentSelectedAttentionForAudits.doctor }}
                        </div>
                    </div>

                    <!-- Audits Status Indicators -->
                    <div class="flex items-center gap-2 mt-2">
                        <Tag :value="currentSelectedAttentionForAudits.is_active ? 'Activa' : 'Cerrada'" :severity="getSeverity(currentSelectedAttentionForAudits.is_active)" class="text-xs" />
                        <div v-if="currentAuditsArray.length > 0" class="flex items-center gap-1">
                            <Tag :value="`${currentAuditsArray.length} auditorías`" severity="info" class="text-xs" />
                        </div>
                    </div>
                </div>
            </template>
            <div v-if="currentSelectedAttentionForAudits">
                <DailyMedicalAudits
                    :attention-id="currentSelectedAttentionForAudits.id"
                    :audits="currentAuditsArray"
                    :read-only="!canEditAudits"
                    @audit-created="handleCreateAudit"
                    @audit-updated="handleUpdateAudit"
                    @audit-deleted="handleDeleteAudit"
                    @audit-marked="handleMarkAuditAsAudited"
                />
            </div>
        </Drawer>

        <!-- Dialog de Confirmación de Aprobación -->
        <Dialog v-model:visible="isApproveDialogVisible" modal header="Confirmar Aprobación de Atención" :style="{ width: '32rem' }" :closable="true">
            <div v-if="attentionToApprove" class="space-y-4">
                <div class="flex items-start gap-3">
                    <i class="pi pi-exclamation-triangle text-warning text-2xl"></i>
                    <div class="flex-1">
                        <p class="text-base mb-3">¿Está seguro de que desea aprobar esta atención hospitalaria?</p>
                        <div class="bg-gray-50 p-3 rounded-lg space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-sm">Admisión:</span>
                                <span class="text-sm">{{ attentionToApprove.number }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-sm">Paciente:</span>
                                <span class="text-sm">{{ attentionToApprove.patient?.name }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-sm">Médico:</span>
                                <span class="text-sm">Dr. {{ attentionToApprove.doctor }}</span>
                            </div>
                            <div v-if="attentionToApprove.bed && attentionToApprove.bed.room" class="flex items-center gap-2">
                                <span class="font-semibold text-sm">Habitación:</span>
                                <span class="text-sm">{{ attentionToApprove.bed.name }}</span>
                            </div>
                        </div>
                        <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                            <i class="pi pi-info-circle mr-2"></i>
                            Esta acción no se puede deshacer. Se registrará automáticamente la fecha, hora y su usuario.
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Cancelar" severity="secondary" @click="isApproveDialogVisible = false" text />
                    <Button label="Aprobar Atención" severity="success" icon="pi pi-check" @click="handleApproveAttention" />
                </div>
            </template>
        </Dialog>
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

/* Details drawer layout */
.details-drawer-content {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1rem;
    height: 100%;
}

.details-sidebar-left {
    border-right: 1px solid var(--surface-border);
    padding-right: 1rem;
    overflow-y: auto;
    max-height: calc(100vh - 200px);
}

.details-sidebar-right {
    overflow-y: auto;
    max-height: calc(100vh - 200px);
}

@media (max-width: 1024px) {
    .details-drawer-content {
        grid-template-columns: 1fr;
    }

    .details-sidebar-left {
        border-right: none;
        border-bottom: 1px solid var(--surface-border);
        padding-right: 0;
        padding-bottom: 1rem;
        max-height: 300px;
    }

    .details-sidebar-right {
        max-height: calc(100vh - 500px);
    }
}
</style>
