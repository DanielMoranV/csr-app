<script setup>
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useSurgeryCallAlerts } from '@/composables/useSurgeryCallAlerts';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import cache from '@/utils/cache';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const store = useHospitalizationStore();
const { state } = storeToRefs(store);

// Keys para el cache
const CACHE_KEY_FULLSCREEN = 'hospitalization_display_fullscreen';
const CACHE_KEY_VIEW_MODE = 'hospitalization_display_view_mode';

// Real-time events
const { startListening, stopListening, isListening } = useRealtimeEvents({
    updateAttentions: false,
    updateDashboard: false,
    updateHospitalization: true
});

// Alertas de llamado a quirófano
const {
    isListening: isSurgeryAlertsListening,
    isAudioEnabled,
    isSpeaking,
    latestCall,
    surgeryCalls,
    toggleAudio
} = useSurgeryCallAlerts({
    autoStart: true,
    enableNotifications: true
});

// Auto-ocultar alerta después de 15 segundos
let alertTimeout = null;
const dismissAlert = () => {
    if (alertTimeout) {
        clearTimeout(alertTimeout);
        alertTimeout = null;
    }
    latestCall.value = null;
};

// Observar cambios en latestCall para auto-ocultar
watch(
    () => latestCall.value,
    (newCall) => {
        if (newCall) {
            // Limpiar timeout anterior si existe
            if (alertTimeout) {
                clearTimeout(alertTimeout);
            }
            // Auto-ocultar después de 15 segundos
            alertTimeout = setTimeout(() => {
                dismissAlert();
            }, 15000);
        }
    },
    { deep: true }
);

// Estado de pantalla completa - Cargar desde cache
const isFullscreen = ref(cache.getItem(CACHE_KEY_FULLSCREEN) ?? false);

// Estado de vista (cards o vertical) - Cargar desde cache
const viewMode = ref(cache.getItem(CACHE_KEY_VIEW_MODE) ?? 'vertical'); // 'cards' o 'vertical' (optimizado para pantallas verticales)

// Habitaciones con atenciones abiertas (filtrado)
const activeRooms = computed(() => {
    if (!state.value.status) {
        return [];
    }

    const filtered = state.value.status
        .map((room) => {
            // Filtrar solo camas ocupadas con atención activa
            const activeBeds = room.beds.filter((bed) => {
                if (bed.status !== 'occupied' || !bed.attention) {
                    return false;
                }

                // Una atención está activa si:
                // 1. No tiene fecha de salida (exit_date, discharge_date)
                // 2. O si tiene is_active en true
                const hasExitDate = bed.attention.exit_date || bed.attention.discharge_date;
                const isActiveByFlag = bed.attention.is_active !== false; // Si no existe el campo, asumimos true si está ocupada

                const isActive = !hasExitDate && isActiveByFlag;

                return isActive;
            });

            return {
                ...room,
                beds: activeBeds
            };
        })
        .filter((room) => room.beds.length > 0); // Solo habitaciones con camas ocupadas

    return filtered;
});

// Estadísticas
const stats = computed(() => {
    const totalRooms = activeRooms.value.length;
    const totalPatients = activeRooms.value.reduce((sum, room) => sum + room.beds.length, 0);

    return {
        totalRooms,
        totalPatients
    };
});

// Formatear edad (redondear decimales a años completos)
// const formatAge = (age) => {
//     if (!age) return 'N/A';
//     return `${Math.floor(age)} años`;
// };

// Calcular días de hospitalización
const calculateHospitalizationDays = (entryDate) => {
    if (!entryDate) return 0;
    const entry = new Date(entryDate);
    const today = new Date();
    const diffTime = Math.abs(today - entry);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Formatear fecha de ingreso
const formatEntryDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// Formatear hora
const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Formatear hora de ingreso
const formatEntryTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Obtener indicador de seguro (P = Particular, S = Seguro)
const getInsuranceIndicator = (codeInsurance) => {
    // Si es código 90 o 28, es Particular (P)
    if (codeInsurance === '90' || codeInsurance === '28') {
        return { label: 'P', color: '#3b82f6' }; // Azul para Particular
    }
    // Caso contrario es Seguro (S)
    return { label: 'S', color: '#ef4444' }; // Rojo para Seguro
};

// Alternar entre vistas (ciclo: vertical -> cards)
const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'vertical' ? 'cards' : 'vertical';
    cache.setItem(CACHE_KEY_VIEW_MODE, viewMode.value);
};

// Paleta de colores para habitaciones
const roomColors = [
    'rgba(59, 130, 246, 0.12)', // blue-500
    'rgba(16, 185, 129, 0.12)', // green-500
    'rgba(245, 158, 11, 0.12)', // amber-500
    'rgba(239, 68, 68, 0.12)', // red-500
    'rgba(139, 92, 246, 0.12)', // violet-500
    'rgba(236, 72, 153, 0.12)', // pink-500
    'rgba(14, 165, 233, 0.12)', // sky-500
    'rgba(34, 197, 94, 0.12)', // green-400
    'rgba(168, 85, 247, 0.12)', // purple-500
    'rgba(251, 146, 60, 0.12)' // orange-400
];

