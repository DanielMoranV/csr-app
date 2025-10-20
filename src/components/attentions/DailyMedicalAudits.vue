<script setup>
import { useDailyMedicalAudits } from '@/composables/useDailyMedicalAudits';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, defineEmits, defineProps, onMounted, ref, watch } from 'vue';

const props = defineProps({
    attentionId: {
        type: Number,
        required: true
    },
    audits: {
        type: Array,
        default: () => []
    },
    readOnly: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['audit-created', 'audit-updated', 'audit-deleted', 'audit-marked']);

const confirm = useConfirm();
const toast = useToast();

const { getAuditSeverity, getComplianceScoreSeverity, formatAuditDate, formatAuditDateTime, getTodayDate } = useDailyMedicalAudits();

const localAudits = ref([]);
const isDialogVisible = ref(false);
const isEditing = ref(false);
const isLoading = ref(false);
const selectedAudit = ref(null);

const formData = ref({
    id_attentions: props.attentionId,
    audit_date: getTodayDate(),
    observations: '',
    compliance_score: null,
    requires_attention: false
});

// Helper para parsear fechas locales
const parseLocalDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(dateString);
    const [, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

// Computed
const sortedAudits = computed(() => {
    return [...localAudits.value].sort((a, b) => {
        const dateA = parseLocalDate(a.audit_date);
        const dateB = parseLocalDate(b.audit_date);
        return dateB - dateA;
    });
});

const pendingAudits = computed(() => {
    return sortedAudits.value.filter((a) => !a.is_audited);
});

const auditedCount = computed(() => {
    return sortedAudits.value.filter((a) => a.is_audited).length;
});

const requiresAttentionCount = computed(() => {
    return sortedAudits.value.filter((a) => a.requires_attention).length;
});

// Lifecycle
onMounted(() => {
    localAudits.value = props.audits || [];
});

// Watchers
watch(
    () => props.audits,
    (newAudits) => {
        localAudits.value = newAudits || [];
    },
    { deep: true }
);

const updateLocalAudits = () => {
    localAudits.value = props.audits || [];
};

// Methods
const openCreateDialog = () => {
    isEditing.value = false;
    selectedAudit.value = null;
    formData.value = {
        id_attentions: props.attentionId,
        audit_date: getTodayDate(),
        observations: '',
        compliance_score: null,
        requires_attention: false
    };
    isDialogVisible.value = true;
};

const openEditDialog = (audit) => {
    isEditing.value = true;
    selectedAudit.value = audit;
    formData.value = {
        id: audit.id,
        id_attentions: audit.id_attentions,
        audit_date: audit.audit_date,
        observations: audit.observations || '',
        compliance_score: audit.compliance_score,
        requires_attention: audit.requires_attention || false
    };
    isDialogVisible.value = true;
};

const closeDialog = () => {
    isDialogVisible.value = false;
    selectedAudit.value = null;
    formData.value = {
        id_attentions: props.attentionId,
        audit_date: getTodayDate(),
        observations: '',
        compliance_score: null,
        requires_attention: false
    };
};

const handleSave = async () => {
    try {
        isLoading.value = true;

        // Normalizar la fecha del formulario a formato YYYY-MM-DD
        const normalizeDate = (date) => {
            if (!date) return null;
            if (typeof date === 'string') return date;
            // Si es un objeto Date, convertir a YYYY-MM-DD en hora local
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const normalizedFormDate = normalizeDate(formData.value.audit_date);

        // Verificar si ya existe una auditoría para esta fecha (solo al crear)
        if (!isEditing.value) {
            const existingAudit = localAudits.value.find((a) => normalizeDate(a.audit_date) === normalizedFormDate);

            if (existingAudit) {
                toast.add({
                    severity: 'warn',
                    summary: 'Auditoría Duplicada',
                    detail: `Ya existe una auditoría para la fecha ${formatAuditDate(normalizedFormDate)}. Puedes editarla en lugar de crear una nueva.`,
                    life: 5000
                });
                isLoading.value = false;
                return;
            }
        }

        // Asegurar que la fecha se envíe en formato correcto al backend
        formData.value.audit_date = normalizedFormDate;

        if (isEditing.value && selectedAudit.value) {
            await emit('audit-updated', formData.value.id, formData.value);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Auditoría actualizada correctamente',
                life: 3000
            });
        } else {
            await emit('audit-created', formData.value);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Auditoría creada correctamente',
                life: 3000
            });
        }

        closeDialog();
        updateLocalAudits();
    } catch (error) {
        console.error('Error en handleSave:', error);

        // Mostrar mensaje específico del backend si está disponible
        let errorMessage = 'Error al guardar la auditoría';

        if (error?.errors?.id_attentions) {
            // Error de validación del backend
            errorMessage = error.errors.id_attentions[0] || errorMessage;
        } else if (error?.message) {
            errorMessage = error.message;
        }

        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
        });
    } finally {
        isLoading.value = false;
    }
};

