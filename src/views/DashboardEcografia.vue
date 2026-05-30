<script setup>
import { dashboardEcografia as ecoApi } from '@/api/dashboardEcografia';
import KPICard from '@/components/dashboard/KPICard.vue';
import { Chart as ChartJS } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

ChartJS.register(ChartDataLabels);

const toast = useToast();

// ─── Constantes ───────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthOptions = MONTH_NAMES.map((label, i) => ({ label, value: i + 1 }));
const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ─── Estado ───────────────────────────────────────────────────────────────────
const desde = ref(null);
const hasta = ref(null);
const activeView = ref('resumen');
const allData = ref([]);
const isLoading = ref(false);
const isExporting = ref(false);
const errorMsg = ref('');

// Filtros locales (igual que emergencia)
const selectedArea = ref('all');
const selectedYears = ref([]);
const selectedMonths = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

// Controles de gráficos
const chartMetric = ref('monto');
const showLabels = ref(false);
const pieMetric = ref('cantidad');
const categoriasMetric = ref('atenciones');
const estacionalidadMetric = ref('atenciones');
const topMedMetric = ref('atenciones');
const topAsegMetric = ref('atenciones');
const topN = ref(10);

// Vista detalle
const searchQuery = ref('');
const detailPage = ref(1);
const PAGE_SIZE = 25;
const rankingVisible = ref(false);

const metricOptions = [
    { label: 'Importe', value: 'monto' },
    { label: 'Cantidad', value: 'cantidad' }
];
const topOptions = [
    { label: 'Top 10', value: 10 },
    { label: 'Top 20', value: 20 },
    { label: 'Top 50', value: 50 }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toISO = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const fCurrency = (v) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v ?? 0);
const fMoney = (v) => `S/ ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)}`;
const fNum = (v) => new Intl.NumberFormat('es-PE').format(v ?? 0);
const fMoneyK = (v) => {
    const abs = Math.abs(v ?? 0);
    return abs >= 1000 ? `S/ ${(abs / 1000).toFixed(1)}K` : `S/ ${Math.round(abs)}`;
};

const formatPeriod = computed(() => {
    if (!desde.value || !hasta.value) return '';
    return `${new Date(desde.value).toLocaleDateString('es-ES')} — ${new Date(hasta.value).toLocaleDateString('es-ES')}`;
});

// ─── Shortcuts de rango ───────────────────────────────────────────────────────
const setRange = (tipo) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    if (tipo === 'mes-actual') {
        desde.value = new Date(y, m, 1);
        hasta.value = new Date(y, m, d);
    } else if (tipo === 'mes-anterior') {
        desde.value = new Date(y, m - 1, 1);
        hasta.value = new Date(y, m, 0);
    } else if (tipo === '3-meses') {
        desde.value = new Date(y, m - 2, 1);
        hasta.value = new Date(y, m, d);
    } else if (tipo === 'año-actual') {
        desde.value = new Date(y, 0, 1);
        hasta.value = new Date(y, m, d);
    }
};

const toggleAllMonths = () => {
    selectedMonths.value = selectedMonths.value.length === 12 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
};

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchData = async () => {
    if (!desde.value || !hasta.value) return;
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const params = { desde: toISO(desde.value), hasta: toISO(hasta.value) };
        const res = await ecoApi.getData(params);
        allData.value = res?.data?.registros || [];
        detailPage.value = 1;
        searchQuery.value = '';
    } catch (err) {
        errorMsg.value = err?.message || 'Error al cargar los datos';
        toast.add({ severity: 'error', summary: 'Error de carga', detail: errorMsg.value, life: 5000 });
    } finally {
        isLoading.value = false;
    }
};

const handleExport = async () => {
    if (!desde.value || !hasta.value) return;
    isExporting.value = true;
    try {
        const params = { desde: toISO(desde.value), hasta: toISO(hasta.value) };
        const res = await ecoApi.exportExcel(params);
        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecografia-${params.desde}-${params.hasta}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: 'Exportado', detail: 'Archivo descargado correctamente', life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el archivo', life: 4000 });
    } finally {
        isExporting.value = false;
    }
};

// ─── Filtros computados ───────────────────────────────────────────────────────
const yearOptions = computed(() => {
    const years = [...new Set(allData.value.map((r) => new Date(r.fecha + 'T00:00:00').getFullYear()))].filter((y) => !isNaN(y)).sort();
    return years.map((y) => ({ label: String(y), value: y }));
});

watch(yearOptions, (opts) => {
    selectedYears.value = opts.map((o) => o.value);
});

const areaOptions = computed(() => {
    const areas = [...new Set(allData.value.map((r) => r.area))].sort();
    return [{ label: 'Todas', value: 'all' }, ...areas.map((a) => ({ label: a, value: a }))];
});

const filteredData = computed(() => {
    let data = allData.value;
    if (selectedArea.value !== 'all') data = data.filter((r) => r.area === selectedArea.value);
    if (selectedYears.value.length && selectedYears.value.length < yearOptions.value.length) {
        data = data.filter((r) => {
            const y = new Date(r.fecha + 'T00:00:00').getFullYear();
            return selectedYears.value.includes(y);
        });
    }
    if (selectedMonths.value.length < 12) {
        data = data.filter((r) => {
            const m = new Date(r.fecha + 'T00:00:00').getMonth() + 1;
            return selectedMonths.value.includes(m);
        });
    }
    return data;
});

// ─── KPIs ─────────────────────────────────────────────────────────────────────
const totales = computed(() => {
    const atenciones = filteredData.value.length;
    const monto_total = filteredData.value.reduce((s, r) => s + r.importe, 0);
    return { atenciones, monto_total, ticket_medio: atenciones > 0 ? monto_total / atenciones : 0 };
});