// Colores por tipo de habitación
const roomTypeColors = {
    personal: {
        bg: 'rgba(59, 130, 246, 0.85)', // blue-500
        text: '#ffffff'
    },
    doble: {
        bg: 'rgba(16, 185, 129, 0.85)', // green-500
        text: '#ffffff'
    },
    triple: {
        bg: 'rgba(245, 158, 11, 0.85)', // amber-500
        text: '#ffffff'
    },
    cuádruple: {
        bg: 'rgba(239, 68, 68, 0.85)', // red-500
        text: '#ffffff'
    },
    múltiple: {
        bg: 'rgba(139, 92, 246, 0.85)', // violet-500
        text: '#ffffff'
    }
};

// Derivar el tipo de habitación desde el número de camas
const getRoomTypeFromBeds = (beds) => {
    const count = beds ? beds.length : 0;
    switch (count) {
        case 1:
            return 'personal';
        case 2:
            return 'doble';
        case 3:
            return 'triple';
        case 4:
            return 'cuádruple';
        default:
            return count > 4 ? 'múltiple' : 'sin camas';
    }
};

// Formatear tipo de habitación a una abreviatura
const formatRoomType = (roomType) => {
    const types = {
        personal: 'P',
        doble: 'D',
        triple: 'T',
        cuádruple: 'C',
        múltiple: 'M'
    };
    return types[roomType?.toLowerCase()] || '';
};

// Obtener color del tipo de habitación
const getRoomTypeColor = (roomType) => {
    const normalized = roomType?.toLowerCase();
    return roomTypeColors[normalized] || { bg: 'rgba(0, 0, 0, 0.25)', text: 'var(--text-color)' };
};

// Datos aplanados para la tabla y vista vertical
const tableData = computed(() => {
    const rows = [];
    const roomColorMap = {};
    let colorIndex = 0;

    activeRooms.value.forEach((room) => {
        if (!roomColorMap[room.room_number]) {
            roomColorMap[room.room_number] = roomColors[colorIndex % roomColors.length];
            colorIndex++;
        }

        // Obtener el tipo de habitación basado en el número total de camas de la habitación original
        const originalRoom = state.value.status.find((r) => r.id === room.id);
        const roomType = getRoomTypeFromBeds(originalRoom.beds);

        room.beds.forEach((bed) => {
            if (bed.attention) {
                const insuranceInfo = getInsuranceIndicator(bed.attention.code_insurance);
                rows.push({
                    room_number: room.room_number,
                    room_type: roomType, // Usar el tipo de habitación calculado
                    room_type_formatted: formatRoomType(roomType),
                    bed_number: bed.bed_number,
                    bed_label: `${room.room_number}-${bed.bed_number}`,
                    patient_name: bed.attention.patient.name,
                    age: bed.attention.patient.age,
                    sex: bed.attention.patient.sex || 'N/A',
                    admission_number: bed.attention.number,
                    doctor: bed.attention.doctor,
                    entry_date: bed.attention.entry_date,
                    entry_date_formatted: formatEntryDate(bed.attention.entry_date),
                    entry_time_formatted: formatEntryTime(bed.attention.entry_date),
                    days: calculateHospitalizationDays(bed.attention.entry_date),
                    room_color: roomColorMap[room.room_number],
                    insurance_label: insuranceInfo.label,
                    insurance_color: insuranceInfo.color,
                    insurance_name: bed.attention.insurance,
                    code_insurance: bed.attention.code_insurance
                });
            }
        });
    });
    return rows;
});

// Número de filas que caben en una columna (ajustable según la altura de pantalla)
const rowsPerColumn = ref(12); // Valor por defecto: 12 filas por columna

// Dividir datos en dos columnas para vista vertical en pantallas grandes
// Llena completamente la columna 1 antes de pasar a la columna 2
const tableDataColumns = computed(() => {
    const data = tableData.value;
    const maxRowsCol1 = rowsPerColumn.value;

    return {
        column1: data.slice(0, maxRowsCol1),
        column2: data.slice(maxRowsCol1)
    };
});

// Determinar si se debe mostrar en una sola columna
const showSingleColumn = computed(() => {
    return tableData.value.length <= rowsPerColumn.value;
});

// Toggle pantalla completa solo del componente
const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value;
    cache.setItem(CACHE_KEY_FULLSCREEN, isFullscreen.value);

    if (isFullscreen.value) {
        // Ocultar sidebar, topbar y footer
        const sidebar = document.querySelector('.layout-sidebar');
        const topbar = document.querySelector('.layout-topbar');
        const mainContainer = document.querySelector('.layout-main-container');

        if (sidebar) sidebar.style.display = 'none';
        if (topbar) topbar.style.display = 'none';
        if (mainContainer) {
            mainContainer.style.padding = '0';
            mainContainer.style.marginLeft = '0';
        }
    } else {
        // Mostrar sidebar, topbar y restaurar padding
        const sidebar = document.querySelector('.layout-sidebar');
        const topbar = document.querySelector('.layout-topbar');
        const mainContainer = document.querySelector('.layout-main-container');

        if (sidebar) sidebar.style.display = '';
        if (topbar) topbar.style.display = '';
        if (mainContainer) {
            mainContainer.style.padding = '';
            mainContainer.style.marginLeft = '';
        }
    }
};

// Actualizar datos
const refreshData = async () => {
    await store.fetchHospitalizationStatus();
};

const refreshInterval = ref(null);

