<script setup>
import RoomCard from '@/components/hospitalization/RoomCard.vue';
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import { storeToRefs } from 'pinia';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Card from 'primevue/card';
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
    if (!selectedRoom.value) return state.value.status;
    return state.value.status.filter((room) => room.id === selectedRoom.value);
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
            alertRooms: 0
        };

    let totalBeds = 0;
    let occupiedBeds = 0;
    let totalTasks = 0;
    let alertRooms = 0;

    state.value.status.forEach((room) => {
        totalBeds += room.beds.length;

        room.beds.forEach((bed) => {
            if (bed.status === 'occupied') {
                occupiedBeds++;

                // Contar tareas pendientes
                if (bed.attention) {
                    const attentions = Array.isArray(bed.attention) ? bed.attention : [bed.attention];
                    attentions.forEach((att) => {
                        if (att.tasks) {
                            totalTasks += att.tasks.filter((task) => task.status === 'pendiente').length;
                        }
                    });
                }
            }
        });

        // Verificar si la habitación tiene alertas
        const hasAlerts = room.beds.some((bed) => {
            if (!bed.attention || bed.status !== 'occupied') return false;
            const attentions = Array.isArray(bed.attention) ? bed.attention : [bed.attention];
            return attentions.some((att) => !att.discharge_date && !att.exit_date);
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
        alertRooms
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

// Limpiar filtro
const clearFilter = () => {
    selectedRoom.value = null;
};

// Actualizar datos
const refreshData = () => {
    store.fetchHospitalizationStatus();
};

onMounted(async () => {
    await store.fetchHospitalizationStatus();

    // Start listening for real-time events
    startListening();
    console.log('[HospitalizationStatus] Started listening for real-time events');
});

onUnmounted(() => {
    // Stop listening for real-time events
    stopListening();
    console.log('[HospitalizationStatus] Stopped listening for real-time events');
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
                    <Button :icon="showStats ? 'pi pi-eye-slash' : 'pi pi-eye'" @click="showStats = !showStats" severity="secondary" outlined :label="showStats ? 'Ocultar estadísticas' : 'Mostrar estadísticas'">
                        <template #loadingicon="slotProps"></template>
                    </Button>
                </div>
            </div>

            <!-- Global Statistics -->
            <div v-if="showStats && globalStats.totalRooms > 0" class="stats-overview">
                <div class="stats-grid">
                    <Card class="stat-card stat-card--primary">
                        <template #content>
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <i class="pi pi-home"></i>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">{{ globalStats.totalRooms }}</div>
                                    <div class="stat-label">Habitaciones</div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card class="stat-card stat-card--success">
                        <template #content>
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <i class="pi pi-check-circle"></i>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">{{ globalStats.freeBeds }}</div>
                                    <div class="stat-label">Camas Libres</div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card class="stat-card stat-card--warning">
                        <template #content>
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <i class="pi pi-users"></i>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">{{ globalStats.occupiedBeds }}</div>
                                    <div class="stat-label">Camas Ocupadas</div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card class="stat-card stat-card--info">
                        <template #content>
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <Tag :value="`${globalStats.occupancyRate}%`" :severity="getGlobalStatusSeverity" class="occupancy-tag" />
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">{{ globalStats.totalBeds }}</div>
                                    <div class="stat-label">Total Camas</div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card v-if="globalStats.totalTasks > 0" class="stat-card stat-card--danger">
                        <template #content>
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <i class="pi pi-exclamation-triangle"></i>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">{{ globalStats.totalTasks }}</div>
                                    <div class="stat-label">Tareas Pendientes</div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card v-if="globalStats.alertRooms > 0" class="stat-card stat-card--alert">
                        <template #content>
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <i class="pi pi-bell"></i>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-value">{{ globalStats.alertRooms }}</div>
                                    <div class="stat-label">Con Alertas</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>

            <!-- Filters Section -->
            <div class="filters-section">
                <Card>
                    <template #content>
                        <div class="filters-content">
                            <div class="filter-group">
                                <label class="filter-label">
                                    <i class="pi pi-filter mr-2"></i>
                                    Filtrar por habitación:
                                </label>
                                <div class="filter-controls">
                                    <Select v-model="selectedRoom" :options="roomOptions" optionLabel="label" optionValue="value" placeholder="Seleccionar habitación" class="filter-dropdown" showClear>
                                        <template #option="{ option }">
                                            <div class="dropdown-option">
                                                <i class="pi pi-th-large"></i>
                                                <div class="option-content">
                                                    <div class="option-label">{{ option.label }}</div>
                                                    <small v-if="option.occupancy" class="option-occupancy">{{ option.occupancy }}</small>
                                                </div>
                                            </div>
                                        </template>
                                    </Select>

                                    <Button v-if="selectedRoom" icon="pi pi-times" @click="clearFilter" severity="secondary" outlined size="small" v-tooltip.bottom="'Limpiar filtro'" />
                                </div>
                            </div>

                            <div class="filter-info">
                                <Badge v-if="selectedRoom" :value="`Mostrando: ${filteredRooms.length} habitación(es)`" severity="info" />
                                <Badge v-else :value="`Mostrando: ${globalStats.totalRooms} habitaciones`" severity="success" />
                            </div>
                        </div>
                    </template>
                </Card>
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
                <RoomCard :room="room" />
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
    padding: 1rem;
    background-color: var(--surface-ground);
    min-height: calc(100vh - 8rem);
}

/* Header Styles */
.header-section {
    margin-bottom: 1rem;
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--surface-border);
}

.header-icon {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-400));
    border-radius: 8px;
    padding: 0.75rem;
    color: white;
    font-size: 1.25rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}

.header-subtitle {
    margin: 0.125rem 0 0 0;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
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
    margin-bottom: 1rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.stat-card {
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
    border: 1px solid var(--surface-border);
}

.stat-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.stat-card--primary {
    border-left: 4px solid var(--primary-color);
}

.stat-card--success {
    border-left: 4px solid var(--green-500);
}

.stat-card--warning {
    border-left: 4px solid var(--orange-500);
}

.stat-card--info {
    border-left: 4px solid var(--blue-500);
}

.stat-card--danger {
    border-left: 4px solid var(--red-500);
}

.stat-card--alert {
    border-left: 4px solid var(--yellow-500);
}

.stat-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
}

.stat-icon {
    flex-shrink: 0;
    font-size: 1.25rem;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
}

.stat-info {
    flex: 1;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.125rem;
    color: var(--text-color);
}

.stat-label {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.25px;
    font-weight: 600;
}

.occupancy-tag {
    font-weight: 600;
}

/* Filters Section */
.filters-section {
    margin-bottom: 1rem;
}

.filters-content {
    padding: 0.875rem;
}

.filters-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
}

.filter-label {
    font-weight: 600;
    color: var(--text-color);
    white-space: nowrap;
    display: flex;
    align-items: center;
}

.filter-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 250px;
}