// ─── Por área ─────────────────────────────────────────────────────────────────
const porArea = computed(() => {
    const totalAt = filteredData.value.length;
    const totalMonto = filteredData.value.reduce((s, r) => s + r.importe, 0);
    return ['Ecografia CSR', 'Ecografia Externa'].map((area) => {
        const rows = filteredData.value.filter((r) => r.area === area);
        const monto = rows.reduce((s, r) => s + r.importe, 0);
        return {
            area,
            atenciones: rows.length,
            pct_atenciones: totalAt > 0 ? (rows.length / totalAt) * 100 : 0,
            monto,
            pct_monto: totalMonto > 0 ? (monto / totalMonto) * 100 : 0,
            ticket_medio: rows.length > 0 ? monto / rows.length : 0
        };
    });
});
const areaCSR = computed(() => porArea.value.find((a) => a.area === 'Ecografia CSR') ?? null);
const areaExt = computed(() => porArea.value.find((a) => a.area === 'Ecografia Externa') ?? null);

// ─── Mix particular / aseguradora ─────────────────────────────────────────────
const mixDonutData = computed(() => {
    const m = pieMetric.value;
    const pVal = m === 'monto'
        ? filteredData.value.filter((r) => r.particular).reduce((s, r) => s + r.importe, 0)
        : filteredData.value.filter((r) => r.particular).length;
    const aVal = m === 'monto'
        ? filteredData.value.filter((r) => !r.particular).reduce((s, r) => s + r.importe, 0)
        : filteredData.value.filter((r) => !r.particular).length;
    return {
        labels: ['Particular', 'Aseguradora'],
        datasets: [{ data: [pVal, aVal], backgroundColor: ['#64748B', '#3B82F6'], borderWidth: 0, hoverOffset: 12 }]
    };
});

const mixDonutCenter = computed(() => {
    const [pVal, aVal] = mixDonutData.value.datasets[0].data;
    const total = pVal + aVal;
    return {
        val: pieMetric.value === 'monto' ? fMoney(total) : fNum(total),
        lbl: pieMetric.value === 'monto' ? 'Facturación' : 'Atenciones'
    };
});

const mixLegendItems = computed(() => {
    const [pVal, aVal] = mixDonutData.value.datasets[0].data;
    const total = pVal + aVal;
    const partRows = filteredData.value.filter((r) => r.particular);
    const asegRows = filteredData.value.filter((r) => !r.particular);
    const partMonto = partRows.reduce((s, r) => s + r.importe, 0);
    const asegMonto = asegRows.reduce((s, r) => s + r.importe, 0);
    const fmt = pieMetric.value === 'monto' ? fMoney : fNum;
    return [
        {
            label: 'Particular', color: '#64748B',
            pct: total > 0 ? ((pVal / total) * 100).toFixed(1) : '0.0',
            val: fmt(pVal),
            ticketMedio: partRows.length > 0 ? fMoney(partMonto / partRows.length) : 'S/ 0.00'
        },
        {
            label: 'Aseguradora', color: '#3B82F6',
            pct: total > 0 ? ((aVal / total) * 100).toFixed(1) : '0.0',
            val: fmt(aVal),
            ticketMedio: asegRows.length > 0 ? fMoney(asegMonto / asegRows.length) : 'S/ 0.00'
        }
    ];
});

const mixDonutOptions = computed(() => ({
    cutout: '78%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => pieMetric.value === 'monto' ? ` ${fCurrency(ctx.parsed)}` : ` ${fNum(ctx.parsed)} atenciones`
            }
        }
    }
}));

// ─── Evolución mensual por año ────────────────────────────────────────────────
const monthlyChartData = computed(() => {
    if (!filteredData.value.length) return { labels: [], datasets: [] };

    const yearsSet = new Set();
    const monthsSet = new Set();
    filteredData.value.forEach((r) => {
        const d = new Date(r.fecha + 'T00:00:00');
        yearsSet.add(d.getFullYear());
        monthsSet.add(d.getMonth() + 1);
    });
    const years = [...yearsSet].sort();
    const months = [...monthsSet].sort((a, b) => a - b);
    const labels = months.map((m) => MONTH_NAMES[m - 1]);

    const palette = ['#0F766E', '#3B82F6', '#d97706', '#8b5cf6'];

    const datasets = years.map((year, i) => {
        const color = palette[i % palette.length];
        const data = months.map((m) => {
            const rows = filteredData.value.filter((r) => {
                const d = new Date(r.fecha + 'T00:00:00');
                return d.getFullYear() === year && d.getMonth() + 1 === m;
            });
            return chartMetric.value === 'monto' ? rows.reduce((s, r) => s + r.importe, 0) : rows.length;
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
            pointBorderColor: color
        };
    });

    return { labels, datasets };
});

const lineChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } },
        tooltip: {
            callbacks: {
                label: (ctx) => chartMetric.value === 'monto' ? ` ${fCurrency(ctx.parsed.y)}` : ` ${fNum(ctx.parsed.y)} atenciones`
            }
        },
        datalabels: {
            display: showLabels.value,
            align: 'top',
            backgroundColor: '#fff',
            borderRadius: 8,
            color: '#0f172a',
            font: { size: 10, weight: '800' },
            offset: 12,
            padding: 6,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)',
            formatter: (v) => chartMetric.value === 'monto' ? `S/ ${Math.round(v / 1000)}K` : fNum(v)
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: '#f0f6ff' },
            ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8', callback: (v) => chartMetric.value === 'monto' ? fMoneyK(v) : v }
        },
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } }
    }
}));

// ─── Categorías ───────────────────────────────────────────────────────────────
const categoriasChartData = computed(() => {
    const stats = {};
    filteredData.value.forEach((r) => {
        const cat = r.categoria || 'Otros';
        if (!stats[cat]) stats[cat] = { atenciones: 0, monto: 0 };
        stats[cat].atenciones++;
        stats[cat].monto += r.importe;
    });
    const metric = categoriasMetric.value;
    const sorted = Object.entries(stats)
        .map(([categoria, v]) => ({ categoria, ...v }))
        .sort((a, b) => b[metric] - a[metric]);
    const shades = ['#0F766E', '#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1'];
    return {
        labels: sorted.map((c) => c.categoria),
        datasets: [{ data: sorted.map((c) => c[metric]), backgroundColor: sorted.map((_, i) => shades[i % shades.length]), borderRadius: 4, borderSkipped: false }]
    };
});

