<script setup>
import { attachmentModeInfo, CAMPAIGN_ACTIVE_STATUSES, CAMPAIGN_EDITABLE_STATUSES, campaignStatusInfo, recipientStatusInfo, useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressBar from 'primevue/progressbar';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({ id: { type: [String, Number], required: true } });
const router = useRouter();
const confirm = useConfirm();

const { canManage, currentCampaign, isLoadingCampaign, isRetrying, fetchCampaign, fetchCampaignProgress, fetchCampaignRecipients, retryFailed, downloadErrors, downloadConstancia, documentTypes, fetchDocumentTypes } = useBoletas();

const POLL_INTERVAL = 3000;
let pollTimer = null;

// Progreso (cards + barra). Se hidrata del detalle y se refresca por polling.
const progress = ref({ status: null, total: 0, sent: 0, failed: 0, pending: 0, percent: 0 });

// ── Destinatarios ────────────────────────────────────────────────────────────
const recipients = ref([]);
const recipientsTotal = ref(0);
const recipientsPage = ref(1);
const recipientsPerPage = ref(25);
const statusFilter = ref(null);
const loadingRecipients = ref(false);

const statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Enviando', value: 'sending' },
    { label: 'Enviado', value: 'sent' },
    { label: 'Fallido', value: 'failed' },
    { label: 'Omitido', value: 'skipped' }
];

const docTypeLabel = (slug) => documentTypes.value.find((d) => d.slug === slug)?.label || slug || '—';

const isActive = computed(() => CAMPAIGN_ACTIVE_STATUSES.includes(progress.value.status));
const campaignTag = computed(() => campaignStatusInfo(progress.value.status || currentCampaign.value?.status));

// Editable solo en draft/failed y con permiso de escritura. Editar la devuelve a
// borrador y, al guardar, reenvía a TODOS (distinto de "Reintentar fallidos").
const canEdit = computed(() => canManage.value && CAMPAIGN_EDITABLE_STATUSES.includes(progress.value.status || currentCampaign.value?.status));

const goEdit = () => router.push({ name: 'boletas-campaign-edit', params: { id: props.id } });

const num = (obj, ...keys) => {
    for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
    return 0;
};

const hydrateProgressFromCampaign = (c) => {
    if (!c) return;
    const total = num(c, 'total', 'recipients_count', 'total_recipients');
    const sent = num(c, 'sent', 'sent_count');
    const failed = num(c, 'failed', 'failed_count');
    const pending = num(c, 'pending', 'pending_count') || Math.max(total - sent - failed, 0);
    progress.value = {
        status: c.status,
        total,
        sent,
        failed,
        pending,
        percent: total > 0 ? Math.round(((sent + failed) / total) * 100) : 0
    };
};

onMounted(async () => {
    await fetchDocumentTypes();
    try {
        const campaign = await fetchCampaign(props.id);
        hydrateProgressFromCampaign(campaign);
    } catch {
        // notificado por el composable
    }
    await loadRecipients(1);
    startPollingIfNeeded();
});

onUnmounted(stopPolling);

