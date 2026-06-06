<script setup>
import { positions as positionsApi, users as usersApi } from '@/api';
import { apiUtils } from '@/api/axios';
import { TicketService } from '@/api/tickets';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/composables/usePermissions';
import { getHolidayInfo } from '@/data/holidays-pe';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const permissions = usePermissions();

// ─── Estado ───────────────────────────────────────────────────────────────────

const isLoading = ref(false);
const tickets = ref([]);
const filterScheduleStatus = ref(null);
const filterAssigneeUserId = ref(null);
const filterAssigneePosition = ref(null);

// Listas para los selects de usuario y área
const userList = ref([]);
const positionList = ref([]); // [{ name, id }]

// ─── Modo de vista: 'month' | 'range' ────────────────────────────────────────

const viewMode = ref('month');

// Estado del modo "por mes"
const selectedYear = ref(new Date().getFullYear());
const selectedMonth = ref(new Date().getMonth()); // 0-indexed

// Estado del modo "por rango"
const rangeFromManual = ref(null);
const rangeToManual = ref(null);

// Rango efectivo — siempre computed a partir del modo activo
const rangeFrom = computed(() => (viewMode.value === 'month' ? new Date(selectedYear.value, selectedMonth.value, 1) : toDate(rangeFromManual.value)));

const rangeTo = computed(() => (viewMode.value === 'month' ? new Date(selectedYear.value, selectedMonth.value + 1, 0) : toDate(rangeToManual.value)));

// Opciones de mes y año para los selects del modo rango/mes
const MONTHS = [
    { label: 'Enero', value: 0 },
    { label: 'Febrero', value: 1 },
    { label: 'Marzo', value: 2 },
    { label: 'Abril', value: 3 },
    { label: 'Mayo', value: 4 },
    { label: 'Junio', value: 5 },
    { label: 'Julio', value: 6 },
    { label: 'Agosto', value: 7 },
    { label: 'Septiembre', value: 8 },
    { label: 'Octubre', value: 9 },
    { label: 'Noviembre', value: 10 },
    { label: 'Diciembre', value: 11 }
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
    if (selectedMonth.value === 0) {
        selectedMonth.value = 11;
        selectedYear.value--;
    } else {
        selectedMonth.value--;
    }
    fetchGantt();
};

const nextMonth = () => {
    if (selectedMonth.value === 11) {
        selectedMonth.value = 0;
        selectedYear.value++;
    } else {
        selectedMonth.value++;
    }
    fetchGantt();
};

const goToCurrentMonth = () => {
    const now = new Date();
    selectedYear.value = now.getFullYear();
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
    if (!rangeToManual.value) rangeToManual.value = new Date(rangeTo.value);
    viewMode.value = 'range';
    fetchGantt();
};

// ─── Config visual ────────────────────────────────────────────────────────────

const SCHEDULE_STATUS = {
    unplanned: { label: 'Sin planificar', color: '#9ca3af', bgClass: 'bar-unplanned' },
    on_track: { label: 'En plazo', color: '#22c55e', bgClass: 'bar-on-track' },
    at_risk: { label: 'En riesgo', color: '#eab308', bgClass: 'bar-at-risk' },
    delayed: { label: 'Con desfase', color: '#ef4444', bgClass: 'bar-delayed' },
    overdue: { label: 'Vencido', color: '#b91c1c', bgClass: 'bar-overdue' }
};

const STATUS_SEVERITY = {
    unplanned: 'secondary',
    on_track: 'success',
    at_risk: 'warn',
    delayed: 'danger',
    overdue: 'danger'
};

