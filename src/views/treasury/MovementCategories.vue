<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import CategoryTypeTag from './components/CategoryTypeTag.vue';

const toast = useToast();

const categories = ref([]);
const loading = ref(true);
const pdfLoading = ref(false);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const loadCategories = async () => {
    loading.value = true;
    try {
        const response = await TreasuryService.getMovementCategoriesTable();
        categories.value = response.data.data || response.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las categorías', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const exportPdf = async () => {
    pdfLoading.value = true;
    try {
        const response = await TreasuryService.getMovementCategoriesPdf();
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.add({ severity: 'success', summary: 'PDF generado', detail: 'El reporte se abrió en una nueva pestaña', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el reporte PDF', life: 3000 });
    } finally {
        pdfLoading.value = false;
    }
};

onMounted(() => {
    loadCategories();
});
</script>

<template>
    <div class="treasury-view">
        <div class="main-card">
            <!-- Hero Header -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-tags"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Categorías de Movimiento</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-list mr-2"></i>
                        Clasificación de ingresos, egresos y movimientos mixtos
                    </p>
                </div>
            </div>

            <!-- Table Header -->
            <div class="table-header-modern">
                <div class="header-left">
                    <div class="header-icon-badge">
                        <i class="pi pi-table"></i>
                    </div>
                    <div class="header-info">
                        <span class="header-title-small">Registro de Categorías</span>
                        <span class="header-count" v-if="categories">{{ categories.length }} {{ categories.length === 1 ? 'categoría' : 'categorías' }}</span>
                    </div>
                </div>
                <div class="header-actions-modern">
                    <IconField iconPosition="left" class="search-field">
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="Buscar categorías..." class="search-input-modern" />
                    </IconField>
                    <Button
                        label="Exportar PDF"
                        icon="pi pi-file-pdf"
                        class="pdf-button"
                        :loading="pdfLoading"
                        @click="exportPdf"
                    />
                </div>
            </div>

            <DataTable
                :value="categories"
                :paginator="true"
                :rows="10"
                dataKey="id"
                :filters="filters"
                :loading="loading"
                showGridlines
                responsiveLayout="scroll"
                :emptyMessage="undefined"
                class="modern-datatable"
            >
                <template #empty>
                    <div class="empty-state">
                        <div class="empty-icon-wrapper">
                            <i class="pi pi-tags"></i>
                        </div>
                        <h3 class="empty-title">Sin categorías registradas</h3>
                        <p class="empty-subtitle">No hay categorías de movimiento disponibles en el sistema.</p>
                    </div>
                </template>

                <Column field="id" header="ID" :sortable="true" style="min-width: 5rem; width: 5rem">
                    <template #body="{ data }">
                        <span class="id-badge">{{ data.id }}</span>
                    </template>
                </Column>

                <Column field="name" header="Nombre" :sortable="true" style="min-width: 14rem">
                    <template #body="{ data }">
                        <span class="category-name">{{ data.name }}</span>
                    </template>
                </Column>

                <Column field="description" header="Descripción" :sortable="false" style="min-width: 20rem">
                    <template #body="{ data }">
                        <span class="category-desc">{{ data.description || '—' }}</span>
                    </template>
                </Column>

                <Column field="type" header="Tipo" :sortable="true" style="min-width: 9rem; width: 9rem">
                    <template #body="{ data }">
                        <CategoryTypeTag :type="data.type" />
                    </template>
                </Column>

                <Column field="is_active" header="Estado" :sortable="true" style="min-width: 8rem; width: 8rem">
                    <template #body="{ data }">
                        <Tag
                            :value="data.is_active ? 'Activo' : 'Inactivo'"
                            :severity="data.is_active ? 'success' : 'danger'"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<style scoped>
/* ============================================================================
   ANIMATIONS
   ============================================================================ */
@keyframes shimmer {
    0%, 100% { transform: translateX(-100%) rotate(45deg); }
    50%       { transform: translateX(100%)  rotate(45deg); }
}
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.05); }
}
@keyframes gradientShift {
    0%, 100% { background-position: 0%   50%; }
    50%       { background-position: 100% 50%; }
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
}
@keyframes iconPulse {
    0%, 100% { transform: scale(1);    box-shadow: 0 4px 12px rgba(16,185,129,0.3), 0 2px 8px rgba(5,150,105,0.2); }
    50%       { transform: scale(1.05); box-shadow: 0 6px 16px rgba(16,185,129,0.4), 0 3px 10px rgba(5,150,105,0.3); }
}

