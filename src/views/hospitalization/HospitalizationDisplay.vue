<script setup>
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
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

// Estado de vista (cards o tabla)
const viewMode = ref('cards'); // 'cards' o 'table'

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

// Alternar entre vistas
const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'cards' ? 'table' : 'cards';
};

// Datos aplanados para la tabla
const tableData = computed(() => {
    const rows = [];
    activeRooms.value.forEach((room) => {
        room.beds.forEach((bed) => {
            if (bed.attention) {
                rows.push({
                    room_number: room.room_number,
                    bed_number: bed.bed_number,
                    patient_name: bed.attention.patient.name,
                    age: bed.attention.patient.age,
                    admission_number: bed.attention.number,
                    doctor: bed.attention.doctor,
                    entry_date: bed.attention.entry_date
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
                <div class="header-left">
                    <div class="header-icon">
                        <i class="pi pi-building"></i>
                    </div>
                    <div class="header-info">
                        <h1 class="header-title">Estado de Hospitalización</h1>
                        <p class="header-subtitle">Vista en tiempo real de pacientes hospitalizados</p>
                    </div>
                </div>

                <div class="header-right">
                    <!-- Estadísticas -->
                    <div class="header-stats">
                        <div class="stat-item">
                            <i class="pi pi-home"></i>
                            <span class="stat-value">{{ stats.totalRooms }}</span>
                            <span class="stat-label">Habitaciones</span>
                        </div>
                        <div class="stat-item">
                            <i class="pi pi-users"></i>
                            <span class="stat-value">{{ stats.totalPatients }}</span>
                            <span class="stat-label">Pacientes</span>
                        </div>
                    </div>

                    <!-- Botones de acción -->
                    <div class="header-actions">
                        <div class="realtime-badge" :class="{ active: isListening }">
                            <i class="pi pi-circle-fill"></i>
                            <span>Tiempo Real</span>
                        </div>
                        <Button :icon="viewMode === 'cards' ? 'pi pi-table' : 'pi pi-th-large'" @click="toggleViewMode" severity="secondary" text rounded v-tooltip.bottom="viewMode === 'cards' ? 'Vista Tabla' : 'Vista Cards'" />
                        <Button icon="pi pi-refresh" :loading="state.isLoading" @click="refreshData" severity="secondary" text rounded v-tooltip.bottom="'Actualizar'" />
                        <Button :icon="isFullscreen ? 'pi pi-times' : 'pi pi-window-maximize'" @click="toggleFullscreen" severity="secondary" text rounded v-tooltip.bottom="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'" />
                    </div>
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

        <!-- Habitaciones Grid - Diseño compacto -->
        <div v-else-if="viewMode === 'cards'" class="rooms-display-grid">
            <div v-for="room in activeRooms" :key="room.id" class="room-card-compact">
                <!-- Header de habitación -->
                <div class="room-header-compact">
                    <span class="room-number-compact">{{ room.room_number }}</span>
                    <span class="room-count">{{ room.beds.length }}</span>
                </div>

                <!-- Lista de camas -->
                <div class="beds-list-compact">
                    <div v-for="bed in room.beds" :key="bed.id" class="bed-item-compact">
                        <div class="bed-main-info">
                            <div class="bed-left">
                                <div class="bed-avatar-compact">
                                    {{ bed.bed_number }}
                                </div>
                                <div class="bed-patient-info">
                                    <div class="patient-name-compact">{{ bed.attention.patient.name }}</div>
                                    <div class="patient-meta-compact">
                                        <span>{{ formatAge(bed.attention.patient.age) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="bed-secondary-info">
                            <div class="info-compact">
                                <span class="info-label-compact">Admisión:</span>
                                <span class="info-value-compact">{{ bed.attention.number }}</span>
                            </div>
                            <div class="info-compact" v-if="bed.attention.doctor">
                                <span class="info-label-compact">Médico:</span>
                                <span class="info-value-compact">{{ bed.attention.doctor }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vista Tabla -->
        <div v-else-if="viewMode === 'table'" class="table-view">
            <DataTable :value="tableData" stripedRows :paginator="false" responsiveLayout="scroll" class="hospitalization-table" :scrollable="true" scrollHeight="flex" sortMode="multiple">
                <Column field="room_number" header="Hab." :sortable="true" style="width: 80px">
                    <template #body="slotProps">
                        <div class="table-room-cell">
                            {{ slotProps.data.room_number }}
                        </div>
                    </template>
                </Column>
                <Column field="bed_number" header="Cama" :sortable="true" style="width: 90px">
                    <template #body="slotProps">
                        <div class="table-bed-cell">
                            {{ slotProps.data.bed_number }}
                        </div>
                    </template>
                </Column>
                <Column field="patient_name" header="Paciente" :sortable="true" style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="table-patient-cell">
                            <span class="patient-name-table">{{ slotProps.data.patient_name }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="age" header="Edad" :sortable="true" style="width: 70px">
                    <template #body="slotProps">
                        <div class="table-age-cell">
                            {{ Math.floor(slotProps.data.age) }}
                        </div>
                    </template>
                </Column>
                <Column field="admission_number" header="N° Adm." :sortable="true" style="width: 95px">
                    <template #body="slotProps">
                        <div class="table-admission-cell">
                            {{ slotProps.data.admission_number }}
                        </div>
                    </template>
                </Column>
                <Column field="doctor" header="Médico" :sortable="true" style="min-width: 140px">
                    <template #body="slotProps">
                        <div class="table-doctor-cell">
                            <span>{{ slotProps.data.doctor || 'N/A' }}</span>
                        </div>
                    </template>
                </Column>
            </DataTable>
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
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    box-shadow: var(--card-shadow);
    flex-shrink: 0;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.header-icon {
    width: 36px;
    height: 36px;
    background: var(--primary-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color-text);
    font-size: 1.125rem;
}

.header-info {
    display: flex;
    flex-direction: column;
}

.header-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
    line-height: 1.2;
}

.header-subtitle {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    margin: 0.125rem 0 0 0;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.header-stats {
    display: flex;
    gap: 0.75rem;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: var(--surface-100);
    border-radius: 6px;
}

.stat-item i {
    font-size: 0.875rem;
    color: var(--primary-color);
}

.stat-value {
    font-size: 1rem;
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
    margin-left: 0.25rem;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.realtime-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: var(--surface-100);
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    border: 1px solid transparent;
    transition: all 0.3s ease;
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

/* Rooms Grid - Diseño Compacto */
.rooms-display-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
    flex: 1;
    overflow-y: auto;
    align-content: start;
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

.room-number-compact {
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.25px;
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

/* Table View */
.table-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--surface-card);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--card-shadow);
}

.hospitalization-table {
    font-size: 0.813rem;
}

/* Table Headers */
:deep(.hospitalization-table .p-datatable-thead > tr > th) {
    background: var(--primary-color);
    color: var(--primary-color-text);
    font-weight: 700;
    font-size: 0.75rem;
    padding: 0.5rem 0.5rem;
    border: none;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
}

:deep(.hospitalization-table .p-datatable-thead > tr > th .p-column-header-content) {
    justify-content: center;
}

/* Table Body */
:deep(.hospitalization-table .p-datatable-tbody > tr > td) {
    padding: 0.5rem 0.5rem;
    font-size: 0.75rem;
}

/* Table Cell Styles */
.table-room-cell,
.table-bed-cell,
.table-patient-cell,
.table-age-cell,
.table-admission-cell,
.table-doctor-cell {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    justify-content: center;
    color: var(--text-color);
    font-weight: 600;
}

.table-room-cell {
    font-weight: 700;
    color: var(--primary-color);
}

.table-bed-cell {
    background: var(--primary-color);
    color: var(--primary-color-text);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.5px;
    font-size: 0.75rem;
    justify-content: center;
    display: inline-flex;
}

.table-patient-cell {
    justify-content: flex-start;
    text-align: left;
    width: 100%;
}

.patient-name-table {
    font-weight: 700;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.table-doctor-cell {
    justify-content: flex-start;
    text-align: left;
}

.table-doctor-cell span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Empty State for Table */
:deep(.hospitalization-table .p-datatable-emptymessage > td) {
    text-align: center;
    padding: 3rem;
    color: var(--text-color-secondary);
    font-size: 1rem;
}

/* Responsive - Diseño Compacto */
@media (min-width: 1920px) {
    .rooms-display-grid {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
}

@media (max-width: 1600px) {
    .rooms-display-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
}

@media (max-width: 1400px) {
    .rooms-display-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }
}

@media (max-width: 1024px) {
    .rooms-display-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.375rem;
    }

    .header-content {
        flex-wrap: wrap;
    }

    .hospitalization-table {
        font-size: 0.688rem;
    }

    :deep(.hospitalization-table .p-datatable-thead > tr > th) {
        font-size: 0.688rem;
        padding: 0.375rem 0.375rem;
    }

    :deep(.hospitalization-table .p-datatable-tbody > tr > td) {
        padding: 0.375rem 0.375rem;
        font-size: 0.688rem;
    }

    .table-bed-cell {
        font-size: 0.688rem;
        padding: 0.25rem 0.375rem;
    }
}

@media (max-width: 768px) {
    .hospitalization-display {
        padding: 0.375rem;
    }

    .display-header {
        padding: 0.5rem 0.625rem;
        margin-bottom: 0.375rem;
    }

    .header-title {
        font-size: 1rem;
    }

    .header-subtitle {
        font-size: 0.688rem;
    }

    .header-icon {
        width: 28px;
        height: 28px;
        font-size: 1rem;
    }

    .rooms-display-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.375rem;
    }

    .patient-name-compact {
        font-size: 0.75rem;
    }

    .patient-meta-compact {
        font-size: 0.625rem;
    }

    .bed-avatar-compact {
        min-width: 42px;
        height: 28px;
        font-size: 0.75rem;
    }

    .hospitalization-table {
        font-size: 0.625rem;
    }

    :deep(.hospitalization-table .p-datatable-thead > tr > th) {
        font-size: 0.625rem;
        padding: 0.375rem 0.25rem;
    }

    :deep(.hospitalization-table .p-datatable-tbody > tr > td) {
        padding: 0.375rem 0.25rem;
        font-size: 0.625rem;
    }

    .table-bed-cell {
        font-size: 0.625rem;
        padding: 0.25rem 0.375rem;
    }
}
</style>
