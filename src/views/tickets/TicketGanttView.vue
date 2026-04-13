<script setup>
import { positions as positionsApi, users as usersApi } from '@/api';
import { apiUtils } from '@/api/axios';
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
const filterScheduleStatus  = ref(null);
const filterAssigneeUserId  = ref(null);
const filterAssigneePosition = ref(null);

// Listas para los selects de usuario y área
const userList     = ref([]);
const positionList = ref([]);  // [{ name, id }]

// ─── Modo de vista: 'month' | 'range' ────────────────────────────────────────

const viewMode = ref('month');

// Estado del modo "por mes"
const selectedYear  = ref(new Date().getFullYear());
const selectedMonth = ref(new Date().getMonth()); // 0-indexed

// Estado del modo "por rango"
const rangeFromManual = ref(null);
const rangeToManual   = ref(null);

// Rango efectivo — siempre computed a partir del modo activo
const rangeFrom = computed(() =>
    viewMode.value === 'month'
        ? new Date(selectedYear.value, selectedMonth.value, 1)
        : toDate(rangeFromManual.value)
);

const rangeTo = computed(() =>
    viewMode.value === 'month'
        ? new Date(selectedYear.value, selectedMonth.value + 1, 0)
        : toDate(rangeToManual.value)
);

// Opciones de mes y año para los selects del modo rango/mes
const MONTHS = [
    { label: 'Enero',      value: 0  },
    { label: 'Febrero',    value: 1  },
    { label: 'Marzo',      value: 2  },
    { label: 'Abril',      value: 3  },
    { label: 'Mayo',       value: 4  },
    { label: 'Junio',      value: 5  },
    { label: 'Julio',      value: 6  },
    { label: 'Agosto',     value: 7  },
    { label: 'Septiembre', value: 8  },
    { label: 'Octubre',    value: 9  },
    { label: 'Noviembre',  value: 10 },
    { label: 'Diciembre',  value: 11 }
];

const yearOptions = computed(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => y - 2 + i);
});

const currentMonthLabel = computed(() => {
    const d = new Date(selectedYear.value, selectedMonth.value, 1);
    const raw = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
});

const isCurrentMonth = computed(() => {
    const now = new Date();
    return selectedYear.value === now.getFullYear() && selectedMonth.value === now.getMonth();
});

// Navegar meses
const prevMonth = () => {
    if (selectedMonth.value === 0) { selectedMonth.value = 11; selectedYear.value--; }
    else { selectedMonth.value--; }
    fetchGantt();
};

const nextMonth = () => {
    if (selectedMonth.value === 11) { selectedMonth.value = 0; selectedYear.value++; }
    else { selectedMonth.value++; }
    fetchGantt();
};

const goToCurrentMonth = () => {
    const now = new Date();
    selectedYear.value  = now.getFullYear();
    selectedMonth.value = now.getMonth();
    fetchGantt();
};

// Cambiar de modo
const switchToMonth = () => {
    viewMode.value = 'month';
    fetchGantt();
};

const switchToRange = () => {
    // Pre-cargar el rango con el mes visible actualmente
    if (!rangeFromManual.value) rangeFromManual.value = new Date(rangeFrom.value);
    if (!rangeToManual.value)   rangeToManual.value   = new Date(rangeTo.value);
    viewMode.value = 'range';
    fetchGantt();
};

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
        if (filterScheduleStatus.value)   params.schedule_status   = filterScheduleStatus.value;
        if (filterAssigneeUserId.value)   params.assignee_user_id  = filterAssigneeUserId.value;
        if (filterAssigneePosition.value) params.assignee_position = filterAssigneePosition.value;

        const response = await TicketService.getGantt(params);
        tickets.value = response?.data?.data ?? response?.data ?? [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos del Gantt.', life: 4000 });
    } finally {
        isLoading.value = false;
    }
};

const loadFilterLists = async () => {
    try {
        const [usersRes, positionsRes] = await Promise.all([
            usersApi.list(),
            positionsApi.getAll()
        ]);

        if (apiUtils.isSuccess(usersRes)) {
            userList.value = apiUtils.getData(usersRes);
        }

        if (apiUtils.isSuccess(positionsRes)) {
            positionList.value = apiUtils.getData(positionsRes).map((p) => ({ name: p, id: p }));
        }
    } catch {
        // Las listas son auxiliares — si fallan los filtros simplemente quedan vacíos
    }
};

const clearFilters = () => {
    filterScheduleStatus.value   = null;
    filterAssigneeUserId.value   = null;
    filterAssigneePosition.value = null;
    fetchGantt();
};

// Cuando se selecciona un usuario, limpiar el filtro de área (y viceversa),
// ya que el modelo de asignación es mutuamente excluyente.
const onUserSelected = () => {
    if (filterAssigneeUserId.value) filterAssigneePosition.value = null;
};

