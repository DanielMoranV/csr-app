<script setup>
import { computed, watch, ref } from 'vue';
import Chart from 'primevue/chart';

const props = defineProps({
    chartData: {
        type: Object,
        required: true
    },
    summary: {
        type: Object,
        default: () => ({})
    }
});

const chartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 20,
                font: {
                    size: 12,
                    family: 'Inter, sans-serif'
                },
                usePointStyle: true,
                pointStyle: 'circle'
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#ddd',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
                label: function (context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.dataset.type === 'line') {
                        label += context.parsed.y.toFixed(2) + '%';
                    } else {
                        label += context.parsed.y;
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        y: {
            type: 'linear',
            display: true,
            position: 'left',
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
                drawBorder: false,
                color: 'rgba(0, 0, 0, 0.05)'
            }
        },
        y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            max: 100,
            title: {
                display: true,
                text: 'Tasa de Ocupación (%)',
                font: {
                    size: 12,
                    weight: 'bold'
                }
            },
            grid: {
                drawOnChartArea: false
            }
        },
        x: {
            grid: {
                display: false
            }
        }
    }
});

// Formatear datos para el gráfico combinado
const formattedChartData = computed(() => {
    if (!props.chartData) return null;

    return {
        labels: props.chartData.labels,
        datasets: [
            {
                type: 'bar',
                label: 'Días-Cama Ocupados',
                data: props.chartData.datasets.find((d) => d.label.includes('Ocupados'))?.data || [],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                type: 'bar',
                label: 'Días-Cama Disponibles',
                data: props.chartData.datasets.find((d) => d.label.includes('Disponibles'))?.data || [],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                type: 'line',
                label: 'Tasa de Ocupación (%)',
                data: props.chartData.datasets.find((d) => d.label.includes('Tasa'))?.data || [],
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                yAxisID: 'y1',
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgb(239, 68, 68)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }
        ]
    };
});
</script>

<template>
    <div class="occupancy-chart-container">
        <!-- Resumen de métricas -->
        <div v-if="summary" class="occupancy-summary">
            <div class="summary-item">
                <span class="summary-label">Período:</span>
                <span class="summary-value">{{ summary.period_days }} días</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Ocupación Promedio:</span>
                <span class="summary-value highlight">{{ summary.average_occupancy_rate }}%</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Total Admisiones:</span>
                <span class="summary-value">{{ summary.total_admissions }}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Total Altas:</span>
                <span class="summary-value">{{ summary.total_discharges }}</span>
            </div>
        </div>

        <!-- Gráfico -->
        <div class="chart-wrapper">
            <Chart v-if="formattedChartData" type="bar" :data="formattedChartData" :options="chartOptions" class="occupancy-chart" />
            <div v-else class="no-data">
                <i class="pi pi-chart-line text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">No hay datos de ocupación disponibles</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.occupancy-chart-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.occupancy-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-200);
}

.summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.summary-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
}

.summary-value.highlight {
    color: var(--primary-500);
}

.chart-wrapper {
    width: 100%;
    height: 400px;
    position: relative;
}

.occupancy-chart {
    width: 100%;
    height: 100%;
}

.no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-color-secondary);
}

@media (max-width: 768px) {
    .occupancy-summary {
        grid-template-columns: repeat(2, 1fr);
    }

    .chart-wrapper {
        height: 300px;
    }

    .summary-value {
        font-size: 1rem;
    }
}
</style>