const scheduleStatusOptions = [
    { label: 'Todos', value: null },
    { label: 'Sin planificar', value: 'unplanned' },
    { label: 'En plazo', value: 'on_track' },
    { label: 'En riesgo', value: 'at_risk' },
    { label: 'Con desfase', value: 'delayed' },
    { label: 'Vencido', value: 'overdue' }
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

// Ancho en px por día — define el ancho total del lienzo de barras.
// Encabezado y cuerpo comparten este mismo ancho, por eso quedan alineados.
const dayWidth = computed(() => {
    if (totalDays.value <= 31) return 40; // vista por días
    if (totalDays.value <= 84) return 22; // vista por semanas
    return 6; // vista por meses
});

const ganttWidth = computed(() => totalDays.value * dayWidth.value);

// Build header columns: days if ≤31, weeks if ≤84, months otherwise
const headerColumns = computed(() => {
    if (!fromDate.value || totalDays.value <= 0) return [];

    const cols = [];

    if (totalDays.value <= 31) {
        // One column per day
        for (let i = 0; i < totalDays.value; i++) {
            const d = new Date(fromDate.value);
            d.setDate(d.getDate() + i);
            const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const holidayName = getHolidayInfo(ymd);
            const isSunday = d.getDay() === 0;
            cols.push({
                label: String(d.getDate()),
                subLabel: d.toLocaleDateString('es-PE', { weekday: 'short' }).slice(0, 2),
                offset: i,
                span: 1,
                isWeekend: [0, 6].includes(d.getDay()),
                isWeekStart: d.getDay() === 1, // lunes → línea de semana más marcada
                isSunday,
                isHoliday: !!holidayName,
                holidayName // null si no es feriado
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
            const end = Math.round((Math.min(monthEnd, toDateVal.value) - fromDate.value) / 86400000);
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

// Parsea una fecha a medianoche LOCAL. Las cadenas "YYYY-MM-DD" se interpretan
// como UTC por el constructor de Date y se corren un día según la zona horaria;
// aquí las forzamos a local para que coincidan con fromDate (también local).
const parseLocalDate = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// Índice de día (0-based) de una fecha dentro del rango visible.
const dayIndexOf = (date) => Math.round((date - fromDate.value) / 86400000);

// Position of today's line — en px sobre la misma rejilla que las columnas.
const todayOffset = computed(() => {
    if (!fromDate.value || totalDays.value <= 0) return null;
    const today = new Date();
    const diff = dayIndexOf(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    if (diff < 0 || diff >= totalDays.value) return null;
    return diff * dayWidth.value;
});

// ─── Cálculo de barras ────────────────────────────────────────────────────────
// Todas las posiciones se calculan en px como múltiplos de dayWidth, idénticos
// a los anchos de columna (col.span * dayWidth), para que barras, marcadores y
// rejilla de días queden perfectamente alineados sin deriva por redondeo de %.

const ganttRows = computed(() => {
    if (!fromDate.value || totalDays.value <= 0) return [];

    const dw = dayWidth.value;

    return tickets.value.map((t) => {
        const start = parseLocalDate(t.implementation_start);
        const end = parseLocalDate(t.implementation_end);
        const due = parseLocalDate(t.due_date);

        let barLeft = null;
        let barWidth = null;
        let duePos = null;

        if (start && end) {
            const startDiff = dayIndexOf(start);
            const endDiff = dayIndexOf(end);
            const clamped = Math.max(0, startDiff);
            const clampedEnd = Math.min(totalDays.value - 1, endDiff);
            if (clampedEnd >= clamped) {
                barLeft = clamped * dw;
                barWidth = (clampedEnd - clamped + 1) * dw;
            }
        }

        if (due) {
            const dueDiff = dayIndexOf(due);
            if (dueDiff >= 0 && dueDiff < totalDays.value) {
                // Centrado en su día para marcar la fecha límite con claridad.
                duePos = dueDiff * dw + dw / 2;
            }
        }

        const cfg = SCHEDULE_STATUS[t.schedule_status] ?? SCHEDULE_STATUS.unplanned;

        return { ...t, barLeft, barWidth, duePos, cfg };
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
            to: toYMD(rangeTo.value)
        };
        if (filterScheduleStatus.value) params.schedule_status = filterScheduleStatus.value;
        if (filterAssigneeUserId.value) params.assignee_user_id = filterAssigneeUserId.value;
        if (filterAssigneePosition.value) params.assignee_position = filterAssigneePosition.value;
        if (filterTicketStatus.value === 'active') params.status = 'pendiente,en proceso';
        if (filterTicketStatus.value === 'finished') params.status = 'concluido,anulado,rechazado';

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
        const [usersRes, positionsRes] = await Promise.all([usersApi.list(), positionsApi.getAll()]);

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
    filterScheduleStatus.value = null;
    filterAssigneeUserId.value = null;
    filterAssigneePosition.value = null;
    filterTicketStatus.value = 'active';
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
    filteredUserList.value = q.length >= 1 ? userList.value.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())) : userList.value;
};

onMounted(async () => {
    // rangeFrom/rangeTo ya apuntan al mes actual gracias a los computed
    await Promise.all([loadFilterLists(), fetchGantt()]);
    filteredUserList.value = userList.value;
});

// ─── Helpers de display ───────────────────────────────────────────────────────

// Formatea siempre como dd/mm/yyyy (y HH:mm si includeTime), sin depender de la
// configuración regional del entorno (que puede caer a en-US → mm/dd/yyyy).
const formatDate = (d, includeTime = false) => {
    if (!d) return '—';
    const pad = (n) => String(n).padStart(2, '0');
    let v;
    // Cadenas solo-fecha ("YYYY-MM-DD") se parsean como local para no correrse un día.
    if (typeof d === 'string') {
        const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        v = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
    } else {
        v = new Date(d);
    }
    if (isNaN(v.getTime())) return '—';
    const date = `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()}`;
    return includeTime ? `${date} ${pad(v.getHours())}:${pad(v.getMinutes())}` : date;
};

const PRIORITY_COLORS = {
    baja: '#10b981',
    media: '#f59e0b',
    alta: '#ef4444',
    urgente: '#dc2626'
};

// ─── Estado del ticket ────────────────────────────────────────────────────────

const TICKET_STATUS = {
    pendiente: { label: 'Pendiente', icon: 'pi pi-clock', severity: 'secondary' },
    'en proceso': { label: 'En proceso', icon: 'pi pi-sync', severity: 'info' },
    concluido: { label: 'Concluido', icon: 'pi pi-check-circle', severity: 'success' },
    rechazado: { label: 'Rechazado', icon: 'pi pi-times-circle', severity: 'danger' },
    anulado: { label: 'Anulado', icon: 'pi pi-ban', severity: 'secondary' }
};

const FINISHED_STATUSES = new Set(['concluido', 'anulado', 'rechazado']);
const isFinished = (status) => FINISHED_STATUSES.has(status);

// Toggle: 'all' | 'active' | 'finished'
const filterTicketStatus = ref('active');

const setTicketStatus = (val) => {
    filterTicketStatus.value = val;
    fetchGantt();
};

const handleTicketClick = (ticket) => {
    const currentUser = authStore.getUser;
    if (!currentUser) return;

    // 1. Acceso administrativo total (Solo SISTEMAS tiene "God Mode" en tickets)
    if (permissions.hasPosition(permissions.POSITIONS.SISTEMAS)) {
        return navigateToTicket(ticket.id);
    }

    // 2. Relación directa con el ticket
    const isCreator = ticket.creator?.id === currentUser.id;
    const isAssignee = ticket.assignee?.id === currentUser.id;
    const isSamePosition = ticket.assignee_position && currentUser.position === ticket.assignee_position;

    if (isCreator || isAssignee || isSamePosition) {
        return navigateToTicket(ticket.id);
    }

    // 3. Bloquear y avisar
    toast.add({
        severity: 'warn',
        summary: 'Acceso restringido',
        detail: 'No tienes autorización para ver los detalles de este ticket.',
        life: 5000
    });
};

const navigateToTicket = (id) => {
    router.push({ name: 'tickets', query: { ticket_id: id } });
};
</script>

<template>
    <div class="gantt-page">
        <!-- ═══ Header card ═══ -->
        <div class="gantt-header-card">
            <!-- Title row -->
            <div class="gantt-title-row">
                <div class="flex items-center gap-3">
                    <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.push({ name: 'tickets' })" v-tooltip.right="'Volver a Tickets'" />
                    <i class="pi pi-sliders-h text-primary-500" style="font-size: 1.3rem"></i>
                    <h1 class="gantt-title">Diagrama de Gantt — Tickets</h1>
                </div>
                <span v-if="!isLoading && ganttRows.length > 0" class="gantt-count-pill"> {{ ganttRows.length }} {{ ganttRows.length === 1 ? 'ticket' : 'tickets' }} </span>
            </div>

            <!-- Controls: stacked bands -->
            <div class="gantt-controls">
                <!-- Band 1 · Período -->
                <div class="controls-band">
                    <span class="controls-band-label">Período</span>
                    <div class="period-inner">
                        <div class="mode-toggle">
                            <button class="mode-btn" :class="{ 'mode-btn--active': viewMode === 'month' }" @click="switchToMonth"><i class="pi pi-calendar"></i> Por mes</button>
                            <button class="mode-btn" :class="{ 'mode-btn--active': viewMode === 'range' }" @click="switchToRange"><i class="pi pi-calendar-plus"></i> Por rango</button>
                        </div>

                        <template v-if="viewMode === 'month'">
                            <div class="month-nav">
                                <button class="month-nav-btn" @click="prevMonth" v-tooltip.top="'Mes anterior'">
                                    <i class="pi pi-chevron-left"></i>
                                </button>
                                <div class="month-selects">
                                    <Select v-model="selectedMonth" :options="MONTHS" optionLabel="label" optionValue="value" class="month-select-month" @change="fetchGantt" />
                                    <Select v-model="selectedYear" :options="yearOptions" class="month-select-year" @change="fetchGantt" />
                                </div>
                                <button class="month-nav-btn" @click="nextMonth" v-tooltip.top="'Mes siguiente'">
                                    <i class="pi pi-chevron-right"></i>
                                </button>
                                <button v-if="!isCurrentMonth" class="month-today-btn" @click="goToCurrentMonth" v-tooltip.top="'Ir al mes actual'">Hoy</button>
                            </div>
                        </template>

                        <template v-else>
                            <div class="range-inputs">
                                <div class="control-group">
                                    <label class="control-label">Desde</label>
                                    <Calendar v-model="rangeFromManual" dateFormat="dd/mm/yy" :showIcon="true" class="control-input" />
                                </div>
                                <div class="control-group">
                                    <label class="control-label">Hasta</label>
                                    <Calendar v-model="rangeToManual" dateFormat="dd/mm/yy" :showIcon="true" :minDate="rangeFromManual ?? undefined" class="control-input" />
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Band 2 · Filtros -->
                <div class="controls-band">
                    <span class="controls-band-label">Filtros</span>
                    <div class="filters-inner">
                        <!-- Toggle estado ticket -->
                        <div class="control-group">
                            <label class="control-label"><i class="pi pi-ticket"></i> Tickets</label>
                            <div class="status-toggle">
                                <button class="status-btn" :class="{ 'status-btn--all': filterTicketStatus === 'all' }" @click="setTicketStatus('all')">Todos</button>
                                <button class="status-btn" :class="{ 'status-btn--active': filterTicketStatus === 'active' }" @click="setTicketStatus('active')"><i class="pi pi-play-circle"></i> Activos</button>
                                <button class="status-btn" :class="{ 'status-btn--done': filterTicketStatus === 'finished' }" @click="setTicketStatus('finished')"><i class="pi pi-check-circle"></i> Terminados</button>
                            </div>
                        </div>

                        <div class="filter-divider"></div>

                        <div class="control-group">
                            <label class="control-label"><i class="pi pi-user"></i> Usuario asignado</label>
                            <Select
                                v-model="filterAssigneeUserId"
                                :options="filteredUserList"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Todos"
                                :filter="true"
                                filterPlaceholder="Buscar usuario..."
                                @filter="onFilterUsers"
                                @change="onUserSelected"
                                :disabled="!!filterAssigneePosition"
                                :showClear="true"
                                class="control-input"
                            />
                            <small v-if="filterAssigneePosition" class="control-hint">Limpie el área primero</small>
                        </div>

                        <div class="control-group">
                            <label class="control-label"><i class="pi pi-briefcase"></i> Área / Posición</label>
                            <Select
                                v-model="filterAssigneePosition"
                                :options="positionList"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Todas"
                                :filter="true"
                                filterPlaceholder="Buscar área..."
                                @change="onPositionSelected"
                                :disabled="!!filterAssigneeUserId"
                                :showClear="true"
                                class="control-input"
                            />
                            <small v-if="filterAssigneeUserId" class="control-hint">Limpie el usuario primero</small>
                        </div>

                        <div class="control-group">
                            <label class="control-label"><i class="pi pi-tag"></i> Estado planificación</label>
                            <Select v-model="filterScheduleStatus" :options="scheduleStatusOptions" optionLabel="label" optionValue="value" placeholder="Todos" :showClear="true" class="control-input" />
                        </div>

                        <div class="control-actions">
                            <Button label="Actualizar" icon="pi pi-refresh" size="small" @click="fetchGantt" :loading="isLoading" />
                            <Button v-if="filterAssigneeUserId || filterAssigneePosition || filterScheduleStatus || filterTicketStatus !== 'all'" label="Limpiar" icon="pi pi-times" severity="secondary" outlined size="small" @click="clearFilters" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active filter chips -->
            <div v-if="filterAssigneeUserId || filterAssigneePosition || filterScheduleStatus || filterTicketStatus !== 'all'" class="gantt-active-filters">
                <span class="active-filters-label"><i class="pi pi-filter-fill mr-1"></i>Filtros activos:</span>
                <Tag v-if="filterTicketStatus !== 'all'" :value="filterTicketStatus === 'active' ? 'Tickets: Activos' : 'Tickets: Terminados'" severity="info" class="text-xs" :removable="true" @remove="setTicketStatus('all')" />
                <Tag
                    v-if="filterAssigneeUserId"
                    :value="`Usuario: ${userList.find((u) => u.id === filterAssigneeUserId)?.name ?? filterAssigneeUserId}`"
                    severity="info"
                    class="text-xs"
                    :removable="true"
                    @remove="
                        filterAssigneeUserId = null;
                        fetchGantt();
                    "
                />
                <Tag
                    v-if="filterAssigneePosition"
                    :value="`Área: ${filterAssigneePosition}`"
                    severity="info"
                    class="text-xs"
                    :removable="true"
                    @remove="
                        filterAssigneePosition = null;
                        fetchGantt();
                    "
                />
                <Tag
                    v-if="filterScheduleStatus"
                    :value="`Planif.: ${scheduleStatusOptions.find((o) => o.value === filterScheduleStatus)?.label}`"
                    severity="secondary"
                    class="text-xs"
                    :removable="true"
                    @remove="
                        filterScheduleStatus = null;
                        fetchGantt();
                    "
                />
            </div>

            <!-- Legend -->
            <div class="gantt-legend">
                <span class="legend-item" v-for="(cfg, key) in SCHEDULE_STATUS" :key="key">
                    <span class="legend-dot" :style="{ background: cfg.color }"></span>
                    {{ cfg.label }}
                </span>
                <span class="legend-sep">·</span>
                <span class="legend-item">
                    <span class="legend-line legend-today"></span>
                    Hoy
                </span>
                <span class="legend-item">
                    <span class="legend-line legend-due"></span>
                    Fecha límite
                </span>
                <span class="legend-item">
                    <span class="legend-dot legend-holiday"></span>
                    Domingo / Feriado
                </span>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="gantt-state-panel">
            <i class="pi pi-spin pi-spinner" style="font-size: 2.5rem; color: var(--primary-500)"></i>
            <p class="mt-3 text-color-secondary">Cargando diagrama...</p>
        </div>

        <!-- No range -->
        <div v-else-if="totalDays <= 0" class="gantt-state-panel">
            <i class="pi pi-calendar" style="font-size: 3rem; opacity: 0.35"></i>
            <p class="mt-3">Seleccione un rango de fechas válido.</p>
        </div>

        <!-- No data -->
        <div v-else-if="ganttRows.length === 0" class="gantt-state-panel">
            <i class="pi pi-inbox" style="font-size: 3rem; opacity: 0.35"></i>
            <p class="mt-3">No hay tickets en este período.</p>
            <small class="text-color-secondary">Los tickets sin planificación también aparecen cuando no se filtra por estado.</small>
        </div>

        <!-- ═══ Gantt body ═══ -->
        <div v-else class="gantt-container">
            <div class="gantt-grid" :style="{ gridTemplateColumns: `var(--gantt-label-w, 300px) ${ganttWidth}px` }">
                <!-- Header row -->
                <div class="gantt-col-header"><i class="pi pi-list mr-2"></i>Ticket</div>
                <div class="gantt-date-header">
                    <div v-if="todayOffset !== null" class="gantt-today-line gantt-today-line--head" :style="{ left: todayOffset + 'px' }"></div>
                    <div
                        v-for="col in headerColumns"
                        :key="col.offset"
                        class="gantt-date-col"
                        :class="{ 'is-weekend': col.isWeekend, 'is-week-start': col.isWeekStart, 'is-sunday': col.isSunday, 'is-holiday': col.isHoliday }"
                        :style="{ width: col.span * dayWidth + 'px' }"
                        v-tooltip.bottom="col.holidayName || (col.isSunday ? 'Domingo' : undefined)"
                    >
                        <span class="gantt-date-main">{{ col.label }}</span>
                        <span v-if="col.subLabel" class="gantt-date-sub">{{ col.subLabel }}</span>
                    </div>
                </div>

                <!-- Ticket rows: cada ticket es UNA fila de grid (etiqueta + barras),
                     por eso ambas celdas comparten siempre la misma altura. -->
                <template v-for="row in ganttRows" :key="row.id">
                    <!-- Label cell (sticky a la izquierda) -->
                    <div
                        class="gantt-label-row"
                        :class="{ 'is-finished': isFinished(row.status) }"
                        @click="handleTicketClick(row)"
                        v-tooltip.right="`#${row.id} · ${row.title} | Creado por: ${row.creator?.name ?? '—'} (${row.creator?.position ?? '—'}) el ${formatDate(row.created_at, true)}`"
                    >
                        <span class="gantt-label-id">#{{ row.id }}</span>
                        <div class="gantt-label-info">
                            <span class="gantt-label-title">{{ row.title }}</span>
                            <div class="gantt-label-meta">
                                <span class="ticket-status-badge" :data-status="row.status" v-tooltip.top="TICKET_STATUS[row.status]?.label ?? row.status">
                                    <i :class="TICKET_STATUS[row.status]?.icon ?? 'pi pi-circle'"></i>
                                    {{ TICKET_STATUS[row.status]?.label ?? row.status }}
                                </span>
                                <Tag :value="SCHEDULE_STATUS[row.schedule_status]?.label ?? row.schedule_status" :severity="STATUS_SEVERITY[row.schedule_status] ?? 'secondary'" class="label-tag-sm" />
                                <span v-if="row.priority" class="gantt-priority-badge" :data-priority="row.priority">
                                    {{ row.priority }}
                                </span>
                            </div>
                            <div class="gantt-label-assignee-row" v-tooltip.top="'Asignado a'">
                                <template v-if="row.assignee">
                                    <i class="pi pi-user" style="font-size: 0.65rem"></i>
                                    <span style="font-size: 0.7rem"
                                        >{{ row.assignee.name }} <small v-if="row.assignee.position" style="font-size: 0.62rem" class="opacity-60">({{ row.assignee.position }})</small></span
                                    >
                                </template>
                                <template v-else-if="row.assignee_position">
                                    <i class="pi pi-briefcase" style="font-size: 0.65rem"></i>
                                    <span style="font-size: 0.7rem">{{ row.assignee_position }}</span>
                                </template>
                                <span v-else class="no-assignee" style="font-size: 0.65rem">Sin asignar</span>
                            </div>
                            <div v-if="row.creator" class="gantt-label-assignee-row mt-0.5 opacity-60" v-tooltip.top="'Creado por'">
                                <i class="pi pi-pencil" style="font-size: 0.6rem"></i>
                                <span style="font-size: 0.65rem"
                                    >{{ row.creator.name }} <small style="font-size: 0.6rem" class="opacity-70">{{ formatDate(row.created_at) }}</small></span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Bar cell -->
                    <div class="gantt-bar-row" :class="{ 'is-finished': isFinished(row.status) }">
                        <!-- Línea de hoy (un segmento por fila → forma una línea continua) -->
                        <div v-if="todayOffset !== null" class="gantt-today-line" :style="{ left: todayOffset + 'px' }"></div>

                        <!-- Grid bg cols -->
                        <div
                            v-for="col in headerColumns"
                            :key="col.offset"
                            class="gantt-bg-col"
                            :class="{ 'is-weekend': col.isWeekend, 'is-week-start': col.isWeekStart, 'is-sunday': col.isSunday, 'is-holiday': col.isHoliday }"
                            :style="{ width: col.span * dayWidth + 'px' }"
                        ></div>

                        <!-- Implementation bar -->
                        <div
                            v-if="row.barLeft !== null"
                            class="gantt-bar shadow-sm"
                            :class="row.cfg.bgClass"
                            :style="{ left: row.barLeft + 'px', width: row.barWidth + 'px' }"
                            @click="handleTicketClick(row)"
                            v-tooltip.top="
                                `#${row.id} · ${row.title} | ${TICKET_STATUS[row.status]?.label ?? row.status} | ${formatDate(row.implementation_start)} → ${formatDate(row.implementation_end)} | Creado por: ${row.creator?.name ?? '—'} (${row.creator?.position ?? '—'}) el ${formatDate(row.created_at, true)}`
                            "
                        >
                            <i :class="TICKET_STATUS[row.status]?.icon" class="gantt-bar-status-icon"></i>
                            <span class="gantt-bar-label">{{ row.title }}</span>
                        </div>

                        <!-- Unplanned placeholder -->
                        <div v-else-if="row.schedule_status === 'unplanned'" class="gantt-bar-unplanned" v-tooltip.top="`#${row.id} · ${TICKET_STATUS[row.status]?.label ?? row.status} — Sin fechas de implementación`">
                            <i class="pi pi-clock"></i>
                            <span>Sin planificar</span>
                        </div>

                        <!-- Due date marker -->
                        <div v-if="row.duePos !== null" class="gantt-due-marker" :style="{ left: row.duePos + 'px' }" v-tooltip.top="`Fecha límite: ${formatDate(row.due_date)}`"></div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ─── Page layout ─── */
.gantt-page {
    padding: 1.25rem;
    min-height: 100vh;
    background: var(--surface-ground);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ─── Header card ─── */
.gantt-header-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.gantt-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
}

.gantt-title {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}

.gantt-count-pill {
    background: var(--primary-100);
    color: var(--primary-700);
    border-radius: 20px;
    padding: 0.2rem 0.8rem;
    font-size: 0.78rem;
    font-weight: 700;
    border: 1px solid var(--primary-200);
}

/* ─── Controls: stacked bands ─── */
.gantt-controls {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 1rem;
}

.controls-band {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-100);
    border-radius: 8px;
}

.controls-band-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-color-secondary);
    padding-top: 0.55rem;
    white-space: nowrap;
    min-width: 50px;
}

/* Period band */
.period-inner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
}

/* Filters band */
.filters-inner {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 175px;
}

.control-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
    gap: 0.2rem;
}

.control-label i {
    font-size: 0.7rem;
}

.control-input {
    min-width: 175px;
}

.control-hint {
    font-size: 0.7rem;
    color: var(--orange-500);
    line-height: 1.3;
}

.control-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.1rem;
}

/* ── Mode toggle ── */
.mode-toggle {
    display: flex;
    background: var(--surface-0);
    border: 1px solid var(--surface-300);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
}

.mode-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--text-color-secondary);
    transition:
        background 0.15s,
        color 0.15s;
    white-space: nowrap;
}