const onPositionSelected = () => {
    if (filterAssigneePosition.value) filterAssigneeUserId.value = null;
};

// Computed para búsqueda de usuarios en el Select con filtro
const filteredUserList = ref([]);
const onFilterUsers = (event) => {
    const q = event?.value ?? '';
    filteredUserList.value = q.length >= 1
        ? userList.value.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()))
        : userList.value;
};

onMounted(async () => {
    // rangeFrom/rangeTo ya apuntan al mes actual gracias a los computed
    await Promise.all([loadFilterLists(), fetchGantt()]);
    filteredUserList.value = userList.value;
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

                <!-- ── Selector de período ── -->
                <div class="period-selector">
                    <!-- Toggle modo -->
                    <div class="mode-toggle">
                        <button
                            class="mode-btn"
                            :class="{ 'mode-btn--active': viewMode === 'month' }"
                            @click="switchToMonth"
                        >
                            <i class="pi pi-calendar mr-1 text-xs"></i>Por mes
                        </button>
                        <button
                            class="mode-btn"
                            :class="{ 'mode-btn--active': viewMode === 'range' }"
                            @click="switchToRange"
                        >
                            <i class="pi pi-calendar-plus mr-1 text-xs"></i>Por rango
                        </button>
                    </div>

                    <!-- Modo mes: navegación por flechas + selects -->
                    <template v-if="viewMode === 'month'">
                        <div class="month-nav">
                            <button class="month-nav-btn" @click="prevMonth" v-tooltip.top="'Mes anterior'">
                                <i class="pi pi-chevron-left"></i>
                            </button>

                            <div class="month-selects">
                                <Select
                                    v-model="selectedMonth"
                                    :options="MONTHS"
                                    optionLabel="label"
                                    optionValue="value"
                                    class="month-select-month"
                                    @change="fetchGantt"
                                />
                                <Select
                                    v-model="selectedYear"
                                    :options="yearOptions"
                                    class="month-select-year"
                                    @change="fetchGantt"
                                />
                            </div>

                            <button class="month-nav-btn" @click="nextMonth" v-tooltip.top="'Mes siguiente'">
                                <i class="pi pi-chevron-right"></i>
                            </button>

                            <button
                                v-if="!isCurrentMonth"
                                class="month-today-btn"
                                @click="goToCurrentMonth"
                                v-tooltip.top="'Ir al mes actual'"
                            >
                                Hoy
                            </button>
                        </div>
                    </template>

                    <!-- Modo rango: calendarios from/to -->
                    <template v-else>
                        <div class="range-inputs">
                            <div class="control-group">
                                <label class="control-label">Desde</label>
                                <Calendar
                                    v-model="rangeFromManual"
                                    dateFormat="dd/mm/yy"
                                    :showIcon="true"
                                    class="control-input"
                                />
                            </div>
                            <div class="control-group">
                                <label class="control-label">Hasta</label>
                                <Calendar
                                    v-model="rangeToManual"
                                    dateFormat="dd/mm/yy"
                                    :showIcon="true"
                                    :minDate="rangeFromManual ?? undefined"
                                    class="control-input"
                                />
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Divisor visual -->
                <div class="control-divider" aria-hidden="true"></div>

                <!-- Filtro por usuario asignado -->
                <div class="control-group">
                    <label class="control-label">
                        <i class="pi pi-user text-xs mr-1"></i>Usuario asignado
                    </label>
                    <Select
                        v-model="filterAssigneeUserId"
                        :options="filteredUserList"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Todos los usuarios"
                        :filter="true"
                        filterPlaceholder="Buscar usuario..."
                        @filter="onFilterUsers"
                        @change="onUserSelected"
                        :disabled="!!filterAssigneePosition"
                        :showClear="true"
                        class="control-input"
                    />
                    <small v-if="filterAssigneePosition" class="control-hint">
                        Limpie el filtro de área para filtrar por usuario
                    </small>
                </div>

                <!-- Filtro por área/posición -->
                <div class="control-group">
                    <label class="control-label">
                        <i class="pi pi-briefcase text-xs mr-1"></i>Área / Posición
                    </label>
                    <Select
                        v-model="filterAssigneePosition"
                        :options="positionList"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Todas las áreas"
                        :filter="true"
                        filterPlaceholder="Buscar área..."
                        @change="onPositionSelected"
                        :disabled="!!filterAssigneeUserId"
                        :showClear="true"
                        class="control-input"
                    />
                    <small v-if="filterAssigneeUserId" class="control-hint">
                        Limpie el filtro de usuario para filtrar por área
                    </small>
                </div>

                <!-- Divisor visual -->
                <div class="control-divider" aria-hidden="true"></div>

                <!-- Estado de planificación -->
                <div class="control-group">
                    <label class="control-label">
                        <i class="pi pi-chart-gantt text-xs mr-1"></i>Estado de planificación
                    </label>
                    <Select
                        v-model="filterScheduleStatus"
                        :options="scheduleStatusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Todos"
                        :showClear="true"
                        class="control-input"
                    />
                </div>

                <!-- Acciones -->
                <div class="control-actions">
                    <Button label="Actualizar" icon="pi pi-refresh" @click="fetchGantt" :loading="isLoading" />
                    <Button
                        v-if="filterAssigneeUserId || filterAssigneePosition || filterScheduleStatus"
                        label="Limpiar filtros"
                        icon="pi pi-times"
                        severity="secondary"
                        text
                        @click="clearFilters"
                    />
                </div>
            </div>

            <!-- Filtros activos -->
            <div
                v-if="filterAssigneeUserId || filterAssigneePosition || filterScheduleStatus"
                class="gantt-active-filters"
            >
                <span class="active-filters-label">Filtros activos:</span>
                <Tag
                    v-if="filterAssigneeUserId"
                    :value="`Usuario: ${userList.find(u => u.id === filterAssigneeUserId)?.name ?? filterAssigneeUserId}`"
                    severity="info"
                    class="text-xs"
                    :removable="true"
                    @remove="filterAssigneeUserId = null; fetchGantt()"
                />
                <Tag
                    v-if="filterAssigneePosition"
                    :value="`Área: ${filterAssigneePosition}`"
                    severity="info"
                    class="text-xs"
                    :removable="true"
                    @remove="filterAssigneePosition = null; fetchGantt()"
                />
                <Tag
                    v-if="filterScheduleStatus"
                    :value="`Estado: ${scheduleStatusOptions.find(o => o.value === filterScheduleStatus)?.label}`"
                    severity="secondary"
                    class="text-xs"
                    :removable="true"
                    @remove="filterScheduleStatus = null; fetchGantt()"
                />
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

/* ── Selector de período ── */
.period-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

/* Toggle mes/rango */
.mode-toggle {
    display: flex;
    background: var(--surface-100);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
    border: 1px solid var(--surface-200);
}

.mode-btn {
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--text-color-secondary);
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
}

.mode-btn:hover {
    background: var(--surface-200);
    color: var(--text-color);
}

.mode-btn--active {
    background: var(--primary-500);
    color: #fff;
}

.mode-btn--active:hover {
    background: var(--primary-600);
    color: #fff;
}

/* Navegación de mes */
.month-nav {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.month-nav-btn {
    width: 2rem;
    height: 2rem;
    border-radius: 6px;
    border: 1px solid var(--surface-300);
    background: var(--surface-0);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color-secondary);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    flex-shrink: 0;
}

.month-nav-btn:hover {
    background: var(--primary-50);
    border-color: var(--primary-300);
    color: var(--primary-600);
}

.month-selects {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.month-select-month {
    min-width: 120px;
}

.month-select-year {
    min-width: 80px;
}

.month-today-btn {
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    border: 1px solid var(--primary-300);
    background: var(--primary-50);
    color: var(--primary-600);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}

.month-today-btn:hover {
    background: var(--primary-100);
}

/* Entradas de rango libre */
.range-inputs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: flex-end;
}

.control-divider {
    width: 1px;
    height: 40px;
    background: var(--surface-border);
    align-self: flex-end;
    margin-bottom: 0.1rem;
    flex-shrink: 0;
}

.control-hint {
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    margin-top: 0.15rem;
    line-height: 1.3;
}

.control-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    align-self: flex-end;
    padding-bottom: 0.05rem;
}

