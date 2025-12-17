<script setup>
import RoomCard from '@/components/hospitalization/RoomCard.vue';
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import { storeToRefs } from 'pinia';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const store = useHospitalizationStore();

const { state } = storeToRefs(store);

// Real-time events
const { startListening, stopListening, isListening } = useRealtimeEvents({
    updateAttentions: false,
    updateDashboard: false,
    updateHospitalization: true
});

// Current time and last update
const currentTime = ref(new Date());
const lastUpdate = ref(new Date());

// Clock interval
const clockInterval = ref(null);

// Smart sort always enabled for TV
const smartSortEnabled = ref(true);

// Filtered and sorted rooms
const filteredRooms = computed(() => {
    if (!state.value.status) return [];

    let rooms = [...state.value.status];

    // Always apply smart sort for TV
    rooms.sort((a, b) => {
        const bedsA = a.beds.length;
        const bedsB = b.beds.length;

        // First sort by number of beds
        if (bedsA !== bedsB) {
            return bedsA - bedsB;
        }

        // Then by occupancy (more occupied first)
        const occupancyA = a.beds.filter((bed) => bed.status === 'occupied').length;
        const occupancyB = b.beds.filter((bed) => bed.status === 'occupied').length;
        return occupancyB - occupancyA;
    });

    return rooms;
});

// Global statistics
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
            alertRooms: 0
        };

    let totalBeds = 0;
    let occupiedBeds = 0;
    let totalTasks = 0;
    let tasksNearingDue = 0;
    let tasksOverdue = 0;
    let alertRooms = 0;

    state.value.status.forEach((room) => {
        totalBeds += room.beds.length;

        room.beds.forEach((bed) => {
            if (bed.status === 'occupied' && bed.attention) {
                occupiedBeds++;

                if (bed.attention.tasks) {
                    bed.attention.tasks.forEach((task) => {
                        if (task.status === 'pendiente') {
                            totalTasks++;

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

        // Check for alerts
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
        alertRooms
    };
});

// Get severity
const getGlobalStatusSeverity = computed(() => {
    const rate = globalStats.value.occupancyRate;
    if (rate >= 90) return 'danger';
    if (rate >= 75) return 'warn';
    if (rate >= 50) return 'info';
    return 'success';
});

// Refresh data
const refreshData = async () => {
    try {
        await store.fetchHospitalizationStatus();
        lastUpdate.value = new Date();
    } catch (error) {
        // Silent error handling for TV display
    }
};

// Wake lock to prevent screen sleep
let wakeLock = null;

const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        // Wake lock not supported or failed
    }
};

// Enter fullscreen
const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
};

// Reconnect WebSocket if disconnected
const reconnectWebSocket = () => {
    if (!isListening.value) {
        startListening();
    }
};

const refreshInterval = ref(null);
const reconnectInterval = ref(null);

onMounted(async () => {
    // Hide dashboard layout (sidebar, topbar)
    const sidebar = document.querySelector('.layout-sidebar');
    const topbar = document.querySelector('.layout-topbar');
    const mainContainer = document.querySelector('.layout-main-container');

    if (sidebar) sidebar.style.display = 'none';
    if (topbar) topbar.style.display = 'none';
    if (mainContainer) {
        mainContainer.style.padding = '0';
        mainContainer.style.marginLeft = '0';
    }

    // Initial data load
    await refreshData();

    // Start real-time events
    startListening();

    // Request wake lock
    await requestWakeLock();

    // Update clock every second
    clockInterval.value = setInterval(() => {
        currentTime.value = new Date();
    }, 1000);

    // Auto-refresh every 5 minutes (aggressive for TV)
    refreshInterval.value = setInterval(
        async () => {
            await refreshData();
        },
        5 * 60 * 1000
    );

    // Check WebSocket connection every minute
    reconnectInterval.value = setInterval(reconnectWebSocket, 60 * 1000);

    // Re-acquire wake lock if lost
    document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });
});

onUnmounted(() => {
    // Restore dashboard layout
    const sidebar = document.querySelector('.layout-sidebar');
    const topbar = document.querySelector('.layout-topbar');
    const mainContainer = document.querySelector('.layout-main-container');

    if (sidebar) sidebar.style.display = '';
    if (topbar) topbar.style.display = '';
    if (mainContainer) {
        mainContainer.style.padding = '';
        mainContainer.style.marginLeft = '';
    }

    stopListening();

    if (clockInterval.value) {
        clearInterval(clockInterval.value);
    }

    if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
    }

    if (reconnectInterval.value) {
        clearInterval(reconnectInterval.value);
    }

    if (wakeLock !== null) {
        wakeLock.release();
    }
});