const handleMarkAsAudited = async (audit) => {
    try {
        await emit('audit-marked', audit.id);
        toast.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Auditoría marcada como auditada',
            life: 3000
        });
        updateLocalAudits();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al marcar auditoría',
            life: 3000
        });
    }
};

const handleDelete = (audit) => {
    confirm.require({
        message: '¿Está seguro de que desea eliminar esta auditoría médica?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Eliminar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await emit('audit-deleted', audit.id);
                toast.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Auditoría eliminada correctamente',
                    life: 3000
                });
                updateLocalAudits();
            } catch (error) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al eliminar la auditoría',
                    life: 3000
                });
            }
        }
    });
};

const isFormValid = computed(() => {
    return formData.value.audit_date && formData.value.id_attentions;
});

// Estado para cards expandidas
const expandedCards = ref(new Set());

const toggleCard = (auditId) => {
    if (expandedCards.value.has(auditId)) {
        expandedCards.value.delete(auditId);
    } else {
        expandedCards.value.add(auditId);
    }
};
</script>

<template>
    <div class="daily-medical-audits">
        <!-- Header -->
        <div class="audits-header">
            <div class="header-info">
                <h3 class="header-title">
                    <i class="pi pi-check-square"></i>
                    Auditorías Médicas Diarias
                </h3>
                <div class="header-stats">
                    <Tag :value="`${auditedCount} auditadas`" severity="success" size="small" />
                    <Tag v-if="pendingAudits.length > 0" :value="`${pendingAudits.length} pendientes`" severity="warning" size="small" />
                    <Tag v-if="requiresAttentionCount > 0" :value="`${requiresAttentionCount} requieren atención`" severity="danger" size="small" />
                </div>
            </div>
            <Button v-if="!readOnly" label="Nueva Auditoría" icon="pi pi-plus" size="small" @click="openCreateDialog" />
        </div>

        <!-- Empty State -->
        <div v-if="sortedAudits.length === 0" class="empty-audits">
            <i class="pi pi-check-square"></i>
            <span>No hay auditorías médicas registradas</span>
            <Button v-if="!readOnly" label="Crear Auditoría" icon="pi pi-plus" size="small" severity="secondary" outlined @click="openCreateDialog" />
        </div>

        <!-- Audits Grid -->
        <div v-else class="audits-grid">
            <div v-for="audit in sortedAudits" :key="audit.id" class="audit-card-compact" :class="{ expanded: expandedCards.has(audit.id) }">
                <!-- Card Header - Siempre visible -->
                <div class="card-header" @click="toggleCard(audit.id)">
                    <div class="header-left">
                        <div class="date-info">
                            <i class="pi pi-calendar"></i>
                            <span class="date-text">{{ formatAuditDate(audit.audit_date) }}</span>
                        </div>
                        <div class="status-badges">
                            <Tag :value="audit.is_audited ? 'Auditada' : 'Pendiente'" :severity="audit.is_audited ? 'success' : 'warning'" class="badge-sm" />
                            <Tag v-if="audit.requires_attention" icon="pi pi-exclamation-triangle" severity="danger" class="badge-sm" />
                        </div>
                    </div>
                    <div class="header-right">
                        <!-- Score Badge -->
                        <div v-if="audit.compliance_score !== null && audit.compliance_score !== undefined" class="score-badge" :class="`score-badge--${getComplianceScoreSeverity(audit.compliance_score)}`">
                            <span class="score-number">{{ audit.compliance_score }}</span>
                            <i
                                class="pi score-icon"
                                :class="{
                                    'pi-check-circle': audit.compliance_score >= 90,
                                    'pi-info-circle': audit.compliance_score >= 70 && audit.compliance_score < 90,
                                    'pi-exclamation-circle': audit.compliance_score >= 50 && audit.compliance_score < 70,
                                    'pi-times-circle': audit.compliance_score < 50
                                }"
                            ></i>
                        </div>
                        <i class="pi toggle-icon" :class="expandedCards.has(audit.id) ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
                    </div>
                </div>

                <!-- Card Body - Expandible -->
                <Transition name="expand">
                    <div v-if="expandedCards.has(audit.id)" class="card-body">
                        <!-- Progress bar si hay puntaje -->
                        <div v-if="audit.compliance_score !== null && audit.compliance_score !== undefined" class="body-section">
                            <ProgressBar :value="audit.compliance_score" :severity="getComplianceScoreSeverity(audit.compliance_score)" :showValue="false" class="compact-progress" />
                        </div>

                        <!-- Observaciones -->
                        <div v-if="audit.observations" class="body-section">
                            <div class="section-label">
                                <i class="pi pi-file-edit"></i>
                                <span>Observaciones</span>
                            </div>
                            <p class="observation-text">{{ audit.observations }}</p>
                        </div>

                        <!-- Info del auditor -->
                        <div v-if="audit.is_audited && audit.auditor" class="body-section">
                            <div class="auditor-info">
                                <div class="info-item">
                                    <i class="pi pi-user"></i>
                                    <span>{{ audit.auditor.name }}</span>
                                </div>
                                <div class="info-item">
                                    <i class="pi pi-clock"></i>
                                    <span>{{ formatAuditDateTime(audit.audited_at) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Acciones -->
                        <div v-if="!readOnly" class="body-section actions-section">
                            <Button v-if="!audit.is_audited" label="Marcar Auditada" icon="pi pi-check" severity="success" size="small" text @click="handleMarkAsAudited(audit)" />
                            <Button label="Editar" icon="pi pi-pencil" severity="info" size="small" text @click="openEditDialog(audit)" />
                            <Button label="Eliminar" icon="pi pi-trash" severity="danger" size="small" text @click="handleDelete(audit)" />
                        </div>
                    </div>
                </Transition>
            </div>
        </div>

        <!-- Dialog for Create/Edit -->
        <Dialog v-model:visible="isDialogVisible" :header="isEditing ? 'Editar Auditoría' : 'Nueva Auditoría'" modal :style="{ width: '32rem' }" :closable="true">
            <div class="audit-form">
                <!-- Audit Date -->
                <div class="field">
                    <label for="audit_date" class="field-label">
                        <i class="pi pi-calendar"></i>
                        Fecha de Auditoría *
                    </label>
                    <Calendar id="audit_date" v-model="formData.audit_date" dateFormat="yy-mm-dd" :showIcon="true" class="w-full" :disabled="isEditing" />
                </div>

                <!-- Compliance Score -->
                <div class="field">
                    <label for="compliance_score" class="field-label">
                        <i class="pi pi-chart-bar"></i>
                        Puntaje de Cumplimiento (0-100)
                    </label>
                    <InputNumber id="compliance_score" v-model="formData.compliance_score" mode="decimal" :min="0" :max="100" suffix=" pts" show-buttons class="w-full" placeholder="0-100" />
                </div>

                <!-- Observations -->
                <div class="field">
                    <label for="observations" class="field-label">
                        <i class="pi pi-file-edit"></i>
                        Observaciones
                    </label>
                    <Textarea id="observations" v-model="formData.observations" placeholder="Observaciones sobre la auditoría..." rows="4" auto-resize class="w-full" />
                </div>

                <!-- Requires Attention -->
                <div class="field">
                    <div class="flex align-items-center">
                        <Checkbox id="requires_attention" v-model="formData.requires_attention" :binary="true" />
                        <label for="requires_attention" class="ml-2 cursor-pointer">
                            <i class="pi pi-exclamation-triangle text-orange-500"></i>
                            Requiere atención especial
                        </label>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancelar" severity="secondary" outlined @click="closeDialog" :disabled="isLoading" />
                <Button :label="isEditing ? 'Actualizar' : 'Crear'" icon="pi pi-check" @click="handleSave" :disabled="!isFormValid || isLoading" :loading="isLoading" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.daily-medical-audits {
    padding: 1rem;
    background: var(--surface-card);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

/* Header */
.audits-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--surface-border);
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
}

.header-title i {
    color: var(--primary-color);
}

.header-stats {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

/* Empty State */
.empty-audits {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem 1rem;
    text-align: center;
    color: var(--text-color-secondary);
}

.empty-audits i {
    font-size: 2.5rem;
    color: var(--surface-400);
}

/* Audits Grid */
.audits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 0.75rem;
    max-height: 550px;
    overflow-y: auto;
    padding: 0.25rem;
}

/* Compact Audit Card */
.audit-card-compact {
    background: var(--surface-50);
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
}

.audit-card-compact:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.audit-card-compact.expanded {
    border-color: var(--primary-color);
}

/* Card Header */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    cursor: pointer;
    user-select: none;
    background: var(--surface-card);
}

