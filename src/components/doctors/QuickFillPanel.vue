<script setup>
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Chip from 'primevue/chip';
import { computed } from 'vue';

const props = defineProps({
    config: {
        type: Object,
        required: true
    },
    selectedDays: {
        type: Array,
        default: () => []
    },
    medicalShifts: {
        type: Array,
        default: () => []
    },
    conflicts: {
        type: Array,
        default: () => []
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:config', 'remove-day', 'clear-all', 'send-batch']);

const categoryOptions = [
    { label: 'Emergencia', value: 'emergency' },
    { label: 'Ambulatorio', value: 'ambulatory' },
    { label: 'Hospitalario', value: 'hospitable' }
];

const statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Confirmado', value: 'confirmed' }
];

const shiftOptions = computed(() => {
    return props.medicalShifts.map((shift) => ({
        label: `${shift.description} (${shift.start_time?.substring(0, 5)} - ${shift.end_time?.substring(0, 5)})`,
        value: shift.id
    }));
});

const updateConfig = (field, value) => {
    emit('update:config', { ...props.config, [field]: value });
};

const hasConflicts = computed(() => {
    return props.conflicts.length > 0;
});

const conflictDays = computed(() => {
    return props.selectedDays.filter(day => 
        props.conflicts.some(conflict => conflict.date === day.date)
    );
});

const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
    });
};
</script>

<template>
    <div class="quick-fill-panel">
        <div class="panel-header">
            <div class="header-icon">
                <i class="pi pi-bolt"></i>
            </div>
            <div class="header-content">
                <h3 class="panel-title">Llenado Rápido de Horarios</h3>
                <p class="panel-subtitle">Configure los datos predeterminados y seleccione días en el calendario</p>
            </div>
        </div>

        <!-- Configuration Section -->
        <div class="config-section">
            <div class="config-grid">
                <!-- Shift Selector -->
                <div class="field">
                    <label for="quick-shift" class="field-label">
                        <i class="pi pi-clock mr-2"></i>
                        Turno
                    </label>
                    <Select
                        id="quick-shift"
                        :modelValue="config.shiftId"
                        @update:modelValue="updateConfig('shiftId', $event)"
                        :options="shiftOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar turno"
                        class="w-full"
                        :disabled="disabled"
                    />
                </div>

                <!-- Category Selector -->
                <div class="field">
                    <label for="quick-category" class="field-label">
                        <i class="pi pi-tag mr-2"></i>
                        Categoría
                    </label>
                    <Select
                        id="quick-category"
                        :modelValue="config.category"
                        @update:modelValue="updateConfig('category', $event)"
                        :options="categoryOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar categoría"
                        class="w-full"
                        :disabled="disabled"
                    />
                </div>

                <!-- Status Selector -->
                <div class="field">
                    <label for="quick-status" class="field-label">
                        <i class="pi pi-info-circle mr-2"></i>
                        Estado
                    </label>
                    <Select
                        id="quick-status"
                        :modelValue="config.status"
                        @update:modelValue="updateConfig('status', $event)"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccionar estado"
                        class="w-full"
                        :disabled="disabled"
                    />
                </div>

                <!-- Payment Payroll Checkbox -->
                <div class="field checkbox-field">
                    <div class="flex items-center gap-2">
                        <Checkbox
                            :modelValue="config.isPaymentPayroll"
                            @update:modelValue="updateConfig('isPaymentPayroll', $event)"
                            inputId="quick-payroll"
                            binary
                            :disabled="disabled"
                        />
                        <label for="quick-payroll" class="field-label mb-0 cursor-pointer">
                            <i class="pi pi-wallet mr-2"></i>
                            Incluir en planilla
                        </label>
                    </div>
                </div>
            </div>

            <!-- Notes -->
            <div class="field mt-3">
                <label for="quick-notes" class="field-label">
                    <i class="pi pi-file-edit mr-2"></i>
                    Notas (opcional)
                </label>
                <Textarea
                    id="quick-notes"
                    :modelValue="config.notes"
                    @update:modelValue="updateConfig('notes', $event)"
                    rows="2"
                    placeholder="Notas que se aplicarán a todos los horarios..."
                    class="w-full"
                    :disabled="disabled"
                />
            </div>
        </div>

        <!-- Selected Days Section -->
        <div v-if="selectedDays.length > 0" class="selected-days-section">
            <div class="section-header">
                <h4 class="section-title">
                    <i class="pi pi-calendar-plus mr-2"></i>
                    Días Seleccionados
                    <span class="days-count">{{ selectedDays.length }}</span>
                </h4>
                <Button
                    label="Limpiar Todo"
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    size="small"
                    @click="emit('clear-all')"
                    :disabled="disabled"
                />
            </div>

            <!-- Conflict Warning -->
            <div v-if="hasConflicts" class="conflict-warning">
                <i class="pi pi-exclamation-triangle"></i>
                <span>
                    {{ conflictDays.length }} día(s) con posibles conflictos de horario
                </span>
            </div>

            <!-- Days List -->
            <div class="days-list">
                <Chip
                    v-for="day in selectedDays"
                    :key="day.date"
                    :label="`${formatDate(day.date)}${day.doctorName ? ' - ' + day.doctorName : ''}${day.shiftDisplay ? ' (' + day.shiftDisplay + ')' : ''}`"
                    :class="{ 'conflict-chip': day.hasConflict }"
                    removable
                    @remove="emit('remove-day', day.date)"
                >
                    <template #icon>
                        <i v-if="day.hasConflict" class="pi pi-exclamation-circle text-orange-500"></i>
                        <i v-else class="pi pi-calendar"></i>
                    </template>
                </Chip>
            </div>

            <!-- Send Button -->
            <div class="send-section">
                <Button
                    label="Enviar Horarios"
                    icon="pi pi-send"
                    class="send-button"
                    @click="emit('send-batch')"
                    :disabled="disabled || selectedDays.length === 0"
                    :loading="disabled"
                />
                <p class="send-hint">
                    Se crearán {{ selectedDays.length }} horario(s) con la configuración seleccionada
                </p>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
            <i class="pi pi-calendar-plus empty-icon"></i>
            <p class="empty-text">Haga click en los días del calendario para agregarlos a la cola</p>
        </div>
    </div>
