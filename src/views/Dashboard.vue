<script setup>
import BedOccupancyAnalysis from '@/components/dashboard/BedOccupancyAnalysis.vue';
import DiagnosesChart from '@/components/dashboard/DiagnosesChart.vue';
import DoctorsTable from '@/components/dashboard/DoctorsTable.vue';
import KPICard from '@/components/dashboard/KPICard.vue';
import { useHospitalStatistics } from '@/composables/useHospitalStatistics';
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import { useDashboardStore } from '@/store/dashboardStore';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const dashboardStore = useDashboardStore();
const { startListening, stopListening } = useRealtimeEvents();

// Hospital Statistics
const { loading: statsLoading, dashboard: hospitalDashboard, fetchDashboard, getDefaultDateRange, occupancyRate, currentlyActive, averageStayDays, totalAdmissions } = useHospitalStatistics();

const isLoading = computed(() => dashboardStore.isLoading);

// Date range filter
const dateRange = ref(null);
const showAdvancedStats = ref(true);

// Helper function to format numbers
const formatNumber = (value, decimals = 2) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num.toFixed(decimals);
};

// Initialize date range
const initializeDateRange = () => {
    const defaultRange = getDefaultDateRange();
    dateRange.value = [new Date(defaultRange.start_date), new Date(defaultRange.end_date)];
};

// Handle date range change
const onDateRangeChange = async () => {
    if (dateRange.value && dateRange.value.length === 2) {
        const [start, end] = dateRange.value;

        // Validar que ambas fechas estén seleccionadas
        if (!start || !end) {
            return;
        }

        try {
            await fetchDashboard({
                start_date: start.toISOString().split('T')[0],
                end_date: end.toISOString().split('T')[0]
            });
        } catch (err) {
            console.error('Error al cambiar el rango de fechas:', err);
        }
    }
};

const pieChartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                color: '#495057',
                padding: 10,
                font: {
                    size: 12
                },
                usePointStyle: true
            }
        }
    }
});

onMounted(async () => {
    initializeDateRange();

    // Cargar estadísticas del dashboard con filtro de fechas
    try {
        await fetchDashboard();
    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }

    // Start listening for real-time events
    startListening();
});

onBeforeUnmount(() => {
    // Stop listening for real-time events
    stopListening();
});
</script>

