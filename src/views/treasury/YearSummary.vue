<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

const toast = useToast();

const CHIP_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444', '#84cc16'];

// ─── Controls ─────────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const selectedYear = ref(currentYear);
const yearOptions = Array.from({ length: currentYear - 2023 }, (_, i) => ({ label: String(2024 + i), value: 2024 + i }));
const accountMode = ref('all'); // 'all' | 'individual'
const accounts = ref([]);
const selectedAccountIds = ref([]);

// ─── Report ───────────────────────────────────────────────────────────────────
const reportData = ref(null);
const loading = ref(false);
const errorMsg = ref(null);

// ─── Computed ─────────────────────────────────────────────────────────────────
const calcTrend = (cur, prev) => {
    if (prev === null || prev === undefined || prev === 0) return null;
    const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
};

const months = computed(() => {
    const raw = reportData.value?.months ?? [];
    return raw.map((m, idx) => {
        const prev = idx > 0 ? raw[idx - 1] : null;
        return {
            ...m,
            trend_ingresos: calcTrend(m.total_ingresos, prev?.total_ingresos),
            trend_egresos: calcTrend(m.total_egresos, prev?.total_egresos)
        };
    });
});

const ingresoCategories = computed(() => {
    if (!reportData.value) return [];
    const names = new Set();
    reportData.value.months.forEach((m) => m.ingresos?.forEach((i) => names.add(i.category_name)));
    return [...names].sort();
});

const egresoCategories = computed(() => {
    if (!reportData.value) return [];
    const names = new Set();
    reportData.value.months.forEach((m) => m.egresos?.forEach((e) => names.add(e.category_name)));
    return [...names].sort();
});

const ingresoFillerCount = computed(() => Math.max(0, 12 - ingresoCategories.value.length));
const canLoad = computed(() => accountMode.value === 'all' || selectedAccountIds.value.length > 0);

const maxAbsSaldo = computed(() => {
    const vals = months.value.map((m) => Math.abs(m.saldo ?? 0));
    return Math.max(1, ...vals);
});

const saldoSemaphore = (value) => {
    if (value === null || value === undefined) return 'sem-normal';
    const max = maxAbsSaldo.value;
    if (value >= max * 0.5) return 'sem-muy-bueno';
    if (value >= 0) return 'sem-normal';
    if (value >= -max * 0.3) return 'sem-riesgo';
    return 'sem-perdida';
};

const barWidth = (value) => Math.min(100, Math.round((Math.abs(value ?? 0) / maxAbsSaldo.value) * 100));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getMonthAmount = (monthData, type, categoryName) => {
    const arr = type === 'ingreso' ? monthData?.ingresos : monthData?.egresos;
    return arr?.find((x) => x.category_name === categoryName)?.amount ?? null;
};

const getAnnualAmount = (type, categoryName) => {
    const arr =
        type === 'ingreso'
            ? reportData.value?.annual_totals?.ingresos_by_category
            : reportData.value?.annual_totals?.egresos_by_category;
    return arr?.find((x) => x.category_name === categoryName)?.amount ?? null;
};

const fmt = (value) => {
    if (value === null || value === undefined || value === 0) return 'S/  -';
    const formatted = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
    return value < 0 ? `S/ -${formatted}` : `S/ ${formatted}`;
};

const toggleAccount = (id) => {
    const idx = selectedAccountIds.value.indexOf(id);
    if (idx === -1) selectedAccountIds.value.push(id);
    else selectedAccountIds.value.splice(idx, 1);
};

const isAccountSelected = (id) => selectedAccountIds.value.includes(id);

// ─── Loaders ──────────────────────────────────────────────────────────────────
const loadAccounts = async () => {
    try {
        const res = await TreasuryService.getBankAccounts();
        const raw = res.data?.data?.data || res.data?.data || res.data;
        accounts.value = (Array.isArray(raw) ? raw : []).map((acc, i) => ({
            id: acc.id,
            label: acc.description || acc.account_number || `Cuenta ${acc.id}`,
            color: CHIP_COLORS[i % CHIP_COLORS.length]
        }));
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las cuentas', life: 3000 });
    }
};