const categoriasOptions = computed(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: { callbacks: { label: (ctx) => categoriasMetric.value === 'monto' ? ` ${fMoney(ctx.parsed.x)}` : ` ${fNum(ctx.parsed.x)} atenc.` } }
    },
    scales: {
        x: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 10 }, color: '#94a3b8', callback: (v) => categoriasMetric.value === 'monto' ? fMoneyK(v) : fNum(v) }
        },
        y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#334155' } }
    }
}));

// ─── Estacionalidad ───────────────────────────────────────────────────────────
const estacionalidadChartData = computed(() => {
    const stats = {};
    DAY_ORDER.forEach((d) => { stats[d] = { atenciones: 0, monto: 0 }; });
    filteredData.value.forEach((r) => {
        const dayName = DAY_MAP[new Date(r.fecha + 'T00:00:00').getDay()];
        if (stats[dayName]) { stats[dayName].atenciones++; stats[dayName].monto += r.importe; }
    });
    const metric = estacionalidadMetric.value;
    const COLOR = '#0F766E';
    return {
        labels: DAY_ORDER,
        datasets: [{
            data: DAY_ORDER.map((d) => stats[d][metric]),
            backgroundColor: DAY_ORDER.map((d) => ['Sábado', 'Domingo'].includes(d) ? COLOR + '55' : COLOR + 'CC'),
            borderColor: COLOR,
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false
        }]
    };
});

const estacionalidadOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: { callbacks: { label: (ctx) => estacionalidadMetric.value === 'monto' ? ` ${fMoney(ctx.parsed.y)}` : ` ${fNum(ctx.parsed.y)} atenc.` } }
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12, weight: '700' }, color: '#64748b' } },
        y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8', callback: (v) => estacionalidadMetric.value === 'monto' ? fMoneyK(v) : v }
        }
    }
}));

// ─── Top rankings (derivados de filteredData) ─────────────────────────────────
const topProcedimientos = computed(() => {
    const stats = {};
    filteredData.value.forEach((r) => {
        const key = r.cod_seg;
        if (!key) return;
        if (!stats[key]) stats[key] = { cod_seg: r.cod_seg, nombre: r.nombre_seg, categoria: r.categoria, atenciones: 0, monto: 0 };
        stats[key].atenciones++;
        stats[key].monto += r.importe;
    });
    return Object.values(stats)
        .map((s) => ({ ...s, ticket_medio: s.atenciones > 0 ? s.monto / s.atenciones : 0 }))
        .sort((a, b) => b.atenciones - a.atenciones)
        .slice(0, topN.value);
});

const topAseguradoras = computed(() => {
    const stats = {};
    filteredData.value.forEach((r) => {
        const key = r.cia || 'PARTICULAR';
        if (!stats[key]) stats[key] = { cia: key, atenciones: 0, monto: 0 };
        stats[key].atenciones++;
        stats[key].monto += r.importe;
    });
    const metric = topAsegMetric.value;
    return Object.values(stats)
        .map((s) => ({ ...s, ticket_medio: s.atenciones > 0 ? s.monto / s.atenciones : 0 }))
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, topN.value);
});

const topMedicos = computed(() => {
    const stats = {};
    filteredData.value.forEach((r) => {
        const key = r.medico || 'SIN NOMBRE';
        if (!stats[key]) stats[key] = { medico: key, cod_medico: r.cod_medico, atenciones: 0, monto: 0 };
        stats[key].atenciones++;
        stats[key].monto += r.importe;
    });
    const metric = topMedMetric.value;
    return Object.values(stats)
        .map((s) => ({ ...s, ticket_medio: s.atenciones > 0 ? s.monto / s.atenciones : 0 }))
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, topN.value);
});

// ─── Detalle ──────────────────────────────────────────────────────────────────
const rankingSEGUS = computed(() => {
    const stats = {};
    filteredData.value.forEach((r) => {
        const key = r.cod_seg;
        if (!key) return;
        if (!stats[key]) stats[key] = { cod_seg: r.cod_seg, nombre: r.nombre_seg, cantidad: 0, monto: 0 };
        stats[key].cantidad++;
        stats[key].monto += r.importe;
    });
    return Object.values(stats).sort((a, b) => b.cantidad - a.cantidad);
});

const registrosFiltrados = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return filteredData.value;
    return filteredData.value.filter((r) =>
        (r.medico ?? '').toLowerCase().includes(q) ||
        (r.cod_seg ?? '').toLowerCase().includes(q) ||
        (r.nombre_seg ?? '').toLowerCase().includes(q) ||
        (r.cia ?? '').toLowerCase().includes(q)
    );
});

const totalPages = computed(() => Math.max(1, Math.ceil(registrosFiltrados.value.length / PAGE_SIZE)));
const registrosPaginados = computed(() => {
    const start = (detailPage.value - 1) * PAGE_SIZE;
    return registrosFiltrados.value.slice(start, start + PAGE_SIZE);
});

watch(searchQuery, () => { detailPage.value = 1; });
watch(filteredData, () => { detailPage.value = 1; });

const prevPage = () => { if (detailPage.value > 1) detailPage.value--; };
const nextPage = () => { if (detailPage.value < totalPages.value) detailPage.value++; };

// ─── Badge de ranking ─────────────────────────────────────────────────────────
const rankClass = (idx) => {
    if (idx === 0) return 'eco-rank-1';
    if (idx === 1) return 'eco-rank-2';
    if (idx === 2) return 'eco-rank-3';
    return '';
};

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
    const now = new Date();
    desde.value = new Date(now.getFullYear() - 1, 0, 1); // 1 enero del año pasado
    hasta.value = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // hoy
    fetchData();
});
</script>

