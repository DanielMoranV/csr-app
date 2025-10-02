<script setup>
import { computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Badge from 'primevue/badge';

const props = defineProps({
    doctors: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const topDoctors = computed(() => props.doctors.slice(0, 10));

// Determinar el color del badge según el ranking
const getRankBadgeColor = (index) => {
    if (index === 0) return 'warning'; // Gold
    if (index === 1) return 'secondary'; // Silver
    if (index === 2) return 'contrast'; // Bronze
    return 'info';
};

// Formatear número de estancia promedio
const formatStayDays = (days) => {
    if (!days) return '-';
    return `${Number(days).toFixed(1)} días`;
};
</script>

<template>
    <div class="doctors-table-container">
        <DataTable
            :value="topDoctors"
            :loading="loading"
            stripedRows
            showGridlines
            responsiveLayout="scroll"
            :paginator="false"
            class="doctors-table"
        >
            <template #empty>
                <div class="empty-state">
                    <i class="pi pi-users text-4xl text-gray-400 mb-2"></i>
                    <p class="text-gray-500">No hay datos de doctores disponibles</p>
                </div>
            </template>

            <Column header="#" headerStyle="width: 60px" bodyStyle="text-align: center">
                <template #body="{ index }">
                    <Badge :value="index + 1" :severity="getRankBadgeColor(index)" />
                </template>
            </Column>

            <Column field="doctor" header="Doctor" :sortable="true">
                <template #body="{ data }">
                    <div class="doctor-info">
                        <div class="doctor-avatar">
                            <i class="pi pi-user"></i>
                        </div>
                        <div class="doctor-details">
                            <span class="doctor-name">{{ data.doctor }}</span>
                            <span class="doctor-code">{{ data.code_doctor }}</span>
                        </div>
                    </div>
                </template>
            </Column>

            <Column field="total_attentions" header="Atenciones" :sortable="true" headerStyle="width: 150px">
                <template #body="{ data }">
                    <div class="attentions-cell">
                        <Badge :value="data.total_attentions" severity="success" size="large" />
                    </div>
                </template>
            </Column>

            <Column field="avg_stay_days" header="Estancia Promedio" :sortable="true" headerStyle="width: 180px">
                <template #body="{ data }">
                    <div class="stay-cell">
                        <i class="pi pi-clock text-gray-400 mr-2"></i>
                        <span>{{ formatStayDays(data.avg_stay_days) }}</span>
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
.doctors-table-container {
    width: 100%;
}

.doctors-table {
    font-size: 0.9rem;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
}

.doctor-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.doctor-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--primary-100);
    color: var(--primary-500);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
}

.doctor-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.doctor-name {
    font-weight: 600;
    color: var(--text-color);
}

.doctor-code {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

.attentions-cell {
    display: flex;
    align-items: center;
    justify-content: center;
}

.stay-cell {
    display: flex;
    align-items: center;
    color: var(--text-color-secondary);
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
    background: var(--primary-50);
    color: var(--primary-700);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
    background: var(--surface-50);
}

:deep(.p-badge) {
    font-weight: 700;
}

@media (max-width: 768px) {
    .doctor-avatar {
        width: 32px;
        height: 32px;
        font-size: 0.875rem;
    }

    .doctor-name {
        font-size: 0.875rem;
    }

    .doctor-code {
        font-size: 0.7rem;
    }
}
</style>
