<script setup>
import AttentionDetails from '@/components/attentions/AttentionDetails.vue';
import AttentionTasks from '@/components/attentions/AttentionTasks.vue';
import DetailsTimeline from '@/components/attentions/DetailsTimeline.vue';
import BedReservationDialog from '@/components/hospitalization/BedReservationDialog.vue';
import { usePermissions, USER_POSITIONS } from '@/composables/usePermissions';
import { useHospitalAttentionsStore } from '@/store/hospitalAttentionsStore';
import { useBedReservationsStore } from '@/store/bedReservationsStore';
import { useToast } from 'primevue/usetoast';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import Tag from 'primevue/tag';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    bed: {
        type: Object,
        default: () => null
    }
});

const emit = defineEmits(['update:visible', 'refresh-data']);

const hospitalAttentionsStore = useHospitalAttentionsStore();
const reservationsStore = useBedReservationsStore();
const { hasPosition } = usePermissions();
const toast = useToast();

// PERMISOS DE EDICIÓN: HOSPITALIZACION, DIRECTOR_MEDICO, MEDICOS y EMERGENCIA pueden editar detalles y tareas de atención
const canEdit = computed(() => {
    if (!hasPosition(USER_POSITIONS.HOSPITALIZACION) && !hasPosition(USER_POSITIONS.DIRECTOR_MEDICO) && !hasPosition(USER_POSITIONS.MEDICOS) && !hasPosition(USER_POSITIONS.EMERGENCIA)) {
        return false;
    }
    if (!attention.value) return false;
    return attention.value.is_active === true;
});

const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const activeTab = ref('0');
const selectedDate = ref(null); // Para controlar la fecha seleccionada en detalles
const showReservationDialog = ref(false);
const isLoadingReservation = ref(false);

// Computed para obtener los datos de la atención
const attention = computed(() => {
    if (!props.bed?.attention) return null;

    // La estructura de los datos puede ser diferente, intentamos adaptarla
    const bedAttention = props.bed.attention;

    return {
        id: bedAttention.hospital_attention_id,
        hospital_attention_id: bedAttention.hospital_attention_id,
        patient: bedAttention.patient,
        entry_date: bedAttention.entry_date,
        number: bedAttention.number,
        cie10: bedAttention.cie10 || [],
        details_attention: bedAttention.details || [],
        tasks: bedAttention.tasks || [],
        // Campos adicionales necesarios para compatibilidad
        is_active: true, // Asumimos que es activa si aparece en el estado de hospitalización
        bed: {
            name: props.bed.bed_number,
            room: {
                number: extractRoomFromBed(props.bed.bed_number)
            }
        }
    };
});

// Computed para obtener los detalles como array (siempre array en nuevo formato)
const currentDetailsArray = computed(() => {
    if (!attention.value) return [];
    const details = attention.value.details_attention;

    // Validar que sea un array
    if (!Array.isArray(details)) {
        return [];
    }

    return details;
});

// Función para extraer el número de habitación del nombre de la cama
function extractRoomFromBed(bedNumber) {
    if (!bedNumber) return '';
    // Extraer números del inicio de la string (ej: "206A" -> "206")
    const match = bedNumber.match(/^(\d+)/);
    return match ? match[1] : '';
}

// Formatear fecha
const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (isNaN(date)) return value;
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Función para sanitizar el número de admisión (quitar ceros a la izquierda)
const sanitizeAdmissionNumber = (number) => {
    if (!number) return '---';
    // Convertir a string y quitar ceros a la izquierda
    const sanitized = String(number).replace(/^0+/, '');
    // Si después de quitar los ceros queda vacío, retornar '0'
    return sanitized || '0';
};

// Función para copiar al portapapeles
const copyToClipboard = (text) => {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.add({ severity: 'success', summary: 'Copiado', detail: 'Número de admisión copiado al portapapeles', life: 3000 });
        })
        .catch((err) => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo copiar el texto', life: 3000 });
        });
};

// Función para formatear la edad del paciente
const formatAge = (age) => {
    if (!age) return 'N/A';
    return `${Math.floor(age)} años`;
};

// Función para obtener el ícono según el sexo
const getSexIcon = (sex) => {
    if (sex === 'M') return 'pi-mars';
    if (sex === 'F') return 'pi-venus';
    return 'pi-question';
};

// Función para obtener el label del sexo
const getSexLabel = (sex) => {
    if (sex === 'M') return 'Masculino';
    if (sex === 'F') return 'Femenino';
    return 'No especificado';
};

