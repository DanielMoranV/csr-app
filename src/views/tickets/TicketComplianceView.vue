<script setup>
import { positions as positionsApi, users as usersApi } from '@/api';
import { apiUtils } from '@/api/axios';
import { TicketService } from '@/api/tickets';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/composables/usePermissions';
import { isHoliday } from '@/data/holidays-pe';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
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
const compliance = ref(null); // respuesta completa del backend
const filterAssigneeUserId = ref(null);
const filterAssigneePosition = ref(null);

// Listas para los selects de usuario y área
const userList = ref([]);
const positionList = ref([]); // [{ name, id }]

// Selección de mes/año (mes 0-indexed en el front, se envía 1-12 al backend)
const selectedYear = ref(new Date().getFullYear());
const selectedMonth = ref(new Date().getMonth());

// Toggle del desglose: 'position' | 'user'
const breakdownMode = ref('position');

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

// ─── Navegación de meses ──────────────────────────────────────────────────────

const prevMonth = () => {
    if (selectedMonth.value === 0) {
        selectedMonth.value = 11;
        selectedYear.value--;
    } else {
        selectedMonth.value--;
    }
    fetchCompliance();
};

const nextMonth = () => {
    if (selectedMonth.value === 11) {
        selectedMonth.value = 0;
        selectedYear.value++;
    } else {
        selectedMonth.value++;
    }
    fetchCompliance();
};

const goToCurrentMonth = () => {
    const now = new Date();
    selectedYear.value = now.getFullYear();
    selectedMonth.value = now.getMonth();
    fetchCompliance();
};

// ─── Primer día hábil del mes siguiente (solo texto informativo) ───────────────
// La fuente de verdad de is_closed es el backend; esto solo ilustra al usuario
// cuándo se cierra el indicador del mes seleccionado.

const toYMD = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

const firstBusinessDayLabel = computed(() => {
    // Primer día del mes siguiente al seleccionado
    let d = new Date(selectedYear.value, selectedMonth.value + 1, 1);
    // Avanzar hasta el primer día que no sea sábado, domingo ni feriado
    while (d.getDay() === 0 || d.getDay() === 6 || isHoliday(toYMD(d))) {
        d.setDate(d.getDate() + 1);
    }
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
});

// ─── Derivados de la respuesta ─────────────────────────────────────────────────

const isClosed = computed(() => compliance.value?.is_closed === true);
const metaTotal = computed(() => compliance.value?.meta_total ?? 0);
const cumplidas = computed(() => compliance.value?.cumplidas ?? 0);
const incumplidas = computed(() => compliance.value?.incumplidas ?? 0);
const sinFecha = computed(() => compliance.value?.sin_fecha_ejecucion ?? 0);
const porcentaje = computed(() => compliance.value?.porcentaje ?? 0);

const byPosition = computed(() => compliance.value?.by_position ?? []);
const byUser = computed(() => compliance.value?.by_user ?? []);
const breakdownRows = computed(() => (breakdownMode.value === 'position' ? byPosition.value : byUser.value));

const tickets = computed(() => compliance.value?.tickets ?? []);

// ─── Gauge / doughnut de cumplimiento ──────────────────────────────────────────

const gaugeColor = computed(() => {
    const p = porcentaje.value;
    if (p >= 90) return '#22c55e';
    if (p >= 75) return '#84cc16';
    if (p >= 50) return '#eab308';
    return '#ef4444';
});

const gaugeData = computed(() => {
    const p = Math.max(0, Math.min(100, porcentaje.value));
    return {
        labels: ['Cumplidas', 'Incumplidas'],
        datasets: [
            {
                data: [p, 100 - p],
                backgroundColor: [gaugeColor.value, 'rgba(148, 163, 184, 0.18)'],
                borderWidth: 0,
                cutout: '75%'
            }
        ]
    };
});

const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
    }
};

// ─── Fetch ──────────────────────────────────────────────────────────────────────