onMounted(async () => {
    await store.fetchHospitalizationStatus();
    startListening();

    // Aplicar estado de pantalla completa desde cache
    if (isFullscreen.value) {
        const sidebar = document.querySelector('.layout-sidebar');
        const topbar = document.querySelector('.layout-topbar');
        const mainContainer = document.querySelector('.layout-main-container');

        if (sidebar) sidebar.style.display = 'none';
        if (topbar) topbar.style.display = 'none';
        if (mainContainer) {
            mainContainer.style.padding = '0';
            mainContainer.style.marginLeft = '0';
        }
    }

    // Auto-refresh every 30 minutes
    refreshInterval.value = setInterval(
        async () => {
            await refreshData();
        },
        30 * 60 * 1000
    );
});

onUnmounted(() => {
    stopListening();

    // Clear auto-refresh interval
    if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
    }

    // Clear alert timeout
    if (alertTimeout) {
        clearTimeout(alertTimeout);
    }

    // Asegurarse de restaurar el layout si se desmonta el componente
    if (isFullscreen.value) {
        const sidebar = document.querySelector('.layout-sidebar');
        const topbar = document.querySelector('.layout-topbar');
        const mainContainer = document.querySelector('.layout-main-container');

        if (sidebar) sidebar.style.display = '';
        if (topbar) topbar.style.display = '';
        if (mainContainer) {
            mainContainer.style.padding = '';
            mainContainer.style.marginLeft = '';
        }
    }
});
</script>