<template>
    <div class="eco-container">
        <!-- ── Header ──────────────────────────────────────────────────────── -->
        <div class="eco-header">
            <div class="eco-header-left">
                <div>
                    <h1 class="eco-title">
                        <i class="pi pi-circle-fill eco-title-icon"></i>
                        Dashboard Ecografía
                    </h1>
                    <p class="eco-subtitle">Ecografía CSR y Ecografía Externa — Facturación y atenciones</p>
                </div>
                <div v-if="formatPeriod" class="eco-period-badge">
                    <i class="pi pi-calendar"></i>
                    <span>{{ formatPeriod }}</span>
                </div>
            </div>

            <div class="eco-header-right">
                <div class="eco-filter-row">
                    <div class="eco-filter-group">
                        <label class="eco-filter-label">Desde</label>
                        <Calendar v-model="desde" dateFormat="dd/mm/yy" placeholder="Fecha inicio" showIcon iconDisplay="input" class="eco-calendar" />
                    </div>
                    <div class="eco-filter-group">
                        <label class="eco-filter-label">Hasta</label>
                        <Calendar v-model="hasta" dateFormat="dd/mm/yy" placeholder="Fecha fin" showIcon iconDisplay="input" class="eco-calendar" />
                    </div>
                    <div class="eco-shortcuts">
                        <button class="eco-shortcut-btn" @click="setRange('mes-actual')">Mes actual</button>
                        <button class="eco-shortcut-btn" @click="setRange('mes-anterior')">Mes ant.</button>
                        <button class="eco-shortcut-btn" @click="setRange('3-meses')">3 meses</button>
                        <button class="eco-shortcut-btn" @click="setRange('año-actual')">Año actual</button>
                    </div>
                    <Button icon="pi pi-search" label="Aplicar" @click="fetchData" :loading="isLoading" class="eco-apply-btn" />
                    <Button icon="pi pi-download" label="Excel" @click="handleExport" :loading="isExporting" severity="success" outlined class="eco-apply-btn" />
                </div>

                <div class="eco-header-controls">
                    <SelectButton v-model="topN" :options="topOptions" optionLabel="label" optionValue="value" class="eco-metric-toggle" />
                    <div class="eco-view-toggle">
                        <button :class="['eco-view-btn', activeView === 'resumen' && 'eco-view-btn--active']" @click="activeView = 'resumen'">
                            <i class="pi pi-chart-bar mr-1"></i> Resumen
                        </button>
                        <button :class="['eco-view-btn', activeView === 'detalle' && 'eco-view-btn--active']" @click="activeView = 'detalle'">
                            <i class="pi pi-table mr-1"></i> Detalle
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Loading ────────────────────────────────────────────────────────── -->
        <div v-if="isLoading" class="eco-loading">
            <ProgressSpinner />
            <p>Cargando datos de ecografía...</p>
        </div>

        <div v-else class="eco-content">
            <!-- ── Error ───────────────────────────────────────────────────── -->
            <Message v-if="errorMsg" severity="error" :closable="false">{{ errorMsg }}</Message>

            <!-- ── Barra de filtros locales ─────────────────────────────────── -->
            <div v-if="allData.length" class="eco-filters-bar">
                <!-- Área -->
                <div class="eco-filter-section">
                    <span class="eco-filter-label">Área</span>
                    <SelectButton v-model="selectedArea" :options="areaOptions" optionLabel="label" optionValue="value" />
                </div>

                <div class="eco-filter-divider"></div>

                <!-- Año -->
                <div class="eco-filter-section">
                    <span class="eco-filter-label">Año</span>
                    <SelectButton v-model="selectedYears" :options="yearOptions" optionLabel="label" optionValue="value" multiple />
                </div>

                <div class="eco-filter-divider"></div>

                <!-- Mes -->
                <div class="eco-filter-section eco-filter-section--months">
                    <div class="eco-month-header">
                        <span class="eco-filter-label">Mes</span>
                        <button class="eco-toggle-all-btn" @click="toggleAllMonths">
                            {{ selectedMonths.length === 12 ? 'Desmarcar todos' : 'Marcar todos' }}
                        </button>
                    </div>
                    <SelectButton v-model="selectedMonths" :options="monthOptions" optionLabel="label" optionValue="value" multiple class="eco-month-select" />
                </div>
            </div>

            <!-- ── Empty state ─────────────────────────────────────────────── -->
            <div v-if="!allData.length && !errorMsg" class="eco-empty-state">
                <i class="pi pi-inbox" style="font-size:3rem;opacity:.35"></i>
                <p>Selecciona un período y presiona Aplicar</p>
            </div>

            <template v-if="filteredData.length">
                <!-- ══ VISTA RESUMEN ══════════════════════════════════════════ -->
                <template v-if="activeView === 'resumen'">

                    <!-- Fila 1 — KPIs -->
                    <div class="eco-kpi-grid">
                        <KPICard title="Total Atenciones" :value="fNum(totales.atenciones)" subtitle="Período filtrado" icon="pi-users" color="green" />
                        <KPICard title="Monto Total" :value="fMoney(totales.monto_total)" subtitle="Facturación bruta" icon="pi-dollar" color="blue" />
                        <KPICard title="Ticket Medio" :value="fMoney(totales.ticket_medio)" subtitle="Promedio por atención" icon="pi-calculator" color="purple" />
                    </div>

                    <!-- Fila 2 — Por área -->
                    <div class="eco-area-grid">
                        <div class="eco-area-card eco-area-card--csr">
                            <div class="eco-area-header">
                                <span class="eco-area-dot eco-area-dot--csr"></span>
                                <span class="eco-area-name">Ecografía CSR</span>
                            </div>
                            <template v-if="areaCSR && areaCSR.atenciones > 0">
                                <div class="eco-area-kpis">
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val">{{ fNum(areaCSR.atenciones) }}</span>
                                        <span class="eco-area-kpi-lbl">Atenciones</span>
                                    </div>
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val eco-area-kpi-val--pct">{{ areaCSR.pct_atenciones.toFixed(1) }}%</span>
                                        <span class="eco-area-kpi-lbl">del total</span>
                                    </div>
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val">{{ fMoney(areaCSR.monto) }}</span>
                                        <span class="eco-area-kpi-lbl">Monto</span>
                                    </div>
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val">{{ fMoney(areaCSR.ticket_medio) }}</span>
                                        <span class="eco-area-kpi-lbl">Ticket medio</span>
                                    </div>
                                </div>
                                <div class="eco-area-bar-track">
                                    <div class="eco-area-bar-fill eco-area-bar-fill--csr" :style="{ width: areaCSR.pct_atenciones.toFixed(1) + '%' }"></div>
                                </div>
                            </template>
                            <div v-else class="eco-area-empty">Sin datos para el período</div>
                        </div>

                        <div class="eco-area-card eco-area-card--ext">
                            <div class="eco-area-header">
                                <span class="eco-area-dot eco-area-dot--ext"></span>
                                <span class="eco-area-name">Ecografía Externa</span>
                            </div>
                            <template v-if="areaExt && areaExt.atenciones > 0">
                                <div class="eco-area-kpis">
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val">{{ fNum(areaExt.atenciones) }}</span>
                                        <span class="eco-area-kpi-lbl">Atenciones</span>
                                    </div>
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val eco-area-kpi-val--pct-ext">{{ areaExt.pct_atenciones.toFixed(1) }}%</span>
                                        <span class="eco-area-kpi-lbl">del total</span>
                                    </div>
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val">{{ fMoney(areaExt.monto) }}</span>
                                        <span class="eco-area-kpi-lbl">Monto</span>
                                    </div>
                                    <div class="eco-area-kpi">
                                        <span class="eco-area-kpi-val">{{ fMoney(areaExt.ticket_medio) }}</span>
                                        <span class="eco-area-kpi-lbl">Ticket medio</span>
                                    </div>
                                </div>
                                <div class="eco-area-bar-track">
                                    <div class="eco-area-bar-fill eco-area-bar-fill--ext" :style="{ width: areaExt.pct_atenciones.toFixed(1) + '%' }"></div>
                                </div>
                            </template>
                            <div v-else class="eco-area-empty">Sin datos para el período</div>
                        </div>
                    </div>

                    <!-- Fila 3 — Evolución mensual + Donut mix -->
                    <div class="eco-charts-grid">
                        <!-- Evolución mensual por año -->
                        <Card class="eco-card">
                            <template #title>
                                <div class="eco-card-title">
                                    <span><i class="pi pi-chart-line mr-2" style="color:#0F766E"></i>Evolución Mensual por Año</span>
                                    <div class="eco-chart-toolbar">
                                        <SelectButton v-model="chartMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="eco-metric-toggle" />
                                        <Button
                                            icon="pi pi-tag"
                                            :label="showLabels ? 'Ocultar valores' : 'Ver valores'"
                                            :outlined="!showLabels"
                                            size="small"
                                            severity="secondary"
                                            @click="showLabels = !showLabels"
                                        />
                                    </div>
                                </div>
                            </template>
                            <template #content>
                                <div class="eco-chart-wrapper">
                                    <Chart type="line" :data="monthlyChartData" :options="lineChartOptions" class="eco-chart" />
                                </div>
                            </template>
                        </Card>

                        <!-- Donut Mix Particular / Aseguradora -->
                        <Card class="eco-card">
                            <template #title>
                                <div class="eco-card-title">
                                    <span><i class="pi pi-chart-pie mr-2" style="color:#3B82F6"></i>Particular vs Aseguradora</span>
                                    <SelectButton v-model="pieMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="eco-metric-toggle" />
                                </div>
                            </template>
                            <template #content>
                                <div class="eco-donut-section">
                                    <div class="eco-donut-wrapper">
                                        <Chart type="doughnut" :data="mixDonutData" :options="mixDonutOptions" class="eco-donut-chart" />
                                        <div class="eco-donut-center">
                                            <div class="eco-donut-total">{{ mixDonutCenter.val }}</div>
                                            <div class="eco-donut-label">{{ mixDonutCenter.lbl }}</div>
                                        </div>
                                    </div>
                                    <div class="eco-donut-legend">
                                        <div v-for="item in mixLegendItems" :key="item.label" class="eco-legend-item">
                                            <div class="eco-legend-left">
                                                <span class="eco-legend-dot" :style="{ background: item.color }"></span>
                                                <span class="eco-legend-name">{{ item.label }}</span>
                                            </div>
                                            <div class="eco-legend-right">
                                                <span class="eco-legend-pct">{{ item.pct }}%</span>
                                                <span class="eco-legend-val">{{ item.val }}</span>
                                                <span class="eco-legend-ticket">ticket: {{ item.ticketMedio }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Card>
                    </div>

                    <!-- Fila 4 — Categorías + Estacionalidad -->
                    <div class="eco-two-cols">
                        <Card class="eco-card">
                            <template #title>
                                <div class="eco-card-title">
                                    <span><i class="pi pi-list mr-2" style="color:#0F766E"></i>Categorías</span>
                                    <SelectButton v-model="categoriasMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="eco-metric-toggle" />
                                </div>
                            </template>
                            <template #content>
                                <div class="eco-chart-wrapper-sm">
                                    <Chart type="bar" :data="categoriasChartData" :options="categoriasOptions" class="eco-chart" />
                                </div>
                            </template>
                        </Card>

                        <Card class="eco-card">
                            <template #title>
                                <div class="eco-card-title">
                                    <span><i class="pi pi-calendar mr-2" style="color:#0F766E"></i>Estacionalidad Semanal</span>
                                    <SelectButton v-model="estacionalidadMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="eco-metric-toggle" />
                                </div>
                            </template>
                            <template #content>
                                <div class="eco-chart-wrapper-sm">
                                    <Chart type="bar" :data="estacionalidadChartData" :options="estacionalidadOptions" class="eco-chart" />
                                </div>
                            </template>
                        </Card>
                    </div>

                    <!-- Fila 5 — Top Procedimientos SEGUS -->
                    <Card class="eco-card">
                        <template #title>
                            <span><i class="pi pi-sort-amount-down mr-2" style="color:#0F766E"></i>Top Procedimientos SEGUS</span>
                        </template>
                        <template #content>
                            <DataTable :value="topProcedimientos" stripedRows size="small" class="eco-table">
                                <Column field="cod_seg" header="SEGUS" sortable style="width:110px;font-weight:700" />
                                <Column field="nombre" header="Nombre" sortable />
                                <Column field="categoria" header="Categoría" sortable style="width:160px">
                                    <template #body="{ data }">
                                        <span class="eco-badge-cat">{{ data.categoria }}</span>
                                    </template>
                                </Column>
                                <Column field="atenciones" header="Atenciones" sortable style="width:110px;text-align:right">
                                    <template #body="{ data }">{{ fNum(data.atenciones) }}</template>
                                </Column>
                                <Column field="monto" header="Monto (S/)" sortable style="width:130px;text-align:right">
                                    <template #body="{ data }"><span class="eco-amount">{{ fMoney(data.monto) }}</span></template>
                                </Column>
                                <Column field="ticket_medio" header="Ticket Medio" sortable style="width:120px;text-align:right">
                                    <template #body="{ data }">{{ fMoney(data.ticket_medio) }}</template>
                                </Column>
                            </DataTable>
                            <div v-if="!topProcedimientos.length" class="eco-rank-empty">Sin datos de procedimientos</div>
                        </template>
                    </Card>

                    <!-- Fila 6 — Top Aseguradoras + Top Médicos Ejecutores -->
                    <div class="eco-two-cols">
                        <Card class="eco-card">
                            <template #title>
                                <div class="eco-card-title">
                                    <span><i class="pi pi-building mr-2" style="color:#3B82F6"></i>Top Aseguradoras</span>
                                    <SelectButton v-model="topAsegMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="eco-metric-toggle" />
                                </div>
                            </template>
                            <template #content>
                                <div class="eco-rank-list">
                                    <div v-for="(row, idx) in topAseguradoras" :key="row.cia" class="eco-rank-item">
                                        <div class="eco-rank-left">
                                            <span class="eco-rank-badge" :class="rankClass(idx)">#{{ idx + 1 }}</span>
                                            <div class="eco-rank-info">
                                                <div class="eco-rank-name">{{ row.cia }}</div>
                                                <div class="eco-rank-sub">ticket: {{ fMoney(row.ticket_medio) }}</div>
                                            </div>
                                        </div>
                                        <div class="eco-rank-right">
                                            <div class="eco-rank-value" style="color:#3B82F6">
                                                {{ topAsegMetric === 'monto' ? fMoney(row.monto) : fNum(row.atenciones) }}
                                            </div>
                                            <div class="eco-rank-meta">
                                                {{ topAsegMetric === 'monto' ? `${fNum(row.atenciones)} atenc.` : fMoney(row.monto) }}
                                            </div>
                                        </div>
                                    </div>
                                    <div v-if="!topAseguradoras.length" class="eco-rank-empty">Sin datos</div>
                                </div>
                            </template>
                        </Card>

                        <Card class="eco-card">
                            <template #title>
                                <div class="eco-card-title">
                                    <span><i class="pi pi-user mr-2" style="color:#0F766E"></i>Top Médicos Ejecutores</span>
                                    <SelectButton v-model="topMedMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="eco-metric-toggle" />
                                </div>
                            </template>
                            <template #content>
                                <div class="eco-rank-list">
                                    <div v-for="(row, idx) in topMedicos" :key="row.cod_medico + row.medico" class="eco-rank-item">
                                        <div class="eco-rank-left">
                                            <span class="eco-rank-badge" :class="rankClass(idx)">#{{ idx + 1 }}</span>
                                            <div class="eco-rank-info">
                                                <div class="eco-rank-name">{{ row.medico }}</div>
                                                <div class="eco-rank-sub">ticket: {{ fMoney(row.ticket_medio) }}</div>
                                            </div>
                                        </div>
                                        <div class="eco-rank-right">
                                            <div class="eco-rank-value" style="color:#0F766E">
                                                {{ topMedMetric === 'monto' ? fMoney(row.monto) : fNum(row.atenciones) }}
                                            </div>
                                            <div class="eco-rank-meta">
                                                {{ topMedMetric === 'monto' ? `${fNum(row.atenciones)} atenc.` : fMoney(row.monto) }}
                                            </div>
                                        </div>
                                    </div>
                                    <div v-if="!topMedicos.length" class="eco-rank-empty">Sin datos</div>
                                </div>
                            </template>
                        </Card>
                    </div>
                </template>

                <!-- ══ VISTA DETALLE ══════════════════════════════════════════ -->
                <template v-if="activeView === 'detalle'">
                    <!-- Controles -->
                    <div class="eco-detail-controls">
                        <span class="p-input-icon-left eco-search-wrap">
                            <i class="pi pi-search" />
                            <InputText v-model="searchQuery" placeholder="Buscar médico, SEGUS, categoría, aseguradora..." class="eco-search-input" />
                        </span>
                        <span class="eco-record-count">{{ fNum(registrosFiltrados.length) }} registros</span>
                    </div>

                    <!-- Tabla de detalle -->
                    <Card class="eco-card">
                        <template #content>
                            <DataTable :value="registrosPaginados" stripedRows size="small" class="eco-table">
                                <Column field="fecha" header="Fecha" sortable style="width:100px" />
                                <Column field="area" header="Área" sortable style="width:170px">
                                    <template #body="{ data }">
                                        <span :class="['eco-area-badge', data.area === 'Ecografia CSR' ? 'eco-area-badge--csr' : 'eco-area-badge--ext']">
                                            {{ data.area }}
                                        </span>
                                    </template>
                                </Column>
                                <Column field="medico" header="Médico" sortable />
                                <Column field="cod_seg" header="SEGUS" sortable style="width:100px;font-weight:700" />
                                <Column field="categoria" header="Categoría" sortable style="width:150px" />
                                <Column field="cia" header="Aseguradora" sortable style="width:180px" />
                                <Column field="particular" header="Tipo" style="width:90px;text-align:center">
                                    <template #body="{ data }">
                                        <Tag :value="data.particular ? 'Particular' : 'Seguro'" :severity="data.particular ? 'secondary' : 'info'" />
                                    </template>
                                </Column>
                                <Column field="importe" header="Importe (S/)" sortable style="width:120px;text-align:right">
                                    <template #body="{ data }"><span class="eco-amount">{{ fMoney(data.importe) }}</span></template>
                                </Column>
                            </DataTable>
                            <div v-if="!registrosPaginados.length" class="eco-empty">Sin registros para la búsqueda</div>

                            <!-- Paginación -->
                            <div v-if="registrosFiltrados.length > PAGE_SIZE" class="eco-pagination">
                                <Button icon="pi pi-chevron-left" text rounded @click="prevPage" :disabled="detailPage === 1" />
                                <span class="eco-page-info">Página {{ detailPage }} de {{ totalPages }}</span>
                                <Button icon="pi pi-chevron-right" text rounded @click="nextPage" :disabled="detailPage === totalPages" />
                            </div>
                        </template>
                    </Card>

                    <!-- Ranking SEGUS colapsable -->
                    <Card class="eco-card">
                        <template #title>
                            <button class="eco-collapse-btn" @click="rankingVisible = !rankingVisible">
                                <i :class="['pi mr-2', rankingVisible ? 'pi-chevron-down' : 'pi-chevron-right']" style="color:#0F766E"></i>
                                Ranking SEGUS
                                <span class="eco-collapse-count">{{ rankingSEGUS.length }} procedimientos</span>
                            </button>
                        </template>
                        <template #content v-if="rankingVisible">
                            <DataTable :value="rankingSEGUS" stripedRows size="small" class="eco-table">
                                <Column field="cod_seg" header="SEGUS" sortable style="width:110px;font-weight:700" />
                                <Column field="nombre" header="Nombre" sortable />
                                <Column field="cantidad" header="Cantidad" sortable style="width:110px;text-align:right">
                                    <template #body="{ data }">{{ fNum(data.cantidad) }}</template>
                                </Column>
                                <Column field="monto" header="Monto Total (S/)" sortable style="width:150px;text-align:right">
                                    <template #body="{ data }"><span class="eco-amount">{{ fMoney(data.monto) }}</span></template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>
                </template>
            </template>
        </div>
    </div>
</template>

<style scoped>
/* ─── Container ───────────────────────────────────────────────────────────── */
.eco-container {
    min-height: 100vh;
    background: var(--surface-ground);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.eco-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ─── Header ──────────────────────────────────────────────────────────────── */
.eco-header {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    border-left: 4px solid #0F766E;
}

.eco-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    min-width: 240px;
}

.eco-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.eco-title-icon { color: #0F766E; font-size: 0.9rem; }

.eco-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin: 0.25rem 0 0;
}

.eco-period-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-left: 3px solid #0F766E;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #065f46;
    width: fit-content;
}

