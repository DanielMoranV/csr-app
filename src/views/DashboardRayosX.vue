<script setup>
import { Chart as ChartJS } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(ChartDataLabels);

import { dashboardRayosX as rxApi } from '@/api/dashboardRayosX';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import SelectButton from 'primevue/selectbutton';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const toast = useToast();

// ─── State ────────────────────────────────────────────────────────────────────
const summary = ref(null);
const isLoading = ref(false);
const isExporting = ref(false);

const desde = ref(null);
const hasta = ref(null);

const topN = ref(10);
const topOptions = [
    { label: 'Top 10', value: 10 },
    { label: 'Top 20', value: 20 },
    { label: 'Top 50', value: 50 }
];

const chartMetric = ref('monto');
const showLabels = ref(false);
const selectedYears = ref([]);
const selectedMonths = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

const metricOptions = [
    { label: 'Importe', value: 'monto' },
    { label: 'Cantidad', value: 'cantidad' }
];

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthOptions = MONTH_NAMES.map((label, i) => ({ label, value: i + 1 }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toISO = (d) => d.toISOString().split('T')[0];

// Resolve CSS custom properties for Chart.js canvas (canvas ignores CSS vars)
const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;

// Increment to force lineChartOptions to re-evaluate on theme change
const themeKey = ref(0);

const fCurrency = (v) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v ?? 0);
const fCurrencyK = (v) => {
    const abs = Math.abs(v ?? 0);
    return abs >= 1000 ? `S/ ${(abs / 1000).toFixed(1)}K` : `S/ ${Math.round(abs)}`;
};
const fMoney = (v) => `S/ ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)}`;
const fNum = (v) => new Intl.NumberFormat('es-PE').format(v ?? 0);
const fPct = (v) => `${(v ?? 0).toFixed(1)}%`;

const REGION_COLORS = {
    Extremidades: '#3b82f6',
    Tórax: '#10b981',
    'Cabeza / Cuello': '#f59e0b',
    'Columna / Pelvis': '#8b5cf6',
    Abdomen: '#ef4444',
    'Vías Urinarias': '#06b6d4',
    Otros: '#94a3b8'
};
const regionColor = (r) => REGION_COLORS[r] || '#94a3b8';

// ─── Quick shortcuts ───────────────────────────────────────────────────────────
const setRange = (d, h) => {
    desde.value = d;
    hasta.value = h;
    fetchData();
};
const quickHoy = () => {
    const t = new Date();
    setRange(new Date(t), new Date(t));
};
const quickSemana = () => {
    const t = new Date();
    const lunes = new Date(t);
    lunes.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    setRange(lunes, new Date(t));
};
const quickMesActual = () => {
    const t = new Date();
    setRange(new Date(t.getFullYear(), t.getMonth(), 1), new Date(t));
};
const quickMesAnterior = () => {
    const t = new Date();
    setRange(new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0));
};
const quickAnio = () => {
    const t = new Date();
    setRange(new Date(t.getFullYear(), 0, 1), new Date(t));
};

// ─── Data fetching ─────────────────────────────────────────────────────────────
const fetchData = async () => {
    if (!desde.value || !hasta.value) return;
    isLoading.value = true;
    try {
        const res = await rxApi.getSummary({ desde: toISO(desde.value), hasta: toISO(hasta.value), top: topN.value });
        summary.value = res?.data || null;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos', life: 5000 });
    } finally {
        isLoading.value = false;
    }
};

