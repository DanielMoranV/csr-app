<script setup>
import { TicketService } from '@/api/tickets';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast  = useToast();

// ─── Estado ───────────────────────────────────────────────────────────────────

const isLoading  = ref(false);
const tickets    = ref([]);
const rangeFrom  = ref(null);
const rangeTo    = ref(null);
const filterScheduleStatus = ref(null);

// ─── Config visual ────────────────────────────────────────────────────────────

const SCHEDULE_STATUS = {
    unplanned: { label: 'Sin planificar', color: '#9ca3af', bgClass: 'bar-unplanned' },
    on_track:  { label: 'En plazo',       color: '#22c55e', bgClass: 'bar-on-track'  },
    at_risk:   { label: 'En riesgo',      color: '#eab308', bgClass: 'bar-at-risk'   },
    delayed:   { label: 'Con desfase',    color: '#ef4444', bgClass: 'bar-delayed'   },
    overdue:   { label: 'Vencido',        color: '#b91c1c', bgClass: 'bar-overdue'   }
};

const STATUS_SEVERITY = {
    unplanned: 'secondary',
    on_track:  'success',
    at_risk:   'warn',
    delayed:   'danger',
    overdue:   'danger'
};

const scheduleStatusOptions = [
    { label: 'Todos',           value: null       },
    { label: 'Sin planificar',  value: 'unplanned'},
    { label: 'En plazo',        value: 'on_track' },
    { label: 'En riesgo',       value: 'at_risk'  },
    { label: 'Con desfase',     value: 'delayed'  },
    { label: 'Vencido',         value: 'overdue'  }
];

// ─── Rango y columnas del encabezado ──────────────────────────────────────────

const toDate = (d) => {
    if (!d) return null;
    const v = new Date(d);
    return isNaN(v.getTime()) ? null : v;
};

const fromDate = computed(() => toDate(rangeFrom.value));
const toDateVal = computed(() => toDate(rangeTo.value));

const totalDays = computed(() => {
    if (!fromDate.value || !toDateVal.value) return 0;
    return Math.round((toDateVal.value - fromDate.value) / 86400000) + 1;
});

// Build header columns: days if ≤31, weeks if ≤84, months otherwise
const headerColumns = computed(() => {
    if (!fromDate.value || totalDays.value <= 0) return [];

    const cols = [];

    if (totalDays.value <= 31) {
        // One column per day
        for (let i = 0; i < totalDays.value; i++) {
            const d = new Date(fromDate.value);
            d.setDate(d.getDate() + i);
            cols.push({
                label: String(d.getDate()),
                subLabel: d.toLocaleDateString('es-PE', { weekday: 'short' }).slice(0, 2),
                offset: i,
                span: 1,
                isWeekend: [0, 6].includes(d.getDay())
            });
        }
    } else if (totalDays.value <= 84) {
        // One column per week (Mon)
        let current = new Date(fromDate.value);
        // Advance to next Monday if not already
        while (current.getDay() !== 1) current.setDate(current.getDate() + 1);

        while (current <= toDateVal.value) {
            const offset = Math.round((current - fromDate.value) / 86400000);
            const end = new Date(current);
            end.setDate(end.getDate() + 6);
            const span = Math.min(7, totalDays.value - offset);
            cols.push({
                label: current.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
                subLabel: '',
                offset,
                span,
                isWeekend: false
            });
            current.setDate(current.getDate() + 7);
        }
    } else {
        // One column per month
        let current = new Date(fromDate.value.getFullYear(), fromDate.value.getMonth(), 1);
        while (current <= toDateVal.value) {
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
            const start = Math.max(0, Math.round((current - fromDate.value) / 86400000));
            const end   = Math.round((Math.min(monthEnd, toDateVal.value) - fromDate.value) / 86400000);
            cols.push({
                label: current.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }),
                subLabel: '',
                offset: start,
                span: end - start + 1,
                isWeekend: false
            });
            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }
    }
    return cols;
});

// Position of today's line
const todayOffset = computed(() => {
    if (!fromDate.value || totalDays.value <= 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - fromDate.value) / 86400000);
    if (diff < 0 || diff >= totalDays.value) return null;
    return (diff / totalDays.value) * 100;
});

// ─── Cálculo de barras ────────────────────────────────────────────────────────