.eco-header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.75rem;
}

.eco-filter-row {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.eco-filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.eco-filter-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.eco-calendar { min-width: 155px; }

.eco-shortcuts {
    display: flex;
    gap: 0.375rem;
    align-items: flex-end;
    flex-wrap: wrap;
}

.eco-shortcut-btn {
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #0F766E44;
    background: #f0fdf4;
    color: #065f46;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.eco-shortcut-btn:hover { background: #dcfce7; border-color: #0F766E; }
.eco-apply-btn { align-self: flex-end; }

.eco-header-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.eco-view-toggle {
    display: flex;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    overflow: hidden;
}

.eco-view-btn {
    padding: 0.45rem 1rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: var(--surface-50);
    color: var(--text-color-secondary);
    transition: background 0.15s, color 0.15s;
    display: flex;
    align-items: center;
}

.eco-view-btn--active { background: #0F766E; color: #ffffff; }

/* ─── Loading / Empty ─────────────────────────────────────────────────────── */
.eco-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
    color: var(--text-color-secondary);
}

.eco-empty-state {
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

/* ─── Barra de filtros locales ────────────────────────────────────────────── */
.eco-filters-bar {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1rem 1.25rem;
    background: var(--surface-card);
    border-radius: 10px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    flex-wrap: wrap;
}

.eco-filter-section {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
}

.eco-filter-section--months {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.eco-filter-divider {
    width: 1px;
    align-self: stretch;
    min-height: 2rem;
    background: var(--surface-border);
    flex-shrink: 0;
}

.eco-month-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.eco-toggle-all-btn {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #0F766E;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.15s;
}

.eco-toggle-all-btn:hover { opacity: 0.75; }

.eco-month-select :deep(.p-selectbutton) { flex-wrap: wrap; gap: 0.25rem; }
.eco-month-select :deep(.p-button) { padding: 0.25rem 0.55rem; font-size: 0.6875rem; font-weight: 700; min-width: unset; }

/* ─── KPIs ────────────────────────────────────────────────────────────────── */
.eco-kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
}

/* ─── Área cards ──────────────────────────────────────────────────────────── */
.eco-area-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.eco-area-card {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.eco-area-card--csr { border-left: 4px solid #0F766E; }
.eco-area-card--ext { border-left: 4px solid #5EEAD4; }

.eco-area-header { display: flex; align-items: center; gap: 0.625rem; }

.eco-area-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.eco-area-dot--csr { background: #0F766E; }
.eco-area-dot--ext { background: #5EEAD4; border: 2px solid #0D9488; }

.eco-area-name { font-size: 0.9375rem; font-weight: 700; color: var(--text-color); }

.eco-area-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }

.eco-area-kpi {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.625rem 0.25rem;
    background: var(--surface-50);
    border-radius: 8px;
    text-align: center;
}

.eco-area-kpi-val { font-size: 0.875rem; font-weight: 800; color: var(--text-color); line-height: 1.2; }
.eco-area-kpi-val--pct { color: #0F766E; }
.eco-area-kpi-val--pct-ext { color: #0D9488; }

.eco-area-kpi-lbl {
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.eco-area-bar-track { height: 6px; background: var(--surface-200); border-radius: 99px; overflow: hidden; }
.eco-area-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; }
.eco-area-bar-fill--csr { background: #0F766E; }
.eco-area-bar-fill--ext { background: #5EEAD4; }

.eco-area-empty { color: var(--text-color-secondary); font-size: 0.875rem; text-align: center; padding: 1rem; }

/* ─── Charts grid ─────────────────────────────────────────────────────────── */
.eco-charts-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 1.5rem;
}

.eco-card { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }

.eco-card-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.eco-chart-toolbar { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.eco-metric-toggle { font-size: 0.75rem; }

.eco-chart-wrapper { width: 100%; height: 320px; position: relative; }
.eco-chart-wrapper-sm { width: 100%; height: 260px; position: relative; }
.eco-chart { width: 100% !important; height: 100% !important; }

.eco-two-cols { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }

/* ─── Donut ───────────────────────────────────────────────────────────────── */
.eco-donut-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.eco-donut-wrapper { position: relative; width: 220px; height: 220px; flex-shrink: 0; }
.eco-donut-chart { width: 100% !important; height: 100% !important; }

.eco-donut-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    width: 130px;
}

.eco-donut-total { font-size: 1rem; font-weight: 800; color: var(--text-color); line-height: 1.2; word-break: break-all; }
.eco-donut-label { font-size: 0.65rem; font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.2rem; }

.eco-donut-legend { width: 100%; display: flex; flex-direction: column; gap: 0.625rem; }

.eco-legend-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.875rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
}

.eco-legend-left { display: flex; align-items: center; gap: 0.625rem; }
.eco-legend-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(0,0,0,.1); flex-shrink: 0; }
.eco-legend-name { font-size: 0.8125rem; font-weight: 700; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.3px; }

.eco-legend-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; }
.eco-legend-pct { font-size: 0.9375rem; font-weight: 800; color: var(--text-color); }
.eco-legend-val { font-size: 0.6875rem; color: var(--text-color-secondary); font-weight: 500; }
.eco-legend-ticket { font-size: 0.625rem; color: var(--text-color-secondary); font-weight: 500; }

/* ─── Rankings ────────────────────────────────────────────────────────────── */
.eco-rank-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 440px;
    overflow-y: auto;
}

.eco-rank-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
    transition: background 0.15s;
}

.eco-rank-item:hover { background: var(--surface-100); }

.eco-rank-left { display: flex; align-items: flex-start; gap: 0.5rem; flex: 1; min-width: 0; }

.eco-rank-badge {
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    background: var(--surface-200);
    color: var(--text-color-secondary);
    flex-shrink: 0;
    margin-top: 0.1rem;
}

.eco-rank-1 { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.eco-rank-2 { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.eco-rank-3 { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }

.eco-rank-info { flex: 1; min-width: 0; }
.eco-rank-name { font-size: 0.75rem; font-weight: 700; color: var(--text-color); word-break: break-word; line-height: 1.3; }
.eco-rank-sub { font-size: 0.625rem; font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 0.1rem; }

.eco-rank-right { text-align: right; flex-shrink: 0; }
.eco-rank-value { font-size: 0.875rem; font-weight: 800; line-height: 1.2; }
.eco-rank-meta { font-size: 0.6rem; color: var(--text-color-secondary); font-weight: 500; margin-top: 0.1rem; }

.eco-rank-empty {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px dashed var(--surface-border);
}

/* ─── Tables ──────────────────────────────────────────────────────────────── */
.eco-table { font-size: 0.875rem; }
.eco-amount { font-weight: 700; color: #0F766E; }

.eco-badge-cat {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    background: #f0fdf4;
    color: #065f46;
    border-radius: 99px;
    font-size: 0.7rem;
    font-weight: 700;
    border: 1px solid #bbf7d0;
}

.eco-area-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
.eco-area-badge--csr { background: #f0fdf4; color: #065f46; border: 1px solid #0F766E44; }
.eco-area-badge--ext { background: #f0fdfa; color: #134e4a; border: 1px solid #5EEAD4; }

/* ─── Detalle ─────────────────────────────────────────────────────────────── */
.eco-detail-controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.eco-search-wrap { flex: 1; min-width: 260px; }
.eco-search-input { width: 100%; }
.eco-record-count { font-size: 0.8125rem; font-weight: 600; color: var(--text-color-secondary); white-space: nowrap; }

.eco-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem 0 0;
    border-top: 1px solid var(--surface-border);
    margin-top: 0.5rem;
}

.eco-page-info { font-size: 0.8125rem; font-weight: 600; color: var(--text-color-secondary); }

.eco-collapse-btn {
    display: flex;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
    padding: 0;
    gap: 0.25rem;
}

.eco-collapse-count {
    margin-left: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    background: var(--surface-100);
    padding: 0.15rem 0.55rem;
    border-radius: 99px;
}

.eco-empty { text-align: center; padding: 2rem; color: var(--text-color-secondary); font-size: 0.875rem; }

/* ─── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 1400px) {
    .eco-charts-grid { grid-template-columns: 1fr; }
}

@media (max-width: 1200px) {
    .eco-two-cols { grid-template-columns: 1fr; }
    .eco-area-kpis { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 900px) {
    .eco-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .eco-area-grid { grid-template-columns: 1fr; }
    .eco-header { flex-direction: column; }
    .eco-header-right { align-items: flex-start; width: 100%; }
}

@media (max-width: 600px) {
    .eco-container { padding: 1rem; }
    .eco-kpi-grid { grid-template-columns: 1fr; }
    .eco-filter-row { flex-direction: column; align-items: stretch; }
    .eco-calendar { min-width: unset; width: 100%; }
}
</style>