const handleExport = async () => {
    if (!desde.value || !hasta.value) return;
    isExporting.value = true;
    try {
        const res = await rxApi.exportExcel({ desde: toISO(desde.value), hasta: toISO(hasta.value) });
        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rayosx-${toISO(desde.value)}-${toISO(hasta.value)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: 'Exportado', detail: 'Archivo descargado', life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el archivo', life: 4000 });
    } finally {
        isExporting.value = false;
    }
};

watch(topN, fetchData);

// ─── Year / Month filters ─────────────────────────────────────────────────────
const yearOptions = computed(() => {
    const rows = summary.value?.tendencia_mensual || [];
    const years = [...new Set(rows.map((r) => parseInt(r.mes.split('-')[0])))].filter((y) => !isNaN(y)).sort();
    return years.map((y) => ({ label: String(y), value: y }));
});

watch(yearOptions, (opts) => {
    selectedYears.value = opts.map((o) => o.value);
});

const toggleAllMonths = () => {
    selectedMonths.value = selectedMonths.value.length === 12 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
};

// ─── Chart: Evolución mensual por año ─────────────────────────────────────────
const monthlyChartData = computed(() => {
    const rows = summary.value?.tendencia_mensual || [];
    if (!rows.length) return { labels: [], datasets: [] };

    // Build lookup: byYear[year][month] = { atenciones, monto }
    const byYear = {};
    rows.forEach((r) => {
        const [y, m] = r.mes.split('-');
        const year = parseInt(y);
        const month = parseInt(m);
        if (!byYear[year]) byYear[year] = {};
        byYear[year][month] = r;
    });

    const years = Object.keys(byYear)
        .map(Number)
        .filter((y) => selectedYears.value.includes(y))
        .sort();

    const months = [...new Set(rows.map((r) => parseInt(r.mes.split('-')[1])))].filter((m) => selectedMonths.value.includes(m)).sort((a, b) => a - b);

    const labels = months.map((m) => MONTH_NAMES[m - 1]);
    const palette = ['#0369a1', '#64748b', '#14b8a6', '#d97706', '#8b5cf6'];

    const datasets = years.map((year, i) => {
        const color = palette[i % palette.length];
        const data = months.map((m) => {
            const row = byYear[year]?.[m];
            if (!row) return null;
            return chartMetric.value === 'monto' ? row.monto : row.atenciones;
        });
        return {
            label: String(year),
            data,
            borderColor: color,
            backgroundColor: color + '15',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2.5,
            pointBorderColor: color,
            spanGaps: true
        };
    });

    return { labels, datasets };
});

const lineChartOptions = computed(() => {
    // themeKey dependency forces re-evaluation on theme toggle
    void themeKey.value;
    const textColor = getCssVar('--text-color') || '#374151';
    const textMuted = getCssVar('--text-color-secondary') || '#6b7280';
    const surfaceCard = getCssVar('--surface-card') || '#ffffff';
    const borderColor = getCssVar('--surface-border') || '#e5e7eb';

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { usePointStyle: true, padding: 20, font: { size: 12 }, color: textColor }
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => (chartMetric.value === 'monto' ? ` ${fCurrency(ctx.parsed.y)}` : ` ${fNum(ctx.parsed.y)} atenciones`)
                }
            },
            datalabels: {
                display: showLabels.value,
                align: 'top',
                anchor: 'end',
                backgroundColor: surfaceCard,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: borderColor,
                color: textColor,
                font: { size: 10, weight: '700' },
                offset: 8,
                padding: { top: 3, bottom: 3, left: 6, right: 6 },
                shadowBlur: 6,
                shadowColor: 'rgba(0,0,0,0.12)',
                formatter: (v) => (v === null ? '' : chartMetric.value === 'monto' ? `S/ ${Math.round(v / 1000)}K` : fNum(v))
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: borderColor },
                ticks: {
                    font: { size: 10, weight: '600' },
                    color: textMuted,
                    callback: (v) => (chartMetric.value === 'monto' ? fCurrencyK(v) : v)
                }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 11 }, color: textMuted }
            }
        }
    };
});

// ─── Chart: Donut mix ─────────────────────────────────────────────────────────
const mixDonutData = computed(() => {
    const mix = summary.value?.mix;
    if (!mix) return null;
    return {
        labels: ['Particular', 'Seguros'],
        datasets: [{ data: [mix.particular?.pct_atenciones ?? 0, mix.aseguradora?.pct_atenciones ?? 0], backgroundColor: ['#0369a1', '#bae6fd'], borderWidth: 0, hoverOffset: 12 }]
    };
});

const donutOptions = {
    cutout: '72%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14, color: 'var(--text-color)' } },
        datalabels: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw.toFixed(1)}%` } }
    }
};

// ─── Chart: Regiones (horizontal bar) ─────────────────────────────────────────
const regionesChartData = computed(() => {
    const rows = [...(summary.value?.regiones || [])].sort((a, b) => b.atenciones - a.atenciones);
    return {
        labels: rows.map((r) => r.region),
        datasets: [
            {
                label: 'Atenciones',
                data: rows.map((r) => r.atenciones),
                backgroundColor: rows.map((r) => regionColor(r.region) + 'cc'),
                borderColor: rows.map((r) => regionColor(r.region)),
                borderWidth: 1,
                borderRadius: 4
            }
        ]
    };
});

const regionesOptions = computed(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${fNum(ctx.raw)} atenciones` } }
    },
    scales: {
        x: { ticks: { color: 'var(--text-color-secondary)' }, grid: { color: 'var(--surface-border)' } },
        y: { ticks: { color: 'var(--text-color)', font: { size: 12 } }, grid: { display: false } }
    }
}));

