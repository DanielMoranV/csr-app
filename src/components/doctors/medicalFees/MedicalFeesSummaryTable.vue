<script setup>
import { SUMMARY_PAGINATION_CONFIG } from '@/utils/medicalFees/constants';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';

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
</script>

<template>
    <Card class="summary-table-card" v-if="visible">
        <template #title>
            <div class="flex align-items-center gap-2">
                <i class="pi pi-chart-bar"></i>
                <span>Resumen por Médico</span>
                <Tag :value="`${doctorSummary.length} médicos`" severity="info" />
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
</style>
