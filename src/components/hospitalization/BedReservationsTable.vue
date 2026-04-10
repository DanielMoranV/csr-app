<script setup>
import BedReservationAuditDialog from '@/components/hospitalization/BedReservationAuditDialog.vue';
import { AUDIT_ALLOWED_POSITIONS, getStatusConfig } from '@/constants/bedReservation';
import { usePermissions } from '@/composables/usePermissions';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';

defineProps({
    reservations: {
        type: Array,
        default: () => []
    }
});

defineEmits(['edit-reservation', 'delete-reservation']);

const { hasAnyPosition } = usePermissions();

// Permiso para ver auditoría
const canViewAudit = computed(() => hasAnyPosition(AUDIT_ALLOWED_POSITIONS));

// Estado del dialog de auditoría
const auditDialogVisible = ref(false);
const selectedReservation = ref(null);

function openAuditDialog(reservation) {
    selectedReservation.value = reservation;
    auditDialogVisible.value = true;
}

function formatDateTime(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
</script>

<template>
    <div>
        <DataTable :value="reservations" :paginator="true" :rows="10" dataKey="id" responsiveLayout="scroll">
            <Column field="id" header="ID" :sortable="true"></Column>
            <Column field="user.name" header="Reservado por" :sortable="true"></Column>
            <Column field="bed.name" header="Cama" :sortable="true"></Column>
            <Column field="notes" header="Notas" :sortable="true"></Column>
            <Column field="created_at" header="Fecha de Reserva" :sortable="true">
                <template #body="{ data }">
                    {{ formatDateTime(data.created_at) }}
                </template>
            </Column>
            <Column field="status" header="Estado" :sortable="true">
                <template #body="{ data }">
                    <Tag
                        :value="getStatusConfig(data.status).label"
                        :severity="getStatusConfig(data.status).severity"
                    >
                        <template #icon>
                            <i :class="getStatusConfig(data.status).icon" class="mr-1 text-xs"></i>
                        </template>
                    </Tag>
                </template>
            </Column>
            <Column headerStyle="width: 10rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <div class="flex items-center justify-center gap-1">
                        <Button
                            type="button"
                            icon="pi pi-pencil"
                            class="p-button-rounded p-button-success p-button-sm"
                            v-tooltip.top="'Editar'"
                            @click="$emit('edit-reservation', data)"
                        />
                        <Button
                            type="button"
                            icon="pi pi-trash"
                            class="p-button-rounded p-button-warning p-button-sm"
                            v-tooltip.top="'Eliminar'"
                            @click="$emit('delete-reservation', data)"
                        />
                        <Button
                            v-if="canViewAudit"
                            type="button"
                            icon="pi pi-history"
                            severity="info"
                            class="p-button-rounded p-button-sm"
                            v-tooltip.top="'Ver historial'"
                            outlined
                            @click="openAuditDialog(data)"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Modal de historial de auditoría -->
        <BedReservationAuditDialog
            v-model:visible="auditDialogVisible"
            :reservation="selectedReservation"
        />
    </div>
</template>