// ─── Chart: Procedencia (horizontal bar) ──────────────────────────────────────
const procedenciaChartData = computed(() => {
    const rows = [...(summary.value?.procedencia || [])].sort((a, b) => b.atenciones - a.atenciones);
    return {
        labels: rows.map((r) => r.procedencia),
        datasets: [
            {
                label: 'Atenciones',
                data: rows.map((r) => r.atenciones),
                backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(139,92,246,0.8)', 'rgba(167,139,250,0.7)', 'rgba(196,181,253,0.7)'],
                borderColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'],
                borderWidth: 1,
                borderRadius: 4
            }
        ]
    };
});

const procedenciaOptions = computed(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => {
                    const row = summary.value?.procedencia?.find((r) => r.procedencia === ctx.label);
                    return ` ${fNum(ctx.raw)} (${fPct(row?.pct_atenciones)})`;
                }
            }
        }
    },
    scales: {
        x: { ticks: { color: 'var(--text-color-secondary)' }, grid: { color: 'var(--surface-border)' } },
        y: { ticks: { color: 'var(--text-color)', font: { size: 12 } }, grid: { display: false } }
    }
}));

// ─── Chart: Estacionalidad semanal ────────────────────────────────────────────
const estacionalidadChartData = computed(() => {
    const rows = summary.value?.estacionalidad || [];
    const weekend = ['Domingo', 'Sábado'];
    const color = '#14b8a6';
    return {
        labels: rows.map((r) => r.dia),
        datasets: [
            {
                label: 'Atenciones',
                data: rows.map((r) => r.atenciones),
                backgroundColor: rows.map((r) => (weekend.includes(r.dia) ? color + '55' : color + 'CC')),
                borderColor: color,
                borderWidth: 1.5,
                borderRadius: 8,
                borderSkipped: false
            }
        ]
    };
});

const estacionalidadOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => {
                    const row = summary.value?.estacionalidad?.[ctx.dataIndex];
                    return [` Atenciones: ${fNum(ctx.raw)}`, ` Monto: ${fMoney(row?.monto)}`, ` Ticket: ${fMoney(row?.ticket_medio)}`];
                }
            }
        }
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12, weight: '700' }, color: 'var(--text-color-secondary)' } },
        y: { beginAtZero: true, grid: { color: 'var(--surface-border)' }, ticks: { font: { size: 10, weight: '600' }, color: 'var(--text-color-secondary)' } }
    }
}));

// ─── Sorted region table ───────────────────────────────────────────────────────
const regionesSorted = computed(() => [...(summary.value?.regiones || [])].sort((a, b) => b.atenciones - a.atenciones));

let themeObserver = null;