.mode-btn i {
    font-size: 0.75rem;
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

/* Month navigation */
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
    transition:
        background 0.15s,
        color 0.15s,
        border-color 0.15s;
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
    padding: 0.28rem 0.65rem;
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

.range-inputs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: flex-end;
}

/* ── Status toggle ── */
.status-toggle {
    display: flex;
    background: var(--surface-0);
    border: 1px solid var(--surface-300);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
}

.status-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--text-color-secondary);
    transition:
        background 0.15s,
        color 0.15s;
    white-space: nowrap;
}

.status-btn i {
    font-size: 0.72rem;
}
.status-btn:hover {
    background: var(--surface-200);
    color: var(--text-color);
}

.status-btn--all {
    background: var(--surface-300);
    color: var(--text-color);
}
.status-btn--active {
    background: #3b82f6;
    color: #fff;
}
.status-btn--active:hover {
    background: #2563eb;
    color: #fff;
}
.status-btn--done {
    background: #22c55e;
    color: #fff;
}
.status-btn--done:hover {
    background: #16a34a;
    color: #fff;
}

/* Divisor visual entre toggle y selects */
.filter-divider {
    width: 1px;
    align-self: stretch;
    background: var(--surface-200);
    margin: 0.1rem 0.25rem;
    flex-shrink: 0;
}

