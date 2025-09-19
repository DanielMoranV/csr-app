<script setup>
import RoomCard from '@/components/hospitalization/RoomCard.vue';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import { storeToRefs } from 'pinia';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';

const store = useHospitalizationStore();
const { state } = storeToRefs(store);

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

onMounted(() => {
    store.fetchHospitalizationStatus();
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
                    <Button icon="pi pi-refresh" :loading="state.isLoading" @click="refreshData" severity="secondary" outlined v-tooltip.bottom="'Actualizar datos'" />
                    <Button :icon="showStats ? 'pi pi-eye-slash' : 'pi pi-eye'" @click="showStats = !showStats" severity="secondary" outlined :label="showStats ? 'Ocultar estadísticas' : 'Mostrar estadísticas'" />
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
        <div v-if="state.isLoading" class="flex justify-content-center align-items-center" style="min-height: 400px">
            <div class="text-center">
                <i class="pi pi-spin pi-spinner text-primary" style="font-size: 4rem"></i>
                <p class="mt-3 text-xl text-600">Cargando estado de hospitalización...</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="state.error" class="flex justify-content-center align-items-center" style="min-height: 400px">
            <div class="text-center">
                <i class="pi pi-exclamation-triangle text-red-500" style="font-size: 4rem"></i>
                <h3 class="mt-3 text-red-600">Error al cargar datos</h3>
                <p class="text-600">{{ state.error }}</p>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!state.status || state.status.length === 0" class="flex justify-content-center align-items-center" style="min-height: 400px">
            <div class="text-center">
                <i class="pi pi-home text-gray-400" style="font-size: 4rem"></i>
                <h3 class="mt-3 text-gray-600">No hay habitaciones disponibles</h3>
                <p class="text-600">No se encontraron datos de hospitalización para mostrar.</p>
            </div>
        </div>

        <!-- Rooms Grid -->
        <div v-else class="rooms-grid">
            <div v-for="room in filteredRooms" :key="room.id" class="room-card-container">
                <RoomCard :room="room" />
            </div>
        </div>

        <!-- No Results Message -->
        <div v-if="selectedRoom && filteredRooms.length === 0" class="flex justify-content-center align-items-center" style="min-height: 300px">
            <div class="text-center">
                <i class="pi pi-search text-gray-400" style="font-size: 3rem"></i>
                <h3 class="mt-3 text-gray-600">No se encontró la habitación</h3>
                <p class="text-600">La habitación seleccionada no existe o no está disponible.</p>
                <Button label="Limpiar filtro" icon="pi pi-times" @click="clearFilter" severity="secondary" outlined class="mt-3" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.hospitalization-status-container {
    padding: 1.5rem;
    background-color: var(--surface-ground);
    min-height: calc(100vh - 10rem);
}

/* Header Styles */
.header-section {
    margin-bottom: 2rem;
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--surface-border);
}

.header-icon {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-400));
    border-radius: 12px;
    padding: 1rem;
    color: white;
    font-size: 1.5rem;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.header-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}

.header-subtitle {
    margin: 0.25rem 0 0 0;
    color: var(--text-color-secondary);
    font-size: 0.95rem;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

/* Statistics Overview */
.stats-overview {
    margin-bottom: 1.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.stat-card {
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid var(--surface-border);
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
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
    gap: 1rem;
    padding: 0.5rem;
}

.stat-icon {
    flex-shrink: 0;
    font-size: 1.5rem;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
}

.stat-info {
    flex: 1;
}

.stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.25rem;
    color: var(--text-color);
}

.stat-label {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.occupancy-tag {
    font-weight: 600;
}

/* Filters Section */
.filters-section {
    margin-bottom: 1.5rem;
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
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
    width: 100%;
}

.room-card-container {
    display: flex;
    width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .hospitalization-status-container {
        padding: 1rem;
    }

    .rooms-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .header-top {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .header-actions {
        justify-content: center;
    }

    .header-title {
        font-size: 1.5rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .stat-value {
        font-size: 1.5rem;
    }

    .filters-content {
        flex-direction: column;
        align-items: stretch;
    }

    .filter-group {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .filter-controls {
        min-width: auto;
    }
}

@media (min-width: 769px) and (max-width: 1200px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    }
}

@media (min-width: 1201px) and (max-width: 1600px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .header-title {
        font-size: 1.75rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .filters-content {
        gap: 0.75rem;
    }

    .filter-dropdown {
        min-width: 180px;
    }
}

@media (min-width: 1601px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
}
</style>