onMounted(() => {
    const now = new Date();
    desde.value = new Date(now.getFullYear() - 1, 0, 1);
    hasta.value = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    fetchData();

    // Detect PrimeVue dark mode toggle (class change on <html>)
    themeObserver = new MutationObserver(() => {
        themeKey.value++;
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
});

onUnmounted(() => {
    themeObserver?.disconnect();
});
</script>

<template>
    <div class="rx-container">
        <!-- Header -->
        <div class="rx-header">
            <div class="rx-header-left">
                <h1 class="rx-title">
                    <i class="pi pi-image rx-title-icon"></i>
                    Dashboard Rayos X
                </h1>
                <p class="rx-subtitle">Facturación y atenciones del servicio de Rayos X — Clínica Santa Rosa</p>
            </div>
            <div class="rx-header-right">
                <div class="rx-quick-btns">
                    <Button label="Hoy" size="small" severity="secondary" outlined @click="quickHoy" />
                    <Button label="Esta semana" size="small" severity="secondary" outlined @click="quickSemana" />
                    <Button label="Este mes" size="small" severity="secondary" outlined @click="quickMesActual" />
                    <Button label="Mes anterior" size="small" severity="secondary" outlined @click="quickMesAnterior" />
                    <Button label="Año actual" size="small" severity="secondary" outlined @click="quickAnio" />
                </div>
                <div class="rx-filter-row">
                    <div class="rx-filter-group">
                        <label class="rx-filter-label">Desde</label>
                        <Calendar v-model="desde" dateFormat="dd/mm/yy" showIcon iconDisplay="input" :maxDate="hasta" class="rx-calendar" />
                    </div>
                    <div class="rx-filter-group">
                        <label class="rx-filter-label">Hasta</label>
                        <Calendar v-model="hasta" dateFormat="dd/mm/yy" showIcon iconDisplay="input" :minDate="desde" class="rx-calendar" />
                    </div>
                    <Button icon="pi pi-search" label="Aplicar" :loading="isLoading" @click="fetchData" />
                    <Button icon="pi pi-download" label="Excel" severity="success" outlined :loading="isExporting" @click="handleExport" />
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="rx-loading">
            <ProgressSpinner />
            <p>Cargando datos...</p>
        </div>

        <template v-else-if="summary">
            <!-- KPIs -->
            <div class="rx-kpi-grid">
                <div class="rx-kpi-card rx-kpi-blue">
                    <div class="rx-kpi-icon-wrap"><i class="pi pi-users"></i></div>
                    <div class="rx-kpi-body">
                        <div class="rx-kpi-value">{{ fNum(summary.totales.atenciones) }}</div>
                        <div class="rx-kpi-label">Total Atenciones</div>
                    </div>
                </div>
                <div class="rx-kpi-card rx-kpi-green">
                    <div class="rx-kpi-icon-wrap"><i class="pi pi-dollar"></i></div>
                    <div class="rx-kpi-body">
                        <div class="rx-kpi-value">{{ fMoney(summary.totales.monto_total) }}</div>
                        <div class="rx-kpi-label">Facturación Total</div>
                    </div>
                </div>
                <div class="rx-kpi-card rx-kpi-amber">
                    <div class="rx-kpi-icon-wrap"><i class="pi pi-receipt"></i></div>
                    <div class="rx-kpi-body">
                        <div class="rx-kpi-value">{{ fMoney(summary.totales.ticket_medio) }}</div>
                        <div class="rx-kpi-label">Ticket Promedio</div>
                    </div>
                </div>
            </div>

            <!-- Filtros de evolución (Año + Mes) -->
            <div v-if="summary.tendencia_mensual?.length" class="rx-filters-bar">
                <div class="rx-filter-section">
                    <span class="rx-filter-label">Año</span>
                    <SelectButton v-model="selectedYears" :options="yearOptions" optionLabel="label" optionValue="value" multiple />
                </div>
                <div class="rx-filter-divider"></div>
                <div class="rx-filter-section rx-filter-section--months">
                    <div class="rx-month-header">
                        <span class="rx-filter-label">Mes</span>
                        <button class="rx-toggle-all-btn" @click="toggleAllMonths">
                            {{ selectedMonths.length === 12 ? 'Desmarcar todos' : 'Marcar todos' }}
                        </button>
                    </div>
                    <SelectButton v-model="selectedMonths" :options="monthOptions" optionLabel="label" optionValue="value" multiple class="rx-month-select" />
                </div>
            </div>

            <!-- Evolución Mensual por Año -->
            <Card class="rx-card">
                <template #title>
                    <div class="rx-card-title-row">
                        <span><i class="pi pi-chart-line mr-2 text-primary"></i>Evolución Mensual por Año</span>
                        <div class="rx-chart-toolbar">
                            <SelectButton v-model="chartMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="rx-metric-toggle" />
                            <Button icon="pi pi-tag" :label="showLabels ? 'Ocultar valores' : 'Ver valores'" :outlined="!showLabels" size="small" severity="secondary" @click="showLabels = !showLabels" />
                        </div>
                    </div>
                </template>
                <template #content>
                    <div class="rx-chart-wrapper">
                        <Chart type="line" :data="monthlyChartData" :options="lineChartOptions" class="rx-chart" />
                    </div>
                </template>
            </Card>

            <!-- Mix Particular / Aseguradora -->
            <div class="rx-mix-grid">
                <!-- Card Particular -->
                <div class="rx-mix-card rx-mix-dark">
                    <div class="rx-mix-header">
                        <div class="rx-mix-icon-wrap"><i class="pi pi-user"></i></div>
                        <span class="rx-mix-title">Particular</span>
                    </div>
                    <div class="rx-mix-stats">
                        <div class="rx-mix-stat">
                            <div class="rx-mix-stat-top">
                                <span class="rx-mix-stat-value">{{ fNum(summary.mix.particular.atenciones) }}</span>
                                <span class="rx-mix-stat-pct">{{ fPct(summary.mix.particular.pct_atenciones) }}</span>
                            </div>
                            <span class="rx-mix-stat-label">Atenciones</span>
                        </div>
                        <div class="rx-mix-divider"></div>
                        <div class="rx-mix-stat">
                            <div class="rx-mix-stat-top">
                                <span class="rx-mix-stat-value rx-mix-stat-value--sm">{{ fMoney(summary.mix.particular.monto) }}</span>
                                <span class="rx-mix-stat-pct">{{ fPct(summary.mix.particular.pct_monto) }}</span>
                            </div>
                            <span class="rx-mix-stat-label">Facturación</span>
                        </div>
                        <div class="rx-mix-divider"></div>
                        <div class="rx-mix-stat">
                            <span class="rx-mix-stat-value rx-mix-stat-value--sm">{{ fMoney(summary.mix.particular.ticket_medio) }}</span>
                            <span class="rx-mix-stat-label">Ticket Medio</span>
                        </div>
                    </div>
                </div>

                <!-- Donut -->
                <Card class="rx-card">
                    <template #title>
                        <span><i class="pi pi-chart-pie mr-2 text-primary"></i>Particular vs Seguros</span>
                    </template>
                    <template #content>
                        <div class="rx-donut-wrapper" v-if="mixDonutData">
                            <Chart type="doughnut" :data="mixDonutData" :options="donutOptions" class="rx-donut-chart" />
                            <div class="rx-donut-center">
                                <div class="rx-donut-total">{{ fNum(summary.totales.atenciones) }}</div>
                                <div class="rx-donut-label">Atenciones</div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- Card Aseguradora -->
                <div class="rx-mix-card rx-mix-light">
                    <div class="rx-mix-header">
                        <div class="rx-mix-icon-wrap rx-mix-icon-wrap--light"><i class="pi pi-shield"></i></div>
                        <span class="rx-mix-title rx-mix-title--light">Seguros</span>
                    </div>
                    <div class="rx-mix-stats">
                        <div class="rx-mix-stat">
                            <div class="rx-mix-stat-top">
                                <span class="rx-mix-stat-value rx-mix-stat-value--light">{{ fNum(summary.mix.aseguradora.atenciones) }}</span>
                                <span class="rx-mix-stat-pct rx-mix-stat-pct--light">{{ fPct(summary.mix.aseguradora.pct_atenciones) }}</span>
                            </div>
                            <span class="rx-mix-stat-label rx-mix-stat-label--light">Atenciones</span>
                        </div>
                        <div class="rx-mix-divider rx-mix-divider--light"></div>
                        <div class="rx-mix-stat">
                            <div class="rx-mix-stat-top">
                                <span class="rx-mix-stat-value rx-mix-stat-value--sm rx-mix-stat-value--light">{{ fMoney(summary.mix.aseguradora.monto) }}</span>
                                <span class="rx-mix-stat-pct rx-mix-stat-pct--light">{{ fPct(summary.mix.aseguradora.pct_monto) }}</span>
                            </div>
                            <span class="rx-mix-stat-label rx-mix-stat-label--light">Facturación</span>
                        </div>
                        <div class="rx-mix-divider rx-mix-divider--light"></div>
                        <div class="rx-mix-stat">
                            <span class="rx-mix-stat-value rx-mix-stat-value--sm rx-mix-stat-value--light">{{ fMoney(summary.mix.aseguradora.ticket_medio) }}</span>
                            <span class="rx-mix-stat-label rx-mix-stat-label--light">Ticket Medio</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Regiones + Procedencia -->
            <div class="rx-two-col rx-two-col--6040">
                <Card class="rx-card">
                    <template #title>
                        <span><i class="pi pi-map mr-2" style="color: #10b981"></i>Regiones Anatómicas</span>
                    </template>
                    <template #content>
                        <div class="rx-chart-wrapper rx-chart-wrapper--sm">
                            <Chart type="bar" :data="regionesChartData" :options="regionesOptions" class="rx-chart" />
                        </div>
                        <DataTable :value="regionesSorted" size="small" class="rx-table mt-3" stripedRows>
                            <Column field="region" header="Región" sortable>
                                <template #body="{ data: row }">
                                    <span class="rx-region-badge" :style="{ background: regionColor(row.region) + '22', color: regionColor(row.region), borderColor: regionColor(row.region) + '66' }">
                                        {{ row.region }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="atenciones" header="Atenc." sortable style="width: 80px; text-align: right">
                                <template #body="{ data: row }">{{ fNum(row.atenciones) }}</template>
                            </Column>
                            <Column field="pct_atenciones" header="%" sortable style="width: 60px; text-align: right">
                                <template #body="{ data: row }">{{ fPct(row.pct_atenciones) }}</template>
                            </Column>
                            <Column field="monto" header="Monto S/" sortable style="width: 130px; text-align: right">
                                <template #body="{ data: row }">{{ fMoney(row.monto) }}</template>
                            </Column>
                            <Column field="ticket_medio" header="Ticket" sortable style="width: 110px; text-align: right">
                                <template #body="{ data: row }">{{ fMoney(row.ticket_medio) }}</template>
                            </Column>
                        </DataTable>
                    </template>
                </Card>

                <Card class="rx-card">
                    <template #title>
                        <span><i class="pi pi-directions mr-2" style="color: #8b5cf6"></i>Procedencia</span>
                    </template>
                    <template #content>
                        <div class="rx-chart-wrapper rx-chart-wrapper--xs">
                            <Chart type="bar" :data="procedenciaChartData" :options="procedenciaOptions" class="rx-chart" />
                        </div>
                        <div class="rx-proc-list">
                            <div v-for="p in summary.procedencia" :key="p.procedencia" class="rx-proc-item">
                                <div class="rx-proc-left">
                                    <span class="rx-proc-dot"></span>
                                    <span class="rx-proc-name">{{ p.procedencia }}</span>
                                </div>
                                <div class="rx-proc-right">
                                    <span class="rx-proc-val">{{ fNum(p.atenciones) }}</span>
                                    <span class="rx-proc-pct">{{ fPct(p.pct_atenciones) }}</span>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Top Procedimientos -->
            <Card class="rx-card">
                <template #title>
                    <div class="rx-card-title-row">
                        <span><i class="pi pi-list mr-2" style="color: #f59e0b"></i>Top Procedimientos</span>
                        <SelectButton v-model="topN" :options="topOptions" optionLabel="label" optionValue="value" class="rx-metric-toggle" />
                    </div>
                </template>
                <template #content>
                    <DataTable :value="summary.top_procedimientos" size="small" class="rx-table" sortField="atenciones" :sortOrder="-1" stripedRows paginator :rows="10">
                        <Column field="cod_seg" header="Cód. SEGUS" sortable style="width: 130px">
                            <template #body="{ data: row }"
                                ><span class="rx-code">{{ row.cod_seg }}</span></template
                            >
                        </Column>
                        <Column field="nombre" header="Procedimiento" sortable />
                        <Column field="region" header="Región" sortable style="width: 160px">
                            <template #body="{ data: row }">
                                <span class="rx-region-badge" :style="{ background: regionColor(row.region) + '22', color: regionColor(row.region), borderColor: regionColor(row.region) + '66' }">
                                    {{ row.region }}
                                </span>
                            </template>
                        </Column>
                        <Column field="atenciones" header="Atenc." sortable style="width: 80px; text-align: right">
                            <template #body="{ data: row }">{{ fNum(row.atenciones) }}</template>
                        </Column>
                        <Column field="monto" header="Monto S/" sortable style="width: 130px; text-align: right">
                            <template #body="{ data: row }">{{ fMoney(row.monto) }}</template>
                        </Column>
                        <Column field="ticket_medio" header="Ticket" sortable style="width: 110px; text-align: right">
                            <template #body="{ data: row }">{{ fMoney(row.ticket_medio) }}</template>
                        </Column>
                    </DataTable>
                </template>
            </Card>

            <!-- Estacionalidad + Top Aseguradoras -->
            <div class="rx-two-col">
                <Card class="rx-card">
                    <template #title>
                        <span><i class="pi pi-calendar mr-2" style="color: #14b8a6"></i>Estacionalidad Semanal</span>
                    </template>
                    <template #subtitle>
                        <span>Barras claras = fines de semana (solo urgencias)</span>
                    </template>
                    <template #content>
                        <div class="rx-chart-wrapper rx-chart-wrapper--sm">
                            <Chart type="bar" :data="estacionalidadChartData" :options="estacionalidadOptions" class="rx-chart" />
                        </div>
                    </template>
                </Card>

                <Card class="rx-card">
                    <template #title>
                        <span><i class="pi pi-shield mr-2" style="color: #0369a1"></i>Top Seguros</span>
                    </template>
                    <template #content>
                        <DataTable :value="summary.top_aseguradoras.filter((r) => r.cia !== 'PARTICULAR')" size="small" class="rx-table" sortField="atenciones" :sortOrder="-1" stripedRows>
                            <Column field="cia" header="Seguro / Convenio" sortable>
                                <template #body="{ data: row }">
                                    <span :class="row.cia === 'PARTICULAR' ? 'rx-tag-particular' : 'rx-tag-cia'">{{ row.cia }}</span>
                                </template>
                            </Column>
                            <Column field="atenciones" header="Atenc." sortable style="width: 80px; text-align: right">
                                <template #body="{ data: row }">{{ fNum(row.atenciones) }}</template>
                            </Column>
                            <Column field="monto" header="Monto S/" sortable style="width: 130px; text-align: right">
                                <template #body="{ data: row }">{{ fMoney(row.monto) }}</template>
                            </Column>
                            <Column field="ticket_medio" header="Ticket" sortable style="width: 110px; text-align: right">
                                <template #body="{ data: row }">{{ fMoney(row.ticket_medio) }}</template>
                            </Column>
                        </DataTable>
                    </template>
                </Card>
            </div>
        </template>

        <div v-else-if="!isLoading" class="rx-empty">
            <i class="pi pi-inbox" style="font-size: 3rem; opacity: 0.4"></i>
            <p>Sin datos para el período seleccionado</p>
        </div>
    </div>
</template>

<style scoped>
.rx-container {
    min-height: 100vh;
    background: var(--surface-ground);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ─── HEADER ──────────────────────────────────────────────────────────────── */
.rx-header {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
}

.rx-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-width: 240px;
}

.rx-title {
    font-size: 1.625rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.rx-title-icon {
    color: var(--primary-500);
    font-size: 1.375rem;
}

.rx-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin: 0;
}

.rx-header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.75rem;
}

.rx-quick-btns {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.rx-filter-row {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.rx-filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.rx-filter-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.rx-calendar {
    min-width: 160px;
}

/* ─── LOADING / EMPTY ─────────────────────────────────────────────────────── */
.rx-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
    color: var(--text-color-secondary);
}

.rx-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 1rem;
    color: var(--text-color-secondary);
    background: var(--surface-card);
    border-radius: 12px;
}

/* ─── KPI GRID ────────────────────────────────────────────────────────────── */
.rx-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.rx-kpi-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: var(--surface-card);
    border-radius: 12px;
    border-left: 4px solid transparent;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition:
        transform 0.2s,
        box-shadow 0.2s;
}

.rx-kpi-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.rx-kpi-blue {
    border-color: #3b82f6;
}
.rx-kpi-green {
    border-color: #10b981;
}
.rx-kpi-amber {
    border-color: #f59e0b;
}

.rx-kpi-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
}