/* ── Active filter chips ── */
.gantt-active-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0.55rem 0.875rem;
    background: var(--blue-50);
    border: 1px solid var(--blue-100);
    border-radius: 8px;
    margin-bottom: 0.75rem;
}

.active-filters-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--blue-700);
    display: flex;
    align-items: center;
    gap: 0.2rem;
    margin-right: 0.2rem;
}

/* ─── Legend ─── */
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

.legend-today {
    background: #3b82f6;
}
.legend-due {
    background: #f97316;
    border-top: 2px dashed #f97316;
    height: 0;
}

.legend-holiday {
    background: rgba(239, 68, 68, 0.35);
    border: 1px solid #ef4444;
}

.legend-sep {
    color: var(--text-color-secondary);
    opacity: 0.35;
    font-size: 1rem;
    line-height: 1;
}

/* ─── Gantt container ─── */
.gantt-container {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    overflow: auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Un único grid de 2 columnas: etiquetas (fija) + lienzo de barras.
   Cada ticket ocupa UNA fila del grid, así etiqueta y barra siempre
   comparten la misma altura. El ancho de la 2ª columna se fija inline
   (ganttWidth px) para que encabezado y barras midan exactamente igual. */
.gantt-grid {
    --gantt-label-w: 300px;
    display: grid;
    align-items: stretch;
}

.gantt-col-header {
    height: 56px;
    border-bottom: 1px solid var(--surface-border);
    border-right: 2px solid var(--surface-border);
    background: var(--surface-50);
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: sticky;
    top: 0;
    left: 0;
    z-index: 6;
}

.gantt-label-row {
    display: flex;
    align-items: center;
    min-height: 64px;
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
    border-bottom: 1px solid var(--surface-100);
    border-right: 2px solid var(--surface-border);
    cursor: pointer;
    position: sticky;
    left: 0;
    z-index: 5;
    background: var(--surface-card);
    transition:
        background 0.15s,
        box-shadow 0.15s;
}

.gantt-label-row:hover {
    background: var(--primary-50);
    box-shadow: inset 3px 0 0 var(--primary-400);
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

.gantt-label-assignee-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    overflow: hidden;
}

.gantt-label-assignee-row i {
    font-size: 0.68rem;
    flex-shrink: 0;
}

.gantt-label-assignee-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.no-assignee {
    font-style: italic;
    opacity: 0.5;
}

.gantt-priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* Priority badge */
.gantt-priority-badge {
    font-size: 0.63rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    line-height: 1.4;
    white-space: nowrap;
    flex-shrink: 0;
}

.gantt-priority-badge[data-priority='baja'] {
    background: #d1fae5;
    color: #065f46;
}
.gantt-priority-badge[data-priority='media'] {
    background: #fef3c7;
    color: #92400e;
}
.gantt-priority-badge[data-priority='alta'] {
    background: #fee2e2;
    color: #991b1b;
}
.gantt-priority-badge[data-priority='urgente'] {
    background: #dc2626;
    color: #fff;
}

/* Tag pequeño en labels */
.label-tag-sm {
    font-size: 0.63rem;
    padding: 0.1rem 0.3rem;
    line-height: 1.4;
}

/* ── Ticket status badge ── */
.ticket-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    font-size: 0.62rem;
    font-weight: 700;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
}