// Format time
const formatTime = (date) => {
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (date) => {
    return date.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};
</script>

<template>
    <div class="tv-hospitalization-container">
        <!-- TV Header -->
        <div class="tv-header">
            <div class="tv-header-left">
                <div class="tv-logo">
                    <i class="pi pi-building"></i>
                </div>
                <div class="tv-title-section">
                    <h1 class="tv-title">HOSPITALIZACIÓN</h1>
                    <p class="tv-subtitle">{{ formatDate(currentTime) }}</p>
                </div>
            </div>

            <!-- TV Statistics integrated in header -->
            <div class="tv-header-stats">
                <!-- Occupancy -->
                <div class="tv-header-stat-item tv-header-stat--primary">
                    <i class="pi pi-building"></i>
                    <div class="tv-header-stat-info">
                        <span class="tv-header-stat-value">{{ globalStats.occupiedBeds }}/{{ globalStats.totalBeds }}</span>
                        <span class="tv-header-stat-label">OCUPADAS</span>
                    </div>
                </div>

                <!-- Free Beds -->
                <div class="tv-header-stat-item tv-header-stat--success">
                    <i class="pi pi-check-circle"></i>
                    <div class="tv-header-stat-info">
                        <span class="tv-header-stat-value">{{ globalStats.freeBeds }}</span>
                        <span class="tv-header-stat-label">LIBRES</span>
                    </div>
                </div>

                <!-- Pending Tasks -->
                <div v-if="globalStats.totalTasks > 0" class="tv-header-stat-item tv-header-stat--info">
                    <i class="pi pi-list-check"></i>
                    <div class="tv-header-stat-info">
                        <span class="tv-header-stat-value">{{ globalStats.totalTasks }}</span>
                        <span class="tv-header-stat-label">TAREAS</span>
                    </div>
                </div>

                <!-- Alerts -->
                <div v-if="globalStats.alertRooms > 0" class="tv-header-stat-item tv-header-stat--alert">
                    <i class="pi pi-bell tv-stat-icon--pulse"></i>
                    <div class="tv-header-stat-info">
                        <span class="tv-header-stat-value">{{ globalStats.alertRooms }}</span>
                        <span class="tv-header-stat-label">ALERTAS</span>
                    </div>
                </div>
            </div>

            <div class="tv-header-right">
                <div class="tv-clock">
                    <i class="pi pi-clock"></i>
                    <span class="tv-clock-time">{{ formatTime(currentTime) }}</span>
                </div>

                <div class="tv-exit-button" @click="enterFullscreen" title="Pantalla Completa">
                    <i class="pi pi-window-maximize"></i>
                </div>

                <div class="tv-exit-button" @click="router.push({ name: 'hospitalizacion' })" title="Salir de vista TV">
                    <i class="pi pi-arrow-left"></i>
                    <span>Salir</span>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="state.isLoading && !state.status" class="tv-loading">
            <i class="pi pi-spin pi-spinner"></i>
            <p>Cargando información...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="state.error" class="tv-error">
            <i class="pi pi-exclamation-triangle"></i>
            <h3>Error al cargar datos</h3>
            <p>{{ state.error }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!state.status || state.status.length === 0" class="tv-empty">
            <i class="pi pi-home"></i>
            <h3>No hay habitaciones disponibles</h3>
        </div>

        <!-- TV Rooms Grid -->
        <div v-else class="tv-rooms-grid">
            <div v-for="room in filteredRooms" :key="room.id" class="tv-room-card-container">
                <RoomCard :room="room" :read-only="true" />
            </div>
        </div>

        <!-- TV Footer -->
        <div class="tv-footer">
            <div class="tv-footer-item">
                <i class="pi pi-sync"></i>
                <span>Última actualización: {{ formatTime(lastUpdate) }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Exit Button */
.tv-exit-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: #94a3b8;
    font-size: 0.9rem;
    font-weight: 500;
}

.tv-exit-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    border-color: rgba(148, 163, 184, 0.4);
}

.tv-exit-button i {
    font-size: 0.9rem;
}

/* TV Container */
.tv-hospitalization-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999; /* Overlay everything including layout footer/sidebar */
    overflow: hidden;
    /* Professional Dark Health Theme: Dark Slate/Deep Teal */
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #f8fafc;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    box-sizing: border-box;
}