.rx-kpi-blue .rx-kpi-icon-wrap {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
}
.rx-kpi-green .rx-kpi-icon-wrap {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
}
.rx-kpi-amber .rx-kpi-icon-wrap {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
}

.rx-kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.rx-kpi-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-color);
    line-height: 1;
}

.rx-kpi-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* ─── FILTERS BAR ─────────────────────────────────────────────────────────── */
.rx-filters-bar {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1rem 1.25rem;
    background: var(--surface-card);
    border-radius: 10px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    flex-wrap: wrap;
}

.rx-filter-section {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
}

.rx-filter-section--months {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.rx-filter-divider {
    width: 1px;
    align-self: stretch;
    min-height: 2rem;
    background: var(--surface-border);
    flex-shrink: 0;
}

.rx-month-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.rx-toggle-all-btn {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--primary-color);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.15s;
}

.rx-toggle-all-btn:hover {
    opacity: 0.75;
}

.rx-month-select :deep(.p-selectbutton) {
    flex-wrap: wrap;
    gap: 0.25rem;
}

.rx-month-select :deep(.p-button) {
    padding: 0.25rem 0.55rem;
    font-size: 0.6875rem;
    font-weight: 700;
    min-width: unset;
}

/* ─── CARD ────────────────────────────────────────────────────────────────── */
.rx-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.rx-card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.rx-chart-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.rx-metric-toggle {
    --p-selectbutton-border-radius: 6px;
    font-size: 0.75rem;
}