.ticket-status-badge i {
    font-size: 0.58rem;
}

.ticket-status-badge[data-status='pendiente'] {
    background: #e0e7ff;
    color: #3730a3;
}
.ticket-status-badge[data-status='en proceso'] {
    background: #dbeafe;
    color: #1d4ed8;
}
.ticket-status-badge[data-status='concluido'] {
    background: #dcfce7;
    color: #15803d;
}
.ticket-status-badge[data-status='rechazado'] {
    background: #fee2e2;
    color: #991b1b;
}
.ticket-status-badge[data-status='anulado'] {
    background: #f3f4f6;
    color: #4b5563;
}

/* ── Icono en la barra ── */
.gantt-bar-status-icon {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.85);
    flex-shrink: 0;
}

/* ── Estado terminado — filas atenuadas ── */
.gantt-label-row.is-finished {
    opacity: 0.6;
}

.gantt-label-row.is-finished:hover {
    opacity: 1;
}

.gantt-bar-row.is-finished .gantt-bar {
    opacity: 0.5;
    filter: grayscale(0.35);
}

.gantt-bar-row.is-finished .gantt-bar:hover {
    opacity: 0.85;
    filter: none;
}

.gantt-bar-row.is-finished .gantt-bar-unplanned {
    opacity: 0.35;
}

