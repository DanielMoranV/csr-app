<script setup>
import { dashboardErrores as erroresApi } from '@/api/dashboardErrores';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const toast = useToast();

const data = ref(null);
const isLoading = ref(false);
const isExporting = ref(false);

const initDates = () => {
    const today = new Date();
    return {
        desde: new Date(today.getFullYear() - 2, 0, 1),
        hasta: today
    };
};

const { desde: defaultDesde, hasta: defaultHasta } = initDates();
const desde = ref(defaultDesde);
const hasta = ref(defaultHasta);

const getParams = () => ({
    desde: desde.value.toISOString().split('T')[0],
    hasta: hasta.value.toISOString().split('T')[0]
});

const fNumber = (v) => new Intl.NumberFormat('es-PE').format(v ?? 0);

const fetchData = async () => {
    isLoading.value = true;
    try {
        const response = await erroresApi.getData(getParams());
        data.value = response?.data || null;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos', life: 5000 });
    } finally {
        isLoading.value = false;
    }
};

const handleExport = async () => {
    isExporting.value = true;
    try {
        const response = await erroresApi.exportExcel(getParams());
        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'errores-admision.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: 'Exportado', detail: 'Archivo descargado correctamente', life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el archivo', life: 4000 });
    } finally {
        isExporting.value = false;
    }
};

const maxTipo = computed(() => data.value?.tipos?.[0]?.total || 1);
const maxUsuario = computed(() => data.value?.por_usuario?.[0]?.total || 1);

onMounted(fetchData);
</script>

<template>
    <div class="er-container">
        <!-- Header -->
        <div class="er-header">
            <div class="er-header-left">
                <h1 class="er-title">
                    <i class="pi pi-exclamation-circle er-title-icon"></i>
                    Errores de Admisión
                </h1>
                <p class="er-subtitle">Registros con área corregida</p>
            </div>
            <div class="er-header-right">
                <div class="er-filters">
                    <div class="er-filter-group">
                        <label class="er-filter-label">Desde</label>
                        <Calendar v-model="desde" dateFormat="dd/mm/yy" showIcon iconDisplay="input" :maxDate="hasta" class="er-calendar" />
                    </div>
                    <div class="er-filter-group">
                        <label class="er-filter-label">Hasta</label>
                        <Calendar v-model="hasta" dateFormat="dd/mm/yy" showIcon iconDisplay="input" :minDate="desde" class="er-calendar" />
                    </div>
                    <Button icon="pi pi-search" label="Buscar" :loading="isLoading" @click="fetchData" class="er-filter-btn" />
                </div>
                <Button icon="pi pi-download" label="Exportar Excel" severity="success" outlined :loading="isExporting" @click="handleExport" />
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="er-loading">
            <ProgressSpinner />
            <p>Cargando datos...</p>
        </div>

        <template v-else-if="data">
            <!-- KPI total -->
            <div class="er-kpi-banner">
                <div class="er-kpi-value">{{ fNumber(data.total_errores) }}</div>
                <div class="er-kpi-label">registros con área corregida automáticamente</div>
            </div>

            <!-- Tipos + Usuarios -->
            <div class="er-grid">
                <!-- Tipos de corrección -->
                <Card class="er-card">
                    <template #title>
                        <span><i class="pi pi-arrows-h mr-2" style="color: #d97706"></i>Tipos de Corrección</span>
                    </template>
                    <template #content>
                        <DataTable :value="data.tipos" stripedRows size="small" class="er-table" sortField="total" :sortOrder="-1">
                            <Column field="area_original" header="Área Original" sortable>
                                <template #body="{ data: row }">
                                    <span class="er-area-original">{{ row.area_original }}</span>
                                </template>
                            </Column>
                            <Column header="" style="width: 2rem; text-align: center">
                                <template #body>
                                    <i class="pi pi-arrow-right" style="color: #94a3b8; font-size: 0.75rem"></i>
                                </template>
                            </Column>
                            <Column field="area_corregida" header="Área Corregida" sortable>
                                <template #body="{ data: row }">
                                    <span class="er-area-corregida">{{ row.area_corregida }}</span>
                                </template>
                            </Column>
                            <Column field="total" header="Registros" sortable style="width: 120px">
                                <template #body="{ data: row }">
                                    <div class="er-bar-cell">
                                        <span class="er-bar-num">{{ fNumber(row.total) }}</span>
                                        <div class="er-bar-track">
                                            <div class="er-bar-fill er-bar-fill--amber" :style="{ width: ((row.total / maxTipo) * 100).toFixed(1) + '%' }"></div>
                                        </div>
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </template>
                </Card>

                <!-- Ranking por usuario -->
                <Card class="er-card">
                    <template #title>
                        <span><i class="pi pi-user mr-2" style="color: #6366f1"></i>Ranking por Usuario Admisión</span>
                    </template>
                    <template #content>
                        <div class="er-rank-list">
                            <div v-for="(u, idx) in data.por_usuario" :key="u.usuario" class="er-rank-item">
                                <div class="er-rank-left">
                                    <span class="er-rank-badge" :class="{ 'er-rank-1': idx === 0, 'er-rank-2': idx === 1, 'er-rank-3': idx === 2 }">#{{ idx + 1 }}</span>
                                    <span class="er-rank-name">{{ u.usuario }}</span>
                                </div>
                                <div class="er-rank-right">
                                    <span class="er-rank-value">{{ fNumber(u.total) }}</span>
                                    <div class="er-bar-track er-bar-track--sm">
                                        <div class="er-bar-fill er-bar-fill--indigo" :style="{ width: ((u.total / maxUsuario) * 100).toFixed(1) + '%' }"></div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="!data.por_usuario?.length" class="er-empty">Sin datos de usuarios</div>
                        </div>
                    </template>
                </Card>
            </div>
        </template>

        <div v-else-if="!isLoading" class="er-empty-state">
            <i class="pi pi-inbox" style="font-size: 3rem; opacity: 0.3"></i>
            <p>Sin datos disponibles</p>
        </div>
    </div>