const loadReport = async () => {
    if (!canLoad.value) return;
    loading.value = true;
    errorMsg.value = null;
    try {
        const ids = accountMode.value === 'individual' ? selectedAccountIds.value : [];
        const res = await TreasuryService.getYearSummary(selectedYear.value, ids);
        reportData.value = res.data?.data ?? res.data;
    } catch (err) {
        errorMsg.value = err?.response?.data?.message || 'Error al generar el reporte. Intenta de nuevo.';
        reportData.value = null;
    } finally {
        loading.value = false;
    }
};

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(selectedYear, loadReport);
watch(accountMode, (val) => {
    if (val === 'all') {
        selectedAccountIds.value = [];
        loadReport();
    }
});
watch(
    selectedAccountIds,
    () => {
        if (accountMode.value === 'individual' && selectedAccountIds.value.length > 0) loadReport();
    },
    { deep: true }
);

onMounted(async () => {
    await loadAccounts();
    await loadReport();
});
</script>

<template>
    <div class="year-summary-view">
        <div class="main-card">
            <!-- Hero Header -->
            <div class="hero-header">
                <div class="hero-icon">
                    <i class="pi pi-chart-bar"></i>
                </div>
                <div class="hero-text">
                    <h1>Resumen del Año</h1>
                    <p><i class="pi pi-calendar mr-2"></i>Reporte financiero anual de tesorería</p>
                </div>
            </div>

            <!-- Controls Bar -->
            <div class="controls-bar">
                <!-- Year -->
                <div class="control-block">
                    <span class="control-label">AÑO</span>
                    <Dropdown v-model="selectedYear" :options="yearOptions" optionLabel="label" optionValue="value" class="year-dropdown" />
                </div>

                <div class="controls-divider"></div>

                <!-- Mode toggle -->
                <div class="control-block">
                    <div class="mode-toggle">
                        <button :class="['mode-btn', accountMode === 'all' ? 'active' : '']" @click="accountMode = 'all'">
                            <i class="pi pi-database mr-1"></i>Todas las Cuentas
                        </button>
                        <button :class="['mode-btn', accountMode === 'individual' ? 'active' : '']" @click="accountMode = 'individual'">
                            <i class="pi pi-list mr-1"></i>Cuentas Individ.
                        </button>
                    </div>
                </div>

                <!-- Account chips -->
                <div v-if="accountMode === 'individual'" class="control-block account-chips-wrap">
                    <button
                        v-for="acc in accounts"
                        :key="acc.id"
                        :class="['account-chip', isAccountSelected(acc.id) ? 'chip-on' : '']"
                        :style="isAccountSelected(acc.id) ? { background: acc.color, borderColor: acc.color } : { borderColor: acc.color, color: acc.color }"
                        @click="toggleAccount(acc.id)"
                    >
                        <i v-if="isAccountSelected(acc.id)" class="pi pi-check mr-1 text-xs"></i>
                        {{ acc.label }}
                    </button>
                </div>

                <div class="controls-flex-end">
                    <Button icon="pi pi-refresh" text rounded v-tooltip.top="'Actualizar reporte'" @click="loadReport" :loading="loading" class="refresh-btn" />
                </div>
            </div>

            <!-- No accounts warning -->
            <div v-if="accountMode === 'individual' && selectedAccountIds.length === 0" class="no-selection-alert">
                <i class="pi pi-info-circle mr-2"></i>
                Selecciona al menos una cuenta para visualizar el reporte.
            </div>

            <!-- Loading -->
            <div v-if="loading" class="state-wrapper">
                <div class="skeleton-table">
                    <div class="skeleton-header"></div>
                    <div v-for="i in 10" :key="i" class="skeleton-row" :style="{ opacity: 1 - i * 0.07 }"></div>
                </div>
            </div>

            <!-- Error -->
            <div v-else-if="errorMsg" class="state-wrapper">
                <div class="state-box">
                    <i class="pi pi-exclamation-triangle state-icon error-icon"></i>
                    <p class="state-msg">{{ errorMsg }}</p>
                    <Button label="Reintentar" icon="pi pi-refresh" @click="loadReport" severity="danger" outlined />
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="reportData && months.length === 0" class="state-wrapper">
                <div class="state-box">
                    <i class="pi pi-inbox state-icon"></i>
                    <p class="state-msg">Sin movimientos registrados para el período seleccionado.</p>
                </div>
            </div>

            <!-- Table -->
            <div v-else-if="reportData" class="table-scroll-wrapper">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th class="col-label sticky-left th-dark">RESUMEN DEL AÑO</th>
                            <th v-for="m in months" :key="m.month" class="col-month th-dark">{{ m.month_name }}</th>
                            <th class="col-totals sticky-right th-dark">TOTALES<br />INTERANUALES<br />FISCALES</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- ─── INICIAL EFECTIVO DISPONIBLE ─── -->
                        <tr class="row-inicial">
                            <td class="col-label sticky-left">INICIAL EFECTIVO DISPONIBLE</td>
                            <td v-for="m in months" :key="m.month" class="col-month money-cell">{{ fmt(m.initial_balance) }}</td>
                            <td class="col-totals sticky-right money-cell">{{ fmt(reportData.initial_year_balance) }}</td>
                        </tr>

                        <!-- ─── (+) INGRESOS ─── -->
                        <tr class="row-section row-section--ingreso">
                            <td class="col-label sticky-left section-label">( + ) INGRESOS</td>
                            <td v-for="m in months" :key="m.month" class="col-month"></td>
                            <td class="col-totals sticky-right"></td>
                        </tr>

                        <tr v-for="(cat, idx) in ingresoCategories" :key="`ing-${cat}`" :class="['row-ingreso-cat', idx % 2 !== 0 ? 'row-alt' : '']">
                            <td class="col-label sticky-left cat-label">{{ cat }}</td>
                            <td v-for="m in months" :key="m.month" class="col-month money-cell">
                                {{ fmt(getMonthAmount(m, 'ingreso', cat)) }}
                            </td>
                            <td class="col-totals sticky-right money-cell totals-cell">{{ fmt(getAnnualAmount('ingreso', cat)) }}</td>
                        </tr>

                        <tr v-for="i in ingresoFillerCount" :key="`fill-${i}`" class="row-filler">
                            <td class="col-label sticky-left"></td>
                            <td v-for="m in months" :key="m.month" class="col-month money-cell filler-dash">S/  -</td>
                            <td class="col-totals sticky-right totals-cell"></td>
                        </tr>

                        <tr class="row-total row-total--ingreso">
                            <td class="col-label sticky-left">TOTAL DE INGRESOS</td>
                            <td v-for="m in months" :key="m.month" class="col-month money-cell trend-cell">
                                {{ fmt(m.total_ingresos) }}
                                <span v-if="m.trend_ingresos" :class="['trend-badge', m.trend_ingresos.up ? 'trend-up' : 'trend-down']">
                                    {{ m.trend_ingresos.up ? '▲' : '▼' }} {{ m.trend_ingresos.pct }}%
                                </span>
                            </td>
                            <td class="col-totals sticky-right money-cell">{{ fmt(reportData.annual_totals?.total_ingresos) }}</td>
                        </tr>

                        <!-- ─── (-) EGRESOS ─── -->
                        <tr class="row-section row-section--egreso">
                            <td class="col-label sticky-left section-label">( - ) EGRESOS</td>
                            <td v-for="m in months" :key="m.month" class="col-month"></td>
                            <td class="col-totals sticky-right"></td>
                        </tr>

                        <tr v-for="(cat, idx) in egresoCategories" :key="`egr-${cat}`" :class="['row-egreso-cat', idx % 2 !== 0 ? 'row-alt' : '']">
                            <td class="col-label sticky-left cat-label">{{ cat }}</td>
                            <td v-for="m in months" :key="m.month" class="col-month money-cell">
                                {{ fmt(getMonthAmount(m, 'egreso', cat)) }}
                            </td>
                            <td class="col-totals sticky-right money-cell totals-cell">{{ fmt(getAnnualAmount('egreso', cat)) }}</td>
                        </tr>

                        <tr class="row-total row-total--egreso">
                            <td class="col-label sticky-left">TOTAL DE EGRESOS</td>
                            <td v-for="m in months" :key="m.month" class="col-month money-cell trend-cell">
                                {{ fmt(m.total_egresos) }}
                                <span v-if="m.trend_egresos" :class="['trend-badge', m.trend_egresos.up ? 'trend-down' : 'trend-up']">
                                    {{ m.trend_egresos.up ? '▲' : '▼' }} {{ m.trend_egresos.pct }}%
                                </span>
                            </td>
                            <td class="col-totals sticky-right money-cell">{{ fmt(reportData.annual_totals?.total_egresos) }}</td>
                        </tr>

                        <!-- ─── SALDO ─── -->
                        <tr class="row-saldo">
                            <td class="col-label sticky-left">SALDO</td>
                            <td v-for="m in months" :key="m.month" :class="['col-month', 'money-cell', 'saldo-cell', saldoSemaphore(m.saldo)]">
                                <div class="saldo-num">{{ fmt(m.saldo) }}</div>
                                <div class="bar-track">
                                    <div class="bar-fill" :style="{ width: barWidth(m.saldo) + '%' }"></div>
                                </div>
                            </td>
                            <td :class="['col-totals', 'sticky-right', 'money-cell', { 'negative-val': reportData.annual_totals?.saldo < 0 }]">
                                {{ fmt(reportData.annual_totals?.saldo) }}
                            </td>
                        </tr>

                        <!-- ─── DISPOSICIÓN ─── -->
                        <tr class="row-disposicion">
                            <td class="col-label sticky-left">
                                DISPOSICIÓN DE EFECTIVO AL FINAL DEL MES
                                <br />
                                <span class="disposicion-sub">EFECTIVO DISPONIBLE + INGRESOS – EGRESOS</span>
                            </td>
                            <td v-for="m in months" :key="m.month" class="col-month money-cell">{{ fmt(m.final_balance) }}</td>
                            <td class="col-totals sticky-right money-cell">—</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ── Base ────────────────────────────────────────────────────────────────────── */