const fetchCompliance = async () => {
    isLoading.value = true;
    compliance.value = null;

    try {
        const params = {
            year: selectedYear.value,
            month: selectedMonth.value + 1
        };
        if (filterAssigneeUserId.value) params.assignee_user_id = filterAssigneeUserId.value;
        if (filterAssigneePosition.value) params.assignee_position = filterAssigneePosition.value;

        const response = await TicketService.getCompliance(params);
        compliance.value = response?.data?.data ?? response?.data ?? null;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los indicadores de cumplimiento.', life: 4000 });
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
    filterAssigneeUserId.value = null;
    filterAssigneePosition.value = null;
    fetchCompliance();
};

// El modelo de asignación es mutuamente excluyente (usuario XOR área).
const onUserSelected = () => {
    if (filterAssigneeUserId.value) filterAssigneePosition.value = null;
    fetchCompliance();
};

const onPositionSelected = () => {
    if (filterAssigneePosition.value) filterAssigneeUserId.value = null;
    fetchCompliance();
};

// Búsqueda de usuarios en el Select con filtro
const filteredUserList = ref([]);
const onFilterUsers = (event) => {
    const q = event?.value ?? '';
    filteredUserList.value = q.length >= 1 ? userList.value.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())) : userList.value;
};

onMounted(async () => {
    await Promise.all([loadFilterLists(), fetchCompliance()]);
    filteredUserList.value = userList.value;
});

// ─── Helpers de display ─────────────────────────────────────────────────────────