/* ============================================================================
   MAIN CONTAINER
   ============================================================================ */
.treasury-view {
    padding: 1rem;
    animation: fadeIn 0.5s ease-out;
}

.main-card {
    background: linear-gradient(145deg, var(--surface-section), var(--surface-card));
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}
.main-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981, #047857);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}
:global(.dark) .main-card {
    background: linear-gradient(145deg, #1e293b, #0f172a);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ============================================================================
   HEADER SECTION
   ============================================================================ */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
}
.header-icon-wrapper {
    width: 64px; height: 64px;
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    box-shadow: 0 8px 20px rgba(16,185,129,0.3), 0 4px 12px rgba(5,150,105,0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative; overflow: hidden;
}
.header-icon-wrapper::before {
    content: '';
    position: absolute; top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: shimmer 3s infinite;
}
.header-icon-wrapper i { font-size: 2rem; color: #ffffff; z-index: 1; }

.header-content { flex: 1; }
.header-title {
    font-size: 1.75rem; font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    display: flex; align-items: center;
    margin: 0;
}

/* ============================================================================
   TABLE HEADER
   ============================================================================ */
.table-header-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-bottom: 2px solid color-mix(in srgb, var(--green-500) 20%, var(--surface-border));
    gap: 1rem;
    position: relative;
}
.table-header-modern::after {
    content: '';
    position: absolute; bottom: -2px; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

.header-left { display: flex; align-items: center; gap: 1rem; }

.header-icon-badge {
    width: 48px; height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(16,185,129,0.3), 0 2px 8px rgba(5,150,105,0.2);
    position: relative; overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}
.header-icon-badge::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}
.header-icon-badge i { font-size: 1.5rem; color: white; position: relative; z-index: 1; }

.header-info { display: flex; flex-direction: column; gap: 0.25rem; }
.header-title-small { font-size: 1.125rem; font-weight: 700; color: var(--text-color); }
.header-count {
    font-size: 0.813rem; font-weight: 600;
    color: #059669;
    background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px; display: inline-block; width: fit-content;
    border: 1px solid #6ee7b7;
    box-shadow: 0 2px 4px rgba(16,185,129,0.1);
}

.header-actions-modern { display: flex; gap: 0.75rem; align-items: center; }

.search-field { width: 280px; }
.search-input-modern {
    border-radius: 10px;
    border: 2px solid var(--surface-border);
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem;
    transition: all 0.3s ease;
    background: var(--surface-ground);
    color: var(--text-color);
}
.search-input-modern:hover { border-color: #a7f3d0; }
.search-input-modern:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }

/* PDF button – teal-to-red gradient to visually distinguish it */
.pdf-button {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    border: none !important;
    border-radius: 10px !important;
    box-shadow: 0 3px 10px rgba(239,68,68,0.3) !important;
    transition: all 0.3s ease !important;
    white-space: nowrap;
}
.pdf-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(239,68,68,0.4) !important;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
}

/* ============================================================================
   DATATABLE
   ============================================================================ */
.modern-datatable {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--surface-border);
}
:deep(.modern-datatable .p-datatable-thead > tr > th) {
    background: var(--surface-section);
    color: var(--text-color);
    font-weight: 700;
    border: none;
    padding: 1rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
:deep(.modern-datatable .p-datatable-tbody > tr) {
    transition: background-color 0.2s ease;
}
:deep(.modern-datatable .p-datatable-tbody > tr:hover) {
    background-color: color-mix(in srgb, var(--green-50) 60%, var(--surface-card)) !important;
}

/* Table cell helpers */
.id-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem; height: 2rem;
    border-radius: 8px;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    font-size: 0.8rem; font-weight: 700;
    color: var(--text-color-secondary);
}
.category-name {
    font-weight: 600;
    color: var(--text-color);
}
.category-desc {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    line-height: 1.5;
}

/* ============================================================================
   EMPTY STATE
   ============================================================================ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    animation: fadeIn 0.4s ease-out;
}
.empty-icon-wrapper {
    width: 80px; height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
    border: 2px solid #a7f3d0;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
    box-shadow: 0 8px 20px rgba(16,185,129,0.12);
}
.empty-icon-wrapper i { font-size: 2.25rem; color: #10b981; }
.empty-title {
    font-size: 1.2rem; font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
}
.empty-subtitle {
    font-size: 0.9rem; color: var(--text-color-secondary);
    margin: 0; max-width: 360px; line-height: 1.6;
}
:global(.dark) .empty-icon-wrapper {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
    border-color: #047857;
}
</style>
