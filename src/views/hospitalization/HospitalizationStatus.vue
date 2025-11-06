<script setup>
import RoomCard from '@/components/hospitalization/RoomCard.vue';
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import { storeToRefs } from 'pinia';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const store = useHospitalizationStore();
const { state } = storeToRefs(store);

// Real-time events - only update hospitalization and dashboard (not attentions)
const { startListening, stopListening, isListening } = useRealtimeEvents({
    updateAttentions: false, // Don't update attentions store from this component
    updateDashboard: false, // Don't update dashboard from this component
    updateHospitalization: true // Only update hospitalization status
});

// Filtros
const selectedRoom = ref(null);
const showStats = ref(true);
const showFilters = ref(false);

// Filtros de ocupación
const occupancyFilters = ref({
    occupied: true,
    free: true,
    reserved: true
});

// Opciones para el dropdown de habitaciones
const roomOptions = computed(() => {
    if (!state.value.status) return [];

    const options = [{ label: 'Todas las habitaciones', value: null, icon: 'pi-home' }];

    state.value.status.forEach((room) => {
        const occupiedBeds = room.beds.filter((bed) => bed.status === 'occupied').length;
        const totalBeds = room.beds.length;
        const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);

        options.push({
            label: `Habitación ${room.room_number}`,
            value: room.id,
            icon: 'pi-building',
            occupancy: `${occupiedBeds}/${totalBeds} (${occupancyRate}%)`
        });
    });

    return options;
});

// Habitaciones filtradas
const filteredRooms = computed(() => {
    if (!state.value.status) return [];

    let rooms = state.value.status;

    // Filtrar por habitación específica
    if (selectedRoom.value) {
        rooms = rooms.filter((room) => room.id === selectedRoom.value);
    }

    // Filtrar por estado de ocupación
    rooms = rooms.filter((room) => {
        // Determinar el estado predominante de la habitación
        const totalBeds = room.beds.length;
        const occupiedBeds = room.beds.filter((bed) => bed.status === 'occupied').length;
        const reservedBeds = room.beds.filter((bed) => bed.is_reserved || bed.status === 'reserved' || bed.status === 'reservada').length;
        const freeBeds = totalBeds - occupiedBeds - reservedBeds;

        // Una habitación se considera "ocupada" si tiene al menos 1 cama ocupada
        const hasOccupied = occupiedBeds > 0;
        // Una habitación se considera "reservada" si tiene al menos 1 cama reservada (y no está completamente ocupada)
        const hasReserved = reservedBeds > 0 && occupiedBeds < totalBeds;
        // Una habitación se considera "libre" si todas las camas están libres
        const isFree = freeBeds === totalBeds;

        // Aplicar filtros
        if (isFree && !occupancyFilters.value.free) return false;
        if (hasReserved && !occupancyFilters.value.reserved) return false;
        if (hasOccupied && !occupancyFilters.value.occupied) return false;

        return true;
    });

    return rooms;
});

// Estadísticas generales
const globalStats = computed(() => {
    if (!state.value.status)
        return {
            totalRooms: 0,
            totalBeds: 0,
            occupiedBeds: 0,
            freeBeds: 0,
            occupancyRate: 0,
            totalTasks: 0,
            tasksNearingDue: 0,
            tasksOverdue: 0,
            alertRooms: 0,
            roomTypes: {}
        };

    let totalBeds = 0;
    let occupiedBeds = 0;
    let totalTasks = 0;
    let tasksNearingDue = 0;
    let tasksOverdue = 0;
    let alertRooms = 0;
    const roomTypes = {};

    state.value.status.forEach((room) => {
        totalBeds += room.beds.length;

        // Contar tipos de habitación
        if (room.room_type) {
            if (!roomTypes[room.room_type]) {
                roomTypes[room.room_type] = { total: 0, occupied: 0 };
            }
            roomTypes[room.room_type].total++;
        }

        let hasOccupiedBed = false;

        room.beds.forEach((bed) => {
            if (bed.status === 'occupied' && bed.attention) {
                occupiedBeds++;
                hasOccupiedBed = true;

                // Contar tareas pendientes y alertas
                if (bed.attention.tasks) {
                    bed.attention.tasks.forEach((task) => {
                        if (task.status === 'pendiente') {
                            totalTasks++;

                            // Contar tareas por vencer y vencidas según alert_status
                            if (task.alert_status === 'por_vencer') {
                                tasksNearingDue++;
                            } else if (task.alert_status === 'vencida') {
                                tasksOverdue++;
                            }
                        }
                    });
                }
            }
        });

        // Actualizar conteo de tipos de habitación ocupados
        if (hasOccupiedBed && room.room_type && roomTypes[room.room_type]) {
            roomTypes[room.room_type].occupied++;
        }

        // Verificar si la habitación tiene alertas (tareas pendientes, por vencer o vencidas)
        const hasAlerts = room.beds.some((bed) => {
            return bed.status === 'occupied' && bed.attention && bed.attention.tasks && bed.attention.tasks.some((task) => task.status === 'pendiente' && (task.alert_status === 'por_vencer' || task.alert_status === 'vencida'));
        });

        if (hasAlerts) alertRooms++;
    });

    const freeBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
        totalRooms: state.value.status.length,
        totalBeds,
        occupiedBeds,
        freeBeds,
        occupancyRate,
        totalTasks,
        tasksNearingDue,
        tasksOverdue,
        alertRooms,
        roomTypes
    };
});

