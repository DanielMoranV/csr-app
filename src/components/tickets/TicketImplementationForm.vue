<script setup>
import { useAuthStore } from '@/store/authStore';
import { useTicketsStore } from '@/store/ticketsStore';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    ticket: { type: Object, required: true }
});

const emit = defineEmits(['updated']);

const authStore = useAuthStore();
const ticketsStore = useTicketsStore();
const toast = useToast();

const isSaving = ref(false);
const implStart = ref(null);
const implEnd = ref(null);

// ─── Permisos ─────────────────────────────────────────────────────────────────

const currentUser = computed(() => authStore.getUser);

const isAssignee = computed(() => {
    if (!currentUser.value || !props.ticket) return false;
    return (
        props.ticket.assignee?.id === currentUser.value.id ||
        props.ticket.assignee_position === currentUser.value.position
    );
});

// ─── schedule_status config ───────────────────────────────────────────────────

const SCHEDULE_STATUS = {
    unplanned: { label: 'Sin planificar', severity: 'secondary', icon: 'pi pi-clock' },
    on_track:  { label: 'En plazo',       severity: 'success',   icon: 'pi pi-check-circle' },
    at_risk:   { label: 'En riesgo',      severity: 'warn',      icon: 'pi pi-exclamation-triangle' },
    delayed:   { label: 'Con desfase',    severity: 'danger',    icon: 'pi pi-times-circle' },
    overdue:   { label: 'Vencido',        severity: 'danger',    icon: 'pi pi-ban' }
};

const scheduleConfig = computed(() => {
    const key = props.ticket.schedule_status ?? 'unplanned';
    return SCHEDULE_STATUS[key] ?? { label: key, severity: 'secondary', icon: 'pi pi-info-circle' };
});

// ─── Estado del formulario ────────────────────────────────────────────────────

const hasDates = computed(() =>
    props.ticket.implementation_start && props.ticket.implementation_end
);

const dateRangeError = computed(() => {
    if (!implStart.value || !implEnd.value) return null;
    return new Date(implEnd.value) < new Date(implStart.value)
        ? 'La fecha de fin debe ser igual o posterior al inicio'
        : null;
});

const exceedsDueDate = computed(() => {
    if (!implEnd.value || !props.ticket.due_date) return false;
    return new Date(implEnd.value) > new Date(props.ticket.due_date);
});

const canSave = computed(() =>
    implStart.value && implEnd.value && !dateRangeError.value && !isSaving.value
);

// Inicializar con los valores actuales del ticket
watch(
    () => props.ticket,
    (ticket) => {
        implStart.value = ticket?.implementation_start ? new Date(ticket.implementation_start) : null;
        implEnd.value   = ticket?.implementation_end   ? new Date(ticket.implementation_end)   : null;
    },
    { immediate: true }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

const toYMD = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
};

// ─── Acción guardar ───────────────────────────────────────────────────────────