/* Filtros activos */
.gantt-active-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--surface-100);
}

.active-filters-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    margin-right: 0.25rem;
}

.app-dark .gantt-active-filters {
    border-top-color: var(--surface-700);
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
    .control-divider { display: none; }
    .control-actions { justify-content: stretch; }
    .control-actions :deep(.p-button) { flex: 1; }
    .period-selector { flex-direction: column; align-items: stretch; }
    .month-nav { justify-content: space-between; }
    .month-selects { flex: 1; }
    .month-select-month { flex: 1; min-width: 0; }
    .month-select-year { min-width: 80px; }
    .range-inputs { flex-direction: column; }
}

/* ── Modo oscuro — controles de período ── */
.app-dark .mode-toggle {
    background: var(--surface-800);
    border-color: var(--surface-700);
}

.app-dark .mode-btn:hover {
    background: var(--surface-700);
}

.app-dark .month-nav-btn {
    background: var(--surface-800);
    border-color: var(--surface-600);
}

.app-dark .month-nav-btn:hover {
    background: var(--surface-700);
    border-color: var(--primary-400);
    color: var(--primary-300);
}

.app-dark .month-today-btn {
    background: hsl(220, 40%, 18%);
    border-color: var(--primary-500);
    color: var(--primary-300);
}

.app-dark .month-today-btn:hover {
    background: hsl(220, 40%, 22%);
}
</style>
