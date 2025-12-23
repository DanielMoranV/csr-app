<script setup>
import { useScreenshot } from '@/composables/useScreenshot';
import { SUMMARY_PAGINATION_CONFIG } from '@/utils/medicalFees/constants';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { ref } from 'vue';

const props = defineProps({
    doctorSummary: {
        type: Array,
        required: true
    },
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['delete-doctor']);

// Screenshot functionality
const { isCapturing, captureAndDownload, generateFilename } = useScreenshot();
const tableCardRef = ref(null);

/**
 * Captura screenshot de la tabla
 */
const handleScreenshot = async () => {
    if (!tableCardRef.value) return;

    // Agregar clase para ocultar elementos durante captura
    const cardElement = tableCardRef.value.$el;
    cardElement.classList.add('screenshot-capturing');

    // Ocultar manualmente la columna de acciones y el botón de captura
    const captureButton = cardElement.querySelector('.p-card-title button');
    const actionHeaders = cardElement.querySelectorAll('th[data-p-frozen-column="true"], th.actions-column');
    const actionCells = cardElement.querySelectorAll('td[data-p-frozen-column="true"], td.actions-column');

    // Guardar display original
    const originalDisplays = [];

    if (captureButton) {
        originalDisplays.push({ el: captureButton, display: captureButton.style.display });
        captureButton.style.display = 'none';
    }

    actionHeaders.forEach((el) => {
        originalDisplays.push({ el, display: el.style.display });
        el.style.display = 'none';
    });

    actionCells.forEach((el) => {
        originalDisplays.push({ el, display: el.style.display });
        el.style.display = 'none';
    });

    try {
        // Pequeña pausa para asegurar que el DOM se actualice
        await new Promise((resolve) => setTimeout(resolve, 100));

        const filename = generateFilename('resumen_medicos');
        const success = await captureAndDownload(cardElement, filename, {
            backgroundColor: '#ffffff',
            windowWidth: cardElement.scrollWidth,
            windowHeight: cardElement.scrollHeight,
            foreignObjectRendering: false,
            // Aplicar estilos directamente en el documento clonado
            onclone: (clonedDoc) => {
                // Ocultar el paginador
                const paginator = clonedDoc.querySelector('.p-paginator');
                if (paginator) paginator.style.display = 'none';

                // Mejorar el título
                const cardTitle = clonedDoc.querySelector('.p-card-title');
                if (cardTitle) {
                    cardTitle.style.fontSize = '1.5rem';
                    cardTitle.style.fontWeight = '700';
                    cardTitle.style.color = '#212529';
                    cardTitle.style.marginBottom = '1.5rem';
                    cardTitle.style.paddingBottom = '0.75rem';
                    cardTitle.style.borderBottom = '2px solid #dee2e6';
                }

                // Aplicar estilos a la tabla
                const table = clonedDoc.querySelector('.p-datatable-table');
                if (table) {
                    table.style.border = '1px solid #dee2e6';
                    table.style.borderCollapse = 'collapse';
                    table.style.width = '100%';
                }

                // Aplicar estilos a encabezados
                const headers = clonedDoc.querySelectorAll('.p-datatable-thead th');
                headers.forEach((th) => {
                    th.style.backgroundColor = '#f8f9fa';
                    th.style.color = '#495057';
                    th.style.border = '1px solid #dee2e6';
                    th.style.padding = '0.75rem 0.5rem';
                    th.style.fontWeight = '700';
                    th.style.fontSize = '0.75rem';
                    th.style.textTransform = 'uppercase';
                    th.style.textAlign = 'center';
                    th.style.verticalAlign = 'middle';
                    th.style.whiteSpace = 'nowrap';
                });

                // Aplicar estilos a celdas
                const cells = clonedDoc.querySelectorAll('.p-datatable-tbody td');
                cells.forEach((td) => {
                    td.style.border = '1px solid #dee2e6';
                    td.style.padding = '0.75rem 0.5rem';
                    td.style.color = '#212529';
                    td.style.fontSize = '0.875rem';
                    td.style.verticalAlign = 'middle';
                });

                // Filas alternas
                const rows = clonedDoc.querySelectorAll('.p-datatable-tbody tr');
                rows.forEach((tr, index) => {
                    if (index % 2 === 1) tr.style.backgroundColor = '#f8f9fa';
                });

                // Tags - Estilo profesional mejorado
                const tags = clonedDoc.querySelectorAll('.p-tag');
                tags.forEach((tag) => {
                    tag.style.padding = '0.35rem 0.65rem';
                    tag.style.borderRadius = '4px';
                    tag.style.fontSize = '0.8rem';
                    tag.style.fontWeight = '700';
                    tag.style.display = 'inline-block';
                    tag.style.minWidth = '40px';
                    tag.style.textAlign = 'center';
                    tag.style.border = '1px solid';

                    if (tag.classList.contains('p-tag-success')) {
                        tag.style.backgroundColor = '#d4edda';
                        tag.style.color = '#155724';
                        tag.style.borderColor = '#c3e6cb';
                    } else if (tag.classList.contains('p-tag-warning')) {
                        tag.style.backgroundColor = '#fff3cd';
                        tag.style.color = '#856404';
                        tag.style.borderColor = '#ffeeba';
                    } else if (tag.classList.contains('p-tag-info')) {
                        tag.style.backgroundColor = '#d1ecf1';
                        tag.style.color = '#0c5460';
                        tag.style.borderColor = '#bee5eb';
                    } else {
                        tag.style.backgroundColor = '#d1ecf1';
                        tag.style.color = '#0c5460';
                        tag.style.borderColor = '#bee5eb';
                    }
                });

                // Montos con colores mejorados
                clonedDoc.querySelectorAll('.text-green-600').forEach((el) => {
                    el.style.color = '#155724';
                    el.style.fontWeight = '700';
                });
                clonedDoc.querySelectorAll('.text-orange-600').forEach((el) => {
                    el.style.color = '#d63384';
                    el.style.fontWeight = '700';
                });
                clonedDoc.querySelectorAll('.text-blue-600').forEach((el) => {
                    el.style.color = '#0c5460';
                    el.style.fontWeight = '700';
                });
                clonedDoc.querySelectorAll('.text-primary').forEach((el) => {
                    el.style.color = '#0d6efd';
                    el.style.fontWeight = '700';
                });
                clonedDoc.querySelectorAll('.font-bold').forEach((el) => {
                    el.style.fontWeight = '700';
                });
                clonedDoc.querySelectorAll('.font-semibold').forEach((el) => {
                    el.style.fontWeight = '600';
                });

                // Alineación de texto
                clonedDoc.querySelectorAll('.text-center').forEach((el) => {
                    el.style.textAlign = 'center';
                });

                // Fuente monospace para códigos
                clonedDoc.querySelectorAll('.font-mono').forEach((el) => {
                    el.style.fontFamily = 'monospace';
                    el.style.fontSize = '0.85rem';
                });
            }
        });

        if (success) {
            console.log('Screenshot capturado exitosamente');
        }
    } finally {
        // Restaurar displays originales
        originalDisplays.forEach(({ el, display }) => {
            el.style.display = display;
        });

        // Remover clase después de captura
        cardElement.classList.remove('screenshot-capturing');
    }
};

/**
 * Maneja la eliminación de un médico
 */
const handleDeleteDoctor = (doctor) => {
    emit('delete-doctor', doctor.codigo);
};
</script>

<template>
    <Card class="summary-table-card" v-if="visible" ref="tableCardRef">
        <template #title>
            <div class="flex align-items-center justify-content-between">
                <div class="flex align-items-center gap-2">
                    <i class="pi pi-chart-bar"></i>
                    <span>Resumen por Médico</span>
                    <Tag :value="`${doctorSummary.length} médicos`" severity="info" />
                </div>
                <Button icon="pi pi-camera" label="Capturar" severity="secondary" outlined size="small" :loading="isCapturing" @click="handleScreenshot" v-tooltip.top="'Capturar screenshot profesional'" />
            </div>
        </template>
        <template #content>
            <DataTable
                :value="doctorSummary"
                dataKey="codigo"
                paginator
                :rows="SUMMARY_PAGINATION_CONFIG.rows"
                :rowsPerPageOptions="SUMMARY_PAGINATION_CONFIG.rowsPerPageOptions"
                :paginatorTemplate="SUMMARY_PAGINATION_CONFIG.paginatorTemplate"
                :currentPageReportTemplate="SUMMARY_PAGINATION_CONFIG.currentPageReportTemplate"
                class="p-datatable-sm"
                stripedRows
                responsiveLayout="scroll"
                showGridlines
            >
                <Column field="codigo" header="Código" sortable style="min-width: 100px">
                    <template #body="slotProps">
                        <span class="font-mono">{{ slotProps.data.codigo }}</span>
                    </template>
                </Column>

                <Column field="nombre" header="Médico" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <span class="font-semibold">{{ slotProps.data.nombre }}</span>
                    </template>
                </Column>

                <Column field="cantidadPlanilla" header="Cant. Planilla" sortable style="min-width: 120px" class="text-center">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.cantidadPlanilla" severity="success" />
                    </template>
                </Column>

                <Column field="montoPlanilla" header="Monto Planilla" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <span class="font-semibold text-green-600">S/ {{ slotProps.data.montoPlanilla.toFixed(2) }}</span>
                    </template>
                </Column>

                <Column field="cantidadReten" header="Cant. Retén" sortable style="min-width: 120px" class="text-center">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.cantidadReten" severity="warning" />
                    </template>
                </Column>

                <Column field="montoReten" header="Monto Retén" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <span class="font-semibold text-orange-600">S/ {{ slotProps.data.montoReten.toFixed(2) }}</span>
                    </template>
                </Column>

                <Column field="totalComision" header="Total Comisión" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <span class="font-bold text-blue-600">S/ {{ slotProps.data.totalComision.toFixed(2) }}</span>
                    </template>
                </Column>

                <Column field="totalAtenciones" header="Total Atenciones" sortable style="min-width: 140px" class="text-center">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.totalAtenciones" severity="info" />
                    </template>
                </Column>

                <Column field="totalGenerado" header="Total Generado" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <span class="font-bold text-primary">S/ {{ slotProps.data.totalGenerado.toFixed(2) }}</span>
                    </template>
                </Column>

                <Column header="Acciones" columnKey="actions" :class="'actions-column'" style="min-width: 100px" class="text-center" :frozen="true" alignFrozen="right">
                    <template #body="slotProps">
                        <Button icon="pi pi-trash" severity="danger" text rounded @click="handleDeleteDoctor(slotProps.data)" v-tooltip.top="'Eliminar médico del período actual'" />
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>
</template>

<style scoped>
.summary-table-card {
    margin-bottom: 1.5rem;
    animation: fadeIn 0.4s ease-out;
}

.summary-table-card :deep(.p-card-title) {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 1rem;
}

.summary-table-card :deep(.p-datatable) {
    font-size: 0.9rem;
}

.summary-table-card :deep(.p-datatable-thead > tr > th) {
    background: var(--surface-100);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
}

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

/* ============================================================================
   SCREENSHOT STYLES
   ============================================================================ */

/* Ocultar elementos durante captura de screenshot */
.screenshot-capturing :deep(.p-card-title) {
    /* Ocultar el botón de captura durante la captura */
    button {
        display: none !important;
    }
}

/* Ocultar columna de acciones durante captura - Múltiples selectores para asegurar que funcione */
/* Selector por clase de columna */
.screenshot-capturing :deep(.actions-column) {
    display: none !important;
}

/* Selector por data-p-frozen (columnas frozen de PrimeVue) */
.screenshot-capturing :deep([data-p-frozen-column='true']) {
    display: none !important;
}

/* Selector por posición (fallback) */
.screenshot-capturing :deep(.p-datatable-thead > tr > th:last-child),
.screenshot-capturing :deep(.p-datatable-tbody > tr > td:last-child) {
    display: none !important;
}

/* Ocultar específicamente celdas con el header "Acciones" */
.screenshot-capturing :deep(th:has([class*='actions'])),
.screenshot-capturing :deep(td:has(button[class*='trash'])) {
    display: none !important;
}

/* Mejorar estilos para captura */
.screenshot-capturing :deep(.p-datatable) {
    border: 1px solid #dee2e6;
}

.screenshot-capturing :deep(.p-datatable-thead > tr > th) {
    background-color: #f8f9fa !important;
    color: #495057 !important;
    border: 1px solid #dee2e6 !important;
}

.screenshot-capturing :deep(.p-datatable-tbody > tr > td) {
    border: 1px solid #dee2e6 !important;
    color: #212529 !important;
}

/* Asegurar que los tags se vean bien */
.screenshot-capturing :deep(.p-tag) {
    background-color: #e3f2fd !important;
    color: #1976d2 !important;
}

.screenshot-capturing :deep(.p-tag.p-tag-success) {
    background-color: #e8f5e9 !important;
    color: #388e3c !important;
}

.screenshot-capturing :deep(.p-tag.p-tag-warning) {
    background-color: #fff3e0 !important;
    color: #f57c00 !important;
}

/* Mejorar contraste de textos de montos */
.screenshot-capturing :deep(.text-green-600) {
    color: #2e7d32 !important;
}

.screenshot-capturing :deep(.text-orange-600) {
    color: #e65100 !important;
}

.screenshot-capturing :deep(.text-blue-600) {
    color: #1565c0 !important;
}

.screenshot-capturing :deep(.text-primary) {
    color: #1976d2 !important;
}
</style>
