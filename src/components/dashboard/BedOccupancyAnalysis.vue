<script setup>
import { computed, ref } from 'vue';
import Chart from 'primevue/chart';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressBar from 'primevue/progressbar';

const props = defineProps({
    occupancyData: {
        type: Object,
        required: true
        // Esperamos: { summary, daily_data }
    },
    loading: {
        type: Boolean,
        default: false
    }
});

// Helper para parsear fechas locales
const parseLocalDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return new Date();
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(dateString);
    const [, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

// Datos para la tabla diaria
const dailyTableData = computed(() => {
    if (!props.occupancyData?.daily_data) return [];

    return props.occupancyData.daily_data.map((day) => {
        const bedsAvailable = day.total_beds_available || 0;
        const bedDaysAvailable = day.bed_days_available || 0;
        const bedDaysOccupied = day.bed_days_occupied || 0;
        const bedDaysVacant = bedDaysAvailable - bedDaysOccupied;
        const occupancyRate = typeof day.occupancy_rate === 'number' ? day.occupancy_rate : parseFloat(day.occupancy_rate) || 0;

        return {
            date: day.date,
            dateFormatted: parseLocalDate(day.date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }),
            bedsAvailable,
            bedDaysAvailable,
            bedDaysOccupied,
            bedDaysVacant,
            occupancyRate: occupancyRate.toFixed(2),
            newAdmissions: day.new_admissions || 0,
            discharges: day.discharges || 0,
            activeAttentions: day.active_attentions || 0
        };
    });
});

// Resumen mensual
const monthlySummary = computed(() => {
    if (!props.occupancyData?.summary) return null;

    const summary = props.occupancyData.summary;
    const avgOccupancyRate = typeof summary.average_occupancy_rate === 'number' ? summary.average_occupancy_rate : parseFloat(summary.average_occupancy_rate) || 0;
    const avgDailyActive = typeof summary.average_daily_active === 'number' ? summary.average_daily_active : parseFloat(summary.average_daily_active) || 0;

    return {
        periodDays: summary.period_days || 0,
        totalBedDaysAvailable: summary.total_bed_days_available || 0,
        totalBedDaysOccupied: summary.total_bed_days_occupied || 0,
        totalBedDaysVacant: summary.total_bed_days_vacant || 0,
        averageOccupancyRate: avgOccupancyRate.toFixed(2),
        totalAdmissions: summary.total_admissions || 0,
        totalDischarges: summary.total_discharges || 0,
        averageDailyActive: avgDailyActive.toFixed(1)
    };
});

// Gráfico de barras apiladas (Ocupado vs Disponible)
const stackedChartData = computed(() => {
    if (!dailyTableData.value.length) return null;

    const labels = dailyTableData.value.map((d) => d.dateFormatted);
    const occupied = dailyTableData.value.map((d) => d.bedDaysOccupied);
    const vacant = dailyTableData.value.map((d) => d.bedDaysVacant);

    return {
        labels,
        datasets: [
            {
                label: 'Días-Cama Ocupados',
                backgroundColor: '#EF4444',
                data: occupied,
                stack: 'stack1'
            },
            {
                label: 'Días-Cama Disponibles',
                backgroundColor: '#10B981',
                data: vacant,
                stack: 'stack1'
            }
        ]
    };
});

const stackedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 15,
                font: {
                    size: 12,
                    family: 'Inter, sans-serif'
                },
                usePointStyle: true
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
                footer: function (tooltipItems) {
                    const index = tooltipItems[0].dataIndex;
                    const day = dailyTableData.value[index];
                    return `Ocupación: ${day.occupancyRate}%`;
                }
            }
        }
    },
    scales: {
        x: {
            stacked: true,
            grid: {
                display: false
            },
            ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                    size: 10
                }
            }
        },
        y: {
            stacked: true,
            beginAtZero: true,
            title: {
                display: true,
                text: 'Días-Cama',
                font: {
                    size: 12,
                    weight: 'bold'
                }
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            }
        }
    }
};

// Calcular porcentaje de ocupación
const getOccupancyColor = (rate) => {
    if (rate >= 90) return 'danger';
    if (rate >= 75) return 'warning';
    if (rate >= 50) return 'success';
    return 'info';
};
</script>