<template>
    <div class="hospitalization-display" :class="{ 'is-fullscreen': isFullscreen }">
        <!-- Header -->
        <div class="display-header">
            <div class="header-content">
                <div class="header-icon">
                    <i class="pi pi-building"></i>
                </div>
                <h1 class="header-title">Hospitalización</h1>

                <!-- Estadísticas -->
                <div class="stat-item">
                    <i class="pi pi-home"></i>
                    <span class="stat-value">{{ stats.totalRooms }}</span>
                    <span class="stat-label">Hab</span>
                </div>
                <div class="stat-item">
                    <i class="pi pi-users"></i>
                    <span class="stat-value">{{ stats.totalPatients }}</span>
                    <span class="stat-label">Pac</span>
                </div>

                <div class="realtime-badge" :class="{ active: isListening }">
                    <i class="pi pi-circle-fill"></i>
                    <span>Tiempo Real</span>
                </div>

                <!-- Botones de acción -->
                <div class="header-actions">
                    <Button
                        :icon="isAudioEnabled ? 'pi pi-volume-up' : 'pi pi-volume-off'"
                        @click="toggleAudio"
                        :severity="isAudioEnabled ? 'success' : 'secondary'"
                        text
                        rounded
                        v-tooltip.bottom="isAudioEnabled ? 'Desactivar alertas de audio' : 'Activar alertas de audio'"
                        :class="{ 'audio-speaking': isSpeaking }"
                    />
                    <Button :icon="viewMode === 'vertical' ? 'pi pi-th-large' : 'pi pi-list'" @click="toggleViewMode" severity="secondary" text rounded v-tooltip.bottom="viewMode === 'vertical' ? 'Vista Cards' : 'Vista Vertical'" />
                    <Button icon="pi pi-refresh" :loading="state.isLoading" @click="refreshData" severity="secondary" text rounded v-tooltip.bottom="'Actualizar'" />
                    <Button :icon="isFullscreen ? 'pi pi-times' : 'pi pi-window-maximize'" @click="toggleFullscreen" severity="secondary" text rounded v-tooltip.bottom="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'" />
                </div>
            </div>
        </div>

        <!-- Alerta de Llamado a Quirófano -->
        <transition name="surgery-alert">
            <div v-if="latestCall" class="surgery-call-alert">
                <div class="alert-content">
                    <div class="alert-icon">
                        <i class="pi pi-exclamation-triangle"></i>
                    </div>
                    <div class="alert-info">
                        <h2 class="alert-title">🚨 LLAMADO A QUIRÓFANO</h2>
                        <div class="alert-details">
                            <p class="patient-name">{{ latestCall.patient?.name || 'N/A' }}</p>
                            <div class="alert-meta">
                                <span class="meta-item">
                                    <i class="pi pi-hashtag"></i>
                                    Admisión: {{ latestCall.admission_number || 'N/A' }}
                                </span>
                                <span class="meta-item">
                                    <i class="pi pi-th-large"></i>
                                    Cama: {{ latestCall.hospital_attention?.bed?.name || 'N/A' }}
                                </span>
                                <span class="meta-item">
                                    <i class="pi pi-clock"></i>
                                    {{ formatTime(latestCall.receivedAt) }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button icon="pi pi-times" @click="dismissAlert" severity="secondary" text rounded class="alert-close" />
                </div>
            </div>
        </transition>

        <!-- Loading State -->
        <div v-if="state.isLoading && !state.status" class="display-loading">
            <i class="pi pi-spin pi-spinner"></i>
            <p>Cargando información...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="state.error" class="display-error">
            <i class="pi pi-exclamation-triangle"></i>
            <h3>Error al cargar datos</h3>
            <p>{{ state.error }}</p>
            <Button label="Reintentar" icon="pi pi-refresh" @click="refreshData" severity="secondary" />
        </div>

        <!-- Empty State -->
        <div v-else-if="activeRooms.length === 0" class="display-empty">
            <i class="pi pi-inbox"></i>
            <h3>No hay pacientes hospitalizados</h3>
            <p>Actualmente no hay atenciones activas en las habitaciones.</p>
        </div>

        <!-- Vista Vertical - Optimizada para pantallas verticales -->
        <div v-else-if="viewMode === 'vertical'" class="vertical-view">
            <!-- Pantallas horizontales grandes: 2 columnas -->
            <div class="vertical-columns-wrapper" :class="{ 'single-column-mode': showSingleColumn }">
                <!-- Columna 1 -->
                <div class="vertical-table vertical-column">
                    <div class="vertical-header">
                        <div class="vh-bed">Cama</div>
                        <div class="vh-patient">Paciente</div>
                        <div class="vh-date">F. Ingreso</div>
                        <div class="vh-days">Días</div>
                    </div>
                    <div class="vertical-body">
                        <!-- En modo portrait, mostrar TODOS los datos en columna 1 -->
                        <div v-for="(bed, index) in tableDataColumns.column1" :key="`col1-${index}`" class="vertical-row vertical-row-col1" :style="{ backgroundColor: bed.room_color }">
                            <div class="vr-bed">
                                <span class="bed-number">{{ bed.bed_number }}</span>
                                <span
                                    class="room-type-badge"
                                    v-if="bed.room_type_formatted"
                                    v-tooltip.top="bed.room_type"
                                    :style="{
                                        backgroundColor: getRoomTypeColor(bed.room_type).bg,
                                        color: getRoomTypeColor(bed.room_type).text
                                    }"
                                >
                                    {{ bed.room_type_formatted }}
                                </span>
                            </div>
                            <div class="vr-patient">
                                <div class="vr-patient-name">
                                    {{ bed.patient_name }}
                                    <span 
                                        class="insurance-badge-inline" 
                                        :style="{ backgroundColor: bed.insurance_color }"
                                        v-tooltip.top="`${bed.insurance_name} (${bed.code_insurance})`"
                                    >
                                        {{ bed.insurance_label }}
                                    </span>
                                </div>
                                <div class="vr-patient-doctor" v-if="bed.doctor">
                                    <i class="pi pi-user-md"></i>
                                    {{ bed.doctor }}
                                </div>
                            </div>
                            <div class="vr-date">
                                <div>{{ bed.entry_date_formatted }}</div>
                                <div class="vr-time">{{ bed.entry_time_formatted }}</div>
                            </div>
                            <div class="vr-days">{{ bed.days }}</div>
                        </div>
                        <!-- En modo portrait, también mostrar los datos de columna 2 en columna 1 -->
                        <div v-for="(bed, index) in tableDataColumns.column2" :key="`col1-extra-${index}`" class="vertical-row vertical-row-col2-in-col1" :style="{ backgroundColor: bed.room_color }">
                            <div class="vr-bed">
                                <span class="bed-number">{{ bed.bed_number }}</span>
                                <span
                                    class="room-type-badge"
                                    v-if="bed.room_type_formatted"
                                    v-tooltip.top="bed.room_type"
                                    :style="{
                                        backgroundColor: getRoomTypeColor(bed.room_type).bg,
                                        color: getRoomTypeColor(bed.room_type).text
                                    }"
                                >
                                    {{ bed.room_type_formatted }}
                                </span>
                            </div>
                            <div class="vr-patient">
                                <div class="vr-patient-name">
                                    {{ bed.patient_name }}
                                    <span 
                                        class="insurance-badge-inline" 
                                        :style="{ backgroundColor: bed.insurance_color }"
                                        v-tooltip.top="`${bed.insurance_name} (${bed.code_insurance})`"
                                    >
                                        {{ bed.insurance_label }}
                                    </span>
                                </div>
                                <div class="vr-patient-doctor" v-if="bed.doctor">
                                    <i class="pi pi-user-md"></i>
                                    {{ bed.doctor }}
                                </div>
                            </div>
                            <div class="vr-date">
                                <div>{{ bed.entry_date_formatted }}</div>
                                <div class="vr-time">{{ bed.entry_time_formatted }}</div>
                            </div>
                            <div class="vr-days">{{ bed.days }}</div>
                        </div>
                    </div>
                </div>

                <!-- Columna 2 -->
                <div class="vertical-table vertical-column">
                    <div class="vertical-header">
                        <div class="vh-bed">Cama</div>
                        <div class="vh-patient">Paciente</div>
                        <div class="vh-date">F. Ingreso</div>
                        <div class="vh-days">Días</div>
                    </div>
                    <div class="vertical-body">
                        <div v-for="(bed, index) in tableDataColumns.column2" :key="`col2-${index}`" class="vertical-row" :style="{ backgroundColor: bed.room_color }">
                            <div class="vr-bed">
                                <span class="bed-number">{{ bed.bed_number }}</span>
                                <span
                                    class="room-type-badge"
                                    v-if="bed.room_type_formatted"
                                    v-tooltip.top="bed.room_type"
                                    :style="{
                                        backgroundColor: getRoomTypeColor(bed.room_type).bg,
                                        color: getRoomTypeColor(bed.room_type).text
                                    }"
                                >
                                    {{ bed.room_type_formatted }}
                                </span>
                            </div>
                            <div class="vr-patient">
                                <div class="vr-patient-name">
                                    {{ bed.patient_name }}
                                    <span 
                                        class="insurance-badge-inline" 
                                        :style="{ backgroundColor: bed.insurance_color }"
                                        v-tooltip.top="`${bed.insurance_name} (${bed.code_insurance})`"
                                    >
                                        {{ bed.insurance_label }}
                                    </span>
                                </div>
                                <div class="vr-patient-doctor" v-if="bed.doctor">
                                    <i class="pi pi-user-md"></i>
                                    {{ bed.doctor }}
                                </div>
                            </div>
                            <div class="vr-date">
                                <div>{{ bed.entry_date_formatted }}</div>
                                <div class="vr-time">{{ bed.entry_time_formatted }}</div>
                            </div>
                            <div class="vr-days">{{ bed.days }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vista Cards - Grid horizontal compacto -->
        <div v-else-if="viewMode === 'cards'" class="cards-horizontal-grid">
            <div v-for="(bed, index) in tableData" :key="index" class="bed-card-horizontal" :style="{ backgroundColor: bed.room_color }">
                <div class="bed-card-header">
                    <span class="bed-card-number">{{ bed.bed_number }}</span>
                    <span
                        class="bed-card-type"
                        v-if="bed.room_type_formatted"
                        v-tooltip.top="bed.room_type"
                        :style="{
                            backgroundColor: getRoomTypeColor(bed.room_type).bg,
                            color: getRoomTypeColor(bed.room_type).text
                        }"
                    >
                        {{ bed.room_type_formatted }}
                    </span>
                </div>
                <div class="bed-card-patient">
                    {{ bed.patient_name }}
                    <span 
                        class="insurance-badge-inline-card" 
                        :style="{ backgroundColor: bed.insurance_color }"
                        v-tooltip.top="`${bed.insurance_name} (${bed.code_insurance})`"
                    >
                        {{ bed.insurance_label }}
                    </span>
                </div>
                <div class="bed-card-doctor" v-if="bed.doctor">
                    <i class="pi pi-user-md"></i>
                    <span>{{ bed.doctor }}</span>
                </div>
                <div class="bed-card-footer">
                    <div class="bed-card-date-time">
                        <span class="bed-card-date">{{ bed.entry_date_formatted }}</span>
                        <span class="bed-card-time">{{ bed.entry_time_formatted }}</span>
                    </div>
                    <span class="bed-card-days">{{ bed.days }}d</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hospitalization-display {
    min-height: 100vh;
    max-height: 100vh;
    background: var(--surface-ground);
    padding: 0.5rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.hospitalization-display.is-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    padding: 0.5rem;
    background: var(--surface-ground);
}