// Obtener severidad del estado general
const getGlobalStatusSeverity = computed(() => {
    const rate = globalStats.value.occupancyRate;
    if (rate >= 90) return 'danger';
    if (rate >= 75) return 'warn';
    if (rate >= 50) return 'info';
    return 'success';
});

// Limpiar filtro de habitación específica
const clearFilter = () => {
    selectedRoom.value = null;
};

// Limpiar todos los filtros
const clearAllFilters = () => {
    selectedRoom.value = null;
    occupancyFilters.value = {
        occupied: true,
        free: true,
        reserved: true
    };
};

// Actualizar datos
const refreshData = async () => {
    await store.fetchHospitalizationStatus();
};

// Manejar refresh desde componentes hijos (cuando se crean/actualizan/eliminan detalles o tareas)
const handleRefreshFromChild = async () => {
    console.log('[HospitalizationStatus] Refreshing data after child action...');
    await refreshData();
};

const refreshInterval = ref(null);

onMounted(async () => {
    await store.fetchHospitalizationStatus();

    // Start listening for real-time events
    startListening();
    console.log('[HospitalizationStatus] Started listening for real-time events');

    // Auto-refresh every 30 minutes
    refreshInterval.value = setInterval(
        async () => {
            console.log('[HospitalizationStatus] Auto-refreshing data...');
            await refreshData();
        },
        30 * 60 * 1000
    );
});

onUnmounted(() => {
    // Stop listening for real-time events
    stopListening();
    console.log('[HospitalizationStatus] Stopped listening for real-time events');

    // Clear auto-refresh interval
    if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
        console.log('[HospitalizationStatus] Auto-refresh interval cleared.');
    }
});
</script>

