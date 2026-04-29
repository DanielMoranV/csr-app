<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

const toast = useToast();

// ─── State ────────────────────────────────────────────────────────────────────
const visible = ref(false);
const activeTab = ref('history'); // 'history' | 'deleted'
const mode = ref('history'); // 'history' = solo historial | 'deleted' = solo eliminados | 'both' = ambos
const auditMovement = ref(null);

const auditHistory = ref([]);
const auditLoadingHistory = ref(false);

const deletedMovements = ref([]);
const deletedPage = ref(1);
const deletedTotal = ref(0);
const auditLoadingDeleted = ref(false);

// ─── Public API (called from parent via template ref) ─────────────────────────
const openMovementAudit = async (row) => {
    auditMovement.value = row;
    activeTab.value = 'history';
    mode.value = 'history';
    visible.value = true;
    await loadMovementAudit(row.id);
};

const openDeletedAudit = async () => {
    auditMovement.value = null;
    activeTab.value = 'deleted';
    mode.value = 'deleted';
    visible.value = true;
    await loadDeletedMovements(1);
};

defineExpose({ openMovementAudit, openDeletedAudit });

// ─── Data loaders ─────────────────────────────────────────────────────────────
const loadMovementAudit = async (id) => {
    auditLoadingHistory.value = true;
    auditHistory.value = [];
    try {
        const res = await TreasuryService.getMovementAudit(id);
        auditHistory.value = res.data.data || res.data;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial', life: 3000 });
    } finally {
        auditLoadingHistory.value = false;
    }
};

const loadDeletedMovements = async (page = 1) => {
    auditLoadingDeleted.value = true;
    deletedPage.value = page;
    try {
        const res = await TreasuryService.getDeletedMovements(page);
        const payload = res.data.data || res.data;
        deletedMovements.value = Array.isArray(payload) ? payload : payload.data || [];
        deletedTotal.value = res.data.data?.total ?? res.data.total ?? deletedMovements.value.length;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los movimientos eliminados', life: 3000 });
    } finally {
        auditLoadingDeleted.value = false;
    }
};

const onHide = () => {
    auditHistory.value = [];
    deletedMovements.value = [];
    auditMovement.value = null;
};

const switchToDeleted = async () => {
    activeTab.value = 'deleted';
    if (!deletedMovements.value.length) await loadDeletedMovements(1);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getEventSeverity = (event) => ({ created: 'success', updated: 'info', deleted: 'danger' })[event] || 'secondary';
const getEventIcon = (event) => ({ created: 'pi pi-plus-circle', updated: 'pi pi-pencil', deleted: 'pi pi-trash' })[event] || 'pi pi-circle';
const getEventLabel = (event) => ({ created: 'Creado', updated: 'Actualizado', deleted: 'Eliminado' })[event] || event;

const fieldLabels = {
    amount: 'Monto',
    movement_direction: 'Tipo',
    movement_date: 'Fecha',
    voucher: 'Voucher',
    reference: 'Referencia',
    beneficiary: 'Beneficiario',
    movement_category_id: 'Categoría',
    counterparty_id: 'Tercero',
    bank_account_id: 'Cuenta'
};

const getChangedFields = (oldValues, newValues) => {
    if (!oldValues || !newValues) return [];
    const keys = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];
    return keys.filter((k) => String(oldValues[k] ?? '') !== String(newValues[k] ?? '')).map((k) => ({ field: fieldLabels[k] || k, old: oldValues[k] ?? '—', new: newValues[k] ?? '—' }));
};

const formatAuditDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
</script>

