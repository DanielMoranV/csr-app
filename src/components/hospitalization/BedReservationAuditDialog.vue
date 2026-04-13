<script setup>
import { bedReservations as bedReservationsApi } from '@/api/bedReservations';
import { AUDIT_ALLOWED_POSITIONS, FIELD_LABELS, getAuditEventConfig, getStatusConfig } from '@/constants/bedReservation';
import { usePermissions } from '@/composables/usePermissions';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    reservation: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:visible']);

const { hasAnyPosition } = usePermissions();

// Guard: si el usuario no tiene permiso este componente no debería renderizarse,
// pero lo verificamos también internamente.
const canViewAudit = computed(() => hasAnyPosition(AUDIT_ALLOWED_POSITIONS));

// Estado interno
const audits = ref([]);
const isLoading = ref(false);
const hasError = ref(false);
const expandedDiffs = ref(new Set());

// ─── Computed ─────────────────────────────────────────────────────────────────

const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

const reservationInfo = computed(() => {
    if (!props.reservation) return null;
    return {
        id: props.reservation.id,
        bedName: props.reservation.bed?.name ?? props.reservation.bed_name ?? '—',
        roomName: props.reservation.bed?.room?.name ?? '—',
        reservedBy: props.reservation.user?.name ?? '—',
        reservedByNick: props.reservation.user?.nick ?? null,
        currentStatus: props.reservation.status ?? '—'
    };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Quién realizó la acción (usuario sisclin, usuario del sistema, o automático).
 */
function getActor(audit) {
    if (audit.event === 'expired') return 'Sistema automático';
    if (audit.sisclin_nick) return `Sisclin: ${audit.sisclin_nick}`;
    if (audit.user) return `${audit.user.name}${audit.user.nick ? ` (${audit.user.nick})` : ''}`;
    return '—';
}

/**
 * Genera el array de diferencias campo→antes/después para mostrar en el diff.
 */
function getDiff(audit) {
    const { old_values, new_values, event } = audit;

    if (event === 'created') {
        return Object.entries(new_values ?? {})
            .filter(([key]) => FIELD_LABELS[key])
            .map(([key, val]) => ({
                campo: FIELD_LABELS[key],
                anterior: '—',
                nuevo: val ?? '—'
            }));
    }

    return Object.entries(new_values ?? {})
        .filter(([key]) => FIELD_LABELS[key])
        .map(([key, val]) => ({
            campo: FIELD_LABELS[key],
            anterior: old_values?.[key] ?? '—',
            nuevo: val ?? '—'
        }));
}

/**
 * Si la cama cambió, devuelve datos del cambio; de lo contrario null.
 */
function getBedChange(audit) {
    if (!audit.bed_before && !audit.bed_after) return null;
    if (audit.bed_before?.id === audit.bed_after?.id) return null;
    return {
        before: audit.bed_before?.name ?? '—',
        after: audit.bed_after?.name ?? '—'
    };
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function toggleDiff(auditId) {
    if (expandedDiffs.value.has(auditId)) {
        expandedDiffs.value.delete(auditId);
    } else {
        expandedDiffs.value.add(auditId);
    }
}

function isDiffExpanded(auditId) {
    return expandedDiffs.value.has(auditId);
}

// ─── Carga de datos ───────────────────────────────────────────────────────────

async function loadAudits() {
    if (!props.reservation?.id) return;
    isLoading.value = true;
    hasError.value = false;
    audits.value = [];
    expandedDiffs.value = new Set();

    try {
        const response = await bedReservationsApi.getAudits(props.reservation.id);
        // El interceptor de axios ya desenvuelve .data; la estructura es { data: [...], pagination: {...} }
        const payload = response?.data ?? response;
        audits.value = payload?.data ?? [];
    } catch {
        hasError.value = true;
    } finally {
        isLoading.value = false;
    }
}

watch(
    () => props.visible,
    (visible) => {
        if (visible && props.reservation?.id) {
            loadAudits();
        } else {
            audits.value = [];
            expandedDiffs.value = new Set();
            hasError.value = false;
        }
    }
);
</script>

<template>
    <Dialog
        v-model:visible="dialogVisible"
        :modal="true"
        :style="{ width: '680px', maxHeight: '90vh' }"
        :closable="true"
        :draggable="false"
        class="bed-audit-dialog"
    >
        <!-- Header personalizado -->
        <template #header>
            <div class="audit-dialog-header">
                <div class="audit-header-main">
                    <i class="pi pi-history audit-header-icon"></i>
                    <div>
                        <div class="audit-header-title">
                            Historial de Reserva
                            <span v-if="reservationInfo" class="audit-header-id">#{{ reservationInfo.id }}</span>
                        </div>
                        <div v-if="reservationInfo" class="audit-header-subtitle">
                            {{ reservationInfo.bedName }}
                            <span v-if="reservationInfo.roomName !== '—'"> · {{ reservationInfo.roomName }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="reservationInfo" class="audit-header-meta">
                    <div class="audit-meta-row">
                        <i class="pi pi-user text-xs"></i>
                        <span>{{ reservationInfo.reservedBy }}</span>
                        <span v-if="reservationInfo.reservedByNick" class="audit-nick">({{ reservationInfo.reservedByNick }})</span>
                    </div>
                    <div class="audit-meta-row">
                        <span class="audit-meta-label">Estado actual:</span>
                        <Tag
                            :value="getStatusConfig(reservationInfo.currentStatus).label"
                            :severity="getStatusConfig(reservationInfo.currentStatus).severity"
                            class="text-xs"
                        />
                    </div>
                </div>
            </div>
        </template>

        <!-- Cuerpo del diálogo -->
        <div class="audit-body">
            <!-- Permiso denegado -->
            <div v-if="!canViewAudit" class="audit-empty">
                <i class="pi pi-lock audit-empty-icon text-red-400"></i>
                <p>No tienes permisos para ver el historial de auditoría.</p>
            </div>

            <!-- Cargando -->
            <div v-else-if="isLoading" class="audit-loading">
                <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
                <p>Cargando historial...</p>
            </div>

            <!-- Error -->
            <div v-else-if="hasError" class="audit-empty">
                <i class="pi pi-exclamation-triangle audit-empty-icon text-orange-400"></i>
                <p class="mb-3">Ocurrió un error al cargar el historial.</p>
                <Button label="Reintentar" icon="pi pi-refresh" size="small" @click="loadAudits" />
            </div>

            <!-- Sin historial -->
            <div v-else-if="audits.length === 0" class="audit-empty">
                <i class="pi pi-inbox audit-empty-icon text-gray-300"></i>
                <p>Esta reserva no tiene historial registrado.</p>
            </div>

            <!-- Línea de tiempo -->
            <div v-else class="audit-timeline">
                <div
                    v-for="(audit, index) in audits"
                    :key="audit.id"
                    class="audit-entry"
                    :class="{ 'audit-entry--last': index === audits.length - 1 }"
                >
                    <!-- Indicador lateral de la línea de tiempo -->
                    <div class="audit-timeline-line">
                        <div
                            class="audit-dot"
                            :class="`audit-dot--${getAuditEventConfig(audit.event).severity}`"
                        >
                            <i :class="getAuditEventConfig(audit.event).icon" class="text-xs"></i>
                        </div>
                        <div v-if="index < audits.length - 1" class="audit-connector"></div>
                    </div>

                    <!-- Contenido del evento -->
                    <div class="audit-content">
                        <!-- Encabezado del evento -->
                        <div class="audit-event-header">
                            <div class="audit-event-left">
                                <Tag
                                    :value="getAuditEventConfig(audit.event).label"
                                    :severity="getAuditEventConfig(audit.event).severity"
                                    class="text-xs font-semibold"
                                />
                                <span v-if="audit.patient_name || audit.admission_number" class="audit-admission">
                                    <i class="pi pi-user text-xs"></i>
                                    <span v-if="audit.patient_name">{{ audit.patient_name }}</span>
                                    <span v-if="audit.patient_name && audit.admission_number" class="opacity-50 mx-1">·</span>
                                    <span v-if="audit.admission_number">
                                        <i class="pi pi-hashtag text-xs"></i>{{ audit.admission_number }}
                                    </span>
                                </span>
                            </div>
                            <span class="audit-date">{{ formatDate(audit.created_at) }}</span>
                        </div>

                        <!-- Actor -->
                        <div class="audit-actor">
                            <i class="pi pi-user text-xs text-500"></i>
                            <span>{{ getActor(audit) }}</span>
                        </div>

                        <!-- Cambio de cama (si aplica) -->
                        <div v-if="getBedChange(audit)" class="audit-bed-change">
                            <i class="pi pi-arrows-h text-xs text-orange-500"></i>
                            <span>Cama:</span>
                            <strong>{{ getBedChange(audit).before }}</strong>
                            <i class="pi pi-arrow-right text-xs"></i>
                            <strong>{{ getBedChange(audit).after }}</strong>
                        </div>

                        <!-- Toggle del diff -->
                        <div
                            v-if="getDiff(audit).length > 0"
                            class="audit-diff-toggle"
                            @click="toggleDiff(audit.id)"
                        >
                            <i :class="isDiffExpanded(audit.id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="text-xs"></i>
                            <span>{{ isDiffExpanded(audit.id) ? 'Ocultar cambios' : 'Ver cambios' }}</span>
                        </div>

                        <!-- Diff expandido -->
                        <Transition name="diff-expand">
                            <div v-if="isDiffExpanded(audit.id) && getDiff(audit).length > 0" class="audit-diff">
                                <div
                                    v-for="(change, i) in getDiff(audit)"
                                    :key="i"
                                    class="audit-diff-row"
                                >
                                    <span class="audit-diff-field">{{ change.campo }}</span>
                                    <span class="audit-diff-before">{{ change.anterior }}</span>
                                    <i class="pi pi-arrow-right text-xs text-500"></i>
                                    <span class="audit-diff-after">{{ change.nuevo }}</span>
                                </div>
                            </div>
                        </Transition>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Cerrar" icon="pi pi-times" severity="secondary" text @click="dialogVisible = false" />
        </template>
    </Dialog>
</template>

<style scoped>
/* ── Dialog header ── */
.audit-dialog-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

.audit-header-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.audit-header-icon {
    font-size: 1.5rem;
    color: var(--primary-500);
    background: var(--primary-50);
    padding: 0.5rem;
    border-radius: 8px;
    flex-shrink: 0;
}

.audit-header-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1.2;
}

.audit-header-id {
    font-weight: 400;
    color: var(--text-color-secondary);
    font-size: 0.95rem;
    margin-left: 0.25rem;
}

.audit-header-subtitle {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    margin-top: 0.1rem;
}

.audit-header-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface-50);
    border-radius: 6px;
    border: 1px solid var(--surface-200);
}

.audit-meta-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: var(--text-color-secondary);
}