<template>
    <div class="hospitalization-status-container">
        <!-- Enhanced Header -->
        <div class="header-section">
            <div class="header-top">
                <div class="flex align-items-center gap-3">
                    <div class="header-icon">
                        <i class="pi pi-hospital"></i>
                    </div>
                    <div>
                        <h1 class="header-title">Estado de Hospitalización</h1>
                        <p class="header-subtitle">Panel de control de camas y pacientes hospitalizados</p>
                    </div>
                </div>

                <div class="header-actions">
                    <!-- Real-time status indicator -->
                    <div class="realtime-status">
                        <i v-if="isListening" class="pi pi-circle-fill realtime-indicator realtime-indicator--active" v-tooltip.bottom="'Actualizaciones en tiempo real activas'"></i>
                        <i v-else class="pi pi-circle realtime-indicator realtime-indicator--inactive" v-tooltip.bottom="'Actualizaciones en tiempo real inactivas'"></i>
                        <span class="realtime-text">Tiempo Real</span>
                    </div>

                    <Button icon="pi pi-refresh" :loading="state.isLoading" @click="refreshData" severity="secondary" outlined v-tooltip.bottom="'Actualizar datos manualmente'" />
                    <Button :icon="showFilters ? 'pi pi-filter-slash' : 'pi pi-filter'" @click="showFilters = !showFilters" severity="secondary" outlined v-tooltip.bottom="showFilters ? 'Ocultar filtros' : 'Mostrar filtros'" />
                    <Button :icon="showStats ? 'pi pi-eye-slash' : 'pi pi-eye'" @click="showStats = !showStats" severity="secondary" outlined v-tooltip.bottom="showStats ? 'Ocultar estadísticas' : 'Mostrar estadísticas'" />
                </div>
            </div>

            <!-- Global Statistics -->
            <div v-if="showStats && globalStats.totalRooms > 0" class="stats-overview">
                <div class="stats-grid-compact">
                    <!-- Ocupación General -->
                    <Card class="stat-card-group stat-card-group--primary">
                        <template #content>
                            <div class="stat-group-content">
                                <div class="stat-group-header">
                                    <i class="pi pi-building"></i>
                                    <span>Ocupación General</span>
                                </div>
                                <div class="stat-group-body">
                                    <div class="stat-metric">
                                        <div class="metric-value">{{ globalStats.totalRooms }}</div>
                                        <div class="metric-label">Habitaciones</div>
                                    </div>
                                    <div class="stat-divider"></div>
                                    <div class="stat-metric stat-metric--highlight">
                                        <div class="metric-value">
                                            {{ globalStats.occupiedBeds }}/{{ globalStats.totalBeds }}
                                            <Tag :value="`${globalStats.occupancyRate}%`" :severity="getGlobalStatusSeverity" class="occupancy-tag-inline" />
                                        </div>
                                        <div class="metric-label">Camas Ocupadas</div>
                                    </div>
                                    <div class="stat-divider"></div>
                                    <div class="stat-metric stat-metric--success">
                                        <div class="metric-value">{{ globalStats.freeBeds }}</div>
                                        <div class="metric-label">Camas Libres</div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <!-- Tareas Activas -->
                    <Card v-if="globalStats.totalTasks > 0" class="stat-card-group stat-card-group--tasks">
                        <template #content>
                            <div class="stat-group-content">
                                <div class="stat-group-header">
                                    <i class="pi pi-list-check"></i>
                                    <span>Tareas Activas</span>
                                </div>
                                <div class="stat-group-body">
                                    <div class="stat-metric">
                                        <div class="metric-value">{{ globalStats.totalTasks }}</div>
                                        <div class="metric-label">Pendientes</div>
                                    </div>
                                    <div class="stat-divider"></div>
                                    <div class="stat-metric stat-metric--warning" v-if="globalStats.tasksNearingDue > 0">
                                        <div class="metric-value">
                                            <i class="pi pi-clock metric-icon"></i>
                                            {{ globalStats.tasksNearingDue }}
                                        </div>
                                        <div class="metric-label">Por Vencer</div>
                                    </div>
                                    <div class="stat-divider" v-if="globalStats.tasksNearingDue > 0"></div>
                                    <div class="stat-metric stat-metric--danger" v-if="globalStats.tasksOverdue > 0">
                                        <div class="metric-value">
                                            <i class="pi pi-exclamation-circle metric-icon"></i>
                                            {{ globalStats.tasksOverdue }}
                                        </div>
                                        <div class="metric-label">Vencidas</div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <!-- Alertas -->
                    <Card v-if="globalStats.alertRooms > 0" class="stat-card-group stat-card-group--alert">
                        <template #content>
                            <div class="stat-group-content">
                                <div class="stat-group-header">
                                    <i class="pi pi-bell"></i>
                                    <span>Alertas</span>
                                </div>
                                <div class="stat-group-body">
                                    <div class="stat-metric stat-metric--large">
                                        <div class="metric-value metric-value--large">{{ globalStats.alertRooms }}</div>
                                        <div class="metric-label">Habitaciones con Alertas</div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>

            <!-- Filters Section -->
            <div v-if="showFilters" class="filters-section">
                <div class="filters-container">
                    <div class="filters-row">
                        <div class="filter-item filter-item--select">
                            <label class="filter-label-compact">
                                <i class="pi pi-building"></i>
                                <span>Habitación:</span>
                            </label>
                            <Select v-model="selectedRoom" :options="roomOptions" optionLabel="label" optionValue="value" placeholder="Todas" class="filter-select-compact" showClear size="small">
                                <template #option="{ option }">
                                    <div class="dropdown-option-compact">
                                        <span class="option-label">{{ option.label }}</span>
                                        <small v-if="option.occupancy" class="option-occupancy">{{ option.occupancy }}</small>
                                    </div>
                                </template>
                            </Select>
                        </div>

                        <div class="filter-divider-vertical"></div>

                        <div class="filter-item filter-item--checkboxes">
                            <label class="filter-label-compact">
                                <i class="pi pi-list"></i>
                                <span>Estado:</span>
                            </label>
                            <div class="occupancy-filters-compact">
                                <div class="occupancy-checkbox-compact">
                                    <Checkbox v-model="occupancyFilters.occupied" inputId="filter-occupied" :binary="true" />
                                    <label for="filter-occupied" class="occupancy-label-compact">
                                        <i class="pi pi-users text-cyan-500"></i>
                                        <span>Ocupadas</span>
                                    </label>
                                </div>
                                <div class="occupancy-checkbox-compact">
                                    <Checkbox v-model="occupancyFilters.free" inputId="filter-free" :binary="true" />
                                    <label for="filter-free" class="occupancy-label-compact">
                                        <i class="pi pi-check-circle text-green-500"></i>
                                        <span>Libres</span>
                                    </label>
                                </div>
                                <div class="occupancy-checkbox-compact">
                                    <Checkbox v-model="occupancyFilters.reserved" inputId="filter-reserved" :binary="true" />
                                    <label for="filter-reserved" class="occupancy-label-compact">
                                        <i class="pi pi-bookmark-fill text-yellow-500"></i>
                                        <span>Reservadas</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="filter-divider-vertical"></div>

                        <div class="filter-item filter-item--actions">
                            <Badge :value="`${filteredRooms.length} hab.`" severity="info" size="small" />
                            <Button
                                v-if="selectedRoom || !occupancyFilters.occupied || !occupancyFilters.free || !occupancyFilters.reserved"
                                icon="pi pi-filter-slash"
                                @click="clearAllFilters"
                                severity="secondary"
                                text
                                size="small"
                                v-tooltip.bottom="'Limpiar filtros'"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="state.isLoading" class="loading-state">
            <div class="loading-content">
                <div class="loading-spinner">
                    <i class="pi pi-spin pi-spinner"></i>
                </div>
                <div class="loading-text">
                    <h3>Cargando estado de hospitalización</h3>
                    <p>Obteniendo información actualizada...</p>
                </div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="state.error" class="error-state">
            <div class="error-content">
                <div class="error-icon">
                    <i class="pi pi-exclamation-triangle"></i>
                </div>
                <div class="error-text">
                    <h3>Error al cargar datos</h3>
                    <p>{{ state.error }}</p>
                    <Button label="Reintentar" icon="pi pi-refresh" @click="refreshData" severity="secondary" outlined size="small" class="mt-2" />
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!state.status || state.status.length === 0" class="empty-state">
            <div class="empty-content">
                <div class="empty-icon">
                    <i class="pi pi-home"></i>
                </div>
                <div class="empty-text">
                    <h3>No hay habitaciones disponibles</h3>
                    <p>No se encontraron datos de hospitalización para mostrar.</p>
                    <Button label="Actualizar" icon="pi pi-refresh" @click="refreshData" severity="secondary" outlined size="small" class="mt-2" />
                </div>
            </div>
        </div>

        <!-- Rooms Grid -->
        <div v-else class="rooms-grid">
            <div v-for="room in filteredRooms" :key="room.id" class="room-card-container">
                <RoomCard :room="room" @refresh-data="handleRefreshFromChild" />
            </div>
        </div>

        <!-- No Results Message -->
        <div v-if="selectedRoom && filteredRooms.length === 0" class="no-results-state">
            <div class="no-results-content">
                <div class="no-results-icon">
                    <i class="pi pi-search"></i>
                </div>
                <div class="no-results-text">
                    <h3>No se encontró la habitación</h3>
                    <p>La habitación seleccionada no existe o no está disponible.</p>
                    <Button label="Limpiar filtro" icon="pi pi-times" @click="clearFilter" severity="secondary" outlined size="small" class="mt-2" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hospitalization-status-container {
    padding: 0.75rem;
    background-color: var(--surface-ground);
    min-height: calc(100vh - 8rem);
}