.card-header:hover {
    background: var(--surface-hover);
}

.header-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.date-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-info i {
    color: var(--primary-color);
    font-size: 0.9rem;
}

.date-text {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
}

.status-badges {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
}

.badge-sm {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: 0.75rem;
}

/* Score Badge */
.score-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border-radius: 6px;
    font-weight: 700;
}

.score-badge--success {
    background: rgba(34, 197, 94, 0.1);
    color: var(--green-600);
}

.score-badge--info {
    background: rgba(59, 130, 246, 0.1);
    color: var(--blue-600);
}

.score-badge--warning {
    background: rgba(251, 146, 60, 0.1);
    color: var(--orange-600);
}

.score-badge--danger {
    background: rgba(239, 68, 68, 0.1);
    color: var(--red-600);
}

.score-number {
    font-size: 1rem;
    line-height: 1;
}

.score-icon {
    font-size: 0.9rem;
}

.toggle-icon {
    color: var(--text-color-secondary);
    font-size: 0.875rem;
    transition: transform 0.2s ease;
}

/* Card Body */
.card-body {
    padding: 0.75rem;
    border-top: 1px solid var(--surface-border);
    background: var(--surface-ground);
}

.body-section {
    margin-bottom: 0.75rem;
}

.body-section:last-child {
    margin-bottom: 0;
}

