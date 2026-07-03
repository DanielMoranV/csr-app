<script setup>
import { CAMPAIGN_EDITABLE_STATUSES, campaignStatusInfo, useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { canManage, campaigns, campaignsPagination, isLoadingCampaigns, fetchCampaigns, documentTypes, fetchDocumentTypes } = useBoletas();

const perPage = ref(15);

onMounted(async () => {
    await fetchDocumentTypes();
    await load(1);
});

const load = async (page) => {
    try {
        await fetchCampaigns({ page, per_page: perPage.value });
    } catch {
        // notificado por el composable
    }
};

const onPage = (event) => {
    perPage.value = event.rows;
    load(event.page + 1);
};

const docTypeLabel = (slug) => documentTypes.value.find((d) => d.slug === slug)?.label || slug || '—';

// Acceso defensivo a contadores (el backend puede nombrarlos de varias formas).
const num = (obj, ...keys) => {
    for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
    return 0;
};
const totalOf = (c) => num(c, 'total', 'recipients_count', 'total_recipients');
const sentOf = (c) => num(c, 'sent', 'sent_count');
const failedOf = (c) => num(c, 'failed', 'failed_count');

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
};

const openDetail = (campaign) => {
    router.push({ name: 'boletas-campaign-detail', params: { id: campaign.id } });
};

// Editable solo en draft/failed (el detalle/edición valida de nuevo).
const isEditable = (campaign) => canManage.value && CAMPAIGN_EDITABLE_STATUSES.includes(campaign?.status);
const openEdit = (campaign) => router.push({ name: 'boletas-campaign-edit', params: { id: campaign.id } });

const goNew = () => router.push({ name: 'boletas-campaign-new' });
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-send"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Campañas de envío</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Historial de envíos masivos. Haz clic en una fila para ver el seguimiento.</p>
                </div>
                <div class="header-actions">
                    <Button v-if="canManage" label="Nueva campaña" icon="pi pi-plus" @click="goNew" />
                </div>
            </div>

            <DataTable
                :value="campaigns"
                :loading="isLoadingCampaigns"
                lazy
                paginator
                :rows="perPage"
                :rowsPerPageOptions="[15, 25, 50]"
                :totalRecords="campaignsPagination.total"
                :first="(campaignsPagination.page - 1) * perPage"
                responsiveLayout="scroll"
                stripedRows
                class="p-datatable-sm clickable-rows"
                emptyMessage="Aún no hay campañas registradas."
                @page="onPage"
                @row-click="openDetail($event.data)"
            >
                <Column field="name" header="Nombre" style="min-width: 220px">
                    <template #body="{ data }"
                        ><span class="font-semibold">{{ data.name }}</span></template
                    >
                </Column>
                <Column field="period" header="Periodo" style="min-width: 120px">
                    <template #body="{ data }"
                        ><span class="mono">{{ data.period }}</span></template
                    >
                </Column>
                <Column header="Tipo" style="min-width: 150px">
                    <template #body="{ data }"><Tag :value="docTypeLabel(data.document_type)" severity="info" /></template>
                </Column>
                <Column header="Estado" style="min-width: 180px">
                    <template #body="{ data }">
                        <Tag :value="campaignStatusInfo(data.status).label" :severity="campaignStatusInfo(data.status).severity" />
                    </template>
                </Column>
                <Column header="Total" style="min-width: 90px">
                    <template #body="{ data }">{{ totalOf(data) }}</template>
                </Column>
                <Column header="Enviados" style="min-width: 100px">
                    <template #body="{ data }"
                        ><span class="text-success font-semibold">{{ sentOf(data) }}</span></template
                    >
                </Column>
                <Column header="Fallidos" style="min-width: 100px">
                    <template #body="{ data }"
                        ><span :class="failedOf(data) > 0 ? 'text-danger font-semibold' : 'text-muted'">{{ failedOf(data) }}</span></template
                    >
                </Column>
                <Column header="Remitente" style="min-width: 150px">
                    <template #body="{ data }">
                        <span class="text-muted">{{ data.mail_setting?.label ?? 'Predeterminada' }}</span>
                    </template>
                </Column>
                <Column header="Fecha" style="min-width: 170px">
                    <template #body="{ data }">{{ formatDate(data.created_at || data.launched_at) }}</template>
                </Column>
                <Column header="" style="width: 96px">
                    <template #body="{ data }">
                        <Button v-if="isEditable(data)" icon="pi pi-pencil" size="small" text rounded @click.stop="openEdit(data)" v-tooltip.left="'Editar'" />
                        <Button icon="pi pi-arrow-right" size="small" text rounded @click.stop="openDetail(data)" v-tooltip.left="'Ver detalle'" />
                    </template>
                </Column>
            </DataTable>
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
    gap: 1.25rem;
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
}
.header-title {
    font-size: 1.6rem;
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
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.text-success {
    color: var(--green-600, #16a34a);
}
.text-danger {
    color: var(--red-600, #dc2626);
}
.text-muted {
    color: var(--text-color-secondary);
}
.clickable-rows :deep(tbody tr) {
    cursor: pointer;
}
@media (max-width: 768px) {
    .main-card {
        padding: 1rem;
    }
}
</style>
