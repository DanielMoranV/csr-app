<script setup>
import { useDailyMedicalAudits } from '@/composables/useDailyMedicalAudits';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, defineEmits, defineProps, onMounted, ref } from 'vue';

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

const {
    getAuditSeverity,
    getComplianceScoreSeverity,
    formatAuditDate,
    formatAuditDateTime,
    getTodayDate
} = useDailyMedicalAudits();

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

// Computed
const sortedAudits = computed(() => {
    return [...localAudits.value].sort((a, b) => {
        return new Date(b.audit_date) - new Date(a.audit_date);
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
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al guardar la auditoría',
            life: 3000
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

        <!-- Audits List -->
        <div v-else class="audits-list">
            <div v-for="audit in sortedAudits" :key="audit.id" class="audit-card" :class="`audit-card--${getAuditSeverity(audit)}`">
                <!-- Card Header -->
                <div class="audit-card-header">
                    <div class="audit-card-info">
                        <div class="audit-card-date">
                            <i class="pi pi-calendar"></i>
                            {{ formatAuditDate(audit.audit_date) }}
                        </div>
                        <div class="audit-card-badges">
                            <Tag :value="audit.is_audited ? 'Auditada' : 'Pendiente'" :severity="audit.is_audited ? 'success' : 'warning'" size="small" />
                            <Tag v-if="audit.requires_attention" value="Requiere atención" severity="danger" size="small" />
                        </div>
                    </div>
                    <div v-if="!readOnly" class="audit-card-actions">
                        <Button v-if="!audit.is_audited" icon="pi pi-check" v-tooltip.top="'Marcar como auditada'" severity="success" text rounded size="small" @click="handleMarkAsAudited(audit)" />
                        <Button icon="pi pi-pencil" v-tooltip.top="'Editar'" severity="info" text rounded size="small" @click="openEditDialog(audit)" />
                        <Button icon="pi pi-trash" v-tooltip.top="'Eliminar'" severity="danger" text rounded size="small" @click="handleDelete(audit)" />
                    </div>
                </div>

                <!-- Card Body -->
                <div class="audit-card-body">
                    <!-- Compliance Score -->
                    <div v-if="audit.compliance_score !== null && audit.compliance_score !== undefined" class="audit-score">
                        <div class="score-label">
                            <i class="pi pi-chart-bar"></i>
                            Puntaje de Cumplimiento
                        </div>
                        <div class="score-value" :class="`score-value--${getComplianceScoreSeverity(audit.compliance_score)}`">{{ audit.compliance_score }}/100</div>
                        <ProgressBar :value="audit.compliance_score" :severity="getComplianceScoreSeverity(audit.compliance_score)" class="score-progress" />
                    </div>

                    <!-- Observations -->
                    <div v-if="audit.observations" class="audit-observations">
                        <div class="observations-label">
                            <i class="pi pi-file-edit"></i>
                            Observaciones
                        </div>
                        <div class="observations-text">{{ audit.observations }}</div>
                    </div>

                    <!-- Auditor Info -->
                    <div v-if="audit.is_audited && audit.auditor" class="audit-footer">
                        <div class="auditor-info">
                            <i class="pi pi-user"></i>
                            <span>Auditado por: {{ audit.auditor.name }}</span>
                        </div>
                        <div class="audit-date">
                            <i class="pi pi-clock"></i>
                            <span>{{ formatAuditDateTime(audit.audited_at) }}</span>
                        </div>
                    </div>
                </div>
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

        <ConfirmDialog />
        <Toast />
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
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
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
    font-size: 1.25rem;
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
    padding: 3rem 1rem;
    text-align: center;
    color: var(--text-color-secondary);
}

.empty-audits i {
    font-size: 3rem;
    color: var(--surface-400);
}

/* Audits List */
.audits-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Audit Card */
.audit-card {
    background: var(--surface-50);
    border: 2px solid var(--surface-200);
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s ease;
}

.audit-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.audit-card--success {
    border-left: 4px solid var(--green-500);
}

.audit-card--warning {
    border-left: 4px solid var(--orange-500);
}

.audit-card--danger {
    border-left: 4px solid var(--red-500);
}

.audit-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
}

.audit-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.audit-card-date {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
}

.audit-card-date i {
    color: var(--primary-color);
}

.audit-card-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.audit-card-actions {
    display: flex;
    gap: 0.25rem;
}

/* Card Body */
.audit-card-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.audit-score {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--surface-card);
    border-radius: 6px;
    border: 1px solid var(--surface-200);
}

.score-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color-secondary);
}

.score-value {
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
}

.score-value--success {
    color: var(--green-600);
}

.score-value--info {
    color: var(--blue-600);
}

.score-value--warning {
    color: var(--orange-600);
}

.score-value--danger {
    color: var(--red-600);
}

.score-progress {
    height: 12px;
}

.audit-observations {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.observations-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color-secondary);
}

.observations-text {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text-color);
    white-space: pre-wrap;
}

.audit-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid var(--surface-200);
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.auditor-info,
.audit-date {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

/* Form */
.audit-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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
@media (max-width: 768px) {
    .audits-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    .audit-card-header {
        flex-direction: column;
        gap: 0.75rem;
    }

    .audit-card-actions {
        align-self: flex-end;
    }

    .audit-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
}
</style>