/* ─── Encabezado de fechas (columna derecha del grid) ─── */
.gantt-date-header {
    display: flex;
    height: 56px;
    border-bottom: 1px solid var(--surface-border);
    background: var(--surface-50);
    position: sticky;
    top: 0;
    z-index: 4;
}

.gantt-date-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    min-width: 0;
    flex-shrink: 0;
}

.gantt-date-col.is-weekend {
    background: var(--surface-100);
}

/* Línea más marcada al inicio de cada semana (lunes) */
.gantt-date-col.is-week-start {
    border-left: 2px solid rgba(0, 0, 0, 0.16);
}

/* Domingos y feriados — resaltados en rojo transparente */
.gantt-date-col.is-sunday,
.gantt-date-col.is-holiday {
    background: rgba(239, 68, 68, 0.16);
}

.gantt-date-col.is-sunday .gantt-date-main,
.gantt-date-col.is-holiday .gantt-date-main,
.gantt-date-col.is-sunday .gantt-date-sub,
.gantt-date-col.is-holiday .gantt-date-sub {
    color: #dc2626;
    font-weight: 700;
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

/* Línea de "Hoy" — un segmento por celda (encabezado + cada fila de barras),
   que en conjunto dibuja una línea vertical continua. */
.gantt-today-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #3b82f6;
    z-index: 3;
    pointer-events: none;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}