/* ─── CHARTS ──────────────────────────────────────────────────────────────── */
.rx-chart-wrapper {
    width: 100%;
    height: 320px;
    position: relative;
}

.rx-chart-wrapper--sm {
    height: 260px;
}
.rx-chart-wrapper--xs {
    height: 180px;
}

.rx-chart {
    width: 100% !important;
    height: 100% !important;
}

/* ─── DONUT ───────────────────────────────────────────────────────────────── */
.rx-donut-wrapper {
    position: relative;
    width: 220px;
    height: 220px;
    margin: 0 auto;
}

.rx-donut-chart {
    width: 100% !important;
    height: 100% !important;
}

.rx-donut-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    width: 130px;
}

.rx-donut-total {
    font-size: 1.125rem;
    font-weight: 800;
    color: var(--text-color);
    line-height: 1.2;
}

.rx-donut-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0.2rem;
}

/* ─── MIX GRID ────────────────────────────────────────────────────────────── */
.rx-mix-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: 1rem;
    align-items: stretch;
}

.rx-mix-card {
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.rx-mix-dark {
    background: linear-gradient(145deg, #1e40af 0%, #1d4ed8 100%);
}
.rx-mix-light {
    background: linear-gradient(145deg, var(--primary-50) 0%, var(--primary-100) 100%);
}

.rx-mix-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.rx-mix-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.1rem;
    flex-shrink: 0;
}

.rx-mix-icon-wrap--light {
    background: rgba(59, 130, 246, 0.15);
    color: var(--primary-600);
}

.rx-mix-title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: white;
}
.rx-mix-title--light {
    color: var(--primary-700);
}

