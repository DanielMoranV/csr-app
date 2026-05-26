<script setup>
import { dashboardEmergencia as emergenciaApi } from '@/api/dashboardEmergencia';
import KPICard from '@/components/dashboard/KPICard.vue';
import { Chart as ChartJS } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import ToggleButton from 'primevue/togglebutton';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

ChartJS.register(ChartDataLabels);

const toast = useToast();

const desde = ref(null);
const hasta = ref(null);
const rawData = ref([]);
const isLoading = ref(false);
const isExporting = ref(false);
const errorMsg = ref('');
const selectedArea = ref('all');
const selectedYears = ref([]);
const selectedMonths = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const chartMetric = ref('monto');
const showLabels = ref(false);
const pieMetric = ref('monto');
const rankMetricGuardia = ref('monto');
const rankMetricEspecialista = ref('monto');
const rankMetricCia = ref('monto');

const metricOptions = [
    { label: 'Importe', value: 'monto' },
    { label: 'Cantidad', value: 'cantidad' }
];

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const monthOptions = MONTH_NAMES.map((label, i) => ({ label, value: i + 1 }));

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fCurrency = (v) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v ?? 0);

const fCurrencyK = (v) => {
    const abs = Math.abs(v ?? 0);
    return abs >= 1000 ? `S/ ${(abs / 1000).toFixed(1)}K` : `S/ ${Math.round(abs)}`;
};

const fNumber = (v) => new Intl.NumberFormat('es-PE').format(v ?? 0);

const formatPeriod = computed(() => {
    if (!desde.value || !hasta.value) return '';
    return `${desde.value.toLocaleDateString('es-ES')} — ${hasta.value.toLocaleDateString('es-ES')}`;
});