.section-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    margin-bottom: 0.5rem;
}

.section-label i {
    font-size: 0.75rem;
}

.observation-text {
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-color);
    margin: 0;
    padding: 0.5rem;
    background: var(--surface-card);
    border-radius: 4px;
    white-space: pre-wrap;
}

.compact-progress {
    height: 8px;
}

.auditor-info {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.5rem;
    background: var(--surface-card);
    border-radius: 4px;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.info-item i {
    font-size: 0.75rem;
    color: var(--primary-color);
}

.actions-section {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-top: 0.5rem;
    border-top: 1px solid var(--surface-border);
}

/* Expand Transition */
.expand-enter-active,
.expand-leave-active {
    transition: all 0.3s ease;
    max-height: 500px;
}

.expand-enter-from,
.expand-leave-to {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
}

/* Form */
.audit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem 0;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
}

.field-label i {
    font-size: 0.85rem;
}

/* Responsive */
@media (max-width: 1200px) {
    .audits-grid {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
}

@media (max-width: 768px) {
    .daily-medical-audits {
        padding: 0.75rem;
    }

    .audits-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }

    .header-title {
        font-size: 1rem;
    }

    .audits-grid {
        grid-template-columns: 1fr;
        gap: 0.625rem;
        max-height: 500px;
    }

    .card-header {
        padding: 0.625rem;
    }

    .card-body {
        padding: 0.625rem;
    }

    .header-right {
        gap: 0.5rem;
        margin-left: 0.5rem;
    }

    .score-badge {
        padding: 0.3rem 0.5rem;
    }

    .score-number {
        font-size: 0.9rem;
    }

    .actions-section {
        flex-direction: column;
    }

    .actions-section :deep(.p-button) {
        width: 100%;
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .audits-grid {
        max-height: 450px;
    }

    .date-text {
        font-size: 0.85rem;
    }

    .badge-sm {
        font-size: 0.65rem;
        padding: 0.15rem 0.4rem;
    }
}
</style>