// Obtener severidad del estado de la cama
const getBedStatusSeverity = (status) => {
    return status === 'occupied' ? 'danger' : 'success';
};

// Handlers para las acciones
const handleCreateTask = async (taskData) => {
    try {
        await hospitalAttentionsStore.createTask(taskData);
        // Emitir evento para refrescar datos de hospitalización
        emit('refresh-data');
    } catch (error) {
        // Error handled by store
    }
};

const handleUpdateTask = async (taskData) => {
    try {
        await hospitalAttentionsStore.updateTask(taskData.id, taskData);
        // Emitir evento para refrescar datos de hospitalización
        emit('refresh-data');
    } catch (error) {
        // Error handled by store
    }
};

const handleDeleteTask = async (taskId) => {
    try {
        await hospitalAttentionsStore.deleteTask(taskId);
        // Emitir evento para refrescar datos de hospitalización
        emit('refresh-data');
    } catch (error) {
        // Error handled by store
    }
};

const handleCreateDetails = async (detailsData) => {
    try {
        await hospitalAttentionsStore.createDetails(detailsData);
        // Emitir evento para refrescar datos de hospitalización
        emit('refresh-data');
    } catch (error) {
        // Error handled by store
    }
};

const handleUpdateDetails = async (detailsId, detailsData) => {
    try {
        await hospitalAttentionsStore.updateDetails(detailsId, detailsData);
        // Emitir evento para refrescar datos de hospitalización
        emit('refresh-data');
    } catch (error) {
        // Error handled by store
    }
};

const handleDeleteDetails = async (detailsId) => {
    try {
        await hospitalAttentionsStore.deleteDetails(detailsId);
        // Emitir evento para refrescar datos de hospitalización
        emit('refresh-data');
    } catch (error) {
        // Error handled by store
    }
};

const handleDateSelected = (date) => {
    selectedDate.value = date;
};

const handleCreateNewDetail = (date) => {
    selectedDate.value = date;
};

// Función para verificar si una fecha es hoy
const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return (
        checkDate.getDate() === today.getDate() &&
        checkDate.getMonth() === today.getMonth() &&
        checkDate.getFullYear() === today.getFullYear()
    );
};

// Función para seleccionar automáticamente la fecha más reciente o la de hoy
const selectInitialDate = () => {
    if (!currentDetailsArray.value || currentDetailsArray.value.length === 0) {
        selectedDate.value = null;
        return;
    }

    // Ordenar detalles por fecha descendente (más reciente primero)
    const sortedDetails = [...currentDetailsArray.value].sort((a, b) => {
        const dateA = new Date(a.attention_date || a.created_at || 0);
        const dateB = new Date(b.attention_date || b.created_at || 0);
        return dateB - dateA;
    });

    // Buscar si hay un detalle de hoy
    const todayDetail = sortedDetails.find(detail =>
        isToday(detail.attention_date || detail.created_at)
    );

    // Si existe un detalle de hoy, seleccionarlo
    if (todayDetail) {
        selectedDate.value = todayDetail.attention_date || todayDetail.created_at;
    } else {
        // Si no hay detalle de hoy, seleccionar el más reciente
        const mostRecent = sortedDetails[0];
        selectedDate.value = mostRecent.attention_date || mostRecent.created_at;
    }
};

// Watcher para reiniciar la fecha seleccionada cuando se abre el drawer o cambia la cama
watch(
    () => [props.visible, props.bed?.id],
    ([visible, bedId]) => {
        if (visible && bedId) {
            selectInitialDate();
        } else {
            selectedDate.value = null;
        }
    },
    { immediate: true }
);

// Computed para determinar si la cama está reservada
const isReserved = computed(() => {
    return props.bed?.is_reserved || props.bed?.status === 'reserved';
});

const activeReservation = computed(() => {
    // Intentar diferentes nombres de campo para la reserva activa
    const reservation = props.bed?.active_reservation || props.bed?.bed_reservation || props.bed?.reservation || null;

    // Mapear campos del backend al formato esperado por el componente
    if (reservation) {
        return {
            id: reservation.reservation_id || reservation.id,
            id_beds: props.bed?.id,
            id_users: reservation.reserved_by?.id,
            notes: reservation.notes,
            status: reservation.status,
            created_at: reservation.created_at,
            user: reservation.reserved_by
        };
    }

    return null;
});

