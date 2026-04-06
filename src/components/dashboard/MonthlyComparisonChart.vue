<script setup>
import { hospitalStatistics } from '@/api';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import InputNumber from 'primevue/inputnumber';
import { computed, onMounted, ref } from 'vue';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const COLORS = {
    admissions: { bg: 'rgba(59, 130, 246, 0.75)', border: 'rgb(59, 130, 246)' },
    discharges: { bg: 'rgba(16, 185, 129, 0.75)', border: 'rgb(16, 185, 129)' },
    occupancy: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgb(245, 158, 11)' },
};

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const year = ref(currentYear);
const selectedMonths = ref(Array.from({ length: currentMonth }, (_, i) => i + 1));
const apiData = ref(null);
const loading = ref(false);
const error = ref(null);

const toggleMonth = (m) => {
    const idx = selectedMonths.value.indexOf(m);
    if (idx === -1) {
        selectedMonths.value = [...selectedMonths.value, m].sort((a, b) => a - b);
    } else if (selectedMonths.value.length > 1) {
        selectedMonths.value = selectedMonths.value.filter((x) => x !== m);
    }
};

const occupancyClass = (rate) => {
    if (rate >= 85) return 'occ-high';
    if (rate >= 60) return 'occ-mid';
    return 'occ-low';
};

const chartData = computed(() => {
    if (!apiData.value) return null;
    const { chart_data } = apiData.value;

    return {
        labels: chart_data.labels,
        datasets: chart_data.datasets.map((ds) => {
            if (ds.type === 'line') {
                return {
                    ...ds,
                    backgroundColor: COLORS.occupancy.bg,
                    borderColor: COLORS.occupancy.border,
                    borderWidth: 2.5,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: COLORS.occupancy.border,
                    fill: true,
                };
            }
            const color = ds.label.includes('Admis') ? COLORS.admissions : COLORS.discharges;
            return {
                ...ds,
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 1,
                borderRadius: 4,
                hoverBackgroundColor: color.border,
            };
        }),
    };
});

const chartOptions = computed(() => {
    if (!apiData.value) return {};
    const { chart_data, months_data } = apiData.value;

    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true, padding: 20, font: { size: 13 } },
            },
            tooltip: {
                padding: 12,
                callbacks: {
                    label: (ctx) => {
                        const suffix = ctx.dataset.yAxisID === 'y1' ? '%' : '';
                        return `  ${ctx.dataset.label}: ${ctx.parsed.y}${suffix}`;
                    },
                    footer: ([first]) => {
                        const mes = months_data[first.dataIndex];
                        return [`Total activos: ${mes.total_attentions}`, `Prom. activos/día: ${mes.average_active_attentions}`];
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 12 } },
            },
            y: {
                ...chart_data.suggested_scales.y,
                ticks: { stepSize: 5 },
            },
            y1: {
                ...chart_data.suggested_scales.y1,
                ticks: {
                    stepSize: 20,
                    callback: (val) => `${val}%`,
                },
            },
        },
    };
});

const load = async () => {
    if (!selectedMonths.value.length) return;
    loading.value = true;
    error.value = null;
    try {
        const response = await hospitalStatistics.getMonthlyComparison({
            year: year.value,
            months: [...selectedMonths.value].sort((a, b) => a - b),
        });
        if (response.success) {
            apiData.value = response.data;
        } else {
            throw new Error(response.message || 'Error al obtener datos');
        }
    } catch (e) {
        error.value = e.message || 'Error al cargar la comparativa mensual';
    } finally {
        loading.value = false;
    }
};

onMounted(load);
</script>