const ganttRows = computed(() => {
    if (!fromDate.value || totalDays.value <= 0) return [];

    return tickets.value.map((t) => {
        const start = t.implementation_start ? new Date(t.implementation_start) : null;
        const end   = t.implementation_end   ? new Date(t.implementation_end)   : null;
        const due   = t.due_date             ? new Date(t.due_date)             : null;

        let barLeft = null;
        let barWidth = null;
        let duePct = null;

        if (start && end) {
            const startDiff = Math.round((start - fromDate.value) / 86400000);
            const endDiff   = Math.round((end   - fromDate.value) / 86400000);
            const clamped   = Math.max(0, startDiff);
            const clampedEnd = Math.min(totalDays.value - 1, endDiff);
            if (clampedEnd >= clamped) {
                barLeft  = (clamped / totalDays.value) * 100;
                barWidth = ((clampedEnd - clamped + 1) / totalDays.value) * 100;
            }
        }

        if (due) {
            const dueDiff = Math.round((due - fromDate.value) / 86400000);
            if (dueDiff >= 0 && dueDiff < totalDays.value) {
                duePct = (dueDiff / totalDays.value) * 100;
            }
        }

        const cfg = SCHEDULE_STATUS[t.schedule_status] ?? SCHEDULE_STATUS.unplanned;

        return { ...t, barLeft, barWidth, duePct, cfg };
    });
});

// ─── Inicialización y fetch ───────────────────────────────────────────────────

function initDefaultRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    rangeFrom.value = first;
    rangeTo.value   = last;
}

const toYMD = (d) => {
    if (!d) return null;
    const v = new Date(d);
    return [v.getFullYear(), String(v.getMonth() + 1).padStart(2, '0'), String(v.getDate()).padStart(2, '0')].join('-');
};