// ── Polling de progreso ──────────────────────────────────────────────────────
function startPollingIfNeeded() {
    stopPolling();
    if (!isActive.value) return;
    pollTimer = setInterval(async () => {
        try {
            const data = await fetchCampaignProgress(props.id);
            if (data) progress.value = { ...progress.value, ...data };
            if (!CAMPAIGN_ACTIVE_STATUSES.includes(progress.value.status)) {
                stopPolling();
                // Refrescar detalle y destinatarios al terminar
                await fetchCampaign(props.id);
                await loadRecipients(recipientsPage.value);
            }
        } catch {
            // silencioso: el polling no debe spamear toasts
        }
    }, POLL_INTERVAL);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// ── Carga de destinatarios ────────────────────────────────────────────────────
const loadRecipients = async (page) => {
    loadingRecipients.value = true;
    try {
        const result = await fetchCampaignRecipients(props.id, { page, per_page: recipientsPerPage.value, status: statusFilter.value });
        recipients.value = result.items;
        recipientsTotal.value = result.total;
        recipientsPage.value = result.page;
    } catch {
        // notificado por el composable
    } finally {
        loadingRecipients.value = false;
    }
};

const onRecipientsPage = (event) => {
    recipientsPerPage.value = event.rows;
    loadRecipients(event.page + 1);
};

const onStatusFilterChange = () => loadRecipients(1);

// ── Acciones ──────────────────────────────────────────────────────────────────
const handleRetry = () => {
    confirm.require({
        message: '¿Reintentar el envío de los destinatarios fallidos?',
        header: 'Reintentar fallidos',
        icon: 'pi pi-replay',
        acceptLabel: 'Sí, reintentar',
        rejectLabel: 'Cancelar',
        accept: async () => {
            try {
                await retryFailed(props.id);
                const campaign = await fetchCampaign(props.id);
                hydrateProgressFromCampaign(campaign);
                await loadRecipients(recipientsPage.value);
                startPollingIfNeeded();
            } catch {
                // notificado por el composable
            }
        }
    });
};

const downloadingId = ref(null);
const handleDownloadConstancia = async (recipient) => {
    downloadingId.value = recipient.id;
    try {
        await downloadConstancia(props.id, recipient.id, recipient.dni);
    } catch {
        // notificado por el composable
    } finally {
        downloadingId.value = null;
    }
};

const downloadingErrors = ref(false);
const handleDownloadErrors = async () => {
    downloadingErrors.value = true;
    try {
        await downloadErrors(props.id);
    } catch {
        // notificado por el composable
    } finally {
        downloadingErrors.value = false;
    }
};

const hasFailures = computed(() => progress.value.failed > 0);

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
};
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <!-- Encabezado -->
            <div class="header-section">
                <Button icon="pi pi-arrow-left" rounded text @click="router.push({ name: 'boletas-campaigns' })" v-tooltip.bottom="'Volver al historial'" />
                <div class="header-icon-wrapper"><i class="pi pi-chart-line"></i></div>
                <div class="header-content">
                    <h1 class="header-title">{{ currentCampaign?.name || 'Campaña' }}</h1>
                    <p class="header-subtitle">
                        <Tag :value="campaignTag.label" :severity="campaignTag.severity" class="mr-2" />
                        <span v-if="currentCampaign" class="mono">{{ currentCampaign.period }}</span>
                        <span v-if="currentCampaign"> · {{ docTypeLabel(currentCampaign.document_type) }}</span>
                        <Tag v-if="currentCampaign?.attachment_mode" :value="attachmentModeInfo(currentCampaign.attachment_mode).short" severity="secondary" class="ml-2" />
                    </p>
                </div>
                <div class="header-actions flex gap-2 flex-wrap">
                    <Button label="Descargar errores" icon="pi pi-file-excel" outlined severity="secondary" :disabled="!hasFailures" :loading="downloadingErrors" @click="handleDownloadErrors" />
                    <Button v-if="canEdit" label="Editar" icon="pi pi-pencil" outlined @click="goEdit" />
                    <Button v-if="canManage" label="Reintentar fallidos" icon="pi pi-replay" :disabled="!hasFailures" :loading="isRetrying" @click="handleRetry" />
                </div>
            </div>

            <!-- Cards de estadísticas -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon total"><i class="pi pi-users"></i></div>
                    <div>
                        <div class="stat-value">{{ progress.total }}</div>
                        <div class="stat-label">Total</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon sent"><i class="pi pi-check-circle"></i></div>
                    <div>
                        <div class="stat-value">{{ progress.sent }}</div>
                        <div class="stat-label">Enviados</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon failed"><i class="pi pi-times-circle"></i></div>
                    <div>
                        <div class="stat-value">{{ progress.failed }}</div>
                        <div class="stat-label">Fallidos</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon pending"><i class="pi pi-clock"></i></div>
                    <div>
                        <div class="stat-value">{{ progress.pending }}</div>
                        <div class="stat-label">Pendientes</div>
                    </div>
                </div>
            </div>

            <!-- Barra de progreso -->
            <div class="progress-block">
                <div class="progress-head">
                    <span><i v-if="isActive" class="pi pi-spin pi-spinner mr-2"></i>Progreso del envío</span>
                    <span class="progress-percent">{{ progress.percent }}%</span>
                </div>
                <ProgressBar :value="progress.percent" />
                <small v-if="isActive" class="text-muted">Actualizando automáticamente cada 3&nbsp;segundos…</small>
                <small v-else class="text-muted">Envío finalizado.</small>
            </div>

            <!-- Destinatarios -->
            <div class="recipients-block">
                <div class="recipients-head">
                    <h3 class="block-title"><i class="pi pi-list mr-2"></i>Destinatarios</h3>
                    <div class="filter">
                        <label>Estado</label>
                        <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" class="w-44" @change="onStatusFilterChange" />
                    </div>
                </div>

                <DataTable
                    :value="recipients"
                    :loading="loadingRecipients || isLoadingCampaign"
                    lazy
                    paginator
                    :rows="recipientsPerPage"
                    :rowsPerPageOptions="[25, 50, 100]"
                    :totalRecords="recipientsTotal"
                    :first="(recipientsPage - 1) * recipientsPerPage"
                    responsiveLayout="scroll"
                    stripedRows
                    class="p-datatable-sm"
                    emptyMessage="No hay destinatarios para el filtro seleccionado."
                    @page="onRecipientsPage"
                >
                    <Column field="nombre" header="Nombre" style="min-width: 200px">
                        <template #body="{ data }"
                            ><span class="font-semibold">{{ data.nombre }}</span></template
                        >
                    </Column>
                    <Column field="email" header="Email" style="min-width: 220px" />
                    <Column field="dni" header="DNI" style="min-width: 120px">
                        <template #body="{ data }"
                            ><span class="mono">{{ data.dni }}</span></template
                        >
                    </Column>
                    <Column header="Estado" style="min-width: 130px">
                        <template #body="{ data }"><Tag :value="recipientStatusInfo(data.status).label" :severity="recipientStatusInfo(data.status).severity" /></template>
                    </Column>
                    <Column header="Motivo de error" style="min-width: 240px">
                        <template #body="{ data }"
                            ><span v-if="data.error_reason" class="text-danger">{{ data.error_reason }}</span
                            ><span v-else class="text-muted">—</span></template
                        >
                    </Column>
                    <Column header="Intentos" style="min-width: 90px">
                        <template #body="{ data }">{{ data.attempts ?? 0 }}</template>
                    </Column>
                    <Column header="Enviado" style="min-width: 140px">
                        <template #body="{ data }">{{ formatDate(data.sent_at) }}</template>
                    </Column>
                    <Column header="Constancia" style="min-width: 130px">
                        <template #body="{ data }">
                            <Button v-if="data.has_constancia" icon="pi pi-download" label="PDF" size="small" outlined :loading="downloadingId === data.id" @click="handleDownloadConstancia(data)" />
                            <span v-else class="text-muted">—</span>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>