.audit-meta-label {
    font-weight: 600;
}

.audit-nick {
    color: var(--text-color-secondary);
    opacity: 0.75;
    font-size: 0.8rem;
}

/* ── Body ── */
.audit-body {
    min-height: 160px;
    overflow-y: auto;
    max-height: calc(90vh - 220px);
    padding: 0.25rem 0;
}

/* ── Estados vacíos / carga ── */
.audit-loading,
.audit-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    gap: 0.75rem;
    color: var(--text-color-secondary);
    text-align: center;
}

.audit-empty-icon {
    font-size: 2.5rem;
    opacity: 0.5;
}

/* ── Timeline ── */
.audit-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.audit-entry {
    display: flex;
    gap: 0.75rem;
    position: relative;
}

.audit-timeline-line {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 2rem;
    padding-top: 0.2rem;
}

.audit-dot {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 2px solid transparent;
    color: white;
}

.audit-dot--info       { background: var(--blue-500); }
.audit-dot--success    { background: var(--green-500); }
.audit-dot--danger     { background: var(--red-500); }
.audit-dot--warn       { background: var(--orange-500); }
.audit-dot--secondary  { background: var(--surface-400); }

.audit-connector {
    width: 2px;
    flex: 1;
    min-height: 1rem;
    background: var(--surface-200);
    margin: 0.25rem 0;
}