/* Header */
.display-header {
    background: var(--surface-card);
    border-radius: 6px;
    padding: 0.375rem 0.625rem;
    margin-bottom: 0.375rem;
    box-shadow: var(--card-shadow);
    flex-shrink: 0;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.header-icon {
    width: 28px;
    height: 28px;
    background: var(--primary-color);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color-text);
    font-size: 0.875rem;
    flex-shrink: 0;
}

.header-title {
    font-size: 0.938rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
    line-height: 1;
    white-space: nowrap;
    flex-shrink: 0;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.375rem;
    background: var(--surface-100);
    border-radius: 4px;
    flex-shrink: 0;
}

.stat-item i {
    font-size: 0.75rem;
    color: var(--primary-color);
}

.stat-value {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1;
}

.stat-label {
    font-size: 0.625rem;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.25px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: auto;
}

.realtime-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.375rem;
    background: var(--surface-100);
    border-radius: 4px;
    font-size: 0.688rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    border: 1px solid transparent;
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.realtime-badge.active {
    background: rgba(34, 197, 94, 0.1);
    border-color: #22c55e;
    color: #16a34a;
}

.realtime-badge.active i {
    color: #22c55e;
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

/* Botón de audio hablando */
.audio-speaking {
    animation: audio-pulse 0.8s ease-in-out infinite;
}

@keyframes audio-pulse {
    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.1);
        opacity: 0.8;
    }
}

/* Alerta de Llamado a Quirófano */
.surgery-call-alert {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    width: 90%;
    max-width: 700px;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border-radius: 12px;
    box-shadow:
        0 20px 60px rgba(239, 68, 68, 0.5),
        0 0 0 4px rgba(255, 255, 255, 0.2);
    animation:
        surgery-alert-shake 0.5s ease-in-out,
        surgery-alert-glow 1.5s ease-in-out infinite;
    border: 3px solid #ffffff;
}

.alert-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    position: relative;
}

.alert-icon {
    width: 64px;
    height: 64px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    animation: alert-icon-pulse 1s ease-in-out infinite;
}

.alert-icon i {
    font-size: 2rem;
    color: #ffffff;
}

@keyframes alert-icon-pulse {
    0%,
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
    }
    50% {
        transform: scale(1.1);
        box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
    }
}

.alert-info {
    flex: 1;
    min-width: 0;
}

.alert-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.alert-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.patient-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.alert-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.15);
    padding: 0.375rem 0.625rem;
    border-radius: 6px;
}

.meta-item i {
    font-size: 0.875rem;
}

.alert-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: #ffffff !important;
}

.alert-close:hover {
    background: rgba(255, 255, 255, 0.2) !important;
}

