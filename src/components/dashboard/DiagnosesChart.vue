<script setup>
import { computed } from 'vue';
import Chart from 'primevue/chart';

const props = defineProps({
    diagnoses: {
        type: Object,
        default: () => ({})
    },
    loading: {
        type: Boolean,
        default: false
    }
});

// Obtener la lista de diagnósticos del objeto top_diagnoses
const topDiagnosesList = computed(() => {
    if (!props.diagnoses || !props.diagnoses.top_list || props.diagnoses.top_list.length === 0) {
        return [];
    }
    return props.diagnoses.top_list;
});

const chartData = computed(() => {
    if (topDiagnosesList.value.length === 0) return null;

    // Crear etiquetas con código y nombre truncado
    const labels = topDiagnosesList.value.map((d) => {
        const name = d.name.length > 30 ? d.name.substring(0, 30) + '...' : d.name;
        return `${d.code} - ${name}`;
    });

    const data = topDiagnosesList.value.map((d) => d.count);

    // Colores vibrantes para cada diagnóstico
    const backgroundColors = [
        'rgba(239, 68, 68, 0.8)', // red
        'rgba(249, 115, 22, 0.8)', // orange
        'rgba(245, 158, 11, 0.8)', // amber
        'rgba(34, 197, 94, 0.8)', // green
        'rgba(20, 184, 166, 0.8)', // teal
        'rgba(59, 130, 246, 0.8)', // blue
        'rgba(99, 102, 241, 0.8)', // indigo
        'rgba(168, 85, 247, 0.8)', // purple
        'rgba(236, 72, 153, 0.8)', // pink
        'rgba(251, 146, 60, 0.8)' // orange-400
    ];

    return {
        labels,
        datasets: [
            {
                label: 'Casos',
                data,
                backgroundColor: backgroundColors.slice(0, data.length),
                borderColor: backgroundColors.slice(0, data.length).map((c) => c.replace('0.8', '1')),
                borderWidth: 2
            }
        ]
    };
});

const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#ddd',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
                label: function (context) {
                    const index = context.dataIndex;
                    const diagnosis = topDiagnosesList.value[index];
                    return [
                        `Casos: ${diagnosis.count}`,
                        `Porcentaje: ${diagnosis.percentage}%`
                    ];
                },
                title: function (context) {
                    const index = context[0].dataIndex;
                    const diagnosis = topDiagnosesList.value[index];
                    return [`CIE-10: ${diagnosis.code}`, diagnosis.name];
                }
            }
        }
    },
    scales: {
        x: {
            beginAtZero: true,
            ticks: {
                precision: 0
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            },
            title: {
                display: true,
                text: 'Número de Casos',
                font: {
                    size: 12,
                    weight: 'bold'
                }
            }
        },
        y: {
            grid: {
                display: false
            },
            ticks: {
                font: {
                    size: 11,
                    weight: '600'
                },
                autoSkip: false
            }
        }
    }
};

// Estadísticas generales
const totalDiagnoses = computed(() => props.diagnoses?.total_diagnoses || 0);
const totalCases = computed(() => props.diagnoses?.total_cases || 0);
</script>

<template>
    <div class="diagnoses-chart-container">
        <!-- Estadísticas generales -->
        <div v-if="totalDiagnoses > 0" class="stats-summary">
            <div class="stat-item">
                <span class="stat-label">Total de diagnósticos únicos:</span>
                <span class="stat-value">{{ totalDiagnoses }}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total de casos:</span>
                <span class="stat-value">{{ totalCases }}</span>
            </div>
        </div>

        <!-- Gráfico de barras horizontales -->
        <div class="chart-wrapper">
            <Chart v-if="chartData" type="bar" :data="chartData" :options="chartOptions" class="diagnoses-chart" />
            <div v-else class="no-data">
                <i class="pi pi-chart-bar text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">No hay datos de diagnósticos disponibles</p>
            </div>
        </div>

        <!-- Lista detallada de diagnósticos -->
        <div v-if="topDiagnosesList.length > 0" class="diagnoses-list">
            <div v-for="(diagnosis, index) in topDiagnosesList" :key="diagnosis.code" class="diagnosis-item">
                <div class="diagnosis-rank">
                    <span class="rank-number">{{ index + 1 }}</span>
                </div>
                <div class="diagnosis-info">
                    <div class="diagnosis-header">
                        <span class="diagnosis-code">{{ diagnosis.code }}</span>
                        <span class="diagnosis-percentage">{{ diagnosis.percentage }}%</span>
                    </div>
                    <span class="diagnosis-name">{{ diagnosis.name }}</span>
                    <span class="diagnosis-count">{{ diagnosis.count }} casos</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.diagnoses-chart-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.stats-summary {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-200);
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-label {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    font-weight: 500;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
}

.chart-wrapper {
    width: 100%;
    height: 450px;
    position: relative;
}

.diagnoses-chart {
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

.diagnoses-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.diagnosis-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-200);
    transition: all 0.2s ease;
}

.diagnosis-item:hover {
    background: var(--surface-100);
    border-color: var(--primary-300);
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.diagnosis-rank {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.diagnosis-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
}

.diagnosis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
}

.diagnosis-code {
    font-weight: 700;
    color: var(--primary-color);
    font-size: 0.95rem;
    font-family: 'Courier New', monospace;
}

.diagnosis-percentage {
    font-weight: 700;
    color: var(--text-color);
    font-size: 0.875rem;
    background: var(--primary-100);
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
}

.diagnosis-name {
    font-size: 0.8125rem;
    color: var(--text-color);
    font-weight: 500;
    line-height: 1.4;
}

.diagnosis-count {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    font-weight: 600;
}

@media (max-width: 768px) {
    .chart-wrapper {
        height: 350px;
    }

    .diagnoses-list {
        grid-template-columns: 1fr;
    }

    .stats-summary {
        flex-direction: column;
        gap: 1rem;
    }
}
</style>