</template>

<style scoped>
/* ============================================================================
   ANIMATIONS
   ============================================================================ */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

/* ============================================================================
   MAIN PANEL
   ============================================================================ */
.quick-fill-panel {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 2px solid #0ea5e9;
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
    animation: slideIn 0.3s ease;
}

:global(.dark) .quick-fill-panel {
    background: linear-gradient(135deg, #0c4a6e 0%, #075985 100%);
    border-color: #38bdf8;
}

/* ============================================================================
   PANEL HEADER
   ============================================================================ */
.panel-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(14, 165, 233, 0.2);
}

.header-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.header-icon i {
    font-size: 1.5rem;
    color: white;
}

:global(.dark) .header-icon {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
}

.header-content {
    flex: 1;
}

.panel-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #0369a1;
    margin: 0 0 0.25rem 0;
}

:global(.dark) .panel-title {
    color: #7dd3fc;
}

.panel-subtitle {
    font-size: 0.875rem;
    color: #0c4a6e;
    margin: 0;
}

:global(.dark) .panel-subtitle {
    color: #bae6fd;
}

/* ============================================================================
   CONFIGURATION SECTION
   ============================================================================ */
.config-section {
    margin-bottom: 1.5rem;
}

.config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.checkbox-field {
    justify-content: center;
}

.field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #0369a1;
    display: flex;
    align-items: center;
}

:global(.dark) .field-label {
    color: #7dd3fc;
}

/* ============================================================================
   SELECTED DAYS SECTION
   ============================================================================ */
.selected-days-section {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:global(.dark) .selected-days-section {
    background: rgba(15, 23, 42, 0.5);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.section-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
    display: flex;
    align-items: center;
}

.days-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #0ea5e9;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    margin-left: 0.5rem;
    min-width: 24px;
}

/* ============================================================================
   CONFLICT WARNING
   ============================================================================ */
.conflict-warning {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    color: #92400e;
    font-size: 0.875rem;
    font-weight: 500;
}

.conflict-warning i {
    color: #f59e0b;
    font-size: 1.125rem;
}

:global(.dark) .conflict-warning {
    background: rgba(251, 191, 36, 0.1);
    border-color: #fbbf24;
    color: #fcd34d;
}

/* ============================================================================
   DAYS LIST
   ============================================================================ */
.days-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.days-list :deep(.p-chip) {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #7dd3fc;
    font-weight: 500;
    transition: all 0.2s ease;
}

.days-list :deep(.p-chip:hover) {
    background: #bae6fd;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
}

.days-list :deep(.conflict-chip) {
    background: #fed7aa;
    color: #9a3412;
    border-color: #fb923c;
}

:global(.dark) .days-list :deep(.p-chip) {
    background: rgba(14, 165, 233, 0.2);
    color: #7dd3fc;
    border-color: #0ea5e9;
}

:global(.dark) .days-list :deep(.conflict-chip) {
    background: rgba(251, 146, 60, 0.2);
    color: #fdba74;
    border-color: #fb923c;
}

/* ============================================================================
   SEND SECTION
   ============================================================================ */
.send-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
}

.send-button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600 !important;
    padding: 0.75rem 2rem !important;
    font-size: 1rem !important;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
    transition: all 0.3s ease !important;
}

.send-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4) !important;
}

.send-hint {
    font-size: 0.813rem;
    color: var(--text-color-secondary);
    margin: 0;
    text-align: center;
}

/* ============================================================================
   EMPTY STATE
   ============================================================================ */
.empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-color-secondary);
}

.empty-icon {
    font-size: 3rem;
    color: #0ea5e9;
    opacity: 0.3;
    margin-bottom: 1rem;
}

.empty-text {
    font-size: 0.875rem;
    margin: 0;
}

/* ============================================================================
   RESPONSIVE
   ============================================================================ */
@media (max-width: 768px) {
    .config-grid {
        grid-template-columns: 1fr;
    }

    .panel-header {
        flex-direction: column;
        text-align: center;
    }

    .section-header {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
    }
}
</style>
