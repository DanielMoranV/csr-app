<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Chip from 'primevue/chip';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
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
    doctorColorMap: {
        type: Object,
        default: () => ({})
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
    const newConfig = { ...props.config, [field]: value };

    // Logic to clear incompatible fields
    if (field === 'isCustom') {
        if (value) {
            newConfig.shiftIds = [];
        } else {
            newConfig.startTime = '';
            newConfig.endTime = '';
        }
    } else if (field === 'shiftIds' && value && value.length > 0) {
        newConfig.isCustom = false;
        newConfig.startTime = '';
        newConfig.endTime = '';
    }

    emit('update:config', newConfig);
};

const hasConflicts = computed(() => {
    return props.conflicts.length > 0;
});

const conflictDays = computed(() => {
    return props.selectedDays.filter((day) => props.conflicts.some((conflict) => conflict.date === day.date));
});

const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
};

const truncateDoctorName = (name, maxLength = 15) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
};

const getDoctorColorClass = (doctorId) => {
    const colorIndex = props.doctorColorMap[doctorId] || 0;
    return `doctor-color-${colorIndex}`;
};

// Extract plain text from HTML shift display (remove span tags)
const getPlainShiftDisplay = (shiftDisplay) => {
    if (!shiftDisplay) return '';
    // Remove HTML tags to get just the text content
    const div = document.createElement('div');
    div.innerHTML = shiftDisplay;
    return div.textContent || div.innerText || '';
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
                <!-- Shift Selector or Custom Time -->
                <div class="field">
                    <label class="field-label mb-2">
                        <i class="pi pi-clock mr-2"></i>
                        Horario
                    </label>

                    <div class="flex items-center gap-2 mb-2">
                        <Checkbox :modelValue="config.isCustom" @update:modelValue="updateConfig('isCustom', $event)" inputId="use-custom-time" binary :disabled="disabled" />
                        <label for="use-custom-time" class="cursor-pointer text-sm">Usar horario personalizado</label>
                    </div>

                    <div v-if="!config.isCustom">
                        <MultiSelect
                            id="quick-shift"
                            :modelValue="config.shiftIds"
                            @update:modelValue="updateConfig('shiftIds', $event)"
                            :options="shiftOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Seleccionar turnos"
                            class="w-full"
                            :disabled="disabled"
                            display="chip"
                        />
                    </div>

                    <div v-else class="grid grid-cols-2 gap-2">
                        <div>
                            <label for="start-time" class="text-xs mb-1 block">Inicio</label>
                            <InputText id="start-time" type="time" :modelValue="config.startTime" @update:modelValue="updateConfig('startTime', $event)" class="w-full" :disabled="disabled" />
                        </div>
                        <div>
                            <label for="end-time" class="text-xs mb-1 block">Fin</label>
                            <InputText id="end-time" type="time" :modelValue="config.endTime" @update:modelValue="updateConfig('endTime', $event)" class="w-full" :disabled="disabled" />
                        </div>
                    </div>
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
                        <Checkbox :modelValue="config.isPaymentPayroll" @update:modelValue="updateConfig('isPaymentPayroll', $event)" inputId="quick-payroll" binary :disabled="disabled" />
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
                <Textarea id="quick-notes" :modelValue="config.notes" @update:modelValue="updateConfig('notes', $event)" rows="2" placeholder="Notas que se aplicarán a todos los horarios..." class="w-full" :disabled="disabled" />
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
                <Button label="Limpiar Todo" icon="pi pi-times" severity="secondary" text size="small" @click="emit('clear-all')" :disabled="disabled" />
            </div>

            <!-- Conflict Warning -->
            <div v-if="hasConflicts" class="conflict-warning">
                <i class="pi pi-exclamation-triangle"></i>
                <span> {{ conflictDays.length }} día(s) con posibles conflictos de horario </span>
            </div>

            <!-- Days List -->
            <div class="days-list">
                <Chip v-for="day in selectedDays" :key="day.date" :class="['day-chip', { 'conflict-chip': day.hasConflict }, day.doctorId ? getDoctorColorClass(day.doctorId) : '']" removable @remove="emit('remove-day', day.date)">
                    <template #icon>
                        <i v-if="day.hasConflict" class="pi pi-exclamation-circle"></i>
                        <i v-else class="pi pi-calendar"></i>
                    </template>
                    <span class="chip-content">
                        <span class="chip-date">{{ formatDate(day.date) }}</span>
                        <span v-if="day.doctorName" class="chip-doctor" :title="day.doctorName">
                            {{ truncateDoctorName(day.doctorName, 12) }}
                        </span>
                        <span v-if="day.shiftDisplay" class="chip-shift">
                            {{ getPlainShiftDisplay(day.shiftDisplay) }}
                        </span>
                    </span>
                </Chip>
            </div>

            <!-- Send Button -->
            <div class="send-section">
                <Button label="Enviar Horarios" icon="pi pi-send" class="send-button" @click="emit('send-batch')" :disabled="disabled || selectedDays.length === 0" :loading="disabled" />
                <p class="send-hint">Se crearán {{ selectedDays.length }} horario(s) con la configuración seleccionada</p>
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
    0%,
    100% {
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
    font-size: 0.75rem;
    padding: 0.35rem 0.65rem;
    font-weight: 500;
    transition: all 0.2s ease;
}

.days-list :deep(.p-chip:hover) {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.chip-content {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
}

.chip-date {
    font-weight: 600;
}

.chip-doctor {
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.1);
}

.chip-shift {
    font-weight: 500;
    opacity: 0.9;
}

/* Doctor Color Classes */
.days-list :deep(.doctor-color-0) {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border: 1.5px solid #3b82f6;
    color: #1e3a8a;
}

.days-list :deep(.doctor-color-0 .chip-doctor) {
    color: #1e40af;
    background: rgba(59, 130, 246, 0.15);
}

.days-list :deep(.doctor-color-1) {
    background: linear-gradient(135deg, #fae8ff 0%, #f0abfc 100%);
    border: 1.5px solid #d946ef;
    color: #701a75;
}

.days-list :deep(.doctor-color-1 .chip-doctor) {
    color: #86198f;
    background: rgba(217, 70, 239, 0.15);
}

.days-list :deep(.doctor-color-2) {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border: 1.5px solid #10b981;
    color: #065f46;
}

.days-list :deep(.doctor-color-2 .chip-doctor) {
    color: #047857;
    background: rgba(16, 185, 129, 0.15);
}

.days-list :deep(.doctor-color-3) {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    border: 1.5px solid #f97316;
    color: #7c2d12;
}

.days-list :deep(.doctor-color-3 .chip-doctor) {
    color: #9a3412;
    background: rgba(249, 115, 22, 0.15);
}

.days-list :deep(.doctor-color-4) {
    background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
    border: 1.5px solid #f43f5e;
    color: #881337;
}

.days-list :deep(.doctor-color-4 .chip-doctor) {
    color: #9f1239;
    background: rgba(244, 63, 94, 0.15);
}

.days-list :deep(.doctor-color-5) {
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    border: 1.5px solid #a855f7;
    color: #581c87;
}

.days-list :deep(.doctor-color-5 .chip-doctor) {
    color: #6b21a8;
    background: rgba(168, 85, 247, 0.15);
}

/* Conflict Chip Override */
.days-list :deep(.conflict-chip) {
    background: #fed7aa !important;
    color: #9a3412 !important;
    border-color: #fb923c !important;
}

/* Dark Mode */
:global(.dark) .days-list :deep(.doctor-color-0) {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
    border-color: #60a5fa;
    color: #93c5fd;
}

:global(.dark) .days-list :deep(.doctor-color-0 .chip-doctor) {
    color: #93c5fd;
    background: rgba(59, 130, 246, 0.25);
}

:global(.dark) .days-list :deep(.doctor-color-1) {
    background: linear-gradient(135deg, rgba(217, 70, 239, 0.2) 0%, rgba(217, 70, 239, 0.3) 100%);
    border-color: #e879f9;
    color: #f0abfc;
}

:global(.dark) .days-list :deep(.doctor-color-1 .chip-doctor) {
    color: #f0abfc;
    background: rgba(217, 70, 239, 0.25);
}

:global(.dark) .days-list :deep(.doctor-color-2) {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.3) 100%);
    border-color: #34d399;
    color: #6ee7b7;
}