.year-summary-view {
    padding: 1rem;
}

.main-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 1.5rem 1.5rem 0 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

/* ── Hero Header ─────────────────────────────────────────────────────────────── */
.hero-header {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
}

.hero-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, #0e7490 0%, #164e63 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 6px 16px rgba(14, 116, 144, 0.38);
}

.hero-icon i {
    font-size: 1.75rem;
    color: #a5f3fc;
}

.hero-text h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.6rem;
    font-weight: 800;
    background: linear-gradient(135deg, #0e7490, #164e63);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.hero-text p {
    margin: 0;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
}

/* ── Controls Bar ────────────────────────────────────────────────────────────── */
.controls-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem 1.25rem;
    background: var(--surface-section);
    border-radius: 12px;
    margin-bottom: 1rem;
    border: 1px solid var(--surface-border);
}

.control-block {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.control-label {
    font-size: 0.75rem;
    font-weight: 800;
    color: #0e7490;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
}

:global(.dark) .control-label {
    color: #67e8f9;
}

:deep(.year-dropdown) {
    width: 110px;
}

:deep(.year-dropdown .p-inputtext) {
    font-weight: 700;
    font-size: 1rem;
    text-align: center;
}

.controls-divider {
    width: 1px;
    height: 32px;
    background: var(--surface-border);
    flex-shrink: 0;
}

.controls-flex-end {
    margin-left: auto;
}

.refresh-btn {
    color: #0e7490 !important;
}

/* ── Mode Toggle ─────────────────────────────────────────────────────────────── */
.mode-toggle {
    display: flex;
    background: var(--surface-ground);
    border-radius: 8px;
    padding: 0.2rem;
    gap: 0.2rem;
    border: 1px solid var(--surface-border);
}

.mode-btn {
    border: none;
    background: transparent;
    padding: 0.35rem 0.85rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    white-space: nowrap;
}

.mode-btn.active {
    background: #0e7490;
    color: white;
    box-shadow: 0 2px 6px rgba(14, 116, 144, 0.32);
}

/* ── Account Chips ───────────────────────────────────────────────────────────── */
.account-chips-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.account-chip {
    border: 2px solid transparent;
    background: transparent;
    padding: 0.3rem 0.85rem;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    white-space: nowrap;
}

.account-chip.chip-on {
    color: white !important;
}

.account-chip:not(.chip-on):hover {
    opacity: 0.75;
}

/* ── Alerts ──────────────────────────────────────────────────────────────────── */
.no-selection-alert {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #ecfeff;
    border: 1px solid #a5f3fc;
    border-radius: 8px;
    color: #0e7490;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 1rem;
}

:global(.dark) .no-selection-alert {
    background: #164e6322;
    border-color: #0e7490;
    color: #67e8f9;
}

/* ── Loading Skeleton ────────────────────────────────────────────────────────── */
.state-wrapper {
    padding: 2rem 0;
}

.skeleton-table {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.skeleton-header {
    height: 38px;
    background: #0e7490;
    border-radius: 4px;
    animation: pulse-skeleton 1.5s ease-in-out infinite;
}

.skeleton-row {
    height: 30px;
    background: var(--surface-ground);
    border-radius: 4px;
    animation: pulse-skeleton 1.5s ease-in-out infinite;
}

@keyframes pulse-skeleton {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* ── State boxes ─────────────────────────────────────────────────────────────── */
.state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    text-align: center;
}

.state-icon {
    font-size: 2.5rem;
    color: var(--text-color-secondary);
    opacity: 0.4;
}

.error-icon {
    color: #ef4444;
    opacity: 1;
}

.state-msg {
    margin: 0;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
}

/* ══════════════════════════════════════════════════════════════════════════════
   FINANCIAL TABLE
   ══════════════════════════════════════════════════════════════════════════════ */

.table-scroll-wrapper {
    overflow-x: auto;
    overflow-y: visible;
    margin: 0 -1.5rem;
    padding-bottom: 1.5rem;
}

.summary-table {
    border-collapse: collapse;
    min-width: 100%;
    white-space: nowrap;
    font-size: 0.8rem;
}

/* ── Column widths ───────────────────────────────────────────────────────────── */
.col-label {
    width: 230px;
    min-width: 230px;
    max-width: 230px;
    white-space: normal;
    text-align: left;
    padding: 0.45rem 0.75rem;
}

.col-month {
    width: 105px;
    min-width: 105px;
    padding: 0.45rem 0.6rem;
    text-align: right;
}

.col-totals {
    width: 125px;
    min-width: 125px;
    padding: 0.45rem 0.75rem;
    text-align: right;
}

/* ── Sticky columns ──────────────────────────────────────────────────────────── */
.sticky-left {
    position: sticky;
    left: 0;
    z-index: 2;
}

.sticky-right {
    position: sticky;
    right: 0;
    z-index: 2;
}

thead .sticky-left,
thead .sticky-right {
    z-index: 3;
}

/* ── Table header ────────────────────────────────────────────────────────────── */
.th-dark {
    background: #1F6F8B;
    color: white;
    font-weight: 700;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid #2C8FB5;
    line-height: 1.3;
    vertical-align: middle;
}

/* ── Row: INICIAL ────────────────────────────────────────────────────────────── */
.row-inicial td {
    background: #1F6F8B;
    color: #ffffff;
    font-weight: 700;
    border: 1px solid #2C8FB5;
}

/* ── Row: Section header (+/-) ───────────────────────────────────────────────── */
.row-section td {
    color: white;
    font-weight: 700;
}

.row-section--ingreso td {
    background: #2EAD6F;
    border: 1px solid #27966A;
}

.row-section--egreso td {
    background: #F2994A;
    border: 1px solid #E08838;
}

.section-label {
    font-size: 0.82rem;
    letter-spacing: 0.02em;
}

/* ── Row: Ingreso categories ─────────────────────────────────────────────────── */
.row-ingreso-cat td {
    background: #E9F7EF;
    color: #1a2e20;
    border: 1px solid #C8EDD5;
    transition: background 0.15s;
}

.row-ingreso-cat.row-alt td {
    background: #F4FAF6;
}

.row-ingreso-cat:hover td {
    background: #D4EDDC;
}

/* ── Row: Egreso categories ──────────────────────────────────────────────────── */
.row-egreso-cat td {
    background: #FFF4E6;
    color: #2e1e0a;
    border: 1px solid #F9DFC0;
    transition: background 0.15s;
}

.row-egreso-cat.row-alt td {
    background: #FFF9F2;
}

.row-egreso-cat:hover td {
    background: #FDEBD0;
}

.cat-label {
    font-size: 0.78rem;
    font-weight: 500;
}

/* ── Row: Filler ─────────────────────────────────────────────────────────────── */
.row-filler td {
    background: #F4FAF6;
    border: 1px solid #C8EDD5;
}

.filler-dash {
    color: #A8D5B8 !important;
    font-size: 0.75rem;
}

/* ── Row: Total ──────────────────────────────────────────────────────────────── */
.row-total td {
    font-weight: 700;
    font-size: 0.82rem;
    color: white;
}

.row-total--ingreso td {
    background: #1F8A70;
    border: 1px solid #1A7560;
}

.row-total--egreso td {
    background: #D97830;
    border: 1px solid #C46A22;
}

/* ── Row: Saldo ──────────────────────────────────────────────────────────────── */
.row-saldo td {
    background: #1F8A70;
    color: white;
    font-weight: 700;
    border: 1px solid #1A7560;
}

/* ── Row: Disposición ────────────────────────────────────────────────────────── */
.row-disposicion td {
    background: #2C8FB5;
    color: white;
    font-weight: 600;
    border: 1px solid #1F6F8B;
    line-height: 1.35;
}

.disposicion-sub {
    font-size: 0.68rem;
    font-weight: 400;
    opacity: 0.85;
}

/* ── Totals column: fondo neutro claro en filas de detalle ───────────────────── */
.totals-cell {
    background: #EEF2F7 !important;
    color: #1F2937 !important;
    border-color: #D5DCE8 !important;
}

/* ── Utility ─────────────────────────────────────────────────────────────────── */
.money-cell {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    letter-spacing: 0.01em;
}

.negative-val {
    color: #E45858 !important;
    font-weight: 700;
}

/* Dark mode adjustments (non-table elements) */
:global(.dark) .hero-text h1 {
    background: linear-gradient(135deg, #22d3ee, #67e8f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .mode-btn.active {
    background: #0e7490;
}

:global(.dark) .refresh-btn {
    color: #67e8f9 !important;
}

/* ── Trend badges ────────────────────────────────────────────────────────────── */
.trend-cell {
    white-space: nowrap;
}

.trend-badge {
    display: inline-block;
    font-size: 0.62rem;
    font-weight: 700;
    padding: 0.08rem 0.28rem;
    border-radius: 3px;
    margin-left: 0.3rem;
    vertical-align: middle;
    letter-spacing: 0.02em;
}

.trend-up {
    background: rgba(31, 138, 112, 0.15);
    color: #1F8A70;
}

.trend-down {
    background: rgba(228, 88, 88, 0.15);
    color: #c0392b;
}

/* Sobre fondos de color (filas total ingresos/egresos) los badges van en blanco */
.row-total--ingreso .trend-badge,
.row-total--egreso .trend-badge {
    background: rgba(255, 255, 255, 0.22);
    color: rgba(255, 255, 255, 0.95);
}

/* ── Semáforo de saldo ───────────────────────────────────────────────────────── */
.saldo-cell { padding: 0.35rem 0.6rem !important; }

.saldo-cell.sem-muy-bueno { background: #1F8A70; color: #fff; border-color: #1A7560 !important; }
.saldo-cell.sem-normal    { background: #2C8FB5; color: #fff; border-color: #1F6F8B !important; }
.saldo-cell.sem-riesgo    { background: #F2994A; color: #fff; border-color: #E08838 !important; }
.saldo-cell.sem-perdida   { background: #E45858; color: #fff; border-color: #C0392B !important; }

.saldo-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
}

/* ── Barra de progreso mensual ───────────────────────────────────────────────── */
.bar-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 2px;
    margin-top: 4px;
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    background: rgba(255, 255, 255, 0.75);
    border-radius: 2px;
    transition: width 0.5s ease;
    min-width: 2px;
}

/* Scrollbar */
.table-scroll-wrapper::-webkit-scrollbar {
    height: 8px;
}

.table-scroll-wrapper::-webkit-scrollbar-track {
    background: var(--surface-ground);
}

.table-scroll-wrapper::-webkit-scrollbar-thumb {
    background: #0e7490;
    border-radius: 4px;
}

.table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
    background: #164e63;
}
</style>