const fetchGantt = async () => {
    if (!rangeFrom.value || !rangeTo.value) return;

    isLoading.value = true;
    tickets.value = [];

    try {
        const params = {
            from: toYMD(rangeFrom.value),
            to:   toYMD(rangeTo.value)
        };
        if (filterScheduleStatus.value) params.schedule_status = filterScheduleStatus.value;

        const response = await TicketService.getGantt(params);
        tickets.value = response?.data?.data ?? response?.data ?? [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos del Gantt.', life: 4000 });
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    initDefaultRange();
    fetchGantt();
});

// ─── Helpers de display ───────────────────────────────────────────────────────

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const PRIORITY_COLORS = {
    baja:    '#10b981',
    media:   '#f59e0b',
    alta:    '#ef4444',
    urgente: '#dc2626'
};
</script>

<template>
    <div class="gantt-page">
        <!-- Header -->
        <div class="gantt-header-card">
            <div class="flex items-center gap-3 mb-4">
                <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.push({ name: 'tickets' })" v-tooltip.right="'Volver a Tickets'" />
                <div class="flex items-center gap-2">
                    <i class="pi pi-chart-gantt text-primary-500 text-xl"></i>
                    <h1 class="gantt-title">Diagrama de Gantt — Tickets</h1>
                </div>
            </div>

            <!-- Controles -->
            <div class="gantt-controls">
                <div class="control-group">
                    <label class="control-label">Desde</label>
                    <Calendar v-model="rangeFrom" dateFormat="dd/mm/yy" :showIcon="true" class="control-input" />
                </div>
                <div class="control-group">
                    <label class="control-label">Hasta</label>
                    <Calendar v-model="rangeTo" dateFormat="dd/mm/yy" :showIcon="true" :minDate="rangeFrom ?? undefined" class="control-input" />
                </div>
                <div class="control-group">
                    <label class="control-label">Estado de planificación</label>
                    <Select
                        v-model="filterScheduleStatus"
                        :options="scheduleStatusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Todos"
                        class="control-input"
                    />
                </div>
                <Button label="Actualizar" icon="pi pi-refresh" @click="fetchGantt" :loading="isLoading" class="self-end" />
            </div>

            <!-- Leyenda -->
            <div class="gantt-legend">
                <span class="legend-item" v-for="(cfg, key) in SCHEDULE_STATUS" :key="key">
                    <span class="legend-dot" :style="{ background: cfg.color }"></span>
                    {{ cfg.label }}
                </span>
                <span class="legend-item">
                    <span class="legend-line legend-today"></span>
                    Hoy
                </span>
                <span class="legend-item">
                    <span class="legend-line legend-due"></span>
                    Fecha límite
                </span>
            </div>
        </div>

        <!-- Cargando -->
        <div v-if="isLoading" class="gantt-loading">
            <i class="pi pi-spin pi-spinner text-3xl text-primary-500"></i>
            <p>Cargando diagrama...</p>
        </div>

        <!-- Sin rango -->
        <div v-else-if="totalDays <= 0" class="gantt-empty">
            <i class="pi pi-calendar text-4xl text-color-secondary opacity-50"></i>
            <p>Seleccione un rango de fechas válido para visualizar el diagrama.</p>
        </div>

        <!-- Sin datos -->
        <div v-else-if="ganttRows.length === 0" class="gantt-empty">
            <i class="pi pi-inbox text-4xl text-color-secondary opacity-50"></i>
            <p>No hay tickets con fechas de implementación en este período.</p>
            <small class="text-color-secondary">Los tickets sin planificación también aparecen cuando no se filtra por estado.</small>
        </div>

        <!-- Gantt -->
        <div v-else class="gantt-container">
            <!-- Encabezado de fechas -->
            <div class="gantt-grid">
                <!-- Columna etiqueta (fija) -->
                <div class="gantt-label-col">
                    <div class="gantt-header-cell gantt-header-label">Ticket</div>
                </div>

                <!-- Área de barras -->
                <div class="gantt-bar-col">
                    <!-- Header de días/semanas/meses -->
                    <div class="gantt-date-header">
                        <div
                            v-for="col in headerColumns"
                            :key="col.offset"
                            class="gantt-date-col"
                            :class="{ 'is-weekend': col.isWeekend }"
                            :style="{ width: (col.span / totalDays * 100) + '%' }"
                        >
                            <span class="gantt-date-main">{{ col.label }}</span>
                            <span v-if="col.subLabel" class="gantt-date-sub">{{ col.subLabel }}</span>
                        </div>
                    </div>

                    <!-- Cuerpo: área de barras con línea de hoy -->
                    <div class="gantt-body-area">
                        <!-- Línea de hoy -->
                        <div
                            v-if="todayOffset !== null"
                            class="gantt-today-line"
                            :style="{ left: todayOffset + '%' }"
                        ></div>

                        <!-- Filas de tickets -->
                        <div
                            v-for="row in ganttRows"
                            :key="row.id"
                            class="gantt-row"
                        >
                            <!-- Fondo alternado (grilla) -->
                            <div
                                v-for="col in headerColumns"
                                :key="col.offset"
                                class="gantt-bg-col"
                                :class="{ 'is-weekend': col.isWeekend }"
                                :style="{ width: (col.span / totalDays * 100) + '%' }"
                            ></div>

                            <!-- Barra de implementación -->
                            <div
                                v-if="row.barLeft !== null"
                                class="gantt-bar"
                                :class="row.cfg.bgClass"
                                :style="{ left: row.barLeft + '%', width: row.barWidth + '%' }"
                                v-tooltip.top="`#${row.id} · ${row.title} · ${formatDate(row.implementation_start)} → ${formatDate(row.implementation_end)}`"
                            >
                                <span class="gantt-bar-label">{{ row.title }}</span>
                            </div>

                            <!-- Barra fantasma para unplanned (sin fechas) -->
                            <div
                                v-else-if="row.schedule_status === 'unplanned'"
                                class="gantt-bar-unplanned-placeholder"
                                v-tooltip.top="`#${row.id} · ${row.title} · Sin fechas planificadas`"
                            >
                                <i class="pi pi-clock text-xs mr-1"></i>
                                <span>{{ row.title }}</span>
                            </div>

                            <!-- Marcador de fecha límite (due_date) -->
                            <div
                                v-if="row.duePct !== null"
                                class="gantt-due-marker"
                                :style="{ left: row.duePct + '%' }"
                                v-tooltip.top="`Fecha límite: ${formatDate(row.due_date)}`"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Lista de etiquetas de tickets (sincronizada) -->
            <div class="gantt-labels-list">
                <div class="gantt-header-cell gantt-header-label"></div>
                <div
                    v-for="row in ganttRows"
                    :key="row.id"
                    class="gantt-label-row"
                    @click="router.push({ name: 'tickets', query: { ticket_id: row.id } })"
                    v-tooltip.right="`Ver ticket #${row.id}`"
                >
                    <div class="gantt-label-id">#{{ row.id }}</div>
                    <div class="gantt-label-info">
                        <span class="gantt-label-title">{{ row.title }}</span>
                        <div class="gantt-label-meta">
                            <Tag
                                :value="SCHEDULE_STATUS[row.schedule_status]?.label ?? row.schedule_status"
                                :severity="STATUS_SEVERITY[row.schedule_status] ?? 'secondary'"
                                class="text-xs"
                            />
                            <span
                                v-if="row.priority"
                                class="gantt-priority-dot"
                                :style="{ background: PRIORITY_COLORS[row.priority] ?? '#9ca3af' }"
                                v-tooltip.top="row.priority"
                            ></span>
                            <span v-if="row.assignee" class="gantt-label-assignee">
                                <i class="pi pi-user text-xs"></i> {{ row.assignee.name }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ─── Layout general ─── */
.gantt-page {
    padding: 1.25rem;
    min-height: 100vh;
    background: var(--surface-ground);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.gantt-header-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.gantt-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}

/* ─── Controles ─── */
.gantt-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 160px;
}

.control-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.control-input {
    min-width: 160px;
}

/* ─── Leyenda ─── */
.gantt-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    font-size: 0.78rem;
    color: var(--text-color-secondary);
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
}

.legend-line {
    display: inline-block;
    width: 18px;
    height: 2px;
    flex-shrink: 0;
}