/* Header Styles */
.header-section {
    margin-bottom: 0.625rem;
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.625rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--surface-border);
}

.header-icon {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-400));
    border-radius: 6px;
    padding: 0.625rem;
    color: white;
    font-size: 1.125rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}

.header-subtitle {
    margin: 0.125rem 0 0 0;
    color: var(--text-color-secondary);
    font-size: 0.8rem;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

/* Real-time status indicator */
.realtime-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
}

.realtime-indicator {
    font-size: 0.75rem;
    animation: pulse 2s infinite;
}

.realtime-text {
    font-weight: 500;
    white-space: nowrap;
}

.realtime-indicator--active {
    color: #22c55e;
    filter: brightness(1.3) saturate(1.5);
    text-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.realtime-indicator--inactive {
    color: var(--surface-400);
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

/* Statistics Overview */
.stats-overview {
    margin-bottom: 0.5rem;
}

.stats-grid-compact {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 0.625rem;
    max-width: 1400px;
    margin: 0 auto;
}

.stat-card-group {
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s ease;
    border: 1px solid var(--surface-border);
}

.stat-card-group:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card-group--primary {
    border-top: 2px solid var(--primary-color);
}

.stat-card-group--tasks {
    border-top: 2px solid var(--indigo-500);
}

.stat-card-group--alert {
    border-top: 2px solid var(--yellow-600);
}

.stat-group-content {
    padding: 0.5rem 0.75rem;
}

.stat-group-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-bottom: 0.375rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--surface-border);
}