<template>
    <div class="dashboard-container">
        <!-- Header con filtros -->
        <div class="dashboard-header">
            <div class="header-content">
                <h1 class="dashboard-title">Dashboard Administrativo</h1>
                <p class="dashboard-subtitle">Vista general de las estadísticas hospitalarias</p>
            </div>
            <div class="header-actions">
                <Calendar v-model="dateRange" selectionMode="range" :manualInput="false" dateFormat="dd/mm/yy" placeholder="Seleccionar período" showIcon iconDisplay="input" @date-select="onDateRangeChange" class="date-range-picker" />
                <Button icon="pi pi-refresh" label="Actualizar" @click="fetchDashboard" :loading="statsLoading" severity="secondary" />
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading || statsLoading" class="loading-state">
            <ProgressSpinner />
            <p>Cargando estadísticas...</p>
        </div>

        <!-- Dashboard Content -->
        <div v-else class="dashboard-content">
            <!-- Mensaje si el API no está disponible -->
            <Message v-if="!hospitalDashboard && !statsLoading && showAdvancedStats" severity="info" :closable="false" class="mb-4">
                <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle"></i>
                    <span>Las estadísticas avanzadas no están disponibles en este momento. Mostrando estadísticas básicas.</span>
                </div>
            </Message>

            <!-- Estadísticas Hospitalarias Avanzadas (Nueva Sección) -->
            <div v-if="hospitalDashboard && showAdvancedStats" class="stats-section">
                <div class="section-header">
                    <h2 class="section-title">
                        <i class="pi pi-chart-line mr-2"></i>
                        Estadísticas Avanzadas
                    </h2>
                    <Button icon="pi pi-eye-slash" text rounded severity="secondary" @click="showAdvancedStats = false" v-tooltip="'Ocultar estadísticas avanzadas'" />
                </div>

                <!-- KPIs Principales -->
                <div class="kpi-grid">
                    <KPICard
                        title="Tasa de Ocupación"
                        :value="`${formatNumber(occupancyRate)}%`"
                        :subtitle="`${hospitalDashboard.occupancy?.summary?.total_bed_days_occupied || 0}/${hospitalDashboard.occupancy?.summary?.total_bed_days_available || 0} días-cama`"
                        icon="pi-chart-bar"
                        color="blue"
                        :loading="statsLoading"
                    />

                    <KPICard title="Hospitalizaciones Activas" :value="currentlyActive" :subtitle="`${hospitalDashboard.hospitalizations?.total_hospitalizations || 0} total del período`" icon="pi-building" color="green" :loading="statsLoading" />

                    <KPICard
                        title="Estancia Promedio"
                        :value="`${formatNumber(averageStayDays)} días`"
                        :subtitle="`Mediana: ${formatNumber(hospitalDashboard.hospitalizations?.median_stay_days)} días`"
                        icon="pi-clock"
                        color="purple"
                        :loading="statsLoading"
                    />

                    <KPICard title="Admisiones" :value="totalAdmissions" :subtitle="`${hospitalDashboard.occupancy?.summary?.total_discharges || 0} altas`" icon="pi-arrow-up-right" color="teal" :loading="statsLoading" />

                    <KPICard title="Casos Complejos" :value="hospitalDashboard.hospitalizations?.complex_cases || 0" subtitle="Múltiples diagnósticos" icon="pi-exclamation-triangle" color="orange" :loading="statsLoading" />

                    <KPICard title="Promedio Diario" :value="formatNumber(hospitalDashboard.occupancy?.summary?.average_daily_active)" subtitle="Pacientes activos" icon="pi-users" color="red" :loading="statsLoading" />
                </div>

                <!-- Análisis Completo de Ocupación de Camas -->
                <Card class="chart-card">
                    <template #title>
                        <div class="flex items-center justify-between">
                            <span>
                                <i class="pi pi-bed mr-2 text-primary"></i>
                                Análisis de Ocupación: Días-Cama Utilizados vs Disponibles
                            </span>
                        </div>
                    </template>
                    <template #content>
                        <BedOccupancyAnalysis :occupancyData="hospitalDashboard.occupancy" :loading="statsLoading" />
                    </template>
                </Card>

                <!-- Grid de Análisis -->
                <div class="analysis-grid">
                    <!-- Top Doctores -->
                    <Card class="analysis-card">
                        <template #title>
                            <i class="pi pi-users mr-2 text-primary"></i>
                            Top Doctores por Atenciones
                        </template>
                        <template #content>
                            <DoctorsTable :doctors="hospitalDashboard.top_doctors || []" :loading="statsLoading" />
                        </template>
                    </Card>

                    <!-- Distribución por Aseguradora -->
                    <Card class="analysis-card">
                        <template #title>
                            <i class="pi pi-shield mr-2 text-primary"></i>
                            Distribución por Aseguradora
                        </template>
                        <template #content>
                            <div v-if="hospitalDashboard.top_insurances && hospitalDashboard.top_insurances.length > 0" class="chart-container">
                                <Chart
                                    type="pie"
                                    :data="{
                                        labels: hospitalDashboard.top_insurances.map((i) => i.insurance),
                                        datasets: [
                                            {
                                                data: hospitalDashboard.top_insurances.map((i) => i.total_attentions),
                                                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']
                                            }
                                        ]
                                    }"
                                    :options="pieChartOptions"
                                />
                            </div>
                            <div v-else class="text-center text-gray-500 py-8">No hay datos disponibles</div>
                        </template>
                    </Card>

                    <!-- Tipos de Atención -->
                    <Card class="analysis-card">
                        <template #title>
                            <i class="pi pi-list mr-2 text-primary"></i>
                            Tipos de Atención
                        </template>
                        <template #content>
                            <div v-if="hospitalDashboard.hospitalizations?.by_type_attention" class="chart-container">
                                <Chart
                                    type="doughnut"
                                    :data="{
                                        labels: Object.keys(hospitalDashboard.hospitalizations.by_type_attention),
                                        datasets: [
                                            {
                                                data: Object.values(hospitalDashboard.hospitalizations.by_type_attention),
                                                backgroundColor: ['#EF4444', '#3B82F6', '#10B981']
                                            }
                                        ]
                                    }"
                                    :options="pieChartOptions"
                                />
                            </div>
                            <div v-else class="text-center text-gray-500 py-8">No hay datos disponibles</div>
                        </template>
                    </Card>

                    <!-- Top Diagnósticos CIE-10 -->
                    <Card class="analysis-card">
                        <template #title>
                            <i class="pi pi-book mr-2 text-primary"></i>
                            Diagnósticos Más Frecuentes (CIE-10)
                        </template>
                        <template #content>
                            <DiagnosesChart :diagnoses="hospitalDashboard.top_diagnoses || {}" :loading="statsLoading" />
                        </template>
                    </Card>
                </div>
            </div>

            <!-- Botón para mostrar estadísticas avanzadas si están ocultas -->
            <div v-else-if="!showAdvancedStats" class="show-stats-section">
                <Button icon="pi pi-eye" label="Mostrar Estadísticas Avanzadas" @click="showAdvancedStats = true" severity="info" size="large" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.dashboard-container {
    min-height: 100vh;
    background: var(--surface-ground);
    padding: 1.5rem;
}