// Formatea dd/mm/yyyy (y HH:mm si includeTime). Las cadenas solo-fecha
// ("YYYY-MM-DD") se parsean como local para no correrse un día; las cadenas
// con hora (ISO con offset) las resuelve el constructor de Date normalmente.
const formatDate = (d, includeTime = false) => {
    if (!d) return '—';
    const pad = (n) => String(n).padStart(2, '0');
    let v;
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

// Origen de la fecha de ejecución → etiqueta y severidad del Tag
const ORIGEN_CONFIG = {
    implementation_end: { label: 'Fin de implementación', severity: 'success' },
    due_date: { label: 'Fecha límite', severity: 'info' },
    culminacion: { label: 'Culminación', severity: 'warn' },
    sin_fecha: { label: 'Sin fecha', severity: 'secondary' }
};

const origenConfig = (origen) => ORIGEN_CONFIG[origen] ?? { label: origen ?? '—', severity: 'secondary' };

// Parsea una fecha a medianoche local para comparar solo la parte de fecha.
const parseLocalDate = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// Concluida a destiempo: se marcó como concluida (concluded_at) pero no cuenta
// como cumplida porque la conclusión cayó después de la fecha de ejecución
// comprometida (fuera del mes-meta).
const isLateCompletion = (t) => {
    if (t.cumplido || !t.concluded_at) return false;
    const done = parseLocalDate(t.concluded_at);
    const exec = parseLocalDate(t.fecha_ejecucion);
    if (!done || !exec) return true; // concluida sin fecha de ejecución comparable → tardía
    return done > exec;
};

const groupPercentSeverity = (p) => {
    if (p >= 90) return 'success';
    if (p >= 75) return 'info';
    if (p >= 50) return 'warn';
    return 'danger';
};

// ─── Navegación al ticket (mismo patrón que el Gantt) ───────────────────────────

const handleTicketClick = (ticket) => {
    const currentUser = authStore.getUser;
    if (!currentUser) return;

    // 1. Acceso administrativo total (solo SISTEMAS tiene "God Mode" en tickets)
    if (permissions.hasPosition(permissions.POSITIONS.SISTEMAS)) {
        return navigateToTicket(ticket.id);
    }

    // 2. Relación directa con el ticket
    const isAssignee = ticket.assignee_user_id === currentUser.id;
    const isSamePosition = ticket.assignee_position && currentUser.position === ticket.assignee_position;

    if (isAssignee || isSamePosition) {
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
    <div class="cmp-page">
        <!-- ═══ Header card ═══ -->
        <div class="cmp-header-card">
            <!-- Title row -->
            <div class="cmp-title-row">
                <div class="flex items-center gap-3">
                    <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.push({ name: 'tickets' })" v-tooltip.right="'Volver a Tickets'" />
                    <i class="pi pi-chart-bar text-primary-500" style="font-size: 1.3rem"></i>
                    <h1 class="cmp-title">Cumplimiento de Tareas — Tickets</h1>
                </div>
                <span class="cmp-month-pill">{{ currentMonthLabel }}</span>
            </div>

            <!-- Controls -->
            <div class="cmp-controls">
                <!-- Band 1 · Período -->
                <div class="controls-band">
                    <span class="controls-band-label">Período</span>
                    <div class="period-inner">
                        <div class="month-nav">
                            <button class="month-nav-btn" @click="prevMonth" v-tooltip.top="'Mes anterior'">
                                <i class="pi pi-chevron-left"></i>
                            </button>
                            <div class="month-selects">
                                <Select v-model="selectedMonth" :options="MONTHS" optionLabel="label" optionValue="value" class="month-select-month" @change="fetchCompliance" />
                                <Select v-model="selectedYear" :options="yearOptions" class="month-select-year" @change="fetchCompliance" />
                            </div>
                            <button class="month-nav-btn" @click="nextMonth" v-tooltip.top="'Mes siguiente'">
                                <i class="pi pi-chevron-right"></i>
                            </button>
                            <button v-if="!isCurrentMonth" class="month-today-btn" @click="goToCurrentMonth" v-tooltip.top="'Ir al mes actual'">Hoy</button>
                        </div>
                    </div>
                </div>

                <!-- Band 2 · Filtros -->
                <div class="controls-band">
                    <span class="controls-band-label">Filtros</span>
                    <div class="filters-inner">
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

                        <div class="control-actions">
                            <Button label="Actualizar" icon="pi pi-refresh" size="small" @click="fetchCompliance" :loading="isLoading" />
                            <Button v-if="filterAssigneeUserId || filterAssigneePosition" label="Limpiar" icon="pi pi-times" severity="secondary" outlined size="small" @click="clearFilters" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Regla de negocio -->
            <div class="cmp-business-rule">
                <i class="pi pi-info-circle"></i>
                <span>
                    <strong>Meta</strong> = tareas cuya fecha de ejecución cae en el mes (excluye anuladas). La fecha se toma en cascada: fin de implementación → fecha límite → fecha de culminación. <strong>Cumplida</strong> = concluida dentro del
                    mes comprometido; concluir a destiempo no cuenta.
                </span>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="cmp-state-panel">
            <i class="pi pi-spin pi-spinner" style="font-size: 2.5rem; color: var(--primary-500)"></i>
            <p class="mt-3 text-color-secondary">Cargando indicadores...</p>
        </div>

        <template v-else-if="compliance">
            <!-- ═══ Banner de estado ═══ -->
            <div class="cmp-banner" :class="isClosed ? 'cmp-banner--closed' : 'cmp-banner--provisional'">
                <i :class="isClosed ? 'pi pi-lock' : 'pi pi-hourglass'"></i>
                <div class="cmp-banner-text">
                    <template v-if="isClosed">
                        <strong>Indicador cerrado / definitivo.</strong>
                        <span>Los valores de {{ currentMonthLabel }} son finales.</span>
                    </template>
                    <template v-else>
                        <strong>Indicador provisional — mes en curso.</strong>
                        <span>Se cerrará el primer día hábil del mes siguiente ({{ firstBusinessDayLabel }}). Los valores aún pueden cambiar.</span>
                    </template>
                </div>
            </div>

            <!-- Aviso de tareas sin fecha de ejecución -->
            <div v-if="sinFecha > 0" class="cmp-warning">
                <i class="pi pi-exclamation-triangle"></i>
                <span>
                    <strong>{{ sinFecha }}</strong> {{ sinFecha === 1 ? 'tarea sin fecha de ejecución' : 'tareas sin fecha de ejecución' }} ni conclusión — se imputan al mes en curso y no cuentan en la meta de este mes.
                </span>
            </div>

            <!-- ═══ KPI cards ═══ -->
            <div class="cmp-kpi-grid">
                <!-- Gauge de cumplimiento -->
                <div class="cmp-card cmp-gauge-card">
                    <span class="cmp-card-label">% Cumplimiento</span>
                    <div class="cmp-gauge-wrap">
                        <Chart type="doughnut" :data="gaugeData" :options="gaugeOptions" class="cmp-gauge" />
                        <div class="cmp-gauge-center">
                            <span class="cmp-gauge-value" :style="{ color: gaugeColor }">{{ porcentaje }}%</span>
                            <span class="cmp-gauge-sub">{{ cumplidas }} / {{ metaTotal }}</span>
                        </div>
                    </div>
                </div>

                <!-- Meta total -->
                <div class="cmp-card cmp-kpi cmp-kpi--meta">
                    <div class="cmp-kpi-icon"><i class="pi pi-flag"></i></div>
                    <span class="cmp-kpi-value">{{ metaTotal }}</span>
                    <span class="cmp-kpi-label">Meta total</span>
                </div>

                <!-- Cumplidas -->
                <div class="cmp-card cmp-kpi cmp-kpi--done">
                    <div class="cmp-kpi-icon"><i class="pi pi-check-circle"></i></div>
                    <span class="cmp-kpi-value">{{ cumplidas }}</span>
                    <span class="cmp-kpi-label">Cumplidas</span>
                </div>

                <!-- Incumplidas -->
                <div class="cmp-card cmp-kpi cmp-kpi--fail">
                    <div class="cmp-kpi-icon"><i class="pi pi-times-circle"></i></div>
                    <span class="cmp-kpi-value">{{ incumplidas }}</span>
                    <span class="cmp-kpi-label">Incumplidas</span>
                </div>

                <!-- Sin fecha de ejecución -->
                <div class="cmp-card cmp-kpi cmp-kpi--nodate">
                    <div class="cmp-kpi-icon"><i class="pi pi-calendar-times"></i></div>
                    <span class="cmp-kpi-value">{{ sinFecha }}</span>
                    <span class="cmp-kpi-label">Sin fecha de ejecución</span>
                </div>
            </div>

            <!-- ═══ Desglose por área / usuario ═══ -->
            <div class="cmp-card cmp-section">
                <div class="cmp-section-header">
                    <h2 class="cmp-section-title"><i class="pi pi-sitemap"></i> Desglose</h2>
                    <div class="breakdown-toggle">
                        <button class="breakdown-btn" :class="{ 'breakdown-btn--active': breakdownMode === 'position' }" @click="breakdownMode = 'position'"><i class="pi pi-briefcase"></i> Por área</button>
                        <button class="breakdown-btn" :class="{ 'breakdown-btn--active': breakdownMode === 'user' }" @click="breakdownMode = 'user'"><i class="pi pi-user"></i> Por usuario</button>
                    </div>
                </div>

                <div v-if="breakdownRows.length === 0" class="cmp-empty-inline">
                    <i class="pi pi-inbox"></i>
                    <span>Sin datos de desglose para este período.</span>
                </div>

                <table v-else class="cmp-table">
                    <thead>
                        <tr>
                            <th>{{ breakdownMode === 'position' ? 'Área' : 'Usuario' }}</th>
                            <th class="num">Meta</th>
                            <th class="num">Cumplidas</th>
                            <th class="num">Incumplidas</th>
                            <th class="pct-col">% Cumplimiento</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, idx) in breakdownRows" :key="idx">
                            <td class="strong">{{ row.label }}</td>
                            <td class="num">{{ row.meta }}</td>
                            <td class="num cell-done">{{ row.cumplidas }}</td>
                            <td class="num cell-fail">{{ row.incumplidas }}</td>
                            <td class="pct-col">
                                <div class="pct-cell">
                                    <div class="pct-bar">
                                        <div
                                            class="pct-bar-fill"
                                            :style="{ width: Math.min(100, row.porcentaje) + '%', background: row.porcentaje >= 90 ? '#22c55e' : row.porcentaje >= 75 ? '#84cc16' : row.porcentaje >= 50 ? '#eab308' : '#ef4444' }"
                                        ></div>
                                    </div>
                                    <Tag :value="`${row.porcentaje}%`" :severity="groupPercentSeverity(row.porcentaje)" class="pct-tag" />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- ═══ Detalle de tickets ═══ -->
            <div class="cmp-card cmp-section">
                <div class="cmp-section-header">
                    <h2 class="cmp-section-title"><i class="pi pi-list"></i> Detalle de tareas</h2>
                    <span v-if="tickets.length" class="cmp-count-pill">{{ tickets.length }} {{ tickets.length === 1 ? 'tarea' : 'tareas' }}</span>
                </div>

                <div v-if="tickets.length === 0" class="cmp-empty-inline">
                    <i class="pi pi-inbox"></i>
                    <span>No hay tareas en este período.</span>
                </div>

                <div v-else class="cmp-table-scroll">
                    <table class="cmp-table cmp-detail-table">
                        <thead>
                            <tr>
                                <th style="width: 3.5rem">#</th>
                                <th>Tarea</th>
                                <th>Asignado a</th>
                                <th>Asignado por</th>
                                <th>Fecha de ejecución</th>
                                <th>Culminado por</th>
                                <th class="center">Cumplido</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="t in tickets"
                                :key="t.id"
                                class="detail-row"
                                :class="{ 'row-late': isLateCompletion(t) }"
                                @click="handleTicketClick(t)"
                                v-tooltip.top="isLateCompletion(t) ? `Ver ticket #${t.id} — concluida a destiempo` : `Ver ticket #${t.id}`"
                            >
                                <td class="id-cell">#{{ t.id }}</td>
                                <td class="title-cell">{{ t.title }}</td>
                                <td>
                                    <div class="person-cell">
                                        <span class="person-name">{{ t.assignee_name ?? '—' }}</span>
                                        <span v-if="t.assignee_position" class="person-sub">{{ t.assignee_position }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="person-cell">
                                        <span class="person-name">{{ t.assigned_by_name ?? '—' }}</span>
                                        <span v-if="t.assigned_at" class="person-sub">{{ formatDate(t.assigned_at, true) }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="exec-cell">
                                        <span>{{ formatDate(t.fecha_ejecucion) }}</span>
                                        <Tag :value="origenConfig(t.fecha_ejecucion_origen).label" :severity="origenConfig(t.fecha_ejecucion_origen).severity" class="origen-tag" />
                                    </div>
                                </td>
                                <td>
                                    <div v-if="t.concluded_at || t.concluded_by_name" class="person-cell concl-cell" :class="{ 'concl-cell--late': isLateCompletion(t) }">
                                        <span class="person-name">{{ t.concluded_by_name ?? '—' }}</span>
                                        <span class="person-sub">{{ formatDate(t.concluded_at, true) }}</span>
                                        <Tag v-if="isLateCompletion(t)" value="A destiempo" severity="warn" class="late-tag" />
                                    </div>
                                    <span v-else class="person-muted">—</span>
                                </td>
                                <td class="center">
                                    <span class="cumplido-badge" :class="t.cumplido ? 'cumplido-badge--yes' : 'cumplido-badge--no'">
                                        <i :class="t.cumplido ? 'pi pi-check' : 'pi pi-times'"></i>
                                        {{ t.cumplido ? 'Cumplida' : 'No cumplida' }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>

        <!-- Sin datos (respuesta vacía) -->
        <div v-else class="cmp-state-panel">
            <i class="pi pi-inbox" style="font-size: 3rem; opacity: 0.35"></i>
            <p class="mt-3">No hay indicadores para este período.</p>
        </div>
    </div>
</template>

<style scoped>
/* ─── Page layout ─── */
.cmp-page {
    padding: 1.25rem;
    min-height: 100vh;
    background: var(--surface-ground);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ─── Header card ─── */
.cmp-header-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.cmp-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.cmp-title {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}

.cmp-month-pill {
    background: var(--primary-100);
    color: var(--primary-700);
    border-radius: 20px;
    padding: 0.2rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 700;
    border: 1px solid var(--primary-200);
}

/* ─── Controls ─── */
.cmp-controls {
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

.period-inner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
}

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

/* ─── Regla de negocio ─── */
.cmp-business-rule {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.6rem 0.875rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-100);
    border-radius: 8px;
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    line-height: 1.5;
}

.cmp-business-rule i {
    color: var(--primary-500);
    margin-top: 0.15rem;
    flex-shrink: 0;
}

/* ─── Banner de estado ─── */
.cmp-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.1rem;
    border-radius: 10px;
    border: 1px solid;
}

.cmp-banner i {
    font-size: 1.4rem;
    flex-shrink: 0;
}

.cmp-banner-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    font-size: 0.85rem;
}

.cmp-banner-text strong {
    font-weight: 700;
}

.cmp-banner-text span {
    opacity: 0.85;
}

.cmp-banner--provisional {
    background: var(--yellow-50, #fefce8);
    border-color: var(--yellow-200, #fef08a);
    color: #854d0e;
}

.cmp-banner--closed {
    background: var(--green-50, #f0fdf4);
    border-color: var(--green-200, #bbf7d0);
    color: #166534;
}

/* ─── Warning sin fecha ─── */
.cmp-warning {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 1.1rem;
    border-radius: 10px;
    background: var(--orange-50, #fff7ed);
    border: 1px solid var(--orange-200, #fed7aa);
    color: #9a3412;
    font-size: 0.82rem;
}

.cmp-warning i {
    font-size: 1.15rem;
    flex-shrink: 0;
}

/* ─── Cards genéricas ─── */
.cmp-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

/* ─── KPI grid ─── */
.cmp-kpi-grid {
    display: grid;
    grid-template-columns: 1.4fr repeat(4, 1fr);
    gap: 1rem;
}

.cmp-card-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-color-secondary);
}

/* Gauge card */
.cmp-gauge-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.1rem;
}

.cmp-gauge-wrap {
    position: relative;
    width: 100%;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cmp-gauge {
    width: 100%;
    height: 100%;
}

.cmp-gauge-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
}

.cmp-gauge-value {
    font-size: 1.9rem;
    font-weight: 800;
    line-height: 1;
}

.cmp-gauge-sub {
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    margin-top: 0.25rem;
}

/* KPI simple cards */
.cmp-kpi {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 1.1rem 0.75rem;
    text-align: center;
}

.cmp-kpi-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    margin-bottom: 0.1rem;
}

.cmp-kpi-value {
    font-size: 1.9rem;
    font-weight: 800;
    line-height: 1;
    color: var(--text-color);
}

.cmp-kpi-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.cmp-kpi--meta .cmp-kpi-icon {
    background: var(--primary-100);
    color: var(--primary-600);
}
.cmp-kpi--done .cmp-kpi-icon {
    background: #dcfce7;
    color: #16a34a;
}
.cmp-kpi--fail .cmp-kpi-icon {
    background: #fee2e2;
    color: #dc2626;
}
.cmp-kpi--nodate .cmp-kpi-icon {
    background: #ffedd5;
    color: #ea580c;
}

/* ─── Secciones (desglose / detalle) ─── */
.cmp-section {
    padding: 1.1rem 1.25rem 1.25rem;
}

.cmp-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.9rem;
}

.cmp-section-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.98rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}

.cmp-section-title i {
    color: var(--primary-500);
    font-size: 0.9rem;
}

.cmp-count-pill {
    background: var(--surface-100);
    color: var(--text-color-secondary);
    border-radius: 20px;
    padding: 0.15rem 0.7rem;
    font-size: 0.75rem;
    font-weight: 700;
}

/* Breakdown toggle */
.breakdown-toggle {
    display: flex;
    background: var(--surface-0);
    border: 1px solid var(--surface-300);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
}

.breakdown-btn {
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

.breakdown-btn i {
    font-size: 0.72rem;
}
.breakdown-btn:hover {
    background: var(--surface-200);
    color: var(--text-color);
}
.breakdown-btn--active {
    background: var(--primary-500);
    color: #fff;
}
.breakdown-btn--active:hover {
    background: var(--primary-600);
    color: #fff;
}

/* ─── Tablas ─── */
.cmp-table-scroll {
    overflow-x: auto;
}

.cmp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
}

.cmp-table thead th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-color-secondary);
    padding: 0.5rem 0.6rem;
    border-bottom: 2px solid var(--surface-200);
    white-space: nowrap;
}

.cmp-table thead th.num,
.cmp-table td.num {
    text-align: right;
}

.cmp-table thead th.center,
.cmp-table td.center {
    text-align: center;
}

.cmp-table tbody td {
    padding: 0.6rem;
    border-bottom: 1px solid var(--surface-100);
    color: var(--text-color);
    vertical-align: middle;
}

.cmp-table td.strong {
    font-weight: 600;
}

.cell-done {
    color: #16a34a;
    font-weight: 600;
}
.cell-fail {
    color: #dc2626;
    font-weight: 600;
}

.pct-col {
    width: 220px;
}

.pct-cell {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.pct-bar {
    flex: 1;
    height: 8px;
    background: var(--surface-200);
    border-radius: 4px;
    overflow: hidden;
    min-width: 80px;
}

.pct-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
}

.pct-tag {
    font-size: 0.72rem;
    font-weight: 700;
    flex-shrink: 0;
}

/* Detail table */
.cmp-detail-table tbody tr.detail-row {
    cursor: pointer;
    transition:
        background 0.15s,
        box-shadow 0.15s;
}

.cmp-detail-table tbody tr.detail-row:hover {
    background: var(--primary-50);
    box-shadow: inset 3px 0 0 var(--primary-400);
}

.id-cell {
    font-weight: 700;
    color: var(--text-color-secondary);
    white-space: nowrap;
}

.title-cell {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
}

/* Celdas de persona (asignado a / asignado por / culminado por) */
.person-cell {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
    align-items: flex-start;
}

.person-name {
    font-weight: 500;
    white-space: nowrap;
}

.person-sub {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
}

.person-muted {
    color: var(--text-color-secondary);
    opacity: 0.6;
}

.exec-cell {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    align-items: flex-start;
    white-space: nowrap;
}

.origen-tag {
    font-size: 0.65rem;
    padding: 0.05rem 0.35rem;
}

/* Culminado por */
.concl-cell {
    gap: 0.15rem;
}

.concl-cell--late .person-name,
.concl-cell--late .person-sub {
    color: #b45309;
    font-weight: 600;
}

.late-tag {
    font-size: 0.62rem;
    padding: 0.05rem 0.35rem;
}

/* Fila con conclusión a destiempo — resaltada en ámbar */
.cmp-detail-table tbody tr.row-late {
    background: #fffbeb;
}

.cmp-detail-table tbody tr.row-late:hover {
    background: #fef3c7;
}

.cumplido-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    white-space: nowrap;
}