/* TV Header */
.tv-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    flex-shrink: 0;
    gap: 1.5rem;
}

.tv-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
}

.tv-logo {
    width: 36px;
    height: 36px;
    /* Professional Medical Blue/Teal Gradient */
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
}

.tv-logo i {
    font-size: 1.4rem;
    color: white;
}

.tv-title-section {
    display: flex;
    flex-direction: column;
}

.tv-title {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.5px;
    line-height: 1.1;
    color: #e2e8f0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tv-subtitle {
    font-size: 0.8rem;
    margin: 0;
    color: #94a3b8;
    text-transform: capitalize;
    font-weight: 500;
}

/* Header Statistics */
.tv-header-stats {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex: 1;
    justify-content: center;
}

.tv-header-stat-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0.8rem;
    background: rgba(30, 41, 59, 0.6);
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    min-width: 120px;
    backdrop-filter: blur(4px);
}

/* Refined status colors - softer, more professional */
.tv-header-stat--primary {
    border-left: 3px solid #38bdf8;
    background: linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, rgba(30, 41, 59, 0) 100%);
}
.tv-header-stat--success {
    border-left: 3px solid #4ade80;
    background: linear-gradient(90deg, rgba(74, 222, 128, 0.1) 0%, rgba(30, 41, 59, 0) 100%);
}
.tv-header-stat--info {
    border-left: 3px solid #818cf8;
    background: linear-gradient(90deg, rgba(129, 140, 248, 0.1) 0%, rgba(30, 41, 59, 0) 100%);
}
.tv-header-stat--alert {
    border-left: 3px solid #fb7185;
    background: linear-gradient(90deg, rgba(251, 113, 133, 0.1) 0%, rgba(30, 41, 59, 0) 100%);
    animation: tv-pulse-alert 3s infinite;
}

.tv-header-stat-item i {
    font-size: 1.5rem;
}

.tv-header-stat--primary i {
    color: #38bdf8;
}
.tv-header-stat--success i {
    color: #4ade80;
}
.tv-header-stat--info i {
    color: #818cf8;
}
.tv-header-stat--alert i {
    color: #fb7185;
}

.tv-header-stat-info {
    display: flex;
    flex-direction: column;
}

.tv-header-stat-value {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1;
    color: #f1f5f9;
}

.tv-header-stat-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.5px;
}

.tv-header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
}

.tv-clock {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(30, 41, 59, 0.6);
    padding: 0.5rem 1rem;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.2);
}

.tv-clock i {
    font-size: 1.2rem;
    color: #38bdf8;
}

.tv-clock-time {
    font-size: 1.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #e2e8f0;
}

@keyframes tv-pulse-alert {
    0%,
    100% {
        box-shadow: 0 0 0 0 rgba(251, 113, 133, 0);
    }
    50% {
        box-shadow: 0 0 10px 0 rgba(251, 113, 133, 0.2);
    }
}

.tv-stat-icon--pulse {
    animation: icon-pulse 2s ease-in-out infinite;
}

@keyframes icon-pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
}

/* TV Rooms Grid */
.tv-rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 0.6rem;
    flex: 1;
    overflow-y: auto;
    padding-right: 0.5rem;
    padding-top: 0.2rem;
}

.tv-rooms-grid::-webkit-scrollbar {
    width: 8px;
}

.tv-rooms-grid::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.5);
    border-radius: 4px;
}

.tv-rooms-grid::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 4px;
}

.tv-rooms-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.5);
}

.tv-room-card-container {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Loading, Error, Empty States */
.tv-loading,
.tv-error,
.tv-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
}

.tv-loading i,
.tv-error i,
.tv-empty i {
    font-size: 4rem;
    color: #475569;
}

.tv-loading p,
.tv-error p,
.tv-empty p {
    font-size: 1.5rem;
    color: #94a3b8;
    margin: 0;
}