<style scoped>
.boletas-view {
    padding: 1rem;
}
.main-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.header-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}
.header-icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 60%, #000));
    box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-color) 35%, transparent);
}
.header-icon-wrapper i {
    font-size: 1.75rem;
    color: #fff;
}
.header-content {
    flex: 1;
    min-width: 200px;
}
.header-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
}
.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    margin: 0;
    flex-wrap: wrap;
}
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    background: var(--surface-ground);
}
.stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    color: #fff;
}
.stat-icon.total {
    background: var(--primary-color);
}
.stat-icon.sent {
    background: var(--green-500, #22c55e);
}
.stat-icon.failed {
    background: var(--red-500, #ef4444);
}
.stat-icon.pending {
    background: var(--surface-500, #6b7280);
}
.stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1;
}
.stat-label {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    margin-top: 0.25rem;
}
.progress-block {
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.25rem;
    background: var(--surface-ground);
    margin-bottom: 1.5rem;
}
.progress-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: var(--text-color);
}
.progress-percent {
    font-size: 1.1rem;
    color: var(--primary-color);
}
.recipients-block {
    margin-top: 0.5rem;
}
.recipients-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}
.block-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
}
.filter {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.filter label {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-color-secondary);
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.text-danger {
    color: var(--red-600, #dc2626);
}
.text-muted {
    color: var(--text-color-secondary);
}
@media (max-width: 900px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
@media (max-width: 768px) {
    .main-card {
        padding: 1rem;
    }
}
</style>