.filter-dropdown {
    flex: 1;
    min-width: 200px;
}

.filter-info {
    flex-shrink: 0;
}

/* Select Option Styles */
.dropdown-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.25rem;
}

.option-icon {
    color: var(--text-color-secondary);
    flex-shrink: 0;
}

.option-content {
    flex: 1;
}

.option-label {
    font-weight: 500;
    color: var(--text-color);
}

.option-occupancy {
    color: var(--text-color-secondary);
    font-style: italic;
}

.rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1rem;
    margin-top: 0.75rem;
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
        font-size: 1.25rem;
    }

    .header-subtitle {
        font-size: 0.8rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.5rem;
    }

    .stat-value {
        font-size: 1.25rem;
    }

    .stat-content {
        padding: 0.5rem;
        gap: 0.5rem;
    }

    .filters-content {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }

    .filter-group {
        flex-direction: column;
        align-items: stretch;
        gap: 0.375rem;
    }

    .filter-controls {
        min-width: auto;
    }
}

@media (min-width: 769px) and (max-width: 1200px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 0.875rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
}

@media (min-width: 1201px) and (max-width: 1600px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1rem;
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .header-title {
        font-size: 1.375rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
    }

    .filters-content {
        gap: 0.75rem;
    }

    .filter-dropdown {
        min-width: 160px;
    }
}

@media (min-width: 1601px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.25rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
