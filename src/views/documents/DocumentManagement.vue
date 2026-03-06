<script setup>
import DocumentViewerDialog from '@/components/documents/DocumentViewerDialog.vue';
import NewDocumentDialog from '@/components/documents/NewDocumentDialog.vue';
import { useDocumentManagement } from '@/composables/useDocumentManagement.js';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const toast = useToast();
const { documents, isLoading: loading, fetchDocumentDetails, initializeDocuments } = useDocumentManagement();

const globalFilter = ref('');
const showNewDocumentDialog = ref(false);
const showDocumentViewerDialog = ref(false);
const selectedDocumentId = ref(null);

const loadDocuments = async () => {
    await initializeDocuments();
};

const openNewDocumentDialog = () => {
    showNewDocumentDialog.value = true;
};

const handleDocumentCreated = () => {
    loadDocuments(); // Recargar la lista de documentos después de crear uno
};

const viewDocument = (doc) => {
    selectedDocumentId.value = doc.id;
    showDocumentViewerDialog.value = true;
};

const getSeverity = (status) => {
    switch (status) {
        case 'Pendiente':
            return 'warning';
        case 'Finalizado':
            return 'success';
        case 'En corrección':
            return 'info';
        case 'Rechazado':
            return 'danger';
        default:
            return 'info';
    }
};

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const handleGlobalFilter = (event) => {
    globalFilter.value = event.target.value;
};

const clearFilter = () => {
    globalFilter.value = '';
};

const filteredDocuments = computed(() => {
    if (!globalFilter.value) return documents.value;
    const search = globalFilter.value.toLowerCase();
    return documents.value.filter((doc) => doc.titulo.toLowerCase().includes(search) || (doc.creador && doc.creador.name.toLowerCase().includes(search)) || doc.estado.toLowerCase().includes(search));
});

onMounted(() => {
    loadDocuments();
});
</script>