<template>
    <div class="bed-occupancy-analysis">
        <!-- Resumen Mensual -->
        <div v-if="monthlySummary" class="summary-section">
            <h3 class="summary-title">
                <i class="pi pi-calendar mr-2"></i>
                Resumen del Período ({{ monthlySummary.periodDays }} días)
            </h3>

            <div class="summary-grid">
                <div class="summary-card total">
                    <div class="summary-icon">
                        <i class="pi pi-database"></i>
                    </div>
                    <div class="summary-content">
                        <span class="summary-label">Días-Cama Disponibles</span>
                        <span class="summary-value">{{ monthlySummary.totalBedDaysAvailable }}</span>
                        <span class="summary-hint">Capacidad total del período</span>
                    </div>
                </div>

                <div class="summary-card occupied">
                    <div class="summary-icon">
                        <i class="pi pi-check-circle"></i>
                    </div>
                    <div class="summary-content">
                        <span class="summary-label">Días-Cama Ocupados</span>
                        <span class="summary-value">{{ monthlySummary.totalBedDaysOccupied }}</span>
                        <span class="summary-hint">{{ monthlySummary.averageOccupancyRate }}% de ocupación</span>
                    </div>
                </div>

                <div class="summary-card vacant">
                    <div class="summary-icon">
                        <i class="pi pi-circle"></i>
                    </div>
                    <div class="summary-content">
                        <span class="summary-label">Días-Cama Libres</span>
                        <span class="summary-value">{{ monthlySummary.totalBedDaysVacant }}</span>
                        <span class="summary-hint">Capacidad no utilizada</span>
                    </div>
                </div>

                <div class="summary-card rate">
                    <div class="summary-icon">
                        <i class="pi pi-percentage"></i>
                    </div>
                    <div class="summary-content">
                        <span class="summary-label">Tasa de Ocupación Promedio</span>
                        <span class="summary-value">{{ monthlySummary.averageOccupancyRate }}%</span>
                        <ProgressBar :value="parseFloat(monthlySummary.averageOccupancyRate)" :show-value="false" class="mt-2" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Gráfico de Barras Apiladas -->
        <div class="chart-section">
            <h3 class="chart-title">
                <i class="pi pi-chart-bar mr-2"></i>
                Evolución Diaria: Ocupación vs Disponibilidad
            </h3>
            <div class="chart-wrapper">
                <Chart v-if="stackedChartData" type="bar" :data="stackedChartData" :options="stackedChartOptions" class="occupancy-chart" />
                <div v-else class="no-data">
                    <i class="pi pi-inbox text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-500">No hay datos disponibles</p>
                </div>
            </div>
        </div>

        <!-- Tabla Detallada por Día -->
        <div class="table-section">
            <h3 class="table-title">
                <i class="pi pi-list mr-2"></i>
                Detalle Diario de Ocupación
            </h3>

            <DataTable :value="dailyTableData" :loading="loading" stripedRows showGridlines paginator :rows="10" :rowsPerPageOptions="[10, 20, 30]" responsiveLayout="scroll" class="occupancy-table">
                <template #empty>
                    <div class="empty-state">
                        <i class="pi pi-inbox text-4xl text-gray-400 mb-2"></i>
                        <p class="text-gray-500">No hay datos de ocupación disponibles</p>
                    </div>
                </template>

                <Column field="dateFormatted" header="Fecha" :sortable="true" frozen style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="font-semibold">{{ data.dateFormatted }}</span>
                    </template>
                </Column>

                <Column field="bedsAvailable" header="Camas Operativas" :sortable="true" style="min-width: 140px">
                    <template #body="{ data }">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-building text-gray-400"></i>
                            <span>{{ data.bedsAvailable }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="bedDaysAvailable" header="Días-Cama Disponibles" :sortable="true" style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="font-medium text-blue-600">{{ data.bedDaysAvailable }}</span>
                    </template>
                </Column>

                <Column field="bedDaysOccupied" header="Días-Cama Ocupados" :sortable="true" style="min-width: 170px">
                    <template #body="{ data }">
                        <span class="font-medium text-red-600">{{ data.bedDaysOccupied }}</span>
                    </template>
                </Column>

                <Column field="bedDaysVacant" header="Días-Cama Libres" :sortable="true" style="min-width: 150px">
                    <template #body="{ data }">
                        <span class="font-medium text-green-600">{{ data.bedDaysVacant }}</span>
                    </template>
                </Column>

                <Column field="occupancyRate" header="Ocupación %" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <div class="occupancy-badge">
                            <Badge :value="`${data.occupancyRate}%`" :severity="getOccupancyColor(parseFloat(data.occupancyRate))" />
                        </div>
                    </template>
                </Column>

                <Column field="activeAttentions" header="Pacientes Activos" :sortable="true" style="min-width: 150px">
                    <template #body="{ data }">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-users text-purple-500"></i>
                            <span>{{ data.activeAttentions }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="newAdmissions" header="Ingresos" :sortable="true" style="min-width: 100px">
                    <template #body="{ data }">
                        <span class="text-green-600">+{{ data.newAdmissions }}</span>
                    </template>
                </Column>

                <Column field="discharges" header="Altas" :sortable="true" style="min-width: 100px">
                    <template #body="{ data }">
                        <span class="text-blue-600">-{{ data.discharges }}</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<style scoped>
.bed-occupancy-analysis {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

/* Summary Section */
.summary-section {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.summary-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 1.5rem 0;
    display: flex;
    align-items: center;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.summary-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 10px;
    border: 2px solid;
    transition: all 0.3s ease;
}

.summary-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-card.total {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-color: #3b82f6;
}

.summary-card.occupied {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-color: #ef4444;
}

.summary-card.vacant {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border-color: #10b981;
}

.summary-card.rate {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
}

.summary-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    flex-shrink: 0;
}

.summary-card.total .summary-icon {
    background: #3b82f6;
    color: white;
}

.summary-card.occupied .summary-icon {
    background: #ef4444;
    color: white;
}

.summary-card.vacant .summary-icon {
    background: #10b981;
    color: white;
}

.summary-card.rate .summary-icon {
    background: #f59e0b;
    color: white;
}

.summary-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
}

.summary-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-color);
}

.summary-hint {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

/* Chart Section */
.chart-section {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chart-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 1.5rem 0;
    display: flex;
    align-items: center;
}

.chart-wrapper {
    width: 100%;
    height: 450px;
    position: relative;
}

.occupancy-chart {
    width: 100%;
    height: 100%;
}

/* Table Section */
.table-section {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.table-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 1.5rem 0;
    display: flex;
    align-items: center;
}

.occupancy-table {
    font-size: 0.9rem;
}

.occupancy-badge {
    display: flex;
    justify-content: center;
}

.no-data,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: var(--text-color-secondary);
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
    background: var(--primary-50);
    color: var(--primary-700);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    padding: 1rem 0.75rem;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
    background: var(--surface-50);
}

:deep(.p-progressbar) {
    height: 8px;
    border-radius: 4px;
}

/* Responsive */
@media (max-width: 768px) {
    .summary-grid {
        grid-template-columns: 1fr;
    }

    .chart-wrapper {
        height: 350px;
    }

    .summary-value {
        font-size: 1.5rem;
    }

    .summary-icon {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
    }
}
</style>