// Computed para determinar si se puede reservar
const canReserve = computed(() => {
    if (!props.bed) return false;
    // Solo se puede reservar si está libre y no tiene reserva activa
    return (props.bed.status === 'free' || props.bed.is_available) && !isReserved.value;
});

// Handlers para reservas
const handleOpenReservationDialog = () => {
    showReservationDialog.value = true;
};

const handleEditReservation = () => {
    showReservationDialog.value = true;
};

const handleReservationCreated = () => {
    showReservationDialog.value = false;
    toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Reserva creada exitosamente',
        life: 3000
    });
    emit('refresh-data');
};

const handleReservationUpdated = () => {
    showReservationDialog.value = false;
    toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Reserva actualizada exitosamente',
        life: 3000
    });
    emit('refresh-data');
};

const handleCancelReservation = async () => {
    if (!activeReservation.value) return;

    isLoadingReservation.value = true;

    try {
        await reservationsStore.cancelReservation(activeReservation.value.id);

        toast.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reserva cancelada exitosamente',
            life: 3000
        });

        emit('refresh-data');
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.response?.data?.message || 'Error al cancelar la reserva',
            life: 5000
        });
    } finally {
        isLoadingReservation.value = false;
    }
};

// Watch para resetear el tab activo cuando se cambia de cama
watch(
    () => props.bed,
    () => {
        activeTab.value = '0';
        selectedDate.value = null;
    }
);
</script>