/* Animaciones de entrada/salida */
.surgery-alert-enter-active {
    animation: surgery-alert-enter 0.5s ease-out;
}

.surgery-alert-leave-active {
    animation: surgery-alert-leave 0.3s ease-in;
}

@keyframes surgery-alert-enter {
    0% {
        opacity: 0;
        transform: translateX(-50%) translateY(-100px) scale(0.8);
    }
    100% {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
}

@keyframes surgery-alert-leave {
    0% {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translateX(-50%) translateY(-100px) scale(0.8);
    }
}

@keyframes surgery-alert-shake {
    0%,
    100% {
        transform: translateX(-50%) translateY(0);
    }
    25% {
        transform: translateX(calc(-50% - 10px)) translateY(0);
    }
    75% {
        transform: translateX(calc(-50% + 10px)) translateY(0);
    }
}

@keyframes surgery-alert-glow {
    0%,
    100% {
        box-shadow:
            0 20px 60px rgba(239, 68, 68, 0.5),
            0 0 0 4px rgba(255, 255, 255, 0.2);
    }
    50% {
        box-shadow:
            0 20px 60px rgba(239, 68, 68, 0.8),
            0 0 0 6px rgba(255, 255, 255, 0.4),
            0 0 40px rgba(239, 68, 68, 0.6);
    }
}

/* States */
.display-loading,
.display-error,
.display-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: var(--surface-card);
    border-radius: 16px;
    padding: 3rem;
    text-align: center;
    box-shadow: var(--card-shadow);
}

.display-loading i,
.display-error i,
.display-empty i {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.display-loading i {
    color: var(--primary-color);
}

.display-error i {
    color: var(--red-500);
}

.display-empty i {
    color: var(--text-color-secondary);
}

.display-loading p,
.display-error p,
.display-empty p {
    color: var(--text-color-secondary);
    font-size: 1rem;
    margin: 0.5rem 0;
}

.display-error h3,
.display-empty h3 {
    color: var(--text-color);
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
}

/* Cards Horizontal Grid - Optimizado para pantallas horizontales */
.cards-horizontal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.375rem;
    flex: 1;
    overflow-y: auto;
    align-content: start;
    padding: 0.5rem;
}

.bed-card-horizontal {
    background: var(--surface-card);
    border-radius: 6px;
    padding: 0.5rem;
    border-left: 4px solid rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-height: 110px;
}

.bed-card-horizontal:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    filter: brightness(0.97);
}

.bed-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem;
}

.bed-card-number {
    background: rgba(0, 0, 0, 0.08);
    color: var(--text-color);
    font-weight: 800;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.5px;
    line-height: 1;
}

.bed-card-type {
    font-size: 0.563rem;
    font-weight: 800;
    padding: 0.2rem;
    border-radius: 50%;
    letter-spacing: 0.25px;
    line-height: 1;
    min-width: 1.125rem;
    min-height: 1.125rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.bed-card-patient {
    font-weight: 700;
    font-size: 0.813rem;
    color: var(--text-color);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
}

.bed-card-doctor {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.688rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    line-height: 1.3;
    overflow: hidden;
}

.bed-card-doctor i {
    font-size: 0.688rem;
    flex-shrink: 0;
}

.bed-card-doctor span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.bed-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.375rem;
    padding-top: 0.25rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.bed-card-date-time {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.bed-card-date {
    font-size: 0.688rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.bed-card-time {
    font-size: 0.625rem;
    font-weight: 500;
    color: var(--text-color-secondary);
}

.bed-card-days {
    font-size: 0.813rem;
    font-weight: 800;
    color: var(--primary-color);
}

.bed-card-insurance {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #ffffff;
    font-weight: 800;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.bed-card-insurance:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Room Card Compacto */
.room-card-compact {
    background: var(--surface-card);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    max-height: 100%;
}

.room-header-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.625rem;
    background: var(--primary-color);
    color: var(--primary-color-text);
    flex-shrink: 0;
}

.room-header-left {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.room-number-compact {
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.25px;
}

.room-type-badge-card {
    background: rgba(255, 255, 255, 0.25);
    color: var(--primary-color-text);
    font-size: 0.563rem;
    font-weight: 700;
    padding: 0.2rem 0.25rem;
    border-radius: 50%;
    letter-spacing: 0.25px;
    line-height: 1;
    min-width: 1.125rem;
    min-height: 1.125rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.room-count {
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.2);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-weight: 600;
}

/* Beds List Compacto */
.beds-list-compact {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.5rem;
    overflow-y: auto;
}

.bed-item-compact {
    background: var(--surface-50);
    border-radius: 6px;
    padding: 0.5rem;
    border: 1px solid var(--surface-border);
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.bed-main-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.bed-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
}

.bed-avatar-compact {
    min-width: 48px;
    height: 32px;
    padding: 0 0.5rem;
    border-radius: 6px;
    background: var(--primary-color);
    color: var(--primary-color-text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
    flex-shrink: 0;
    letter-spacing: 0.5px;
}

.bed-patient-info {
    flex: 1;
    min-width: 0;
}

.patient-name-compact {
    font-size: 0.813rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
}

.patient-meta-compact {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.688rem;
    color: var(--text-color-secondary);
    margin-top: 0.125rem;
}

.separator {
    color: var(--surface-400);
}

.bed-secondary-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-top: 0.375rem;
    border-top: 1px solid var(--surface-border);
}

.info-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.info-label-compact {
    font-size: 0.625rem;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.25px;
    font-weight: 600;
}

.info-value-compact {
    font-size: 0.688rem;
    color: var(--text-color);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60%;
}

/* Vista Vertical - Optimizada para pantallas verticales */
.vertical-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--surface-card);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--card-shadow);
}

/* Wrapper para las columnas */
.vertical-columns-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    gap: 0;
    padding: 0;
}