.stat-group-header i {
    font-size: 0.875rem;
    color: var(--primary-color);
}

.stat-group-header span {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.stat-group-body {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    justify-content: space-evenly;
}

.stat-metric {
    text-align: center;
    flex: 1;
}

.stat-metric--large {
    flex: 1;
}

.stat-metric--highlight {
    background: var(--surface-50);
    padding: 0.375rem 0.625rem;
    border-radius: 4px;
    min-width: 140px;
}

.stat-metric--success .metric-value {
    color: var(--green-600);
}

.stat-metric--warning .metric-value {
    color: var(--amber-600);
}

.stat-metric--danger .metric-value {
    color: var(--red-600);
}

.metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.2rem;
    color: var(--text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
}

.metric-value--large {
    font-size: 1.5rem;
}

.metric-icon {
    font-size: 0.75rem;
}

.metric-label {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    font-weight: 500;
    line-height: 1;
}

.stat-divider {
    width: 1px;
    height: 1.75rem;
    background: var(--surface-border);
    flex-shrink: 0;
}

.occupancy-tag-inline {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.4rem;
    margin-left: 0.25rem;
}

/* Filters Section - Compact Design */
.filters-section {
    margin-bottom: 0.5rem;
}

.filters-container {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
}

.filters-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.filter-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.filter-item--select {
    flex: 0 1 auto;
    min-width: 200px;
}

.filter-item--checkboxes {
    flex: 1 1 auto;
}

.filter-item--actions {
    flex-shrink: 0;
    margin-left: auto;
}

.filter-label-compact {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    white-space: nowrap;
}

.filter-label-compact i {
    font-size: 0.75rem;
}

.filter-select-compact {
    min-width: 150px;
}

.filter-divider-vertical {
    width: 1px;
    height: 1.5rem;
    background: var(--surface-border);
    flex-shrink: 0;
}

/* Occupancy Filters Compact */
.occupancy-filters-compact {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.occupancy-checkbox-compact {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.occupancy-label-compact {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color);
    cursor: pointer;
    user-select: none;
    transition: color 0.2s ease;
    white-space: nowrap;
}

.occupancy-label-compact:hover {
    color: var(--primary-color);
}

.occupancy-label-compact i {
    font-size: 0.75rem;
}

/* Select Option Styles Compact */
.dropdown-option-compact {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.125rem;
}

.option-label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-color);
}

.option-occupancy {
    color: var(--text-color-secondary);
    font-size: 0.7rem;
    font-style: italic;
}

.rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
    width: 100%;
}