/* El punto solo se dibuja en el segmento del encabezado */
.gantt-today-line--head::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);
}

.gantt-bar-row {
    display: flex;
    min-height: 64px;
    position: relative;
    border-bottom: 1px solid var(--surface-100);
}

.gantt-bg-col {
    flex-shrink: 0;
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    min-height: 64px;
    height: 100%;
}

.gantt-bg-col.is-weekend {
    background: var(--surface-50);
}

/* Línea más marcada al inicio de cada semana (lunes) */
.gantt-bg-col.is-week-start {
    border-left: 2px solid rgba(0, 0, 0, 0.16);
}

/* Domingos y feriados — resaltados en rojo transparente */
.gantt-bg-col.is-sunday,
.gantt-bg-col.is-holiday {
    background: rgba(239, 68, 68, 0.08);
}

/* Barras de colores */
.gantt-bar {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
    cursor: pointer;
    transition:
        filter 0.15s,
        box-shadow 0.15s,
        transform 0.1s;
    z-index: 2;
    min-width: 6px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.gantt-bar:hover {
    filter: brightness(1.12);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
    transform: translateY(calc(-50% - 1px));
}

.gantt-bar-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.bar-on_track,
.bar-on-track {
    background: linear-gradient(135deg, #22c55e, #16a34a);
}
.bar-at_risk,
.bar-at-risk {
    background: linear-gradient(135deg, #eab308, #ca8a04);
}
.bar-delayed {
    background: linear-gradient(135deg, #ef4444, #dc2626);
}
.bar-overdue {
    background: linear-gradient(135deg, #b91c1c, #991b1b);
}
.bar-unplanned {
    background: linear-gradient(135deg, #9ca3af, #6b7280);
}

/* Placeholder para unplanned sin fechas */
.gantt-bar-unplanned {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    height: 24px;
    background: var(--surface-100);
    border: 1.5px dashed var(--surface-400);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.6rem;
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
    z-index: 2;
    opacity: 0.75;
}

/* Marcador de fecha límite */
.gantt-due-marker {
    position: absolute;
    top: 6px;
    bottom: 6px;
    width: 0;
    border-left: 2px dashed #f97316;
    z-index: 4;
    pointer-events: none;
}

.gantt-due-marker::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -5px;
    width: 8px;
    height: 8px;
    background: #f97316;
    border-radius: 50%;
}

/* ─── Estados vacíos / carga ─── */
.gantt-state-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 1rem;
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

.app-dark .gantt-col-header,
.app-dark .gantt-date-header {
    background: var(--surface-800);
    border-color: var(--surface-700);
}

.app-dark .gantt-label-row {
    background: var(--surface-900);
    border-right-color: var(--surface-700);
}

.app-dark .gantt-col-header {
    border-right-color: var(--surface-700);
}

.app-dark .gantt-label-row:hover {
    background: color-mix(in srgb, var(--primary-900) 30%, var(--surface-800));
    box-shadow: inset 3px 0 0 var(--primary-500);
}

.app-dark .gantt-bar-row {
    border-bottom-color: var(--surface-700);
}

.app-dark .gantt-bg-col,
.app-dark .gantt-date-col {
    border-right-color: rgba(255, 255, 255, 0.1);
}

.app-dark .gantt-bg-col.is-week-start,
.app-dark .gantt-date-col.is-week-start {
    border-left-color: rgba(255, 255, 255, 0.2);
}

.app-dark .gantt-bg-col.is-weekend {
    background: var(--surface-800);
}

.app-dark .gantt-date-col.is-weekend {
    background: var(--surface-700);
}

/* Domingos y feriados — modo oscuro */
.app-dark .gantt-bg-col.is-sunday,
.app-dark .gantt-bg-col.is-holiday {
    background: rgba(239, 68, 68, 0.15);
}

.app-dark .gantt-date-col.is-sunday,
.app-dark .gantt-date-col.is-holiday {
    background: rgba(239, 68, 68, 0.22);
}

.app-dark .gantt-date-col.is-sunday .gantt-date-main,
.app-dark .gantt-date-col.is-holiday .gantt-date-main,
.app-dark .gantt-date-col.is-sunday .gantt-date-sub,
.app-dark .gantt-date-col.is-holiday .gantt-date-sub {
    color: #f87171;
}

.app-dark .gantt-bar-unplanned {
    background: var(--surface-700);
    border-color: var(--surface-500);
}

.app-dark .gantt-state-panel {
    background: var(--surface-900);
    border-color: var(--surface-700);
}

.app-dark .gantt-priority-badge[data-priority='baja'] {
    background: #064e3b;
    color: #6ee7b7;
}
.app-dark .gantt-priority-badge[data-priority='media'] {
    background: #451a03;
    color: #fde68a;
}
.app-dark .gantt-priority-badge[data-priority='alta'] {
    background: #450a0a;
    color: #fca5a5;
}
.app-dark .gantt-priority-badge[data-priority='urgente'] {
    background: #991b1b;
    color: #fff;
}

.app-dark .ticket-status-badge[data-status='pendiente'] {
    background: #1e1b4b;
    color: #a5b4fc;
}
.app-dark .ticket-status-badge[data-status='en proceso'] {
    background: #1e3a5f;
    color: #93c5fd;
}
.app-dark .ticket-status-badge[data-status='concluido'] {
    background: #14532d;
    color: #86efac;
}
.app-dark .ticket-status-badge[data-status='rechazado'] {
    background: #450a0a;
    color: #fca5a5;
}
.app-dark .ticket-status-badge[data-status='anulado'] {
    background: #374151;
    color: #9ca3af;
}

.app-dark .status-toggle {
    background: var(--surface-800);
    border-color: var(--surface-600);
}

.app-dark .status-btn:hover {
    background: var(--surface-700);
}
.app-dark .status-btn--all {
    background: var(--surface-600);
    color: var(--text-color);
}

.app-dark .filter-divider {
    background: var(--surface-600);
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
    .gantt-page {
        padding: 0.75rem;
    }
    .gantt-grid {
        --gantt-label-w: 200px;
    }
    .gantt-label-title {
        max-width: 150px;
    }
    .gantt-controls {
        flex-direction: column;
        align-items: stretch;
    }
    .control-input {
        min-width: 100%;
    }
    .control-divider {
        display: none;
    }
    .control-actions {
        justify-content: stretch;
    }
    .control-actions :deep(.p-button) {
        flex: 1;
    }
    .period-selector {
        flex-direction: column;
        align-items: stretch;
    }
    .month-nav {
        justify-content: space-between;
    }
    .month-selects {
        flex: 1;
    }
    .month-select-month {
        flex: 1;
        min-width: 0;
    }
    .month-select-year {
        min-width: 80px;
    }
    .range-inputs {
        flex-direction: column;
    }
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