:global(.dark) .days-list :deep(.doctor-color-2 .chip-doctor) {
    color: #6ee7b7;
    background: rgba(16, 185, 129, 0.25);
}

:global(.dark) .days-list :deep(.doctor-color-3) {
    background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.3) 100%);
    border-color: #fb923c;
    color: #fdba74;
}

:global(.dark) .days-list :deep(.doctor-color-3 .chip-doctor) {
    color: #fdba74;
    background: rgba(249, 115, 22, 0.25);
}

:global(.dark) .days-list :deep(.doctor-color-4) {
    background: linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0.3) 100%);
    border-color: #fb7185;
    color: #fda4af;
}

:global(.dark) .days-list :deep(.doctor-color-4 .chip-doctor) {
    color: #fda4af;
    background: rgba(244, 63, 94, 0.25);
}

:global(.dark) .days-list :deep(.doctor-color-5) {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.3) 100%);
    border-color: #c084fc;
    color: #d8b4fe;
}

:global(.dark) .days-list :deep(.doctor-color-5 .chip-doctor) {
    color: #d8b4fe;
    background: rgba(168, 85, 247, 0.25);
}

:global(.dark) .days-list :deep(.conflict-chip) {
    background: rgba(251, 146, 60, 0.2) !important;
    color: #fdba74 !important;
    border-color: #fb923c !important;
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
