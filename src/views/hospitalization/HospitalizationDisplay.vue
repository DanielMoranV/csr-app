<script setup>
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const store = useHospitalizationStore();
const { state } = storeToRefs(store);

// Real-time events
const { startListening, stopListening, isListening } = useRealtimeEvents({
    updateAttentions: false,
    updateDashboard: false,
    updateHospitalization: true
});

// Estado de pantalla completa
const isFullscreen = ref(false);

// Estado de vista (cards o vertical)
const viewMode = ref('vertical'); // 'cards' o 'vertical' (optimizado para pantallas verticales)

// Habitaciones con atenciones abiertas (filtrado)
const activeRooms = computed(() => {
    console.log('[HospitalizationDisplay] Estado completo:', state.value.status);

    if (!state.value.status) {
        console.log('[HospitalizationDisplay] No hay status');
        return [];
    }

    const filtered = state.value.status
        .map((room) => {
            console.log('[HospitalizationDisplay] Procesando habitación:', room.room_number, 'Camas:', room.beds);

            // Filtrar solo camas ocupadas con atención activa
            const activeBeds = room.beds.filter((bed) => {
                if (bed.status !== 'occupied' || !bed.attention) {
                    return false;
                }

                // Expandir objeto attention completo para ver su estructura
                console.log('[HospitalizationDisplay] Cama:', bed.bed_number, '- Estructura completa de attention:', JSON.parse(JSON.stringify(bed.attention)));

                // Una atención está activa si:
                // 1. No tiene fecha de salida (exit_date, discharge_date)
                // 2. O si tiene is_active en true
                const hasExitDate = bed.attention.exit_date || bed.attention.discharge_date;
                const isActiveByFlag = bed.attention.is_active !== false; // Si no existe el campo, asumimos true si está ocupada

                const isActive = !hasExitDate && isActiveByFlag;

                console.log('[HospitalizationDisplay] Cama activa?', isActive, {
                    hasExitDate,
                    exit_date: bed.attention.exit_date,
                    discharge_date: bed.attention.discharge_date,
                    is_active: bed.attention.is_active,
                    isActiveByFlag
                });

                return isActive;
            });

            console.log('[HospitalizationDisplay] Habitación', room.room_number, '- Camas activas:', activeBeds.length);

            return {
                ...room,
                beds: activeBeds
            };
        })
        .filter((room) => room.beds.length > 0); // Solo habitaciones con camas ocupadas

    console.log('[HospitalizationDisplay] Habitaciones con pacientes activos:', filtered);
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
const formatAge = (age) => {
    if (!age) return 'N/A';
    return `${Math.floor(age)} años`;
};

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

// Alternar entre vistas (ciclo: vertical -> cards)
const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'vertical' ? 'cards' : 'vertical';
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
    quíntuple: {
        bg: 'rgba(139, 92, 246, 0.85)', // violet-500
        text: '#ffffff'
    }
};

// Formatear tipo de habitación
const formatRoomType = (roomType) => {
    const types = {
        personal: 'P',
        doble: 'D',
        triple: 'T',
        cuádruple: 'C',
        quíntuple: 'Q'
    };
    return types[roomType?.toLowerCase()] || roomType?.charAt(0).toUpperCase() || '';
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
        // Asignar color único a cada habitación
        if (!roomColorMap[room.room_number]) {
            roomColorMap[room.room_number] = roomColors[colorIndex % roomColors.length];
            colorIndex++;
        }

        room.beds.forEach((bed) => {
            if (bed.attention) {
                rows.push({
                    room_number: room.room_number,
                    room_type: room.room_type,
                    room_type_formatted: formatRoomType(room.room_type),
                    bed_number: bed.bed_number,
                    bed_label: `${room.room_number}-${bed.bed_number}`, // Formato compacto
                    patient_name: bed.attention.patient.name,
                    age: bed.attention.patient.age,
                    sex: bed.attention.patient.sex || 'N/A',
                    admission_number: bed.attention.number,
                    doctor: bed.attention.doctor,
                    entry_date: bed.attention.entry_date,
                    entry_date_formatted: formatEntryDate(bed.attention.entry_date),
                    days: calculateHospitalizationDays(bed.attention.entry_date),
                    room_color: roomColorMap[room.room_number] // Color para agrupar visualmente
                });
            }
        });
    });
    return rows;
});