<template>
    <Dialog v-model:visible="visible" :style="{ width: '760px' }" modal class="audit-dialog" @hide="onHide">
        <template #header>
            <div class="audit-dialog-header">
                <div class="audit-header-icon">
                    <i class="pi pi-history"></i>
                </div>
                <div class="audit-header-text">
                    <h3>Auditoría de Movimientos</h3>
                    <p v-if="auditMovement">Historial del movimiento #{{ auditMovement.id }}</p>
                    <p v-else>Movimientos eliminados del sistema</p>
                </div>
                <div class="audit-tabs" v-if="mode === 'both'">
                    <button :class="['audit-tab-btn', activeTab === 'history' ? 'active' : '']" @click="activeTab = 'history'"><i class="pi pi-list mr-1"></i>Historial</button>
                    <button :class="['audit-tab-btn', activeTab === 'deleted' ? 'active deleted' : '']" @click="switchToDeleted"><i class="pi pi-trash mr-1"></i>Eliminados</button>
                </div>
            </div>
        </template>

        <!-- TAB: Historial de movimiento -->
        <div v-if="activeTab === 'history'" class="audit-tab-content">
            <div v-if="auditLoadingHistory" class="audit-loading">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Cargando historial...</span>
            </div>
            <div v-else-if="auditHistory.length === 0" class="audit-empty">
                <i class="pi pi-inbox"></i>
                <p>No hay eventos registrados para este movimiento.</p>
            </div>
            <div v-else class="audit-timeline">
                <div v-for="(entry, idx) in auditHistory" :key="entry.id" class="audit-entry">
                    <div class="audit-entry-line" v-if="idx < auditHistory.length - 1"></div>
                    <div :class="['audit-entry-dot', entry.event]">
                        <i :class="getEventIcon(entry.event)"></i>
                    </div>
                    <div class="audit-entry-body">
                        <div class="audit-entry-header">
                            <Tag :value="getEventLabel(entry.event)" :severity="getEventSeverity(entry.event)" class="audit-event-tag" />
                            <span class="audit-entry-date"> <i class="pi pi-clock mr-1"></i>{{ formatAuditDate(entry.created_at) }} </span>
                            <span class="audit-entry-user" v-if="entry.user"> <i class="pi pi-user mr-1"></i>{{ entry.user.name }} </span>
                        </div>
                        <div v-if="entry.event === 'updated' && getChangedFields(entry.old_values, entry.new_values).length" class="audit-changes">
                            <table class="audit-changes-table">
                                <thead>
                                    <tr>
                                        <th>Campo</th>
                                        <th>Antes</th>
                                        <th>Después</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="change in getChangedFields(entry.old_values, entry.new_values)" :key="change.field">
                                        <td class="field-name">{{ change.field }}</td>
                                        <td class="old-value">{{ change.old }}</td>
                                        <td class="new-value">{{ change.new }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else-if="entry.event === 'created'" class="audit-hint"><i class="pi pi-info-circle mr-1"></i>Movimiento registrado en el sistema.</div>
                        <div v-else-if="entry.event === 'deleted'" class="audit-hint deleted"><i class="pi pi-exclamation-triangle mr-1"></i>Movimiento eliminado del sistema.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB: Eliminados -->
        <div v-if="activeTab === 'deleted'" class="audit-tab-content">
            <div v-if="auditLoadingDeleted" class="audit-loading">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Cargando registros eliminados...</span>
            </div>
            <div v-else-if="deletedMovements.length === 0" class="audit-empty">
                <i class="pi pi-check-circle" style="color: #10b981"></i>
                <p>No hay movimientos eliminados registrados.</p>
            </div>
            <div v-else>
                <DataTable :value="deletedMovements" showGridlines responsiveLayout="scroll" class="audit-deleted-table">
                    <Column header="ID Mov." style="min-width: 5rem">
                        <template #body="{ data }">
                            <span class="row-id-badge">{{ data.bank_movement_id }}</span>
                        </template>
                    </Column>
                    <Column header="Fecha" style="min-width: 9rem">
                        <template #body="{ data }">{{ data.old_values?.movement_date || '—' }}</template>
                    </Column>
                    <Column header="Tipo" style="min-width: 7rem">
                        <template #body="{ data }">
                            <Tag v-if="data.old_values?.movement_direction" :value="data.old_values.movement_direction === 'IN' ? 'Ingreso' : 'Egreso'" :severity="data.old_values.movement_direction === 'IN' ? 'success' : 'danger'" />
                            <span v-else>—</span>
                        </template>
                    </Column>
                    <Column header="Monto" style="min-width: 8rem">
                        <template #body="{ data }">
                            <span :class="data.old_values?.movement_direction === 'IN' ? 'amount-in' : 'amount-out'">
                                {{ data.old_values?.amount ? formatCurrency(data.old_values.amount) : '—' }}
                            </span>
                        </template>
                    </Column>
                    <Column header="Referencia" style="min-width: 10rem">
                        <template #body="{ data }">{{ data.old_values?.reference || '—' }}</template>
                    </Column>
                    <Column header="Eliminado por" style="min-width: 10rem">
                        <template #body="{ data }">
                            <span v-if="data.user" class="audit-user-cell"> <i class="pi pi-user mr-1"></i>{{ data.user.name }} </span>
                            <span v-else>—</span>
                        </template>
                    </Column>
                    <Column header="Fecha Eliminación" style="min-width: 10rem">
                        <template #body="{ data }">{{ formatAuditDate(data.created_at) }}</template>
                    </Column>
                </DataTable>
                <div class="audit-paginator" v-if="deletedTotal > 20">
                    <Button icon="pi pi-chevron-left" text rounded :disabled="deletedPage === 1" @click="loadDeletedMovements(deletedPage - 1)" />
                    <span class="audit-page-info">Página {{ deletedPage }} · {{ deletedTotal }} registros</span>
                    <Button icon="pi pi-chevron-right" text rounded :disabled="deletedPage * 20 >= deletedTotal" @click="loadDeletedMovements(deletedPage + 1)" />
                </div>
            </div>
        </div>
    </Dialog>
</template>

<style scoped>
:deep(.p-dialog-header) {
    padding: 1.25rem 1.5rem 0 1.5rem;
    border-bottom: none;
}
:deep(.p-dialog-content) {
    padding: 0;
}

/* ─── Header ──────────────────────────────────────────────────────────────── */
.audit-dialog-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--surface-border);
}