const fetchData = async () => {
    if (!desde.value || !hasta.value) return;
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const params = { desde: formatDate(desde.value), hasta: formatDate(hasta.value) };
        const [response] = await Promise.all([emergenciaApi.getData(params), fetchDiagnosticos(), fetchSinDiagnostico(), fetchContinuidad()]);
        rawData.value = response?.data || [];
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
        const params = { desde: formatDate(desde.value), hasta: formatDate(hasta.value) };
        const response = await emergenciaApi.exportExcel(params);
        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergencia-topico-${params.desde}-${params.hasta}.xlsx`;
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

const toggleAllMonths = () => {
    selectedMonths.value = selectedMonths.value.length === 12 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
};

// ─── COMPUTED ─────────────────────────────────────────────────────────────────

const yearOptions = computed(() => {
    const years = [...new Set(rawData.value.map((r) => new Date(r.fecha + 'T00:00:00').getFullYear()))].filter((y) => !isNaN(y)).sort();
    return years.map((y) => ({ label: String(y), value: y }));
});

watch(yearOptions, (opts) => {
    selectedYears.value = opts.map((o) => o.value);
});

const filteredData = computed(() => {
    let data = rawData.value;
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

const areaOptions = computed(() => {
    const areas = [...new Set(rawData.value.map((r) => r.area))].sort();
    return [{ label: 'Todas', value: 'all' }, ...areas.map((a) => ({ label: a, value: a }))];
});

const totalFacturacion = computed(() => filteredData.value.reduce((s, r) => s + r.importe, 0));
const totalAtenciones = computed(() => filteredData.value.length);
const totalParticular = computed(() => filteredData.value.filter((r) => r.particular).reduce((s, r) => s + r.importe, 0));
const pctParticular = computed(() => (totalFacturacion.value > 0 ? ((totalParticular.value / totalFacturacion.value) * 100).toFixed(1) + '%' : '0.0%'));

// Monthly line chart — one line per year, months on X axis
const monthlyChartData = computed(() => {
    if (!filteredData.value.length) return { labels: [], datasets: [] };

    const yearsSet = new Set();
    const monthsSet = new Set();
    filteredData.value.forEach((row) => {
        const d = new Date(row.fecha + 'T00:00:00');
        yearsSet.add(d.getFullYear());
        monthsSet.add(d.getMonth() + 1);
    });
    const years = [...yearsSet].sort();
    const months = [...monthsSet].sort((a, b) => a - b);
    const labels = months.map((m) => MONTH_NAMES[m - 1]);

    const palette = ['#0369a1', '#64748b', '#14b8a6', '#d97706', '#8b5cf6'];

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
                label: (ctx) => (chartMetric.value === 'monto' ? ` ${fCurrency(ctx.parsed.y)}` : ` ${fNumber(ctx.parsed.y)} atenciones`)
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
            formatter: (v) => (chartMetric.value === 'monto' ? `S/ ${Math.round(v / 1000)}K` : fNumber(v))
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: '#f0f6ff' },
            ticks: {
                font: { size: 10, weight: '600' },
                color: '#94a3b8',
                callback: (v) => (chartMetric.value === 'monto' ? fCurrencyK(v) : v)
            }
        },
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } }
    }
}));

// Donut chart
const donutChartData = computed(() => {
    const m = pieMetric.value;
    const pVal = m === 'monto' ? filteredData.value.filter((r) => r.particular).reduce((s, r) => s + r.importe, 0) : filteredData.value.filter((r) => r.particular).length;
    const sVal = m === 'monto' ? filteredData.value.filter((r) => !r.particular).reduce((s, r) => s + r.importe, 0) : filteredData.value.filter((r) => !r.particular).length;
    return {
        labels: ['Particular', 'Seguros'],
        datasets: [{ data: [pVal, sVal], backgroundColor: ['#0369a1', '#bae6fd'], borderWidth: 0, hoverOffset: 12 }]
    };
});

const donutCenterLabel = computed(() => {
    const [pVal, sVal] = donutChartData.value.datasets[0].data;
    const total = pVal + sVal;
    return {
        total: pieMetric.value === 'monto' ? fCurrency(total) : fNumber(total),
        label: pieMetric.value === 'monto' ? 'Facturación' : 'Atenciones'
    };
});

const donutLegendItems = computed(() => {
    const [pVal, sVal] = donutChartData.value.datasets[0].data;
    const total = pVal + sVal;
    const fmt = pieMetric.value === 'monto' ? fCurrency : fNumber;
    return [
        { label: 'Particular', color: '#0369a1', pct: total > 0 ? ((pVal / total) * 100).toFixed(1) : '0.0', val: fmt(pVal) },
        { label: 'Seguros', color: '#bae6fd', pct: total > 0 ? ((sVal / total) * 100).toFixed(1) : '0.0', val: fmt(sVal) }
    ];
});

const donutOptions = {
    cutout: '78%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => (pieMetric.value === 'monto' ? ` ${fCurrency(ctx.parsed)}` : ` ${fNumber(ctx.parsed)} atenciones`)
            }
        },
        datalabels: { display: false }
    }
};

// Area/subtipo breakdown table
const areaBreakdown = computed(() => {
    const areas = [...new Set(filteredData.value.map((r) => r.area))].sort();
    const rows = [];
    areas.forEach((area) => {
        const areaRows = filteredData.value.filter((r) => r.area === area);
        const subtipos = [...new Set(areaRows.map((r) => r.subtipo || 'General'))].sort();
        subtipos.forEach((subtipo) => {
            const sub = areaRows.filter((r) => (r.subtipo || 'General') === subtipo);
            const total = sub.reduce((s, r) => s + r.importe, 0);
            const part = sub.filter((r) => r.particular).reduce((s, r) => s + r.importe, 0);
            rows.push({
                area,
                subtipo,
                total,
                atenciones: sub.length,
                particular: part,
                seguros: total - part
            });
        });
    });
    return rows;
});

// Rankings
const buildRanking = (rows, metric) => {
    const stats = {};
    rows.forEach((r) => {
        const key = r.medico || 'SIN NOMBRE';
        if (!stats[key]) stats[key] = { nombre: key, monto: 0, cantidad: 0 };
        stats[key].monto += r.importe;
        stats[key].cantidad++;
    });
    return Object.values(stats)
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, 10);
};

const topGuardia = computed(() =>
    buildRanking(
        filteredData.value.filter((r) => r.subtipo === 'Guardia'),
        rankMetricGuardia.value
    )
);

const topEspecialista = computed(() =>
    buildRanking(
        filteredData.value.filter((r) => r.subtipo === 'Especialista'),
        rankMetricEspecialista.value
    )
);

const topAseguradoras = computed(() => {
    const rows = filteredData.value.filter((r) => !r.particular);
    const stats = {};
    rows.forEach((r) => {
        const key = r.cia || 'SIN ESPECIFICAR';
        if (!stats[key]) stats[key] = { nombre: key, monto: 0, cantidad: 0 };
        stats[key].monto += r.importe;
        stats[key].cantidad++;
    });
    return Object.values(stats)
        .sort((a, b) => b[rankMetricCia.value] - a[rankMetricCia.value])
        .slice(0, 10);
});

// ─── SIN DIAGNÓSTICO ─────────────────────────────────────────────────────────
const sinDiagData = ref(null);
const sinDiagLoading = ref(false);
const isExportingSinDiag = ref(false);

const fetchSinDiagnostico = async () => {
    if (!desde.value || !hasta.value) return;
    sinDiagLoading.value = true;
    try {
        const params = { desde: formatDate(desde.value), hasta: formatDate(hasta.value) };
        const response = await emergenciaApi.getSinDiagnostico(params);
        sinDiagData.value = response?.data || null;
    } catch {
        // suplementario — fallo silencioso
    } finally {
        sinDiagLoading.value = false;
    }
};

const handleExportSinDiag = async () => {
    isExportingSinDiag.value = true;
    try {
        const params = { desde: formatDate(desde.value), hasta: formatDate(hasta.value) };
        const response = await emergenciaApi.exportSinDiagnostico(params);
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sin-diagnostico-${params.desde}-${params.hasta}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: 'Exportado', detail: 'Archivo descargado correctamente', life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el archivo', life: 4000 });
    } finally {
        isExportingSinDiag.value = false;
    }
};

const pctColor = (pct) => (pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#e11d48');
const pctBg = (pct) => (pct >= 75 ? '#f0fdf4' : pct >= 50 ? '#fffbeb' : '#fff1f2');

// ─── AUDITORÍA PIPELINE ───────────────────────────────────────────────────────
const auditModalVisible = ref(false);
const isExportingAuditoria = ref(false);
const auditArea = ref('');
const auditSoloCorregidos = ref(false);

const AUDIT_AREAS = [
    { label: 'Todas las áreas', value: '' },
    { label: '02.Emergencia', value: '02.Emergencia' },
    { label: '03.Tópico', value: '03.Tópico' },
    { label: '05.RX', value: '05.RX' },
    { label: '06.Lab', value: '06.Lab' },
    { label: '07.Farm', value: '07.Farm' },
    { label: '10.Ecografía', value: '10.Ecografia' },
    { label: '14.Oxígeno', value: '14.Oxígeno' },
    { label: '17.Ambulancia', value: '17.Ambulancia' },
    { label: '08.Consultorio Ext.', value: '08.Consultorio Ext.' }
];

const handleExportAuditoria = async () => {
    if (!desde.value || !hasta.value) return;
    isExportingAuditoria.value = true;
    try {
        const params = { desde: formatDate(desde.value), hasta: formatDate(hasta.value) };
        if (auditArea.value) params.area_dashboard = auditArea.value;
        if (auditSoloCorregidos.value) params.solo_corregidos = 1;

        const response = await emergenciaApi.exportAuditoria(params);
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const cd = response.headers?.['content-disposition'];
        let filename = auditSoloCorregidos.value ? `auditoria_pipeline_${params.desde}_${params.hasta}_solo_corregidos.zip` : `auditoria_pipeline_${params.desde}_${params.hasta}.zip`;
        if (cd) {
            const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match) filename = match[1].replace(/['"]/g, '');
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: 'Exportado', detail: 'Auditoría descargada correctamente', life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar la auditoría del pipeline', life: 4000 });
    } finally {
        isExportingAuditoria.value = false;
    }
};

// ─── DIAGNÓSTICOS CIE-10 ─────────────────────────────────────────────────────
const diagData = ref(null);
const diagLoading = ref(false);
const selectedDiagArea = ref('global');

const fetchDiagnosticos = async () => {
    if (!desde.value || !hasta.value) return;
    diagLoading.value = true;
    try {
        const params = { desde: formatDate(desde.value), hasta: formatDate(hasta.value), limit: 20 };
        const response = await emergenciaApi.getDiagnosticos(params);
        diagData.value = response?.data || null;
        selectedDiagArea.value = 'global';
    } catch {
        // diagnósticos son suplementarios — fallo silencioso
    } finally {
        diagLoading.value = false;
    }
};

const diagAreaOptions = computed(() => {
    if (!diagData.value) return [];
    const areas = Object.keys(diagData.value.por_area || {}).sort();
    return [{ label: 'Global', value: 'global' }, ...areas.map((a) => ({ label: a, value: a }))];
});

const diagList = computed(() => {
    if (!diagData.value) return [];
    if (selectedDiagArea.value === 'global') return diagData.value.global || [];
    return diagData.value.por_area?.[selectedDiagArea.value] || [];
});

const diagMax = computed(() => diagList.value[0]?.atenciones || 1);

// ─── TENDENCIA TEMPORAL ───────────────────────────────────────────────────────
const trendMetric = ref('monto');
const trendGranularity = ref('month');

const trendGranularityOptions = [
    { label: 'Día', value: 'day' },
    { label: 'Semana', value: 'week' },
    { label: 'Mes', value: 'month' }
];

const getWeekKey = (d) => {
    const day = d.getDay() || 7;
    const thu = new Date(d);
    thu.setDate(d.getDate() + 4 - day);
    const yearStart = new Date(thu.getFullYear(), 0, 1);
    const week = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7);
    return `${thu.getFullYear()}-${String(week).padStart(2, '0')}`;
};

const trendChartData = computed(() => {
    if (!filteredData.value.length) return { labels: [], datasets: [] };

    const buckets = {};
    filteredData.value.forEach((r) => {
        const d = new Date(r.fecha + 'T00:00:00');
        let key;
        if (trendGranularity.value === 'day') {
            key = r.fecha;
        } else if (trendGranularity.value === 'week') {
            key = getWeekKey(d);
        } else {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        if (!buckets[key]) buckets[key] = { monto: 0, cantidad: 0 };
        buckets[key].monto += r.importe;
        buckets[key].cantidad++;
    });

    const sorted = Object.keys(buckets).sort();
    const labels = sorted.map((k) => {
        if (trendGranularity.value === 'day') {
            const [, m, d] = k.split('-');
            return `${d}/${m}`;
        }
        if (trendGranularity.value === 'week') {
            const [y, w] = k.split('-');
            return `Sem ${parseInt(w)} ${y}`;
        }
        const [y, m] = k.split('-');
        return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
    });

    const color = '#0369a1';
    return {
        labels,
        datasets: [
            {
                label: trendMetric.value === 'monto' ? 'Facturación' : 'Atenciones',
                data: sorted.map((k) => (trendMetric.value === 'monto' ? buckets[k].monto : buckets[k].cantidad)),
                borderColor: color,
                backgroundColor: color + '18',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointRadius: trendGranularity.value === 'day' ? 2 : 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#fff',
                pointBorderWidth: 2,
                pointBorderColor: color
            }
        ]
    };
});

const trendChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => (trendMetric.value === 'monto' ? ` ${fCurrency(ctx.parsed.y)}` : ` ${fNumber(ctx.parsed.y)} atenciones`)
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: '#f0f6ff' },
            ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8', callback: (v) => (trendMetric.value === 'monto' ? fCurrencyK(v) : v) }
        },
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#64748b', maxRotation: 45 } }
    }
}));

// ─── ESTACIONALIDAD ───────────────────────────────────────────────────────────
const seasonMetric = ref('monto');
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const seasonalChartData = computed(() => {
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    filteredData.value.forEach((r) => {
        const dow = new Date(r.fecha + 'T00:00:00').getDay();
        byDay[dow] += seasonMetric.value === 'monto' ? r.importe : 1;
    });
    const color = '#14b8a6';
    return {
        labels: DAY_NAMES,
        datasets: [
            {
                label: seasonMetric.value === 'monto' ? 'Facturación' : 'Atenciones',
                data: byDay,
                backgroundColor: DAY_NAMES.map((_, i) => (i === 0 || i === 6 ? color + '55' : color + 'CC')),
                borderColor: color,
                borderWidth: 1.5,
                borderRadius: 8,
                borderSkipped: false
            }
        ]
    };
});

const seasonalChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => (seasonMetric.value === 'monto' ? ` ${fCurrency(ctx.parsed.y)}` : ` ${fNumber(ctx.parsed.y)} atenciones`)
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: '#f0f6ff' },
            ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8', callback: (v) => (seasonMetric.value === 'monto' ? fCurrencyK(v) : v) }
        },
        x: { grid: { display: false }, ticks: { font: { size: 12, weight: '700' }, color: '#64748b' } }
    }
}));

// ─── CONTINUIDAD DE ATENCIÓN ─────────────────────────────────────────────────
const continuidadData = ref(null);
const continuidadLoading = ref(false);
const ventanaDias = ref(3);

const VENTANA_OPTIONS = [
    { label: '1 día', value: 1 },
    { label: '3 días', value: 3 },
    { label: '7 días', value: 7 },
    { label: '14 días', value: 14 },
    { label: '30 días', value: 30 }
];

const fetchContinuidad = async () => {
    if (!desde.value || !hasta.value) return;
    continuidadLoading.value = true;
    try {
        const params = { desde: formatDate(desde.value), hasta: formatDate(hasta.value), ventana_dias: ventanaDias.value };
        const response = await emergenciaApi.getContinuidad(params);
        continuidadData.value = response?.data || null;
    } catch {
        // suplementario — fallo silencioso
    } finally {
        continuidadLoading.value = false;
    }
};

watch(ventanaDias, fetchContinuidad);

const continuidadTendenciaData = computed(() => {
    const trend = continuidadData.value?.tendencia_mensual || [];
    if (!trend.length) return { labels: [], datasets: [] };

    const labels = trend.map((t) => {
        const [y, m] = t.mes.split('-');
        return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
    });

    return {
        labels,
        datasets: [
            {
                type: 'bar',
                label: 'Emergencias',
                data: trend.map((t) => t.emergencias),
                backgroundColor: '#0369a130',
                borderColor: '#0369a1',
                borderWidth: 1.5,
                borderRadius: 4,
                borderSkipped: false,
                stack: 'atenciones',
                yAxisID: 'y'
            },
            {
                type: 'bar',
                label: 'Hospitalizaciones',
                data: trend.map((t) => t.hospitalizaciones),
                backgroundColor: '#059669CC',
                borderColor: '#059669',
                borderWidth: 1.5,
                borderRadius: 4,
                borderSkipped: false,
                stack: 'atenciones',
                yAxisID: 'y'
            },
            {
                type: 'line',
                label: '% Conversión',
                data: trend.map((t) => t.tasa_pct),
                borderColor: '#d97706',
                backgroundColor: '#d9770615',
                borderWidth: 2.5,
                tension: 0.4,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#fff',
                pointBorderWidth: 2,
                pointBorderColor: '#d97706',
                yAxisID: 'yPct'
            }
        ]
    };
});

const continuidadTendenciaOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
        datalabels: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) =>
                    ctx.dataset.label === '% Conversión'
                        ? ` ${ctx.parsed.y.toFixed(1)}%`
                        : ` ${fNumber(ctx.parsed.y)} atenciones`
            }
        }
    },
    scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
        y: {
            stacked: true,
            beginAtZero: true,
            position: 'left',
            grid: { color: '#f0f6ff' },
            ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8', callback: (v) => fNumber(v) }
        },
        yPct: {
            beginAtZero: true,
            max: 100,
            position: 'right',
            grid: { display: false },
            ticks: { font: { size: 10, weight: '600' }, color: '#d97706', callback: (v) => `${v}%` }
        }
    }
};

const reingresoColor = (pct) => (pct > 5 ? '#e11d48' : pct > 2 ? '#d97706' : '#059669');
const reingresoBg = (pct) => (pct > 5 ? '#fff1f2' : pct > 2 ? '#fffbeb' : '#f0fdf4');

onMounted(() => {
    const now = new Date();
    desde.value = new Date(now.getFullYear() - 1, 0, 1);
    hasta.value = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    fetchData();
});
</script>

<template>
    <div class="em-container">
        <!-- Header -->
        <div class="em-header">
            <div class="em-header-left">
                <div class="em-title-group">
                    <h1 class="em-title">
                        <i class="pi pi-bolt em-title-icon"></i>
                        Dashboard Emergencia / Tópico
                    </h1>
                    <p class="em-subtitle">Facturación y atenciones médicas por período</p>
                </div>
                <div v-if="formatPeriod" class="em-period-badge">
                    <i class="pi pi-calendar"></i>
                    <span>{{ formatPeriod }}</span>
                </div>
            </div>

            <div class="em-header-right">
                <div class="em-filter-row">
                    <div class="em-filter-group">
                        <label class="em-filter-label">Desde</label>
                        <Calendar v-model="desde" dateFormat="dd/mm/yy" placeholder="Fecha inicio" showIcon iconDisplay="input" class="em-calendar" />
                    </div>
                    <div class="em-filter-group">
                        <label class="em-filter-label">Hasta</label>
                        <Calendar v-model="hasta" dateFormat="dd/mm/yy" placeholder="Fecha fin" showIcon iconDisplay="input" class="em-calendar" />
                    </div>
                    <Button icon="pi pi-search" label="Aplicar" @click="fetchData" :loading="isLoading" class="em-apply-btn" />
                    <Button icon="pi pi-download" label="Excel" @click="handleExport" :loading="isExporting" severity="success" outlined class="em-export-btn" />
                    <Button icon="pi pi-shield" label="Auditoría" @click="auditModalVisible = true" :disabled="!desde || !hasta" severity="secondary" outlined class="em-export-btn" />
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="em-loading">
            <ProgressSpinner />
            <p>Cargando datos...</p>
        </div>

        <div v-else class="em-content">
            <!-- Error -->
            <Message v-if="errorMsg" severity="error" :closable="false">{{ errorMsg }}</Message>

            <!-- Filters bar -->
            <div v-if="rawData.length" class="em-filters-bar">
                <!-- Area filter -->
                <div class="em-filter-section">
                    <span class="em-filter-label">Área</span>
                    <SelectButton v-model="selectedArea" :options="areaOptions" optionLabel="label" optionValue="value" />
                </div>

                <div class="em-filter-divider"></div>

                <!-- Year filter -->
                <div class="em-filter-section">
                    <span class="em-filter-label">Año</span>
                    <SelectButton v-model="selectedYears" :options="yearOptions" optionLabel="label" optionValue="value" multiple />
                </div>

                <div class="em-filter-divider"></div>

                <!-- Month filter -->
                <div class="em-filter-section em-filter-section--months">
                    <div class="em-month-header">
                        <span class="em-filter-label">Mes</span>
                        <button class="em-toggle-all-btn" @click="toggleAllMonths">
                            {{ selectedMonths.length === 12 ? 'Desmarcar todos' : 'Marcar todos' }}
                        </button>
                    </div>
                    <SelectButton v-model="selectedMonths" :options="monthOptions" optionLabel="label" optionValue="value" multiple class="em-month-select" />
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="!rawData.length && !errorMsg" class="em-empty">
                <i class="pi pi-inbox em-empty-icon"></i>
                <p>Sin datos para el período seleccionado</p>
            </div>

            <template v-if="filteredData.length">
                <!-- KPIs -->
                <div class="em-kpi-grid">
                    <KPICard title="Facturación Total" :value="fCurrency(totalFacturacion)" subtitle="Importe bruto del período" icon="pi-dollar" color="blue" />
                    <KPICard title="Total Atenciones" :value="fNumber(totalAtenciones)" subtitle="Consultas registradas" icon="pi-users" color="green" />
                    <KPICard title="% Particular" :value="pctParticular" :subtitle="`${fCurrency(totalParticular)} pago directo`" icon="pi-wallet" color="purple" />
                    <KPICard title="Áreas Activas" :value="String(new Set(filteredData.map((r) => r.area)).size)" subtitle="Unidades con atenciones" icon="pi-building" color="orange" />
                </div>

                <!-- Charts row -->
                <div class="em-charts-grid">
                    <!-- Line chart -->
                    <Card class="em-card">
                        <template #title>
                            <div class="em-card-title">
                                <span><i class="pi pi-chart-line mr-2 text-primary"></i>Evolución Mensual por Año</span>
                                <div class="em-chart-toolbar">
                                    <SelectButton v-model="chartMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                                    <Button
                                        :icon="showLabels ? 'pi pi-tag' : 'pi pi-tag'"
                                        :label="showLabels ? 'Ocultar valores' : 'Ver valores'"
                                        :outlined="!showLabels"
                                        size="small"
                                        severity="secondary"
                                        @click="showLabels = !showLabels"
                                        class="em-labels-btn"
                                    />
                                </div>
                            </div>
                        </template>
                        <template #content>
                            <div class="em-chart-wrapper">
                                <Chart type="line" :data="monthlyChartData" :options="lineChartOptions" class="em-chart" />
                            </div>
                        </template>
                    </Card>

                    <!-- Donut chart -->
                    <Card class="em-card">
                        <template #title>
                            <div class="em-card-title">
                                <span><i class="pi pi-chart-pie mr-2 text-primary"></i>Particular vs Seguros</span>
                                <SelectButton v-model="pieMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                            </div>
                        </template>
                        <template #content>
                            <div class="em-donut-section">
                                <div class="em-donut-wrapper">
                                    <Chart type="doughnut" :data="donutChartData" :options="donutOptions" class="em-donut-chart" />
                                    <div class="em-donut-center">
                                        <div class="em-donut-total">{{ donutCenterLabel.total }}</div>
                                        <div class="em-donut-label">{{ donutCenterLabel.label }}</div>
                                    </div>
                                </div>
                                <div class="em-donut-legend">
                                    <div v-for="item in donutLegendItems" :key="item.label" class="em-legend-item">
                                        <div class="em-legend-left">
                                            <span class="em-legend-dot" :style="{ background: item.color }"></span>
                                            <span class="em-legend-name">{{ item.label }}</span>
                                        </div>
                                        <div class="em-legend-right">
                                            <span class="em-legend-pct">{{ item.pct }}%</span>
                                            <span class="em-legend-val">{{ item.val }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Area breakdown table -->
                <Card class="em-card">
                    <template #title>
                        <i class="pi pi-table mr-2 text-primary"></i>
                        Desglose por Área y Subtipo
                    </template>
                    <template #content>
                        <DataTable :value="areaBreakdown" stripedRows :rowGroupMode="'subheader'" :groupRowsBy="'area'" sortField="area" :sortOrder="1" class="em-table" size="small">
                            <template #groupheader="{ data }">
                                <span class="em-group-header"> <i class="pi pi-building mr-2"></i>{{ data.area }} </span>
                            </template>
                            <Column field="subtipo" header="Subtipo" sortable />
                            <Column field="total" header="Facturación" sortable>
                                <template #body="{ data }">
                                    <span class="em-amount-primary">{{ fCurrency(data.total) }}</span>
                                </template>
                            </Column>
                            <Column field="atenciones" header="Atenciones" sortable>
                                <template #body="{ data }">{{ fNumber(data.atenciones) }}</template>
                            </Column>
                            <Column field="particular" header="Particular" sortable>
                                <template #body="{ data }">
                                    <span class="em-amount-particular">{{ fCurrency(data.particular) }}</span>
                                </template>
                            </Column>
                            <Column field="seguros" header="Seguros" sortable>
                                <template #body="{ data }">
                                    <span class="em-amount-seguros">{{ fCurrency(data.seguros) }}</span>
                                </template>
                            </Column>
                        </DataTable>
                    </template>
                </Card>

                <!-- Rankings médicos -->
                <div class="em-rankings-grid">
                    <!-- Guardia -->
                    <Card class="em-card">
                        <template #title>
                            <div class="em-card-title">
                                <span><i class="pi pi-shield mr-2" style="color: #0369a1"></i>Top Médicos Guardia</span>
                                <SelectButton v-model="rankMetricGuardia" :options="metricOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                            </div>
                        </template>
                        <template #content>
                            <div class="em-rank-list">
                                <div v-for="(doc, idx) in topGuardia" :key="doc.nombre" class="em-rank-item">
                                    <div class="em-rank-left">
                                        <span class="em-rank-badge" :class="{ 'em-rank-1': idx === 0, 'em-rank-2': idx === 1, 'em-rank-3': idx === 2 }">#{{ idx + 1 }}</span>
                                        <div class="em-rank-info">
                                            <div class="em-rank-name">{{ doc.nombre }}</div>
                                            <div class="em-rank-sub">Guardia</div>
                                        </div>
                                    </div>
                                    <div class="em-rank-right">
                                        <div class="em-rank-value" style="color: #0369a1">
                                            {{ rankMetricGuardia === 'monto' ? fCurrency(doc.monto) : fNumber(doc.cantidad) }}
                                        </div>
                                        <div class="em-rank-meta">
                                            {{ rankMetricGuardia === 'monto' ? `${fNumber(doc.cantidad)} atenc.` : fCurrency(doc.monto) }}
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!topGuardia.length" class="em-rank-empty">Sin datos de guardia</div>
                            </div>
                        </template>
                    </Card>

                    <!-- Especialista -->
                    <Card class="em-card">
                        <template #title>
                            <div class="em-card-title">
                                <span><i class="pi pi-star mr-2" style="color: #6366f1"></i>Top Médicos Especialista</span>
                                <SelectButton v-model="rankMetricEspecialista" :options="metricOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                            </div>
                        </template>
                        <template #content>
                            <div class="em-rank-list">
                                <div v-for="(doc, idx) in topEspecialista" :key="doc.nombre" class="em-rank-item">
                                    <div class="em-rank-left">
                                        <span class="em-rank-badge" :class="{ 'em-rank-1': idx === 0, 'em-rank-2': idx === 1, 'em-rank-3': idx === 2 }">#{{ idx + 1 }}</span>
                                        <div class="em-rank-info">
                                            <div class="em-rank-name">{{ doc.nombre }}</div>
                                            <div class="em-rank-sub">Especialista</div>
                                        </div>
                                    </div>
                                    <div class="em-rank-right">
                                        <div class="em-rank-value" style="color: #6366f1">
                                            {{ rankMetricEspecialista === 'monto' ? fCurrency(doc.monto) : fNumber(doc.cantidad) }}
                                        </div>
                                        <div class="em-rank-meta">
                                            {{ rankMetricEspecialista === 'monto' ? `${fNumber(doc.cantidad)} atenc.` : fCurrency(doc.monto) }}
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!topEspecialista.length" class="em-rank-empty">Sin datos de especialistas</div>
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Top Diagnósticos CIE-10 -->
                <Card class="em-card">
                    <template #title>
                        <div class="em-card-title">
                            <span><i class="pi pi-heart-fill mr-2" style="color: #6366f1"></i>Top Diagnósticos CIE-10</span>
                            <SelectButton v-if="diagAreaOptions.length" v-model="selectedDiagArea" :options="diagAreaOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                        </div>
                    </template>
                    <template #content>
                        <div v-if="diagLoading" class="em-diag-loading">
                            <ProgressSpinner style="width: 32px; height: 32px" />
                        </div>
                        <div v-else-if="!diagList.length" class="em-rank-empty">Sin datos de diagnósticos</div>
                        <div v-else class="em-diag-grid">
                            <div v-for="(item, idx) in diagList" :key="item.codigo_cie" class="em-diag-item">
                                <div class="em-diag-top">
                                    <div class="em-diag-left">
                                        <span class="em-rank-badge" :class="{ 'em-rank-1': idx === 0, 'em-rank-2': idx === 1, 'em-rank-3': idx === 2 }">#{{ idx + 1 }}</span>
                                        <div class="em-diag-label">
                                            <span class="em-diag-code">{{ item.codigo_cie }}</span>
                                            <span class="em-diag-name">{{ item.nombre_cie }}</span>
                                        </div>
                                    </div>
                                    <span class="em-diag-count">{{ fNumber(item.atenciones) }}</span>
                                </div>
                                <div class="em-diag-bar-track">
                                    <div class="em-diag-bar-fill" :style="{ width: ((item.atenciones / diagMax) * 100).toFixed(1) + '%' }"></div>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- ── Tendencia + Estacionalidad ─────────────────────────── -->
                <div class="em-charts-grid">
                    <!-- Tendencia temporal -->
                    <Card class="em-card">
                        <template #title>
                            <div class="em-card-title">
                                <span><i class="pi pi-chart-line mr-2" style="color: #0369a1"></i>Tendencia Temporal</span>
                                <div class="em-chart-toolbar">
                                    <SelectButton v-model="trendGranularity" :options="trendGranularityOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                                    <SelectButton v-model="trendMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                                </div>
                            </div>
                        </template>
                        <template #content>
                            <div class="em-chart-wrapper">
                                <Chart type="line" :data="trendChartData" :options="trendChartOptions" class="em-chart" />
                            </div>
                        </template>
                    </Card>

                    <!-- Estacionalidad -->
                    <Card class="em-card">
                        <template #title>
                            <div class="em-card-title">
                                <span><i class="pi pi-calendar mr-2" style="color: #14b8a6"></i>Estacionalidad Semanal</span>
                                <SelectButton v-model="seasonMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                            </div>
                        </template>
                        <template #content>
                            <div class="em-chart-wrapper">
                                <Chart type="bar" :data="seasonalChartData" :options="seasonalChartOptions" class="em-chart" />
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Top Seguros y Convenios — sección propia full-width -->
                <Card class="em-card">
                    <template #title>
                        <div class="em-card-title">
                            <span><i class="pi pi-building mr-2" style="color: #e11d48"></i>Top Seguros y Convenios</span>
                            <SelectButton v-model="rankMetricCia" :options="metricOptions" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                        </div>
                    </template>
                    <template #content>
                        <div v-if="!topAseguradoras.length" class="em-rank-empty">Sin atenciones por seguros</div>
                        <div v-else class="em-cia-grid">
                            <div v-for="(cia, idx) in topAseguradoras" :key="cia.nombre" class="em-rank-item">
                                <div class="em-rank-left">
                                    <span class="em-rank-badge" :class="{ 'em-rank-1': idx === 0, 'em-rank-2': idx === 1, 'em-rank-3': idx === 2 }">#{{ idx + 1 }}</span>
                                    <div class="em-rank-info">
                                        <div class="em-rank-name">{{ cia.nombre }}</div>
                                        <div class="em-rank-sub">Seguro / Convenio</div>
                                    </div>
                                </div>
                                <div class="em-rank-right">
                                    <div class="em-rank-value" style="color: #e11d48">
                                        {{ rankMetricCia === 'monto' ? fCurrency(cia.monto) : fNumber(cia.cantidad) }}
                                    </div>
                                    <div class="em-rank-meta">
                                        {{ rankMetricCia === 'monto' ? `${fNumber(cia.cantidad)} atenc.` : fCurrency(cia.monto) }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>
                <!-- Continuidad de Atención -->
                <Card class="em-card">
                    <template #title>
                        <div class="em-card-title">
                            <span><i class="pi pi-arrow-right-arrow-left mr-2" style="color: #6366f1"></i>Continuidad de Atención — Emergencia → Hospitalización</span>
                            <div class="em-chart-toolbar">
                                <span class="em-filter-label">Ventana</span>
                                <SelectButton v-model="ventanaDias" :options="VENTANA_OPTIONS" optionLabel="label" optionValue="value" class="em-metric-toggle" />
                            </div>
                        </div>
                    </template>
                    <template #content>
                        <div v-if="continuidadLoading" class="em-diag-loading">
                            <ProgressSpinner style="width: 32px; height: 32px" />
                        </div>
                        <div v-else-if="!continuidadData" class="em-rank-empty">Sin datos de continuidad para el período</div>
                        <template v-else>

                            <!-- KPIs -->
                            <div class="em-cont-kpis">
                                <div class="em-cont-kpi em-cont-kpi--highlight">
                                    <span class="em-cont-kpi-val">{{ continuidadData.resumen.tasa_conversion_pct.toFixed(1) }}%</span>
                                    <span class="em-cont-kpi-lbl">Tasa conversión</span>
                                    <span class="em-cont-kpi-sub">{{ fNumber(continuidadData.resumen.con_hospitalizacion) }} de {{ fNumber(continuidadData.resumen.total_emergencias) }}</span>
                                </div>
                                <div class="em-cont-kpi">
                                    <span class="em-cont-kpi-val">{{ continuidadData.resumen.avg_dias_gap.toFixed(1) }}d</span>
                                    <span class="em-cont-kpi-lbl">Días hasta internación</span>
                                    <span class="em-cont-kpi-sub">promedio</span>
                                </div>
                                <div class="em-cont-kpi">
                                    <span class="em-cont-kpi-val">{{ continuidadData.resumen.avg_dias_internado.toFixed(1) }}d</span>
                                    <span class="em-cont-kpi-lbl">Días internado</span>
                                    <span class="em-cont-kpi-sub">mediana {{ continuidadData.resumen.mediana_dias_internado }}d · máx {{ continuidadData.resumen.max_dias_internado }}d</span>
                                </div>
                                <div class="em-cont-kpi">
                                    <span class="em-cont-kpi-val">{{ fCurrency(continuidadData.resumen.avg_ticket_combinado) }}</span>
                                    <span class="em-cont-kpi-lbl">Ticket combinado</span>
                                    <span class="em-cont-kpi-sub">emerg. + hosp.</span>
                                </div>
                                <div class="em-cont-kpi">
                                    <span class="em-cont-kpi-val">{{ fCurrencyK(continuidadData.resumen.total_facturado_emergencia) }}</span>
                                    <span class="em-cont-kpi-lbl">Total emergencia</span>
                                    <span class="em-cont-kpi-sub">período</span>
                                </div>
                                <div class="em-cont-kpi">
                                    <span class="em-cont-kpi-val">{{ fCurrencyK(continuidadData.resumen.total_facturado_hospitalizacion) }}</span>
                                    <span class="em-cont-kpi-lbl">Total hospitalización</span>
                                    <span class="em-cont-kpi-sub">período</span>
                                </div>
                            </div>

                            <!-- Tendencia mensual -->
                            <div class="em-cont-chart-wrapper">
                                <Chart type="bar" :data="continuidadTendenciaData" :options="continuidadTendenciaOptions" class="em-chart" />
                            </div>

                            <!-- Top Médicos + Top Diagnósticos -->
                            <div class="em-rankings-grid">
                                <Card class="em-card">
                                    <template #title>
                                        <span><i class="pi pi-user mr-2" style="color: #6366f1"></i>Top Médicos por Conversión</span>
                                    </template>
                                    <template #content>
                                        <div class="em-rank-list">
                                            <div v-for="(doc, idx) in continuidadData.top_medicos" :key="doc.cod_medico" class="em-rank-item">
                                                <div class="em-rank-left">
                                                    <span class="em-rank-badge" :class="{ 'em-rank-1': idx === 0, 'em-rank-2': idx === 1, 'em-rank-3': idx === 2 }">#{{ idx + 1 }}</span>
                                                    <div class="em-rank-info">
                                                        <div class="em-rank-name">{{ doc.medico }}</div>
                                                        <div class="em-rank-sub">{{ fNumber(doc.emergencias) }} emerg. · {{ fNumber(doc.hospitalizaciones) }} hosp.</div>
                                                    </div>
                                                </div>
                                                <div class="em-rank-right">
                                                    <div class="em-rank-value" style="color: #6366f1">{{ doc.tasa_pct.toFixed(1) }}%</div>
                                                    <div class="em-rank-meta">conversión</div>
                                                </div>
                                            </div>
                                            <div v-if="!continuidadData.top_medicos.length" class="em-rank-empty">Sin datos</div>
                                        </div>
                                    </template>
                                </Card>

                                <Card class="em-card">
                                    <template #title>
                                        <span><i class="pi pi-heart-fill mr-2" style="color: #e11d48"></i>Diagnósticos en Hospitalizados</span>
                                    </template>
                                    <template #content>
                                        <div class="em-diag-grid">
                                            <div v-for="(item, idx) in continuidadData.top_diagnosticos" :key="item.codigo_cie" class="em-diag-item">
                                                <div class="em-diag-top">
                                                    <div class="em-diag-left">
                                                        <span class="em-rank-badge" :class="{ 'em-rank-1': idx === 0, 'em-rank-2': idx === 1, 'em-rank-3': idx === 2 }">#{{ idx + 1 }}</span>
                                                        <div class="em-diag-label">
                                                            <span class="em-diag-code">{{ item.codigo_cie }}</span>
                                                            <span class="em-diag-name">{{ item.nombre_cie }}</span>
                                                        </div>
                                                    </div>
                                                    <span class="em-diag-count">{{ fNumber(item.atenciones) }}</span>
                                                </div>
                                                <div class="em-diag-bar-track">
                                                    <div class="em-diag-bar-fill" :style="{ width: ((item.atenciones / (continuidadData.top_diagnosticos[0]?.atenciones || 1)) * 100).toFixed(1) + '%' }"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div v-if="!continuidadData.top_diagnosticos.length" class="em-rank-empty">Sin datos</div>
                                    </template>
                                </Card>
                            </div>

                            <!-- Por Aseguradora -->
                            <Card class="em-card" style="margin-top: 1rem">
                                <template #title>
                                    <span><i class="pi pi-building mr-2" style="color: #0369a1"></i>Conversión por Aseguradora</span>
                                </template>
                                <template #content>
                                    <DataTable :value="continuidadData.por_aseguradora" stripedRows size="small" class="em-table">
                                        <Column field="aseguradora" header="Aseguradora" sortable />
                                        <Column field="emergencias" header="Emergencias" sortable style="width: 130px">
                                            <template #body="{ data }">{{ fNumber(data.emergencias) }}</template>
                                        </Column>
                                        <Column field="hospitalizaciones" header="Hospitalizaciones" sortable style="width: 150px">
                                            <template #body="{ data }">
                                                <span style="color: #059669; font-weight: 700">{{ fNumber(data.hospitalizaciones) }}</span>
                                            </template>
                                        </Column>
                                        <Column field="tasa_pct" header="% Conversión" sortable style="width: 130px">
                                            <template #body="{ data }">
                                                <span class="em-cont-pct-badge">{{ data.tasa_pct.toFixed(1) }}%</span>
                                            </template>
                                        </Column>
                                    </DataTable>
                                </template>
                            </Card>

                            <!-- Reingresos 30d -->
                            <div class="em-cont-reingresos">
                                <div class="em-cont-reingreso-label">
                                    <i class="pi pi-refresh" style="color: #d97706"></i>
                                    <span>Reingresos a Emergencia ≤ 30 días tras el alta (independiente de la ventana)</span>
                                </div>
                                <div class="em-sindiag-kpis" style="grid-template-columns: repeat(3, 1fr)">
                                    <div class="em-sindiag-kpi">
                                        <span class="em-sindiag-kpi-val">{{ fNumber(continuidadData.reingresos_30d.total_altas) }}</span>
                                        <span class="em-sindiag-kpi-lbl">Altas hospitalarias</span>
                                    </div>
                                    <div class="em-sindiag-kpi em-sindiag-kpi--danger">
                                        <span class="em-sindiag-kpi-val">{{ fNumber(continuidadData.reingresos_30d.reingresos_30d) }}</span>
                                        <span class="em-sindiag-kpi-lbl">Reingresos 30d</span>
                                    </div>
                                    <div class="em-sindiag-kpi" :style="{ background: reingresoBg(continuidadData.reingresos_30d.tasa_reingreso_pct), borderColor: 'transparent' }">
                                        <span class="em-sindiag-kpi-val" :style="{ color: reingresoColor(continuidadData.reingresos_30d.tasa_reingreso_pct) }">
                                            {{ continuidadData.reingresos_30d.tasa_reingreso_pct.toFixed(1) }}%
                                        </span>
                                        <span class="em-sindiag-kpi-lbl">Tasa reingreso</span>
                                    </div>
                                </div>
                            </div>

                        </template>
                    </template>
                </Card>

                <!-- Auditoría Sin Diagnóstico -->
                <Card class="em-card">
                    <template #title>
                        <div class="em-card-title">
                            <span><i class="pi pi-exclamation-triangle mr-2" style="color: #e11d48"></i>Auditoría Diagnósticos</span>
                            <Button icon="pi pi-download" label="Excel" severity="success" outlined size="small" :loading="isExportingSinDiag" @click="handleExportSinDiag" />
                        </div>
                    </template>
                    <template #content>
                        <div v-if="sinDiagLoading" class="em-diag-loading">
                            <ProgressSpinner style="width: 32px; height: 32px" />
                        </div>
                        <div v-else-if="!sinDiagData" class="em-rank-empty">Sin datos de auditoría</div>
                        <template v-else>
                            <!-- KPIs globales -->
                            <div class="em-sindiag-kpis">
                                <div class="em-sindiag-kpi">
                                    <span class="em-sindiag-kpi-val">{{ fNumber(sinDiagData.total) }}</span>
                                    <span class="em-sindiag-kpi-lbl">Total admisiones</span>
                                </div>
                                <div class="em-sindiag-kpi em-sindiag-kpi--danger">
                                    <span class="em-sindiag-kpi-val">{{ fNumber(sinDiagData.sin_diagnostico) }}</span>
                                    <span class="em-sindiag-kpi-lbl">Sin diagnóstico</span>
                                </div>
                                <div class="em-sindiag-kpi em-sindiag-kpi--ok">
                                    <span class="em-sindiag-kpi-val">{{ fNumber(sinDiagData.con_diagnostico) }}</span>
                                    <span class="em-sindiag-kpi-lbl">Con diagnóstico</span>
                                </div>
                                <div class="em-sindiag-kpi" :style="{ background: pctBg(sinDiagData.pct_cumplimiento) }">
                                    <span class="em-sindiag-kpi-val" :style="{ color: pctColor(sinDiagData.pct_cumplimiento) }">{{ sinDiagData.pct_cumplimiento.toFixed(1) }}%</span>
                                    <span class="em-sindiag-kpi-lbl">% Cumplimiento</span>
                                </div>
                            </div>

                            <!-- Por subtipo -->
                            <div class="em-sindiag-subtipo-grid">
                                <div v-for="s in sinDiagData.por_subtipo" :key="s.subtipo" class="em-sindiag-subtipo">
                                    <div class="em-sindiag-subtipo-header">
                                        <span class="em-sindiag-subtipo-name">{{ s.subtipo }}</span>
                                        <span class="em-sindiag-pct-badge" :style="{ background: pctBg(s.pct_cumplimiento), color: pctColor(s.pct_cumplimiento) }">{{ s.pct_cumplimiento.toFixed(1) }}%</span>
                                    </div>
                                    <div class="em-sindiag-row">
                                        <span>Sin diagnóstico</span>
                                        <span style="color: #e11d48; font-weight: 700">{{ fNumber(s.sin_diagnostico) }} / {{ fNumber(s.total) }}</span>
                                    </div>
                                    <div class="em-diag-bar-track">
                                        <div class="em-sindiag-bar-fill" :style="{ width: s.pct_cumplimiento.toFixed(1) + '%', background: pctColor(s.pct_cumplimiento) }"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Ranking por médico -->
                            <DataTable :value="sinDiagData.por_medico" stripedRows size="small" class="em-table em-sindiag-table" :paginator="sinDiagData.por_medico.length > 15" :rows="15" paginatorTemplate="PrevPageLink PageLinks NextPageLink">
                                <Column field="subtipo" header="Subtipo" sortable style="width: 100px" />
                                <Column field="medico" header="Médico" sortable />
                                <Column field="cod_medico" header="Cód." sortable style="width: 70px" />
                                <Column field="total" header="Total" sortable style="width: 70px; text-align: right">
                                    <template #body="{ data }">{{ fNumber(data.total) }}</template>
                                </Column>
                                <Column field="sin_diagnostico" header="Sin Diag." sortable style="width: 90px; text-align: right">
                                    <template #body="{ data }">
                                        <span style="color: #e11d48; font-weight: 700">{{ fNumber(data.sin_diagnostico) }}</span>
                                    </template>
                                </Column>
                                <Column field="con_diagnostico" header="Con Diag." sortable style="width: 90px; text-align: right">
                                    <template #body="{ data }">
                                        <span style="color: #059669; font-weight: 600">{{ fNumber(data.con_diagnostico) }}</span>
                                    </template>
                                </Column>
                                <Column field="pct_cumplimiento" header="% Cumpl." sortable style="width: 100px; text-align: center">
                                    <template #body="{ data }">
                                        <span class="em-sindiag-pct-badge" :style="{ background: pctBg(data.pct_cumplimiento), color: pctColor(data.pct_cumplimiento) }">{{ data.pct_cumplimiento.toFixed(1) }}%</span>
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </template>
                </Card>
            </template>
        </div>

        <!-- ── Modal Auditoría Pipeline ──────────────────────────────────── -->
        <Dialog v-model:visible="auditModalVisible" modal header="Auditoría Pipeline" :style="{ width: '500px' }" :breakpoints="{ '640px': '95vw' }" :draggable="false">
            <div class="em-audit-content">
                <p class="em-audit-desc">
                    Reporte del pipeline de limpieza automática para el período <strong>{{ formatPeriod }}</strong
                    >.
                </p>

                <div class="em-audit-zip-note">
                    <i class="pi pi-info-circle"></i>
                    <span>
                        El archivo descargado es un <strong>.zip</strong> que contiene:
                        <span class="em-audit-zip-files">
                            <span><i class="pi pi-file mr-1"></i>detalle.csv — todos los registros (abrir en Excel con separador ";")</span>
                            <span><i class="pi pi-file-excel mr-1"></i>resumen.xlsx — resumen de correcciones por regla</span>
                        </span>
                    </span>
                </div>

                <div class="em-audit-filter-item">
                    <label class="em-filter-label">Área dashboard</label>
                    <Select v-model="auditArea" :options="AUDIT_AREAS" optionLabel="label" optionValue="value" placeholder="Todas las áreas" class="em-audit-select" />
                </div>

                <div class="em-audit-filter-item">
                    <label class="em-filter-label">Filtro registros</label>
                    <ToggleButton v-model="auditSoloCorregidos" onLabel="Solo corregidos" offLabel="Todos los registros" onIcon="pi pi-filter" offIcon="pi pi-filter-slash" />
                </div>
            </div>

            <template #footer>
                <Button label="Cancelar" severity="secondary" text @click="auditModalVisible = false" />
                <Button icon="pi pi-download" label="Descargar auditoría" severity="success" :loading="isExportingAuditoria" @click="handleExportAuditoria" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.em-container {
    min-height: 100vh;
    background: var(--surface-ground);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ─── HEADER ─────────────────────────────────────────────────────────────── */
.em-header {
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

.em-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    min-width: 240px;
}

.em-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.em-title {
    font-size: 1.625rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.em-title-icon {
    color: var(--primary-500);
    font-size: 1.375rem;
}

.em-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin: 0;
}

.em-period-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
    border-left: 3px solid var(--primary-500);
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--primary-700);
    width: fit-content;
}

.em-header-right {
    display: flex;
    align-items: flex-end;
}

.em-filter-row {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.em-filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.em-filter-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.em-calendar {
    min-width: 160px;
}

.em-apply-btn,
.em-export-btn {
    align-self: flex-end;
}

/* ─── LOADING / EMPTY ─────────────────────────────────────────────────────── */
.em-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
    color: var(--text-color-secondary);
}

.em-empty {
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

.em-empty-icon {
    font-size: 3rem;
    opacity: 0.4;
}

/* ─── CONTENT ─────────────────────────────────────────────────────────────── */
.em-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ─── FILTERS BAR ─────────────────────────────────────────────────────────── */
.em-filters-bar {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1rem 1.25rem;
    background: var(--surface-card);
    border-radius: 10px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    flex-wrap: wrap;
}

.em-filter-section {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
}

.em-filter-section--months {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.em-filter-divider {
    width: 1px;
    align-self: stretch;
    min-height: 2rem;
    background: var(--surface-border);
    flex-shrink: 0;
}

.em-month-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.em-toggle-all-btn {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--primary-color);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.15s;
}

.em-toggle-all-btn:hover {
    opacity: 0.75;
}

/* Compact month SelectButton */
.em-month-select {
    flex-wrap: wrap;
    gap: 0.25rem;
}

.em-month-select :deep(.p-selectbutton) {
    flex-wrap: wrap;
    gap: 0.25rem;
}

.em-month-select :deep(.p-button) {
    padding: 0.25rem 0.55rem;
    font-size: 0.6875rem;
    font-weight: 700;
    min-width: unset;
}

/* ─── KPI GRID ────────────────────────────────────────────────────────────── */
.em-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

/* ─── CHARTS ─────────────────────────────────────────────────────────────── */
.em-charts-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 1.5rem;
}

.em-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.em-card-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.em-chart-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.em-metric-toggle {
    --p-selectbutton-border-radius: 6px;
    font-size: 0.75rem;
}

.em-labels-btn {
    font-size: 0.75rem !important;
}

.em-chart-wrapper {
    width: 100%;
    height: 320px;
    position: relative;
}

.em-chart {
    width: 100% !important;
    height: 100% !important;
}

/* Donut */
.em-donut-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.em-donut-wrapper {
    position: relative;
    width: 220px;
    height: 220px;
    flex-shrink: 0;
}

.em-donut-chart {
    width: 100% !important;
    height: 100% !important;
}

.em-donut-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    width: 130px;
}

.em-donut-total {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-color);
    line-height: 1.2;
    word-break: break-all;
}

.em-donut-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0.2rem;
}

.em-donut-legend {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

.em-legend-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.875rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
}

.em-legend-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.em-legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
}

.em-legend-name {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.em-legend-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
}

.em-legend-pct {
    font-size: 0.9375rem;
    font-weight: 800;
    color: var(--text-color);
}

.em-legend-val {
    font-size: 0.6875rem;
    color: var(--text-color-secondary);
    font-weight: 500;
}

/* ─── TABLE ───────────────────────────────────────────────────────────────── */
.em-table {
    font-size: 0.875rem;
}

.em-group-header {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--primary-700);
    display: flex;
    align-items: center;
}

.em-amount-primary {
    font-weight: 700;
    color: var(--primary-600);
}

.em-amount-particular {
    color: #059669;
    font-weight: 600;
}

.em-amount-seguros {
    color: var(--text-color-secondary);
    font-weight: 600;
}

/* ─── SIN DIAGNÓSTICO ────────────────────────────────────────────────────── */
.em-sindiag-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.25rem;
}

.em-sindiag-kpi {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.875rem 0.5rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
    text-align: center;
}

.em-sindiag-kpi--danger {
    background: #fff1f2;
    border-color: #fecdd3;
}
.em-sindiag-kpi--ok {
    background: #f0fdf4;
    border-color: #bbf7d0;
}

.em-sindiag-kpi-val {
    font-size: 1.375rem;
    font-weight: 800;
    color: var(--text-color);
    line-height: 1;
}

.em-sindiag-kpi--danger .em-sindiag-kpi-val {
    color: #e11d48;
}
.em-sindiag-kpi--ok .em-sindiag-kpi-val {
    color: #059669;
}

.em-sindiag-kpi-lbl {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.em-sindiag-subtipo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
}

.em-sindiag-subtipo {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
}

.em-sindiag-subtipo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.em-sindiag-subtipo-name {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--text-color);
}

.em-sindiag-pct-badge {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: 99px;
}

.em-sindiag-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8125rem;
    color: var(--text-color-secondary);
}

.em-sindiag-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
}

.em-sindiag-table {
    margin-top: 0.25rem;
}

/* ─── DIAGNÓSTICOS ───────────────────────────────────────────────────────── */
.em-diag-loading {
    display: flex;
    justify-content: center;
    padding: 2rem;
}

.em-diag-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.625rem;
}

.em-diag-item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.625rem 0.75rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
}

.em-diag-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.em-diag-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.em-diag-label {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
}

.em-diag-code {
    font-size: 0.8125rem;
    font-weight: 800;
    color: var(--text-color);
    letter-spacing: 0.3px;
}

.em-diag-name {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.em-diag-count {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #6366f1;
    flex-shrink: 0;
}

.em-diag-bar-track {
    height: 4px;
    background: var(--surface-200);
    border-radius: 99px;
    overflow: hidden;
}

.em-diag-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #818cf8);
    border-radius: 99px;
    transition: width 0.4s ease;
}

/* ─── RANKINGS ───────────────────────────────────────────────────────────── */
.em-rankings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
}

.em-cia-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
}

.em-rank-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 480px;
    overflow-y: auto;
}

.em-rank-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
    transition: background 0.15s;
}

.em-rank-item:hover {
    background: var(--surface-100);
}

.em-rank-left {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
}

.em-rank-badge {
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    background: var(--surface-200);
    color: var(--text-color-secondary);
    flex-shrink: 0;
    margin-top: 0.1rem;
}

.em-rank-badge.em-rank-1 {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}

.em-rank-badge.em-rank-2 {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
}

.em-rank-badge.em-rank-3 {
    background: #fff7ed;
    color: #9a3412;
    border: 1px solid #fed7aa;
}

.em-rank-info {
    flex: 1;
    min-width: 0;
}

.em-rank-name {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1.3;
    word-break: break-word;
}

.em-rank-sub {
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 0.1rem;
}

.em-rank-right {
    text-align: right;
    flex-shrink: 0;
}

.em-rank-value {
    font-size: 0.8125rem;
    font-weight: 800;
    line-height: 1.2;
}

.em-rank-meta {
    font-size: 0.6rem;
    color: var(--text-color-secondary);
    font-weight: 500;
    margin-top: 0.1rem;
}

.em-rank-empty {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px dashed var(--surface-border);
}

/* ─── RESPONSIVE ─────────────────────────────────────────────────────────── */
@media (max-width: 1400px) {
    .em-charts-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 900px) {
    .em-cia-grid,
    .em-diag-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 900px) {
    .em-header {
        flex-direction: column;
    }

    .em-filter-row {
        width: 100%;
    }

    .em-rankings-grid {
        grid-template-columns: 1fr;
    }

    .em-kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .em-container {
        padding: 1rem;
    }

    .em-title {
        font-size: 1.25rem;
    }

    .em-kpi-grid {
        grid-template-columns: 1fr;
    }

    .em-filter-row {
        flex-direction: column;
        align-items: stretch;
    }

    .em-calendar {
        min-width: unset;
        width: 100%;
    }
}

/* ─── AUDITORÍA PIPELINE ─────────────────────────────────────────────────── */
.em-audit-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.em-audit-desc {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin: 0;
    line-height: 1.6;
}

.em-audit-zip-note {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    font-size: 0.8125rem;
    color: #1e40af;
    max-width: 56ch;
}

.em-audit-zip-note .pi-info-circle {
    font-size: 0.9rem;
    margin-top: 0.1rem;
    flex-shrink: 0;
}

.em-audit-zip-files {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.375rem;
    padding-left: 0.25rem;
}

.em-audit-filter-item {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.em-audit-select {
    width: 100%;
}

/* ─── CONTINUIDAD ────────────────────────────────────────────────────────── */
.em-cont-kpis {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.em-cont-kpi {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.875rem 0.5rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
    text-align: center;
}

.em-cont-kpi--highlight {
    background: #eff6ff;
    border-color: #bfdbfe;
}

.em-cont-kpi-val {
    font-size: 1.125rem;
    font-weight: 800;
    color: var(--text-color);
    line-height: 1;
}

.em-cont-kpi--highlight .em-cont-kpi-val {
    color: #0369a1;
}

.em-cont-kpi-lbl {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.em-cont-kpi-sub {
    font-size: 0.6rem;
    color: var(--text-color-secondary);
    font-weight: 500;
}

.em-cont-chart-wrapper {
    width: 100%;
    height: 300px;
    position: relative;
    margin-bottom: 1.5rem;
}

.em-cont-reingresos {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 1.25rem;
}

.em-cont-reingreso-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-color);
}

.em-cont-pct-badge {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #0369a1;
}

@media (max-width: 1400px) {
    .em-cont-kpis {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 600px) {
    .em-cont-kpis {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