.legend-today { background: #3b82f6; }
.legend-due   { background: #f97316; border-top: 2px dashed #f97316; height: 0; }

/* ─── Gantt container ─── */
.gantt-container {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    display: grid;
    grid-template-columns: 280px 1fr;
}

.gantt-grid {
    display: contents;
}

/* ─── Columna de etiquetas (izquierda) ─── */
.gantt-labels-list {
    border-right: 1px solid var(--surface-border);
    overflow: hidden;
}

.gantt-header-cell {
    height: 56px;
    border-bottom: 1px solid var(--surface-border);
    background: var(--surface-50);
    display: flex;
    align-items: center;
}

.gantt-header-label {
    padding: 0 0.75rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.gantt-label-row {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 0.75rem;
    gap: 0.5rem;
    border-bottom: 1px solid var(--surface-100);
    cursor: pointer;
    transition: background 0.15s;
}

.gantt-label-row:hover {
    background: var(--surface-50);
}

.gantt-label-id {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    min-width: 2.5rem;
}

.gantt-label-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.gantt-label-title {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}

.gantt-label-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.gantt-label-assignee {
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
}

.gantt-priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* ─── Columna de barras (derecha) ─── */
.gantt-bar-col {
    overflow-x: auto;
    min-width: 0;
}

/* Encabezado de fechas */
.gantt-date-header {
    display: flex;
    height: 56px;
    border-bottom: 1px solid var(--surface-border);
    background: var(--surface-50);
    position: sticky;
    top: 0;
    z-index: 2;
}

.gantt-date-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--surface-100);
    min-width: 28px;
    flex-shrink: 0;
}

.gantt-date-col.is-weekend {
    background: var(--surface-100);
}

.gantt-date-main {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    line-height: 1.2;
}

.gantt-date-sub {
    font-size: 0.65rem;
    color: var(--text-color-secondary);
    opacity: 0.7;
}

/* Cuerpo de barras */
.gantt-body-area {
    position: relative;
}

.gantt-today-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #3b82f6;
    z-index: 3;
    pointer-events: none;
}

.gantt-row {
    display: flex;
    height: 48px;
    position: relative;
    border-bottom: 1px solid var(--surface-100);
}

.gantt-bg-col {
    flex-shrink: 0;
    border-right: 1px solid var(--surface-50);
    height: 100%;
}

.gantt-bg-col.is-weekend {
    background: var(--surface-50);
}

/* Barras de colores */
.gantt-bar {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 26px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    padding: 0 0.4rem;
    cursor: default;
    transition: filter 0.15s;
    z-index: 2;
    min-width: 4px;
    overflow: hidden;
}

.gantt-bar:hover {
    filter: brightness(1.1);
}

.gantt-bar-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.bar-on_track,
.bar-on-track  { background: #22c55e; }
.bar-at_risk,
.bar-at-risk   { background: #eab308; }
.bar-delayed   { background: #ef4444; }
.bar-overdue   { background: #b91c1c; }
.bar-unplanned { background: #9ca3af; }

/* Placeholder para unplanned sin fechas */
.gantt-bar-unplanned-placeholder {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    height: 22px;
    background: var(--surface-200);
    border: 1px dashed var(--surface-400);
    border-radius: 4px;
    display: flex;
    align-items: center;
    padding: 0 0.4rem;
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
    z-index: 2;
}

/* Marcador de fecha límite */
.gantt-due-marker {
    position: absolute;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: #f97316;
    border: none;
    border-left: 2px dashed #f97316;
    z-index: 4;
    pointer-events: none;
}

/* ─── Estados vacíos / carga ─── */
.gantt-loading,
.gantt-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    gap: 0.75rem;
    color: var(--text-color-secondary);
    text-align: center;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
}

/* ─── Modo oscuro ─── */
.app-dark .gantt-header-card,
.app-dark .gantt-container {
    background: var(--surface-900);
    border-color: var(--surface-700);
}

.app-dark .gantt-header-cell,
.app-dark .gantt-date-header {
    background: var(--surface-800);
    border-color: var(--surface-700);
}

.app-dark .gantt-label-row:hover {
    background: var(--surface-800);
}

.app-dark .gantt-row {
    border-bottom-color: var(--surface-700);
}

.app-dark .gantt-bg-col.is-weekend {
    background: var(--surface-800);
}

.app-dark .gantt-date-col.is-weekend {
    background: var(--surface-700);
}

.app-dark .gantt-bar-unplanned-placeholder {
    background: var(--surface-700);
    border-color: var(--surface-500);
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
    .gantt-page { padding: 0.75rem; }
    .gantt-container { grid-template-columns: 180px 1fr; }
    .gantt-label-title { max-width: 130px; }
    .gantt-controls { flex-direction: column; align-items: stretch; }
    .control-input { min-width: 100%; }
}
</style>