<template>
    <div class="monthly-comparison">
        <!-- Controles -->
        <div class="mc-controls">
            <div class="mc-year-group">
                <label class="mc-label">Año</label>
                <InputNumber v-model="year" :min="2020" :max="currentYear" :useGrouping="false" class="mc-year-input" inputClass="mc-year-input-field" />
            </div>

            <div class="mc-months-group">
                <label class="mc-label">Meses</label>
                <div class="mc-pills">
                    <button
                        v-for="(name, idx) in MONTH_NAMES"
                        :key="idx + 1"
                        :class="['mc-pill', { 'mc-pill--active': selectedMonths.includes(idx + 1) }]"
                        @click="toggleMonth(idx + 1)"
                        type="button"
                    >
                        <span v-if="selectedMonths.includes(idx + 1)" class="mc-pill-tag">{{ selectedMonths.indexOf(idx + 1) + 1 }}</span>
                        {{ name }}
                    </button>
                </div>
            </div>

            <Button
                label="Actualizar"
                icon="pi pi-sync"
                :loading="loading"
                :disabled="loading || !selectedMonths.length"
                @click="load"
                severity="primary"
                class="mc-load-button"
            />
        </div>

        <!-- KPI Cards -->
        <div v-if="apiData" class="mc-kpi-row">
            <div v-for="mes in apiData.months_data" :key="mes.month" class="mc-kpi-card">
                <span class="mc-kpi-label">{{ mes.label }}</span>
                <div class="mc-kpi-main">
                    <span :class="['mc-kpi-value', occupancyClass(mes.average_occupancy_rate)]">{{ mes.average_occupancy_rate }}%</span>
                    <span class="mc-kpi-unit">ocupación</span>
                </div>
                <div class="mc-kpi-sub-row">
                    <span class="mc-kpi-sub">Admisiones: <strong>{{ mes.new_admissions }}</strong></span>
                    <span class="mc-kpi-sub">Altas: <strong>{{ mes.discharges }}</strong></span>
                </div>
                <span class="mc-kpi-occ" style="color: var(--text-color-secondary)">
                    {{ mes.total_attentions }} activos
                </span>
            </div>
        </div>

        <!-- Gráfico -->
        <div class="mc-chart-wrapper">
            <Chart v-if="chartData" type="bar" :data="chartData" :options="chartOptions" class="mc-chart" />
            <div v-else-if="!loading" class="mc-empty">
                <i class="pi pi-chart-bar text-4xl mb-3" style="color: var(--text-color-secondary)"></i>
                <p style="color: var(--text-color-secondary)">Selecciona un año y al menos un mes para visualizar.</p>
            </div>
            <div v-if="loading && !chartData" class="mc-empty">
                <i class="pi pi-spin pi-spinner text-4xl" style="color: var(--primary-500)"></i>
            </div>
        </div>

        <p v-if="error" class="mc-error">
            <i class="pi pi-exclamation-triangle mr-2"></i>{{ error }}
        </p>
    </div>
</template>

<style scoped>
.monthly-comparison {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* Controles */
.mc-controls {
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
    flex-wrap: wrap;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-200);
}

.mc-year-group,
.mc-months-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mc-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
}

.mc-year-input {
    width: 100px;
}

:deep(.mc-year-input-field) {
    width: 100px;
    text-align: center;
}

.mc-pills {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.mc-pill {
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--surface-300);
    background: var(--surface-card);
    color: var(--text-color-secondary);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.15s ease;
}

.mc-pill:hover {
    border-color: var(--primary-400);
    color: var(--primary-600);
}

.mc-pill--active {
    background: #3b82f6;
    color: #ffffff;
    border-color: #3b82f6;
}

.mc-pill--active:hover {
    background: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
}

.mc-pill-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
    line-height: 1;
    margin-right: 0.25rem;
}

.mc-load-button {
    align-self: flex-end;
}

/* KPI Cards */
.mc-kpi-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.mc-kpi-card {
    flex: 1;
    min-width: 140px;
    padding: 1rem;
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    background: var(--surface-card);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.mc-kpi-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.mc-kpi-main {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
}

.mc-kpi-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1;
}

.mc-kpi-unit {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.mc-kpi-sub-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.mc-kpi-sub {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

.mc-kpi-occ {
    font-size: 0.9rem;
    font-weight: 600;
    margin-top: 0.25rem;
}

.occ-high { color: #ef4444; }
.occ-mid  { color: #f59e0b; }
.occ-low  { color: #10b981; }

/* Gráfico */
.mc-chart-wrapper {
    width: 100%;
    height: 380px;
    position: relative;
}

.mc-chart {
    width: 100%;
    height: 100%;
}

.mc-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.mc-error {
    color: #ef4444;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
}

@media (max-width: 768px) {
    .mc-controls {
        flex-direction: column;
        align-items: stretch;
    }

    .mc-load-button {
        align-self: stretch;
    }

    .mc-chart-wrapper {
        height: 300px;
    }

    .mc-kpi-value {
        font-size: 1.5rem;
    }
}
</style>