/* Por defecto (portrait): Ocultar la segunda columna y mostrar todo en la primera */
.vertical-column:nth-child(2) {
    display: none;
}

/* En modo portrait, mostrar las filas extras de columna 2 en columna 1 */
.vertical-row-col2-in-col1 {
    display: grid;
}

/* Modo una sola columna: la columna 1 ocupa todo el ancho */
.vertical-columns-wrapper.single-column-mode .vertical-column:nth-child(2) {
    display: none !important;
}

.vertical-columns-wrapper.single-column-mode .vertical-column:nth-child(1) {
    width: 100%;
    max-width: 100%;
}

/* En pantallas horizontales grandes (landscape), mostrar 2 columnas */
@media (min-width: 1024px) and (orientation: landscape) {
    .vertical-columns-wrapper {
        flex-direction: row;
        gap: 0.5rem;
        padding: 0.5rem;
    }

    .vertical-column {
        flex: 1;
        min-width: 0;
        background: var(--surface-card);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: var(--card-shadow);
        display: flex !important; /* Mostrar ambas columnas */
    }

    .vertical-column:nth-child(2) {
        display: flex !important; /* Asegurar que la segunda columna se muestre */
    }

    /* En landscape, ocultar las filas extras de columna 2 que están en columna 1 */
    .vertical-row-col2-in-col1 {
        display: none !important;
    }

    /* EXCEPCIÓN: Si está en modo single-column, mantener una sola columna incluso en landscape */
    .vertical-columns-wrapper.single-column-mode {
        flex-direction: column !important;
        gap: 0 !important;
        padding: 0 !important;
    }

    .vertical-columns-wrapper.single-column-mode .vertical-column:nth-child(2) {
        display: none !important;
    }

    .vertical-columns-wrapper.single-column-mode .vertical-column:nth-child(1) {
        width: 100%;
        max-width: 100%;
    }
}

/* Forzar 1 columna en orientación vertical (portrait), sin importar el ancho */
@media (orientation: portrait) {
    .vertical-columns-wrapper {
        flex-direction: column !important;
        gap: 0 !important;
        padding: 0 !important;
    }

    .vertical-column:nth-child(2) {
        display: none !important;
    }

    /* En portrait, mostrar todas las filas en columna 1 */
    .vertical-row-col2-in-col1 {
        display: grid !important;
    }
}

.vertical-table {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.vertical-header {
    display: grid;
    grid-template-columns: 80px 1fr 130px 80px;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--primary-color);
    color: var(--primary-color-text);
    font-weight: 800;
    font-size: 1.125rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
}

.vertical-header > div {
    display: flex;
    align-items: center;
    justify-content: center;
}

.vh-patient {
    justify-content: flex-start;
}

.vertical-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
}

.vertical-row {
    display: grid;
    grid-template-columns: 80px 1fr 130px 80px;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    margin-bottom: 0.25rem;
    border-left: 4px solid rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    min-height: 44px;
    align-items: center;
}

.vertical-row:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    filter: brightness(0.95);
}

.vertical-row > div {
    display: flex;
    align-items: center;
    overflow: hidden;
}

.vr-bed {
    background: rgba(0, 0, 0, 0.08);
    color: var(--text-color);
    padding: 0.375rem 0.5rem;
    border-radius: 6px;
    font-weight: 800;
    font-size: 1.125rem;
    letter-spacing: 0.5px;
    justify-content: center;
    text-align: center;
    gap: 0.25rem;
    flex-direction: row;
    align-items: center;
}

.bed-number {
    line-height: 1;
}