.cumplido-badge i {
    font-size: 0.65rem;
}

.cumplido-badge--yes {
    background: #dcfce7;
    color: #15803d;
}

.cumplido-badge--no {
    background: #fee2e2;
    color: #b91c1c;
}

/* ─── Estados vacíos / carga ─── */
.cmp-state-panel {
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

.cmp-empty-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    justify-content: center;
    color: var(--text-color-secondary);
    font-size: 0.85rem;
}

.cmp-empty-inline i {
    font-size: 1.2rem;
    opacity: 0.5;
}

/* ─── Responsive ─── */
@media (max-width: 1100px) {
    .cmp-kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .cmp-gauge-card {
        grid-column: 1 / -1;
    }
}

@media (max-width: 640px) {
    .cmp-page {
        padding: 0.75rem;
    }
    .cmp-kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .control-input {
        min-width: 100%;
    }
    .control-group {
        min-width: 100%;
    }
}

/* ─── Modo oscuro ─── */
.app-dark .cmp-header-card,
.app-dark .cmp-card,
.app-dark .cmp-state-panel {
    background: var(--surface-900);
    border-color: var(--surface-700);
}

.app-dark .controls-band,
.app-dark .cmp-business-rule {
    background: var(--surface-800);
    border-color: var(--surface-700);
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

.app-dark .breakdown-toggle {
    background: var(--surface-800);
    border-color: var(--surface-600);
}

.app-dark .breakdown-btn:hover {
    background: var(--surface-700);
}

.app-dark .cmp-table thead th {
    border-bottom-color: var(--surface-600);
}

.app-dark .cmp-table tbody td {
    border-bottom-color: var(--surface-700);
}

.app-dark .cmp-detail-table tbody tr.detail-row:hover {
    background: color-mix(in srgb, var(--primary-900) 30%, var(--surface-800));
    box-shadow: inset 3px 0 0 var(--primary-500);
}

.app-dark .pct-bar {
    background: var(--surface-700);
}

.app-dark .cmp-count-pill {
    background: var(--surface-700);
}

.app-dark .cmp-banner--provisional {
    background: hsl(45, 40%, 14%);
    border-color: hsl(45, 40%, 28%);
    color: #fde68a;
}

.app-dark .cmp-banner--closed {
    background: hsl(142, 35%, 12%);
    border-color: hsl(142, 35%, 25%);
    color: #86efac;
}

.app-dark .cmp-warning {
    background: hsl(24, 40%, 14%);
    border-color: hsl(24, 40%, 28%);
    color: #fdba74;
}

.app-dark .cmp-kpi--done .cmp-kpi-icon {
    background: #14532d;
    color: #86efac;
}
.app-dark .cmp-kpi--fail .cmp-kpi-icon {
    background: #450a0a;
    color: #fca5a5;
}
.app-dark .cmp-kpi--nodate .cmp-kpi-icon {
    background: #431407;
    color: #fdba74;
}

.app-dark .cumplido-badge--yes {
    background: #14532d;
    color: #86efac;
}
.app-dark .cumplido-badge--no {
    background: #450a0a;
    color: #fca5a5;
}

.app-dark .concl-cell--late .person-name,
.app-dark .concl-cell--late .person-sub {
    color: #fbbf24;
}

.app-dark .cmp-detail-table tbody tr.row-late {
    background: hsl(38, 40%, 13%);
}

.app-dark .cmp-detail-table tbody tr.row-late:hover {
    background: hsl(38, 40%, 18%);
}
</style>