.room-card-container {
    display: flex;
    width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .hospitalization-status-container {
        padding: 0.75rem;
    }

    .rooms-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    .header-top {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }

    .header-actions {
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .realtime-status {
        order: -1;
        width: 100%;
        justify-content: center;
        margin-bottom: 0.25rem;
        padding: 0.375rem 0.5rem;
    }

    .header-title {
        font-size: 1.125rem;
    }

    .header-subtitle {
        font-size: 0.75rem;
    }

    .header-icon {
        padding: 0.5rem;
        font-size: 1rem;
    }

    .stats-grid-compact {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }

    .stat-group-body {
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat-divider {
        width: 100%;
        height: 1px;
    }

    .stat-metric {
        width: 100%;
    }

    .metric-value {
        font-size: 1.125rem;
    }

    .stat-group-content {
        padding: 0.375rem 0.5rem;
    }

    .stat-group-header {
        margin-bottom: 0.25rem;
        padding-bottom: 0.2rem;
    }

    .stat-divider {
        height: 1.5rem;
    }

    .filters-container {
        padding: 0.5rem;
    }

    .filters-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .filter-item {
        flex-direction: column;
        align-items: stretch;
        gap: 0.375rem;
    }

    .filter-item--select,
    .filter-item--checkboxes,
    .filter-item--actions {
        min-width: 100%;
        flex: 1;
        margin-left: 0;
    }

    .filter-divider-vertical {
        display: none;
    }

    .occupancy-filters-compact {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .filter-select-compact {
        width: 100%;
        min-width: 100%;
    }

    .filter-item--actions {
        flex-direction: row;
        justify-content: space-between;
    }
}

@media (min-width: 769px) and (max-width: 1200px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 0.75rem;
    }

    .stats-grid-compact {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 0.5rem;
    }

    .filters-row {
        flex-wrap: wrap;
    }

    .filter-item--checkboxes {
        flex: 1 1 100%;
    }

    .occupancy-filters-compact {
        gap: 0.625rem;
    }
}

@media (min-width: 1201px) and (max-width: 1600px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 0.75rem;
    }

    .stats-grid-compact {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        max-width: 1300px;
    }

    .stat-group-body {
        gap: 0.875rem;
    }

    .stat-metric--highlight {
        min-width: 120px;
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .header-title {
        font-size: 1.125rem;
    }

    .stats-grid-compact {
        grid-template-columns: 1fr;
    }

    .stat-group-content {
        padding: 0.5rem 0.625rem;
    }

    .stat-group-header {
        margin-bottom: 0.3rem;
        padding-bottom: 0.2rem;
    }

    .filters-container {
        padding: 0.625rem;
    }

    .filters-row {
        gap: 0.5rem;
    }

    .filter-item--select {
        min-width: 180px;
    }
}

@media (min-width: 1601px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 0.875rem;
    }

    .stats-grid-compact {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        max-width: 1400px;
    }

    .stat-group-content {
        padding: 0.5rem 0.875rem;
    }

    .stat-group-header {
        margin-bottom: 0.375rem;
        padding-bottom: 0.25rem;
    }
}

@media (min-width: 1920px) {
    .stats-grid-compact {
        max-width: 1600px;
        gap: 1rem;
    }

    .stat-group-content {
        padding: 0.5rem 1rem;
    }

    .stat-group-header {
        margin-bottom: 0.4rem;
        padding-bottom: 0.3rem;
    }

    .stat-group-body {
        gap: 1.25rem;
    }

    .metric-value {
        font-size: 1.375rem;
    }

    .metric-value--large {
        font-size: 1.75rem;
    }

    .stat-divider {
        height: 2rem;
    }

    .stat-metric--highlight {
        padding: 0.4rem 0.75rem;
        min-width: 160px;
    }

    .occupancy-tag-inline {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
    }

    .metric-label {
        font-size: 0.75rem;
    }
}

/* Enhanced State Styles */
.loading-state,
.error-state,
.empty-state,
.no-results-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    margin: 2rem 0;
}

.loading-content,
.error-content,
.empty-content,
.no-results-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    max-width: 400px;
    width: 100%;
}

.loading-spinner,
.error-icon,
.empty-icon,
.no-results-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 1.5rem;
}

.loading-spinner {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-400));
    color: white;
}

.error-icon {
    background: linear-gradient(135deg, var(--red-500), var(--red-400));
    color: white;
}

.empty-icon {
    background: linear-gradient(135deg, var(--gray-400), var(--gray-300));
    color: white;
}

.no-results-icon {
    background: linear-gradient(135deg, var(--blue-500), var(--blue-400));
    color: white;
}

.loading-text,
.error-text,
.empty-text,
.no-results-text {
    flex: 1;
}

.loading-text h3,
.error-text h3,
.empty-text h3,
.no-results-text h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
}

.loading-text p,
.error-text p,
.empty-text p,
.no-results-text p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    line-height: 1.4;
}

/* Mobile optimizations for states */
@media (max-width: 768px) {
    .loading-state,
    .error-state,
    .empty-state,
    .no-results-state {
        min-height: 160px;
        margin: 1rem 0;
    }

    .loading-content,
    .error-content,
    .empty-content,
    .no-results-content {
        flex-direction: column;
        text-align: center;
        gap: 0.75rem;
        padding: 1rem;
    }

    .loading-spinner,
    .error-icon,
    .empty-icon,
    .no-results-icon {
        width: 40px;
        height: 40px;
        font-size: 1.25rem;
    }

    .loading-text h3,
    .error-text h3,
    .empty-text h3,
    .no-results-text h3 {
        font-size: 0.9rem;
    }

    .loading-text p,
    .error-text p,
    .empty-text p,
    .no-results-text p {
        font-size: 0.8rem;
    }
}
</style>