.rx-mix-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.rx-mix-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.15);
}
.rx-mix-divider--light {
    background: var(--surface-border);
}

.rx-mix-stat {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.rx-mix-stat-top {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
}

.rx-mix-stat-value {
    font-size: 1.375rem;
    font-weight: 800;
    color: white;
    line-height: 1;
}
.rx-mix-stat-value--sm {
    font-size: 1.0625rem;
}
.rx-mix-stat-value--light {
    color: var(--primary-900);
}

.rx-mix-stat-pct {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
}
.rx-mix-stat-pct--light {
    background: var(--primary-100);
    color: var(--primary-700);
}

.rx-mix-stat-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.65);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
.rx-mix-stat-label--light {
    color: var(--primary-500);
}

/* ─── TWO-COL GRID ────────────────────────────────────────────────────────── */
.rx-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
}

.rx-two-col--6040 {
    grid-template-columns: 3fr 2fr;
}

/* ─── REGION BADGE ────────────────────────────────────────────────────────── */
.rx-region-badge {
    display: inline-block;
    padding: 0.15rem 0.55rem;
    border-radius: 99px;
    border: 1px solid;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
}

/* ─── CODE ────────────────────────────────────────────────────────────────── */
.rx-code {
    font-family: monospace;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-color);
}

/* ─── TABLE ───────────────────────────────────────────────────────────────── */
.rx-table {
    font-size: 0.875rem;
}