.dashboard-header {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
}

.header-content {
    flex: 1;
    min-width: 250px;
}

.dashboard-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
}

.dashboard-subtitle {
    font-size: 1rem;
    color: var(--text-color-secondary);
    margin: 0;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.date-range-picker {
    min-width: 280px;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
}

.dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.stats-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--surface-border);
}

.section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0;
    display: flex;
    align-items: center;
}

.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
}

.chart-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.analysis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 1.5rem;
}

.analysis-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    height: 100%;
}

.chart-container {
    width: 100%;
    min-height: 400px;
    max-height: 450px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 2rem;
}

.chart-container > * {
    width: 100% !important;
    height: 100% !important;
    min-height: 350px;
}

.show-stats-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: var(--surface-card);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Vista General - KPIs Básicos */
.basic-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.kpi-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
}

.kpi-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.kpi-content {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.5rem;
}

.kpi-icon-wrapper {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    color: white;
    flex-shrink: 0;
}

.kpi-icon-wrapper.blue {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.kpi-icon-wrapper.green {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.kpi-icon-wrapper.orange {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.kpi-icon-wrapper.purple {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.kpi-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.kpi-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.kpi-value {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--text-color);
}

/* Overview Card */
.overview-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    margin-bottom: 2rem;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: var(--text-color-secondary);
}

.hospitalization-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
}

.stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: white;
}

.stat-icon.total {
    background: #3b82f6;
}

.stat-icon.occupied {
    background: #ef4444;
}

.stat-icon.available {
    background: #10b981;
}

.stat-icon.rate {
    background: #f59e0b;
}

.stat-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
}

.stat-label {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
}

/* Recent Admissions */
.recent-admissions-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--surface-border);
}

.subsection-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
}

.admissions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.admission-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

.admission-patient {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.patient-name {
    font-weight: 600;
    color: var(--text-color);
}

.room-badge {
    padding: 0.25rem 0.75rem;
    background: var(--primary-color);
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
}

.admission-details {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
}

.physician {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
}

.date {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

/* Charts Grid */
.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
}

.charts-grid-two {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
}

.chart-card-overview {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chart-wrapper-overview {
    min-height: 350px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-chart {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: var(--text-color-secondary);
}

/* Tickets List */
.tickets-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 400px;
    overflow-y: auto;
}

.ticket-item {
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
    transition: all 0.2s ease;
}

.ticket-item:hover {
    background: var(--surface-100);
    border-color: var(--primary-color);
}

.ticket-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.ticket-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
    flex: 1;
}

.ticket-badges {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

.ticket-description {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin: 0.5rem 0;
    line-height: 1.5;
}

.ticket-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--surface-border);
}

.ticket-creator {
    font-size: 0.8125rem;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
}

.ticket-date {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

/* Responsive */
@media (max-width: 1400px) {
    .analysis-grid {
        grid-template-columns: 1fr;
    }

    .charts-grid {
        grid-template-columns: 1fr;
    }

    .charts-grid-two {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .dashboard-container {
        padding: 1rem;
    }

    .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        padding: 1rem;
    }

    .dashboard-title {
        font-size: 1.5rem;
    }

    .header-actions {
        width: 100%;
        flex-direction: column;
    }

    .date-range-picker {
        width: 100%;
    }

    .kpi-grid {
        grid-template-columns: 1fr;
    }

    .basic-kpi-grid {
        grid-template-columns: 1fr;
    }

    .analysis-grid {
        grid-template-columns: 1fr;
    }

    .charts-grid {
        grid-template-columns: 1fr;
    }

    .charts-grid-two {
        grid-template-columns: 1fr;
    }

    .hospitalization-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .admission-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }

    .admission-details {
        align-items: flex-start;
    }

    .section-title {
        font-size: 1.25rem;
    }

    .chart-container {
        min-height: 300px;
        max-height: 350px;
        padding: 0.5rem 1rem;
    }

    .chart-container > * {
        min-height: 280px;
    }

    .chart-wrapper-overview {
        min-height: 300px;
    }

    .kpi-value {
        font-size: 1.5rem;
    }

    .stat-value {
        font-size: 1.25rem;
    }
}

@media (max-width: 480px) {
    .dashboard-title {
        font-size: 1.25rem;
    }

    .dashboard-subtitle {
        font-size: 0.875rem;
    }
}
</style>