<template>
    <Drawer v-model:visible="drawerVisible" position="right" class="!w-full md:!w-[48rem] lg:!w-[56rem] xl:!w-[64rem]">
        <template #header>
            <div v-if="bed && attention" class="flex flex-col gap-2 w-full">
                <!-- Título y estado en una línea -->
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-bed text-primary text-lg"></i>
                        <h3 class="text-lg font-bold m-0">Cama {{ bed.bed_number }}</h3>
                        <Tag :value="bed.status === 'occupied' ? 'OCUPADA' : 'LIBRE'" :severity="getBedStatusSeverity(bed.status)" class="text-xs" />
                    </div>
                    <!-- Número de admisión prominente con icono de copiar -->
                    <div v-if="bed.status === 'occupied' && attention.number" class="flex items-center gap-1 bg-primary-100 px-2 py-1 border-round">
                        <i class="pi pi-hashtag text-primary text-xs"></i>
                        <span class="text-sm font-semibold text-primary">{{ sanitizeAdmissionNumber(attention.number) }}</span>
                        <i class="pi pi-copy text-primary text-xs cursor-pointer hover:text-primary-600 transition-colors" @click="copyToClipboard(attention.number)" v-tooltip.top="'Copiar número de admisión'"></i>
                    </div>
                </div>

                <!-- Información del paciente compacta -->
                <div v-if="bed.status === 'occupied' && attention.patient" class="bg-primary-50 p-2 border-round border-l-3 border-primary-500">
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <div class="flex items-center gap-1 font-semibold">
                            <i class="pi pi-user text-primary text-xs"></i>
                            <span>{{ attention.patient.name }}</span>
                        </div>
                        <div class="flex items-center gap-1 text-600">
                            <i class="pi pi-id-card text-xs"></i>
                            <span>{{ attention.patient.document_number }}</span>
                        </div>
                        <div class="flex items-center gap-1 text-600">
                            <i :class="`pi ${getSexIcon(attention.patient.sex)} text-xs`"></i>
                            <span>{{ getSexLabel(attention.patient.sex) }}</span>
                        </div>
                        <div class="flex items-center gap-1 text-600">
                            <i class="pi pi-calendar-plus text-xs"></i>
                            <span>{{ formatAge(attention.patient.age) }}</span>
                        </div>
                        <div class="flex items-center gap-1 text-600">
                            <i class="pi pi-calendar text-xs"></i>
                            <span>{{ formatDate(attention.entry_date) }}</span>
                        </div>
                        <div v-if="attention.tasks && attention.tasks.length > 0" class="flex items-center gap-1">
                            <i class="pi pi-list-check text-orange-500 text-xs"></i>
                            <span class="text-600">{{ attention.tasks.length }}</span>
                            <Tag v-if="attention.tasks.some((t) => t.status === 'pendiente')" value="Pend." severity="warning" class="text-xs py-0" />
                        </div>
                    </div>

                    <!-- Códigos CIE-10 -->
                    <div v-if="attention.cie10 && attention.cie10.length > 0" class="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-primary-200">
                        <div class="flex items-center gap-1 text-xs font-semibold text-primary-700">
                            <i class="pi pi-file-medical"></i>
                            <span>CIE-10:</span>
                        </div>
                        <Tag v-for="(code, index) in attention.cie10" :key="index" :value="code" severity="contrast" class="text-xs font-semibold cie10-drawer-tag" v-tooltip.top="`Código CIE-10: ${code}`" />
                    </div>
                </div>

                <!-- Estado cuando la cama está reservada -->
                <div v-else-if="isReserved && activeReservation" class="bg-yellow-50 p-2 border-round border-l-3 border-yellow-500">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-calendar-plus text-yellow-600 text-sm"></i>
                            <span class="text-yellow-800 text-sm font-semibold">Cama Reservada</span>
                        </div>
                        <Tag value="RESERVADA" severity="warn" class="text-xs" />
                    </div>
                    <div class="text-xs text-600 flex flex-col gap-1">
                        <div v-if="activeReservation.user" class="flex items-center gap-1">
                            <i class="pi pi-user"></i>
                            <span>Por: {{ activeReservation.user.name }}</span>
                        </div>
                        <div v-if="activeReservation.notes" class="flex items-center gap-1">
                            <i class="pi pi-comment"></i>
                            <span>{{ activeReservation.notes }}</span>
                        </div>
                        <div v-if="activeReservation.created_at" class="flex items-center gap-1">
                            <i class="pi pi-clock"></i>
                            <span>{{ formatDate(activeReservation.created_at) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Estado cuando la cama está libre -->
                <div v-else class="bg-green-50 p-2 border-round border-l-3 border-green-500 flex items-center gap-2">
                    <i class="pi pi-check-circle text-green-600 text-sm"></i>
                    <span class="text-green-800 text-sm">Cama disponible</span>
                </div>
            </div>
        </template>

        <!-- Contenido principal -->
        <div v-if="bed" class="h-full">
            <!-- Solo mostrar contenido si la cama está ocupada -->
            <div v-if="bed.status === 'occupied' && attention">
                <Tabs v-model:value="activeTab" class="bed-drawer-tabs h-full">
                    <TabList class="mb-4">
                        <Tab value="0">
                            <i class="pi pi-file-edit mr-2"></i>
                            Detalles Médicos
                        </Tab>
                        <Tab value="1">
                            <i class="pi pi-list-check mr-2"></i>
                            Tareas
                            <Badge v-if="attention.tasks?.length" :value="attention.tasks.length" severity="info" class="ml-2" />
                        </Tab>
                    </TabList>

                    <TabPanels class="flex-1">
                        <TabPanel value="0" class="h-full p-0">
                            <div class="details-drawer-content">
                                <!-- Timeline de fechas -->
                                <div class="details-sidebar-left">
                                    <DetailsTimeline :details="currentDetailsArray" :selected-date="selectedDate" :attention-active="attention.is_active" @date-selected="handleDateSelected" @create-new="handleCreateNewDetail" />
                                </div>

                                <!-- Detalles del día seleccionado -->
                                <div class="details-sidebar-right">
                                    <AttentionDetails
                                        :details="currentDetailsArray"
                                        :attention-id="attention.hospital_attention_id"
                                        :selected-date="selectedDate"
                                        :read-only="!canEdit"
                                        @create-details="handleCreateDetails"
                                        @update-details="handleUpdateDetails"
                                        @delete-details="handleDeleteDetails"
                                    />
                                </div>
                            </div>
                        </TabPanel>

                        <TabPanel value="1" class="h-full">
                            <AttentionTasks :tasks="attention.tasks || []" :attention-id="attention.hospital_attention_id" :read-only="!canEdit" @create-task="handleCreateTask" @update-task="handleUpdateTask" @delete-task="handleDeleteTask" />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>

            <!-- Estado cuando la cama está reservada -->
            <div v-else-if="isReserved && activeReservation" class="flex flex-col items-center justify-center h-full text-center py-8">
                <i class="pi pi-calendar-plus text-6xl text-yellow-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">Cama Reservada</h3>
                <p class="text-gray-600 mb-4">Esta cama tiene una reserva activa.</p>

                <!-- Información de la reserva -->
                <div class="bg-yellow-50 border-1 border-yellow-200 border-round-md p-4 mb-4 max-w-md w-full text-left">
                    <div class="flex flex-col gap-2 text-sm">
                        <div v-if="activeReservation.user" class="flex items-start gap-2">
                            <i class="pi pi-user text-yellow-600 mt-1"></i>
                            <div>
                                <div class="font-semibold text-gray-700">Reservado por:</div>
                                <div class="text-gray-600">{{ activeReservation.user.name }}</div>
                            </div>
                        </div>
                        <div v-if="activeReservation.notes" class="flex items-start gap-2">
                            <i class="pi pi-comment text-yellow-600 mt-1"></i>
                            <div>
                                <div class="font-semibold text-gray-700">Notas:</div>
                                <div class="text-gray-600">{{ activeReservation.notes }}</div>
                            </div>
                        </div>
                        <div v-if="activeReservation.created_at" class="flex items-start gap-2">
                            <i class="pi pi-clock text-yellow-600 mt-1"></i>
                            <div>
                                <div class="font-semibold text-gray-700">Creada:</div>
                                <div class="text-gray-600">{{ formatDate(activeReservation.created_at) }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2">
                    <Button label="Editar Reserva" icon="pi pi-pencil" @click="handleEditReservation" severity="primary" />
                    <Button label="Cancelar Reserva" icon="pi pi-times-circle" @click="handleCancelReservation" :loading="isLoadingReservation" severity="danger" outlined />
                    <Button label="Cerrar" icon="pi pi-times" @click="drawerVisible = false" severity="secondary" outlined />
                </div>
            </div>

            <!-- Estado cuando la cama está libre -->
            <div v-else class="flex flex-col items-center justify-center h-full text-center py-8">
                <i class="pi pi-bed text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Cama Disponible</h3>
                <p class="text-gray-500 mb-4">Esta cama está disponible para recibir un nuevo paciente o puede ser reservada.</p>
                <div class="flex gap-2">
                    <Button v-if="canReserve" label="Reservar Cama" icon="pi pi-calendar-plus" @click="handleOpenReservationDialog" severity="warning" />
                    <Button label="Cerrar" icon="pi pi-times" outlined @click="drawerVisible = false" severity="secondary" />
                </div>
            </div>
        </div>

        <!-- Dialogo de Reserva -->
        <BedReservationDialog v-model:visible="showReservationDialog" :bed="bed" :reservation="activeReservation" @reservation-created="handleReservationCreated" @save="handleReservationUpdated" />
    </Drawer>
</template>

<style scoped>
.bed-drawer-tabs :deep(.p-tablist) {
    background: var(--surface-50);
    border-radius: 8px;
    padding: 4px;
    border: 1px solid var(--surface-200);
}

.bed-drawer-tabs :deep(.p-tab) {
    border-radius: 6px;
    margin: 0 2px;
    transition: all 0.2s ease;
}

.bed-drawer-tabs :deep(.p-tab:hover) {
    background: var(--surface-100);
}

.bed-drawer-tabs :deep(.p-tab[aria-selected='true']) {
    background: var(--surface-0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--surface-200);
}

.bed-drawer-tabs :deep(.p-tabpanel) {
    padding: 0;
    height: calc(100vh - 280px);
    overflow-y: auto;
}

/* Details drawer layout - similar to HospitalAttentions */
.details-drawer-content {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1rem;
    height: calc(100vh - 280px);
}

.details-sidebar-left {
    border-right: 1px solid var(--surface-border);
    padding-right: 1rem;
    overflow-y: auto;
    max-height: calc(100vh - 280px);
}

.details-sidebar-right {
    overflow-y: auto;
    max-height: calc(100vh - 280px);
}

/* CIE-10 Tags Styling */
.cie10-drawer-tag {
    background: linear-gradient(135deg, #0284c7, #0369a1) !important;
    color: white !important;
    border: none !important;
    padding: 0.25rem 0.5rem !important;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(2, 132, 199, 0.3);
    transition: all 0.2s ease;
    cursor: help;
}

.cie10-drawer-tag:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .bed-drawer-tabs :deep(.p-tablist) {
        flex-wrap: wrap;
    }

    .bed-drawer-tabs :deep(.p-tab) {
        flex: 1;
        min-width: 120px;
    }

    .bed-drawer-tabs :deep(.p-tabpanel) {
        height: calc(100vh - 320px);
    }
}

@media (max-width: 1024px) {
    .details-drawer-content {
        grid-template-columns: 1fr;
        height: calc(100vh - 320px);
    }

    .details-sidebar-left {
        border-right: none;
        border-bottom: 1px solid var(--surface-border);
        padding-right: 0;
        padding-bottom: 1rem;
        max-height: 300px;
    }

    .details-sidebar-right {
        max-height: calc(100vh - 620px);
    }
}
</style>
