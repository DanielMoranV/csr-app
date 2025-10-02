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

const chartData = computed(() => {
    if (!props.diagnoses || Object.keys(props.diagnoses).length === 0) return null;

    const entries = Object.entries(props.diagnoses);
    const labels = entries.map(([code]) => code);
    const data = entries.map(([, count]) => count);

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
                    return `Casos: ${context.parsed.x}`;
                },
                title: function (context) {
                    return `CIE-10: ${context[0].label}`;
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
                    size: 12,
                    weight: 'bold'
                }
            }
        }
    }
};

// Lista de diagnósticos con conteo
const diagnosesList = computed(() => {
    if (!props.diagnoses) return [];

    return Object.entries(props.diagnoses)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count);
});
</script>

<template>
    <div class="diagnoses-chart-container">
        <!-- Gráfico de barras horizontales -->
        <div class="chart-wrapper">
            <Chart v-if="chartData" type="bar" :data="chartData" :options="chartOptions" class="diagnoses-chart" />
            <div v-else class="no-data">
                <i class="pi pi-chart-bar text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">No hay datos de diagnósticos disponibles</p>
            </div>
        </div>

        <!-- Lista alternativa (opcional, para referencia) -->
        <div v-if="diagnosesList.length > 0" class="diagnoses-list">
            <div v-for="(diagnosis, index) in diagnosesList" :key="diagnosis.code" class="diagnosis-item">
                <div class="diagnosis-rank">
                    <span class="rank-number">{{ index + 1 }}</span>
                </div>
                <div class="diagnosis-info">
                    <span class="diagnosis-code">{{ diagnosis.code }}</span>
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

.chart-wrapper {
    width: 100%;
    height: 400px;
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
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
}

.diagnosis-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-200);
    transition: all 0.2s ease;
}

.diagnosis-item:hover {
    background: var(--surface-100);
    border-color: var(--primary-300);
}

.diagnosis-rank {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary-500);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
    flex-shrink: 0;
}

.diagnosis-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-width: 0;
}

.diagnosis-code {
    font-weight: 700;
    color: var(--text-color);
    font-size: 0.9rem;
}

.diagnosis-count {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

@media (max-width: 768px) {
    .chart-wrapper {
        height: 350px;
    }

    .diagnoses-list {
        grid-template-columns: 1fr;
    }
}
</style>