.audit-header-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.audit-header-text {
    flex: 1;
}
.audit-header-text h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-color);
}
.audit-header-text p {
    margin: 0.15rem 0 0 0;
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

/* ─── Tabs ────────────────────────────────────────────────────────────────── */
.audit-tabs {
    display: flex;
    gap: 0.4rem;
    background: var(--surface-ground);
    padding: 0.25rem;
    border-radius: 8px;
}

.audit-tab-btn {
    border: none;
    background: transparent;
    padding: 0.4rem 0.9rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
}
.audit-tab-btn.active {
    background: white;
    color: #7c3aed;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.audit-tab-btn.active.deleted {
    color: #ef4444;
}
:global(.dark) .audit-tab-btn.active {
    background: var(--surface-card);
}

/* ─── Tab content ─────────────────────────────────────────────────────────── */
.audit-tab-content {
    padding: 1.25rem 1.5rem 1.5rem 1.5rem;
    min-height: 260px;
    max-height: 520px;
    overflow-y: auto;
}

.audit-loading,
.audit-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
}
.audit-loading i,
.audit-empty i {
    font-size: 2rem;
    opacity: 0.4;
}

/* ─── Timeline ────────────────────────────────────────────────────────────── */
.audit-timeline {
    display: flex;
    flex-direction: column;
}

.audit-entry {
    display: flex;
    gap: 1rem;
    position: relative;
    padding-bottom: 1.25rem;
}

.audit-entry-line {
    position: absolute;
    left: 15px;
    top: 28px;
    width: 2px;
    bottom: 0;
    background: var(--surface-border);
}

.audit-entry-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    flex-shrink: 0;
    z-index: 1;
}
.audit-entry-dot.created {
    background: #dcfce7;
    color: #16a34a;
    border: 2px solid #86efac;
}
.audit-entry-dot.updated {
    background: #dbeafe;
    color: #2563eb;
    border: 2px solid #93c5fd;
}
.audit-entry-dot.deleted {
    background: #fee2e2;
    color: #dc2626;
    border: 2px solid #fca5a5;
}
:global(.dark) .audit-entry-dot.created {
    background: #14532d;
    color: #4ade80;
}
:global(.dark) .audit-entry-dot.updated {
    background: #1e3a8a;
    color: #60a5fa;
}
:global(.dark) .audit-entry-dot.deleted {
    background: #7f1d1d;
    color: #f87171;
}

.audit-entry-body {
    flex: 1;
    padding-top: 0.3rem;
}

.audit-entry-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
}

.audit-event-tag {
    font-size: 0.72rem !important;
    padding: 0.15rem 0.5rem !important;
    font-weight: 700 !important;
}

.audit-entry-date,
.audit-entry-user {
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
}

/* ─── Changes table ───────────────────────────────────────────────────────── */
.audit-changes {
    background: var(--surface-ground);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--surface-border);
}

.audit-changes-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
}
.audit-changes-table th {
    background: var(--surface-section);
    padding: 0.35rem 0.75rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    text-align: left;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.audit-changes-table td {
    padding: 0.35rem 0.75rem;
    border-top: 1px solid var(--surface-border);
    vertical-align: middle;
}
.field-name {
    font-weight: 600;
    color: var(--text-color);
}
.old-value {
    color: #ef4444;
    text-decoration: line-through;
    opacity: 0.8;
}
.new-value {
    color: #16a34a;
    font-weight: 600;
}

.audit-hint {
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
}
.audit-hint.deleted {
    color: #dc2626;
}

/* ─── Deleted table ───────────────────────────────────────────────────────── */
.audit-deleted-table {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--surface-border);
}
:deep(.audit-deleted-table .p-datatable-thead > tr > th) {
    background: var(--surface-section);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.5rem 0.75rem;
}
:deep(.audit-deleted-table .p-datatable-tbody > tr > td) {
    padding: 0.4rem 0.75rem;
    font-size: 0.82rem;
}

.row-id-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 4px;
    padding: 0.1rem 0.4rem;
    font-family: monospace;
}

.amount-in {
    color: #10b981;
    font-weight: 700;
}
.amount-out {
    color: #ef4444;
    font-weight: 700;
}

.audit-user-cell {
    display: flex;
    align-items: center;
    color: var(--text-color-secondary);
    font-size: 0.8rem;
}

/* ─── Paginator ───────────────────────────────────────────────────────────── */
.audit-paginator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1rem;
}
.audit-page-info {
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    font-weight: 600;
}
</style>