/* ── Contenido de cada entrada ── */
.audit-content {
    flex: 1;
    padding: 0.5rem 0 1rem;
    border-bottom: 1px solid var(--surface-100);
    margin-bottom: 0.25rem;
}

.audit-entry--last .audit-content {
    border-bottom: none;
}

.audit-event-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
}

.audit-event-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.audit-admission {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
    gap: 0.2rem;
    background: var(--surface-100);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
}

.audit-date {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
}

.audit-actor {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    margin-bottom: 0.25rem;
}

.audit-bed-change {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    margin-bottom: 0.25rem;
}

/* ── Diff toggle ── */
.audit-diff-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--primary-600);
    cursor: pointer;
    user-select: none;
    margin-top: 0.2rem;
    transition: color 0.15s ease;
}

.audit-diff-toggle:hover {
    color: var(--primary-700);
    text-decoration: underline;
}

/* ── Diff expandido ── */
.audit-diff {
    margin-top: 0.5rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.audit-diff-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    flex-wrap: wrap;
}

.audit-diff-field {
    font-weight: 600;
    color: var(--text-color-secondary);
    min-width: 6rem;
}

.audit-diff-before {
    color: var(--red-600);
    background: var(--red-50);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.78rem;
}

.audit-diff-after {
    color: var(--green-700);
    background: var(--green-50);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.78rem;
}

/* ── Transición expand/collapse ── */
.diff-expand-enter-active,
.diff-expand-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
}

.diff-expand-enter-from,
.diff-expand-leave-to {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
}

.diff-expand-enter-to,
.diff-expand-leave-from {
    opacity: 1;
    max-height: 300px;
}

/* ── Modo oscuro ── */
.app-dark .audit-header-icon {
    background: hsl(220, 30%, 20%);
}

.app-dark .audit-header-meta {
    background: var(--surface-800);
    border-color: var(--surface-700);
}

.app-dark .audit-diff {
    background: var(--surface-800);
    border-color: var(--surface-700);
}

.app-dark .audit-diff-before {
    background: hsl(0, 30%, 18%);
    color: var(--red-300);
}

.app-dark .audit-diff-after {
    background: hsl(140, 30%, 15%);
    color: var(--green-300);
}

.app-dark .audit-admission {
    background: var(--surface-700);
}

.app-dark .audit-connector {
    background: var(--surface-600);
}

.app-dark .audit-content {
    border-bottom-color: var(--surface-700);
}
</style>