const save = async () => {
    if (!canSave.value) return;

    isSaving.value = true;
    try {
        const response = await ticketsStore.updateImplementation(props.ticket.id, {
            implementation_start: toYMD(implStart.value),
            implementation_end:   toYMD(implEnd.value)
        });

        const updated = response?.data?.data ?? response?.data;
        toast.add({
            severity: 'success',
            summary: 'Fechas actualizadas',
            detail: response?.data?.message ?? 'Fechas de implementación guardadas.',
            life: 3000
        });
        emit('updated', updated);
    } catch (error) {
        const status = error?.response?.status ?? error?.status;
        const msg    = error?.response?.data?.message ?? 'No se pudieron guardar las fechas';

        if (status === 403) {
            toast.add({ severity: 'error', summary: 'Sin permiso', detail: 'Solo el asignado puede definir las fechas de implementación.', life: 5000 });
        } else if (status === 422) {
            toast.add({ severity: 'warn', summary: 'Datos inválidos', detail: msg, life: 5000 });
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 });
        }
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <div class="impl-panel">
        <!-- Encabezado -->
        <div class="impl-header">
            <div class="flex items-center gap-2">
                <i class="pi pi-chart-gantt text-sm text-primary-500"></i>
                <span class="impl-title">Planificación de implementación</span>
            </div>
            <Tag
                :value="scheduleConfig.label"
                :severity="scheduleConfig.severity"
                class="text-xs"
            >
                <template #icon>
                    <i :class="scheduleConfig.icon" class="mr-1 text-xs"></i>
                </template>
            </Tag>
        </div>

        <!-- Vista de solo lectura (no assignee) -->
        <template v-if="!isAssignee">
            <div class="impl-readonly">
                <template v-if="hasDates">
                    <div class="impl-date-row">
                        <span class="impl-date-label">Inicio planificado:</span>
                        <span class="impl-date-value">{{ formatDate(ticket.implementation_start) }}</span>
                    </div>
                    <div class="impl-date-row">
                        <span class="impl-date-label">Fin planificado:</span>
                        <span class="impl-date-value">{{ formatDate(ticket.implementation_end) }}</span>
                    </div>
                </template>
                <span v-else class="text-xs text-color-secondary italic">
                    El asignado aún no ha definido las fechas de implementación.
                </span>
            </div>
        </template>

        <!-- Formulario de fechas (solo assignee) -->
        <template v-else>
            <div class="impl-form">
                <div class="impl-form-row">
                    <div class="impl-form-field">
                        <label class="impl-field-label">Inicio planificado</label>
                        <Calendar
                            v-model="implStart"
                            dateFormat="dd/mm/yy"
                            :showIcon="true"
                            placeholder="dd/mm/aaaa"
                            class="w-full"
                        />
                    </div>
                    <div class="impl-form-field">
                        <label class="impl-field-label">Fin planificado</label>
                        <Calendar
                            v-model="implEnd"
                            dateFormat="dd/mm/yy"
                            :showIcon="true"
                            :minDate="implStart ?? undefined"
                            placeholder="dd/mm/aaaa"
                            class="w-full"
                        />
                    </div>
                </div>

                <!-- Error de rango -->
                <small v-if="dateRangeError" class="p-error block mt-1">
                    <i class="pi pi-times-circle mr-1"></i>{{ dateRangeError }}
                </small>

                <!-- Aviso de desfase (no bloqueante) -->
                <div v-if="exceedsDueDate && !dateRangeError" class="impl-warning">
                    <i class="pi pi-exclamation-triangle text-orange-500"></i>
                    <span>
                        La fecha de fin supera el plazo exigido
                        <strong>({{ formatDate(ticket.due_date) }})</strong>.
                        El sistema lo registrará como <em>Con desfase</em> y notificará al solicitante.
                    </span>
                </div>

                <Button
                    label="Guardar fechas"
                    icon="pi pi-save"
                    size="small"
                    class="mt-3"
                    :loading="isSaving"
                    :disabled="!canSave"
                    @click="save"
                />
            </div>
        </template>
    </div>
</template>

<style scoped>
.impl-panel {
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    padding: 0.875rem 1rem;
    margin-top: 0.75rem;
}

.impl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.impl-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-color);
}

.impl-readonly {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.impl-date-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.83rem;
}

.impl-date-label {
    color: var(--text-color-secondary);
    min-width: 10rem;
}

.impl-date-value {
    font-weight: 500;
    color: var(--text-color);
}

.impl-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
}

@media (max-width: 480px) {
    .impl-form-row {
        grid-template-columns: 1fr;
    }
}

.impl-form-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.impl-field-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

.impl-warning {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: var(--orange-700);
    background: var(--orange-50);
    border: 1px solid var(--orange-200);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    margin-top: 0.5rem;
    line-height: 1.4;
}

/* Modo oscuro */
.app-dark .impl-panel {
    background: var(--surface-800);
    border-color: var(--surface-700);
}

.app-dark .impl-warning {
    background: hsl(30, 30%, 15%);
    border-color: hsl(30, 40%, 30%);
    color: var(--orange-300);
}
</style>