// Toggle pantalla completa solo del componente
const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value;

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

onMounted(async () => {
    await store.fetchHospitalizationStatus();
    startListening();
    console.log('[HospitalizationDisplay] Component mounted, listening for real-time events');
});

onUnmounted(() => {
    stopListening();

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

    console.log('[HospitalizationDisplay] Component unmounted');
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
                        :icon="viewMode === 'vertical' ? 'pi pi-th-large' : 'pi pi-list'"
                        @click="toggleViewMode"
                        severity="secondary"
                        text
                        rounded
                        v-tooltip.bottom="viewMode === 'vertical' ? 'Vista Cards' : 'Vista Vertical'"
                    />
                    <Button icon="pi pi-refresh" :loading="state.isLoading" @click="refreshData" severity="secondary" text rounded v-tooltip.bottom="'Actualizar'" />
                    <Button :icon="isFullscreen ? 'pi pi-times' : 'pi pi-window-maximize'" @click="toggleFullscreen" severity="secondary" text rounded v-tooltip.bottom="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'" />
                </div>
            </div>
        </div>

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
            <div class="vertical-table">
                <div class="vertical-header">
                    <div class="vh-bed">Cama</div>
                    <div class="vh-patient">Paciente</div>
                    <div class="vh-date">F. Ingreso</div>
                    <div class="vh-days">Días</div>
                </div>
                <div class="vertical-body">
                    <div v-for="(bed, index) in tableData" :key="index" class="vertical-row" :style="{ backgroundColor: bed.room_color }">
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
                        <div class="vr-patient">{{ bed.patient_name }}</div>
                        <div class="vr-date">{{ bed.entry_date_formatted }}</div>
                        <div class="vr-days">{{ bed.days }}</div>
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
                <div class="bed-card-patient">{{ bed.patient_name }}</div>
                <div class="bed-card-doctor" v-if="bed.doctor">
                    <i class="pi pi-user-md"></i>
                    <span>{{ bed.doctor }}</span>
                </div>
                <div class="bed-card-footer">
                    <span class="bed-card-date">{{ bed.entry_date_formatted }}</span>
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
    gap: 0.25rem;
    padding-top: 0.25rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.bed-card-date {
    font-size: 0.688rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.bed-card-days {
    font-size: 0.813rem;
    font-weight: 800;
    color: var(--primary-color);
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
    padding: 0.625rem 0.75rem;
    border-radius: 6px;
    margin-bottom: 0.25rem;
    border-left: 4px solid rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    min-height: 52px;
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
    padding: 0.5rem 0.625rem;
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
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--text-color);
    padding-left: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.vr-date {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-color);
    justify-content: center;
    text-align: center;
}

.vr-days {
    font-weight: 800;
    font-size: 1.25rem;
    color: var(--primary-color);
    justify-content: center;
    text-align: center;
}


/* Responsive - Optimización para pantallas verticales */
/* Pantallas 4K verticales o muy altas (1080p+ altura) */
@media (min-height: 1400px) {
    .vertical-row {
        min-height: 58px;
        padding: 0.75rem 0.875rem;
        margin-bottom: 0.5rem;
    }

    .vr-bed {
        font-size: 1.25rem;
        padding: 0.625rem 0.875rem;
    }

    .vr-patient {
        font-size: 1.25rem;
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
        min-height: 50px;
        padding: 0.625rem 0.75rem;
        margin-bottom: 0.375rem;
    }

    .vr-bed {
        font-size: 1.125rem;
    }

    .vr-patient {
        font-size: 1.125rem;
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
        min-height: 44px;
        padding: 0.5rem 0.625rem;
        margin-bottom: 0.25rem;
    }

    .vr-bed {
        font-size: 1rem;
        padding: 0.375rem 0.625rem;
    }

    .vr-patient {
        font-size: 1rem;
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
        min-height: 38px;
        padding: 0.375rem 0.5rem;
        margin-bottom: 0.25rem;
    }

    .vr-bed {
        font-size: 0.938rem;
        padding: 0.25rem 0.5rem;
    }

    .vr-patient {
        font-size: 0.938rem;
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