.room-type-badge {
    background: rgba(0, 0, 0, 0.25);
    color: var(--text-color);
    font-size: 0.688rem;
    font-weight: 800;
    padding: 0.2rem 0.3rem;
    border-radius: 50%;
    letter-spacing: 0.5px;
    line-height: 1;
    min-width: 1.25rem;
    min-height: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.vr-patient {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding-left: 0.5rem;
    min-width: 0;
    flex: 1;
    justify-content: center;
    align-items: flex-start;
}

.vr-patient-name {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.vr-patient-doctor {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    width: 100%;
}

.vr-patient-doctor i {
    font-size: 0.688rem;
    flex-shrink: 0;
}

.vr-date {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-color);
    justify-content: center;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.vr-time {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color-secondary);
}

.vr-days {
    font-weight: 800;
    font-size: 1.25rem;
    color: var(--primary-color);
    justify-content: center;
    text-align: center;
}

.insurance-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    color: #ffffff;
    font-weight: 800;
    font-size: 0.875rem;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.insurance-badge:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.insurance-badge-inline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 0.25rem;
    border-radius: 50%;
    color: #ffffff;
    font-weight: 800;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.insurance-badge-inline:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.insurance-badge-inline-card {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 0.2rem;
    border-radius: 50%;
    color: #ffffff;
    font-weight: 800;
    font-size: 0.625rem;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-left: 0.25rem;
}

.insurance-badge-inline-card:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Responsive - Optimización para pantallas verticales */
/* Pantallas 4K verticales o muy altas (1080p+ altura) */
@media (min-height: 1400px) {
    .vertical-row {
        min-height: 52px;
        padding: 0.5rem 0.875rem;
        margin-bottom: 0.375rem;
    }

    .vr-bed {
        font-size: 1.25rem;
        padding: 0.625rem 0.875rem;
    }

    .vr-patient-name {
        font-size: 1.25rem;
    }

    .vr-patient-doctor {
        font-size: 0.813rem;
    }

    .vr-date {
        font-size: 1.125rem;
    }

    .vr-days {
        font-size: 1.375rem;
    }

    .vertical-header {
        font-size: 1.25rem;
        padding: 0.875rem 1.125rem;
    }
}

/* Pantallas Full HD verticales (1080px altura) */
@media (min-height: 1080px) and (max-height: 1399px) {
    .vertical-row {
        min-height: 46px;
        padding: 0.5rem 0.75rem;
        margin-bottom: 0.25rem;
    }

    .vr-bed {
        font-size: 1.125rem;
    }

    .vr-patient-name {
        font-size: 1.125rem;
    }

    .vr-patient-doctor {
        font-size: 0.75rem;
    }

    .vr-date {
        font-size: 1rem;
    }

    .vr-days {
        font-size: 1.25rem;
    }
}

/* Pantallas medianas (720p - 900p altura) */
@media (max-height: 1079px) and (min-height: 720px) {
    .vertical-row {
        min-height: 40px;
        padding: 0.375rem 0.625rem;
        margin-bottom: 0.25rem;
    }

    .vr-bed {
        font-size: 1rem;
        padding: 0.375rem 0.625rem;
    }

    .vr-patient-name {
        font-size: 1rem;
    }

    .vr-patient-doctor {
        font-size: 0.688rem;
    }

    .vr-date {
        font-size: 0.938rem;
    }

    .vr-days {
        font-size: 1.125rem;
    }

    .vertical-header {
        font-size: 1rem;
        padding: 0.625rem 0.875rem;
    }

    .display-header {
        padding: 0.375rem 0.625rem;
        margin-bottom: 0.375rem;
    }
}

/* Pantallas pequeñas (menor a 720px altura) */
@media (max-height: 719px) {
    .vertical-row {
        min-height: 36px;
        padding: 0.25rem 0.5rem;
        margin-bottom: 0.25rem;
    }

    .vr-bed {
        font-size: 0.938rem;
        padding: 0.25rem 0.5rem;
    }

    .vr-patient-name {
        font-size: 0.938rem;
    }

    .vr-patient-doctor {
        font-size: 0.625rem;
    }

    .vr-date {
        font-size: 0.875rem;
    }

    .vr-days {
        font-size: 1rem;
    }

    .vertical-header {
        font-size: 0.938rem;
        padding: 0.5rem 0.75rem;
    }

    .display-header {
        padding: 0.25rem 0.5rem;
        margin-bottom: 0.25rem;
    }

    .vertical-header {
        grid-template-columns: 70px 1fr 110px 70px;
    }

    .vertical-row {
        grid-template-columns: 70px 1fr 110px 70px;
    }
}

/* Responsive - Grid Cards Horizontal para diferentes resoluciones */
/* 4K y ultra-wide (1920px+): 10-12 columnas para 25+ camas sin scroll */
@media (min-width: 1920px) {
    .cards-horizontal-grid {
        grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
        gap: 0.375rem;
    }
}

/* Full HD wide (1600-1919px): 8-10 columnas */
@media (min-width: 1600px) and (max-width: 1919px) {
    .cards-horizontal-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.375rem;
    }
}

/* HD+ (1366-1599px): 6-8 columnas */
@media (min-width: 1366px) and (max-width: 1599px) {
    .cards-horizontal-grid {
        grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
        gap: 0.375rem;
    }
}

/* HD (1024-1365px): 5-6 columnas */
@media (max-width: 1365px) and (min-width: 1024px) {
    .cards-horizontal-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 0.375rem;
    }

    .header-content {
        flex-wrap: wrap;
    }
}

/* Tablets y móviles */
@media (max-width: 768px) {
    .hospitalization-display {
        padding: 0.375rem;
    }

    .display-header {
        padding: 0.25rem 0.5rem;
        margin-bottom: 0.25rem;
    }

    .header-content {
        gap: 0.375rem;
    }

    .header-title {
        font-size: 0.813rem;
    }

    .header-icon {
        width: 24px;
        height: 24px;
        font-size: 0.75rem;
    }

    .stat-item {
        padding: 0.25rem 0.25rem;
        gap: 0.125rem;
    }

    .stat-value {
        font-size: 0.75rem;
    }

    .stat-label {
        font-size: 0.563rem;
    }

    .realtime-badge {
        padding: 0.25rem 0.25rem;
        font-size: 0.625rem;
    }

    .cards-horizontal-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.375rem;
    }

    .bed-card-horizontal {
        min-height: 100px;
        padding: 0.375rem;
    }

    .bed-card-patient {
        font-size: 0.75rem;
    }

    .bed-card-doctor {
        font-size: 0.625rem;
    }
}
</style>