<template>
    <div class="documents-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-file-pdf"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Gestión Documentaria</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-folder-open mr-2"></i>
                        Administración y flujo de documentos y aprobaciones
                    </p>
                </div>
                <Button label="Nuevo Documento" icon="pi pi-plus" class="add-button" @click="openNewDocumentDialog" />
            </div>

            <!-- Table Header con búsqueda -->
            <div class="table-header-modern">
                <div class="header-left">
                    <div class="header-icon-badge">
                        <i class="pi pi-table"></i>
                    </div>
                    <div class="header-info">
                        <span class="header-title-small">Mis Documentos</span>
                        <span class="header-count" v-if="documents.length > 0"> {{ documents.length }} {{ documents.length === 1 ? 'documento' : 'documentos' }} </span>
                    </div>
                </div>
                <div class="header-actions-modern">
                    <IconField iconPosition="left" class="search-field">
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="globalFilter" placeholder="Buscar documentos..." class="search-input-modern" @input="handleGlobalFilter" />
                    </IconField>
                    <Button v-if="globalFilter" label="Limpiar" icon="pi pi-filter-slash" severity="secondary" outlined @click="clearFilter" class="clear-button" />
                </div>
            </div>

            <!-- Tabla de Documentos -->
            <DataTable
                :value="filteredDocuments"
                :loading="loading"
                :rows="25"
                :paginator="documents.length > 25"
                :rowsPerPageOptions="[10, 25, 50, 100]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} documentos"
                responsiveLayout="scroll"
                stripedRows
                class="p-datatable-sm mt-4"
            >
                <template #empty>
                    <div class="flex flex-column align-items-center justify-content-center p-5 text-center w-full">
                        <i class="pi pi-folder-open text-6xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-700 m-0">No hay documentos que mostrar</h3>
                        <p class="text-gray-500 mt-2 mb-4 max-w-20rem">Aún no tienes documentos asignados o creados. Cuando inicies o seas parte de un flujo, aparecerán aquí.</p>
                        <Button label="Crear mi primer documento" icon="pi pi-plus" @click="openNewDocumentDialog" class="p-button-outlined" />
                    </div>
                </template>

                <Column field="titulo" header="Título" :sortable="true" style="min-width: 250px">
                    <template #body="{ data }">
                        <div class="flex items-center gap-3">
                            <span class="font-semibold text-primary">{{ data.titulo }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="creador.nombre" header="Creador" :sortable="true" style="min-width: 150px">
                    <template #body="{ data }">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-user text-gray-500"></i>
                            <span>{{ data.creador ? data.creador.name : 'Desconocido' }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="estado_actual" header="Estado" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <Badge :value="data.estado_actual" :severity="getSeverity(data.estado_actual)" class="px-2 py-1 uppercase text-xs font-bold" />
                    </template>
                </Column>

                <Column field="created_at" header="Fecha de Creación" :sortable="true" style="min-width: 160px">
                    <template #body="{ data }">
                        <span class="text-gray-600 dark:text-gray-300">
                            <i class="pi pi-calendar mr-1 text-sm"></i>
                            {{ formatDate(data.created_at) }}
                        </span>
                    </template>
                </Column>

                <Column header="Acciones" style="min-width: 120px" alignFrozen="right">
                    <template #body="{ data }">
                        <div class="flex gap-2">
                            <Button icon="pi pi-eye" size="small" rounded severity="info" outlined v-tooltip.top="'Ver Documento'" @click="viewDocument(data)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
        <!-- Diálogo para crear nuevo documento -->
        <NewDocumentDialog v-model:visible="showNewDocumentDialog" @document-created="handleDocumentCreated" />

        <!-- Visor del Documento PDF y Flujo -->
        <DocumentViewerDialog v-model:visible="showDocumentViewerDialog" :documentId="selectedDocumentId" @document-action="loadDocuments" />
    </div>
</template>

<style scoped>
/* ============================================================================
   ANIMATIONS
   ============================================================================ */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes shimmer {
    0%,
    100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

@keyframes gradientShift {
    0%,
    100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

@keyframes iconPulse {
    0%,
    100% {
        transform: scale(1);
        box-shadow:
            0 4px 12px rgba(59, 130, 246, 0.3),
            0 2px 8px rgba(37, 99, 235, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow:
            0 6px 16px rgba(59, 130, 246, 0.4),
            0 3px 10px rgba(37, 99, 235, 0.3);
    }
}

/* ============================================================================
   MAIN CONTAINER
   ============================================================================ */
.documents-view {
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
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6, #1d4ed8);
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
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
    box-shadow:
        0 8px 20px rgba(59, 130, 246, 0.3),
        0 4px 12px rgba(37, 99, 235, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
}

.header-icon-wrapper::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 3s infinite;
}

.header-icon-wrapper i {
    font-size: 2rem;
    color: #ffffff;
    z-index: 1;
}

:global(.dark) .header-icon-wrapper {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
    box-shadow:
        0 8px 20px rgba(96, 165, 250, 0.4),
        0 4px 12px rgba(59, 130, 246, 0.5);
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    display: flex;
    align-items: center;
    margin: 0;
}

.add-button {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600;
    padding: 0.75rem 1.5rem !important;
    border-radius: 10px !important;
    box-shadow:
        0 4px 12px rgba(59, 130, 246, 0.3),
        0 2px 8px rgba(37, 99, 235, 0.2) !important;
    transition: all 0.3s ease !important;
    position: relative;
    overflow: hidden;
}

.add-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.add-button:hover::before {
    transform: translateX(100%);
}

.add-button:hover {
    transform: translateY(-2px) !important;
    box-shadow:
        0 6px 16px rgba(59, 130, 246, 0.4),
        0 3px 10px rgba(37, 99, 235, 0.3) !important;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
}

:global(.dark) .add-button {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    box-shadow:
        0 4px 12px rgba(59, 130, 246, 0.4),
        0 2px 8px rgba(37, 99, 235, 0.3) !important;
}

:global(.dark) .add-button:hover {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%) !important;
    box-shadow:
        0 6px 16px rgba(59, 130, 246, 0.5),
        0 3px 10px rgba(37, 99, 235, 0.4) !important;
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
    border-bottom: 2px solid color-mix(in srgb, #3b82f6 20%, var(--surface-border));
    gap: 1rem;
    position: relative;
    border-radius: 12px;
}

.table-header-modern::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

:global(.dark) .table-header-modern {
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-icon-badge {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        0 4px 12px rgba(59, 130, 246, 0.3),
        0 2px 8px rgba(37, 99, 235, 0.2);
    position: relative;
    overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}

.header-icon-badge::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}

.header-icon-badge i {
    font-size: 1.5rem;
    color: white;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

:global(.dark) .header-icon-badge {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
    box-shadow:
        0 4px 12px rgba(96, 165, 250, 0.4),
        0 2px 8px rgba(59, 130, 246, 0.3);
}

:global(.dark) .header-icon-badge::before {
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.header-title-small {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.015em;
}

.header-count {
    font-size: 0.813rem;
    font-weight: 600;
    color: #2563eb;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #bfdbfe;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

:global(.dark) .header-count {
    color: #93c5fd;
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    border: 1px solid #3b82f6;
}

.header-actions-modern {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.search-field {
    width: 280px;
}

.search-input-modern {
    border-radius: 10px;
    border: 2px solid var(--surface-border);
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem;
    transition: all 0.3s ease;
    background: var(--surface-ground);
    color: var(--text-color);
}

.search-input-modern:hover {
    border-color: #cbd5e1;
}

.search-input-modern:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-button {
    white-space: nowrap;
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 1024px) {
    .table-header-modern {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .header-actions-modern {
        flex-direction: column;
        width: 100%;
    }

    .search-field {
        width: 100%;
    }
}

@media (max-width: 768px) {
    .documents-view {
        padding: 0.5rem;
    }

    .main-card {
        padding: 1rem;
        border-radius: 12px;
    }

    .header-section {
        gap: 1rem;
        flex-direction: column;
        align-items: flex-start;
    }

    .header-icon-wrapper {
        width: 48px;
        height: 48px;
    }

    .header-icon-wrapper i {
        font-size: 1.5rem;
    }

    .header-title {
        font-size: 1.25rem;
    }

    .header-subtitle {
        font-size: 0.875rem;
    }

    .table-header-modern {
        padding: 1rem;
    }

    .header-icon-badge {
        width: 40px;
        height: 40px;
    }

    .header-icon-badge i {
        font-size: 1.25rem;
    }
}
</style>