</template>

<style scoped>
.er-container {
    min-height: 100vh;
    background: var(--surface-ground);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ─── HEADER ─────────────────────────────────────────────────────────────── */
.er-header {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.er-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.er-header-right {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.er-filters {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.er-filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.er-filter-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.er-calendar {
    width: 160px;
}

.er-filter-btn {
    align-self: flex-end;
}

.er-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.er-title-icon {
    color: #e11d48;
    font-size: 1.25rem;
}

.er-subtitle {
    font-size: 0.8125rem;
    color: var(--text-color-secondary);
    margin: 0;
}

/* ─── LOADING ─────────────────────────────────────────────────────────────── */
.er-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
    color: var(--text-color-secondary);
}

.er-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 1rem;
    color: var(--text-color-secondary);
    background: var(--surface-card);
    border-radius: 12px;
}

/* ─── KPI BANNER ──────────────────────────────────────────────────────────── */
.er-kpi-banner {
    background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
    border: 1px solid #fecdd3;
    border-left: 4px solid #e11d48;
    border-radius: 12px;
    padding: 1.25rem 1.75rem;
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
}

.er-kpi-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: #e11d48;
    line-height: 1;
}

.er-kpi-label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #9f1239;
}

/* ─── GRID ────────────────────────────────────────────────────────────────── */
.er-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 1.5rem;
}

.er-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ─── TABLE ───────────────────────────────────────────────────────────────── */
.er-table {
    font-size: 0.875rem;
}

.er-area-original {
    font-weight: 700;
    color: #e11d48;
    font-family: monospace;
    font-size: 0.875rem;
}

.er-area-corregida {
    font-weight: 700;
    color: #059669;
}

.er-bar-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-end;
}

.er-bar-num {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-color);
}

/* ─── BARS ────────────────────────────────────────────────────────────────── */
.er-bar-track {
    width: 100%;
    height: 5px;
    background: var(--surface-200);
    border-radius: 99px;
    overflow: hidden;
}

.er-bar-track--sm {
    width: 80px;
    height: 4px;
}

.er-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
}

.er-bar-fill--amber {
    background: linear-gradient(90deg, #d97706, #f59e0b);
}
.er-bar-fill--indigo {
    background: linear-gradient(90deg, #6366f1, #818cf8);
}

/* ─── RANK LIST ───────────────────────────────────────────────────────────── */
.er-rank-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 480px;
    overflow-y: auto;
}

.er-rank-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    background: var(--surface-50);
    border-radius: 10px;
    border: 1px solid var(--surface-border);
    transition: background 0.15s;
}

.er-rank-item:hover {
    background: var(--surface-100);
}

.er-rank-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.er-rank-badge {
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    background: var(--surface-200);
    color: var(--text-color-secondary);
    flex-shrink: 0;
}

.er-rank-1 {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}
.er-rank-2 {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
}
.er-rank-3 {
    background: #fff7ed;
    color: #9a3412;
    border: 1px solid #fed7aa;
}

.er-rank-name {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.er-rank-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;
}

.er-rank-value {
    font-size: 0.875rem;
    font-weight: 800;
    color: #6366f1;
}

.er-empty {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
}

/* ─── RESPONSIVE ─────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
    .er-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
    .er-container {
        padding: 1rem;
    }

    .er-header-right {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
    }

    .er-filters {
        flex-direction: column;
        align-items: stretch;
    }

    .er-calendar {
        width: 100%;
    }
    .er-title {
        font-size: 1.25rem;
    }
    .er-kpi-value {
        font-size: 2rem;
    }
}
</style>