/* ─── CIA TAGS ────────────────────────────────────────────────────────────── */
.rx-tag-particular {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}
.rx-tag-cia {
    font-size: 0.875rem;
    color: var(--text-color);
    font-weight: 500;
}

/* ─── PROCEDENCIA LIST ────────────────────────────────────────────────────── */
.rx-proc-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
}

.rx-proc-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

.rx-proc-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.rx-proc-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #8b5cf6;
    flex-shrink: 0;
}
.rx-proc-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
}
.rx-proc-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
.rx-proc-val {
    font-size: 0.875rem;
    font-weight: 700;
    color: #8b5cf6;
}
.rx-proc-pct {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    min-width: 40px;
    text-align: right;
}

/* ─── RESPONSIVE ──────────────────────────────────────────────────────────── */
@media (max-width: 1400px) {
    .rx-mix-grid {
        grid-template-columns: 1fr 1fr;
    }
    .rx-mix-grid > .rx-card {
        grid-column: 1 / -1;
    }
}

@media (max-width: 1100px) {
    .rx-two-col,
    .rx-two-col--6040 {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 900px) {
    .rx-kpi-grid {
        grid-template-columns: 1fr;
    }
    .rx-mix-grid {
        grid-template-columns: 1fr;
    }
    .rx-header {
        flex-direction: column;
    }
    .rx-filter-row {
        width: 100%;
    }
}

@media (max-width: 600px) {
    .rx-container {
        padding: 1rem;
    }
    .rx-title {
        font-size: 1.25rem;
    }
    .rx-kpi-value {
        font-size: 1.25rem;
    }
    .rx-filter-row {
        flex-direction: column;
        align-items: stretch;
    }
    .rx-calendar {
        min-width: unset;
        width: 100%;
    }
    .rx-chart-wrapper {
        height: 260px;
    }
    .rx-quick-btns {
        justify-content: flex-start;
    }
}
</style>