.tv-error h3,
.tv-empty h3 {
    font-size: 2rem;
    margin: 0;
    color: #e2e8f0;
}

/* TV Footer */
.tv-footer {
    margin-top: 0.5rem;
    padding-top: 0.4rem;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
    display: flex;
    justify-content: center;
    flex-shrink: 0;
}

.tv-footer-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    font-size: 0.9rem;
    color: #64748b;
    font-weight: 500;
}

.tv-footer-item i {
    font-size: 1rem;
}

/* Increase font sizes in RoomCard for TV */
:deep(.room-card) {
    font-size: 1.1rem;
    background: rgba(30, 41, 59, 0.7) !important;
    border: 1px solid rgba(148, 163, 184, 0.2) !important;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
}

:deep(.room-header) {
    font-size: 1.3rem;
    background: rgba(15, 23, 42, 0.5) !important;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1) !important;
}

:deep(.bed-card) {
    font-size: 1rem;
    background: rgba(51, 65, 85, 0.3) !important;
}

/* Force white text for critical info in dark mode TV */
:deep(.patient-name) {
    color: #ffffff !important;
    font-weight: 700 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

:deep(.doctor-name),
:deep(.doctor-name span),
:deep(.doctor-name i) {
    color: #e2e8f0 !important;
}

:deep(.sub-info-item),
:deep(.sub-info-item i) {
    color: #cbd5e1 !important;
}

:deep(.bed-number) {
    color: #38bdf8 !important;
    font-weight: 800 !important;
}

:deep(.stat-label-compact) {
    color: #94a3b8 !important;
}

:deep(.stat-value-compact) {
    color: #f1f5f9 !important;
}

/* Room Header Visibility Improvements */
:deep(.room-card__header h3) {
    color: #ffffff !important;
    font-weight: 800 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

:deep(.room-card__header i.pi-home) {
    color: #38bdf8 !important; /* Sky blue icon */
}

:deep(.room-type-badge-inline) {
    background: rgba(56, 189, 248, 0.15) !important;
    color: #bae6fd !important; /* Light sky blue text */
    border: 1px solid rgba(56, 189, 248, 0.3) !important;
    padding: 0.3rem 0.6rem !important;
    font-size: 0.85rem !important;
}

:deep(.room-type-badge-inline i) {
    color: #38bdf8 !important;
}

/* --- OPTIMIZATION FOR 1080p SCREENS --- */
@media screen and (max-height: 1080px) {
    .tv-hospitalization-container {
        padding: 0.25rem !important;
    }

    .tv-header {
        margin-bottom: 0.2rem !important;
        padding-bottom: 0.2rem !important;
        gap: 1rem !important;
    }

    .tv-logo {
        width: 32px !important;
        height: 32px !important;
    }

    .tv-title {
        font-size: 1.2rem !important;
    }

    .tv-subtitle {
        font-size: 0.75rem !important;
    }

    .tv-header-stat-item {
        padding: 0.25rem 0.6rem !important;
        min-width: 100px !important;
    }

    .tv-header-stat-value {
        font-size: 1.2rem !important;
    }

    .tv-header-stat-label {
        font-size: 0.65rem !important;
    }

    .tv-rooms-grid {
        gap: 0.4rem !important;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
    }

    /* Shrink RoomCard internals */
    :deep(.room-card) {
        padding: 0.5rem !important;
        gap: 0.4rem !important;
    }

    :deep(.room-header) {
        font-size: 1.1rem !important;
        margin-bottom: 0.2rem !important;
    }

    :deep(.room-card__header h3) {
        font-size: 1.4rem !important;
    }

    /* Critical: Reduce Bed Indicator Height */
    :deep(.bed-indicator) {
        min-height: 90px !important;
    }

    :deep(.bed-indicator .bed-header) {
        margin-bottom: 0.2rem !important;
    }

    :deep(.patient-name) {
        font-size: 0.9rem !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
    }

    :deep(.doctor-name),
    :deep(.sub-info-item) {
        font-size: 0.8rem !important;
    }

    .tv-footer {
        margin-top: 0.25rem !important;
        padding-top: 0.25rem !important;
        font-size: 0.8rem !important;
    }
}
</style>
