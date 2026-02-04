<script setup>
import TariffImportDialog from '@/components/doctors/TariffImportDialog.vue';
import { useDoctorTariffs, useGeneralTariffs, useTariffSync } from '@/composables/useTariffs';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Divider from 'primevue/divider';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import { useConfirm } from 'primevue/useconfirm';
import { onMounted, ref } from 'vue';

// Composables
const generalTariffs = useGeneralTariffs();
const doctorTariffs = useDoctorTariffs();
const { isLoading: isSyncing, syncStats, syncTariffs } = useTariffSync();
const confirm = useConfirm();

// Estado de diálogos
const showImportDialog = ref(false);
const importType = ref('general');

// Inicialización
onMounted(async () => {
    await generalTariffs.loadTariffs();
});

// Handlers
const openImportDialog = (type) => {
    importType.value = type;
    showImportDialog.value = true;
};

const handleImportSuccess = async () => {
    // Los datos se recargan automáticamente en el composable
};

const handleTabChange = async (event) => {
    // Cargar datos del tab de médicos cuando se activa
    if (event.index === 1 && doctorTariffs.tariffs.value.length === 0) {
        await doctorTariffs.loadTariffs();
    }
};

// Sincronización de tarifarios
const confirmSync = () => {
    confirm.require({
        message: '¿Deseas sincronizar los tarifarios desde Sisclin? Esta acción actualizará todos los tarifarios generales y personalizados de doctores.',
        header: 'Confirmar Sincronización',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, sincronizar',
        rejectLabel: 'Cancelar',
        accept: async () => {
            await executeSync();
        }
    });
};

const executeSync = async () => {
    try {
        await syncTariffs();
        // Recargar datos después de la sincronización
        await generalTariffs.loadTariffs();
        if (doctorTariffs.tariffs.value.length > 0) {
            await doctorTariffs.loadTariffs();
        }
    } catch (error) {
        console.error('Error en sincronización:', error);
    }
};

// Formateo de moneda
const formatCurrency = (value) => {
    if (!value) return '-';
    return `S/ ${parseFloat(value).toFixed(2)}`;
};
</script>

<template>
    <div class="tariffs-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-money-bill"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Gestión de Tarifarios</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-chart-line mr-2"></i>
                        Administración de tarifarios generales y personalizados
                    </p>
                </div>
                <div class="header-actions">
                    <Button label="Sincronizar desde Sisclin" icon="pi pi-sync" class="p-button-warning" @click="confirmSync" :loading="isSyncing" :disabled="isSyncing" />
                </div>
            </div>

            <!-- Estadísticas de Sincronización -->
            <Card v-if="syncStats" class="sync-stats-card mb-4">
                <template #title>
                    <div class="flex align-items-center gap-2">
                        <i class="pi pi-check-circle text-green-500"></i>
                        <span>Resultados de Sincronización</span>
                    </div>
                </template>
                <template #content>
                    <div class="grid">
                        <div class="col-12 md:col-6">
                            <div class="stats-section">
                                <h4 class="stats-title">
                                    <i class="pi pi-list mr-2"></i>
                                    Tarifarios Generales
                                </h4>
                                <div class="stats-content">
                                    <div class="stat-item">
                                        <span class="stat-label">✅ Creados:</span>
                                        <span class="stat-value">{{ syncStats.general_tariffs.created }}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">🔄 Actualizados:</span>
                                        <span class="stat-value">{{ syncStats.general_tariffs.updated }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <div class="stats-section">
                                <h4 class="stats-title">
                                    <i class="pi pi-user-edit mr-2"></i>
                                    Tarifarios de Doctores
                                </h4>
                                <div class="stats-content">
                                    <div class="stat-item">
                                        <span class="stat-label">✅ Creados:</span>
                                        <span class="stat-value">{{ syncStats.doctor_tariffs.created }}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">🔄 Actualizados:</span>
                                        <span class="stat-value">{{ syncStats.doctor_tariffs.updated }}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">⏭️ Ignorados:</span>
                                        <span class="stat-value">{{ syncStats.doctor_tariffs.skipped }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Divider />
                    <div class="text-center">
                        <p class="text-sm text-color-secondary mb-0">
                            <i class="pi pi-clock mr-2"></i>
                            Duración: {{ (syncStats.total_duration_ms / 1000).toFixed(2) }} segundos
                        </p>
                    </div>

                    <!-- Registros Huérfanos -->
                    <div v-if="syncStats.doctor_tariffs.orphaned_records?.length > 0" class="mt-3">
                        <Divider />
                        <div class="orphaned-records">
                            <h4 class="orphaned-title">
                                <i class="pi pi-exclamation-triangle text-orange-500 mr-2"></i>
                                Registros Ignorados ({{ syncStats.doctor_tariffs.orphaned_records.length }})
                            </h4>
                            <ul class="orphaned-list">
                                <li v-for="(record, index) in syncStats.doctor_tariffs.orphaned_records" :key="index" class="orphaned-item">{{ record.message }} (Doctor: {{ record.doctor_code }}, Código: {{ record.codigo_segus }})</li>
                            </ul>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- TabView -->
            <TabView @tab-change="handleTabChange">
                <!-- Tab: Tarifario General -->
                <TabPanel>
                    <template #header>
                        <i class="pi pi-list mr-2"></i>
                        <span>Tarifario General</span>
                    </template>

                    <!-- Toolbar -->
                    <Toolbar class="mb-4">
                        <template #start>
                            <Button label="Importar Excel" icon="pi pi-upload" class="p-button-success mr-2" @click="openImportDialog('general')" />
                            <Button label="Recargar" icon="pi pi-refresh" class="p-button-info" @click="generalTariffs.loadTariffs" :loading="generalTariffs.loading.value" />
                        </template>
                        <template #end>
                            <IconField iconPosition="left">
                                <InputIcon>
                                    <i class="pi pi-search" />
                                </InputIcon>
                                <InputText v-model="generalTariffs.filters.value.search" placeholder="Buscar por código o nombre..." @input="generalTariffs.loadTariffs" />
                            </IconField>
                        </template>
                    </Toolbar>

                    <!-- Filtros adicionales -->
                    <div class="grid mb-3">
                        <div class="col-12 md:col-6">
                            <label for="grouper" class="block mb-2">Agrupador</label>
                            <InputText id="grouper" v-model="generalTariffs.filters.value.grouper" placeholder="Filtrar por agrupador" class="w-full" @input="generalTariffs.loadTariffs" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="control_group" class="block mb-2">Grupo de Control</label>
                            <InputText id="control_group" v-model="generalTariffs.filters.value.control_group" placeholder="Filtrar por grupo de control" class="w-full" @input="generalTariffs.loadTariffs" />
                        </div>
                    </div>

                    <!-- DataTable -->
                    <DataTable
                        :value="generalTariffs.tariffs.value"
                        :loading="generalTariffs.loading.value"
                        :paginator="true"
                        :rows="20"
                        :rowsPerPageOptions="[10, 20, 50, 100]"
                        responsiveLayout="scroll"
                        stripedRows
                        showGridlines
                        :globalFilterFields="['code', 'name', 'grouper', 'control_group']"
                    >
                        <Column field="code" header="Código" :sortable="true" style="min-width: 120px">
                            <template #body="{ data }">
                                <strong>{{ data.code }}</strong>
                            </template>
                        </Column>
                        <Column field="name" header="Nombre" :sortable="true" style="min-width: 250px" />
                        <Column field="insurance_cost" header="Costo Seguro" :sortable="true" style="min-width: 130px">
                            <template #body="{ data }">
                                <span>{{ formatCurrency(data.insurance_cost) }}</span>
                            </template>
                        </Column>
                        <Column field="clinic_commission" header="Comisión Clínica" :sortable="true" style="min-width: 150px">
                            <template #body="{ data }">
                                <span>{{ formatCurrency(data.clinic_commission) }}</span>
                            </template>
                        </Column>
                        <Column field="doctor_commission" header="Comisión Médico" :sortable="true" style="min-width: 150px">
                            <template #body="{ data }">
                                <span>{{ formatCurrency(data.doctor_commission) }}</span>
                            </template>
                        </Column>
                        <Column field="total" header="Total" :sortable="true" style="min-width: 120px">
                            <template #body="{ data }">
                                <strong>{{ formatCurrency(data.total) }}</strong>
                            </template>
                        </Column>
                        <Column field="grouper" header="Agrupador" :sortable="true" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag v-if="data.grouper" :value="data.grouper" severity="info" />
                                <span v-else class="text-gray-400">-</span>
                            </template>
                        </Column>
                        <Column field="control_group" header="Grupo Control" :sortable="true" style="min-width: 130px">
                            <template #body="{ data }">
                                <Tag v-if="data.control_group" :value="data.control_group" />
                                <span v-else class="text-gray-400">-</span>
                            </template>
                        </Column>
                        <template #empty>
                            <div class="text-center p-4">
                                <i class="pi pi-inbox text-4xl text-gray-400 mb-3"></i>
                                <p class="text-gray-500">No se encontraron tarifarios</p>
                            </div>
                        </template>
                    </DataTable>
                </TabPanel>

                <!-- Tab: Tarifario Personalizado -->
                <TabPanel>
                    <template #header>
                        <i class="pi pi-user-edit mr-2"></i>
                        <span>Tarifario Personalizado</span>
                    </template>

                    <!-- Toolbar -->
                    <Toolbar class="mb-4">
                        <template #start>
                            <Button label="Importar Excel" icon="pi pi-upload" class="p-button-success mr-2" @click="openImportDialog('doctor')" />
                            <Button label="Recargar" icon="pi pi-refresh" class="p-button-info" @click="doctorTariffs.loadTariffs" :loading="doctorTariffs.loading.value" />
                        </template>
                        <template #end>
                            <IconField iconPosition="left">
                                <InputIcon>
                                    <i class="pi pi-search" />
                                </InputIcon>
                                <InputText v-model="doctorTariffs.filters.value.search" placeholder="Buscar..." @input="doctorTariffs.loadTariffs" />
                            </IconField>
                        </template>
                    </Toolbar>

                    <!-- Filtros adicionales -->
                    <div class="grid mb-3">
                        <div class="col-12 md:col-4">
                            <label for="doctor_code" class="block mb-2">Código Médico</label>
                            <InputText id="doctor_code" v-model="doctorTariffs.filters.value.doctor_code" placeholder="Filtrar por código de médico" class="w-full" @input="doctorTariffs.loadTariffs" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="tariff_code" class="block mb-2">Código Tarifa</label>
                            <InputText id="tariff_code" v-model="doctorTariffs.filters.value.tariff_code" placeholder="Filtrar por código de tarifa" class="w-full" @input="doctorTariffs.loadTariffs" />
                        </div>
                    </div>

                    <!-- DataTable -->
                    <DataTable :value="doctorTariffs.tariffs.value" :loading="doctorTariffs.loading.value" :paginator="true" :rows="20" :rowsPerPageOptions="[10, 20, 50, 100]" responsiveLayout="scroll" stripedRows showGridlines>
                        <Column field="doctor_code" header="Código Médico" :sortable="true" style="min-width: 140px">
                            <template #body="{ data }">
                                <strong>{{ data.doctor_code }}</strong>
                            </template>
                        </Column>
                        <Column field="doctor.name" header="Nombre Médico" :sortable="true" style="min-width: 200px">
                            <template #body="{ data }">
                                {{ data.doctor?.name || '-' }}
                            </template>
                        </Column>
                        <Column field="tariff_code" header="Código Tarifa" :sortable="true" style="min-width: 130px" />
                        <Column field="tariff_name" header="Nombre Tarifa" :sortable="true" style="min-width: 250px" />
                        <Column field="clinic_commission" header="Comisión Clínica" :sortable="true" style="min-width: 150px">
                            <template #body="{ data }">
                                <span>{{ formatCurrency(data.clinic_commission) }}</span>
                            </template>
                        </Column>
                        <Column field="doctor_commission" header="Comisión Médico" :sortable="true" style="min-width: 150px">
                            <template #body="{ data }">
                                <span>{{ formatCurrency(data.doctor_commission) }}</span>
                            </template>
                        </Column>
                        <Column field="total" header="Total" :sortable="true" style="min-width: 120px">
                            <template #body="{ data }">
                                <strong>{{ formatCurrency(data.total) }}</strong>
                            </template>
                        </Column>
                        <Column field="message" header="Mensaje" style="min-width: 200px">
                            <template #body="{ data }">
                                <span v-if="data.message" class="text-sm">{{ data.message }}</span>
                                <span v-else class="text-gray-400">-</span>
                            </template>
                        </Column>
                        <template #empty>
                            <div class="text-center p-4">
                                <i class="pi pi-inbox text-4xl text-gray-400 mb-3"></i>
                                <p class="text-gray-500">No se encontraron tarifarios</p>
                            </div>
                        </template>
                    </DataTable>
                </TabPanel>
            </TabView>
        </div>

        <!-- Dialog de importación -->
        <TariffImportDialog v-model:visible="showImportDialog" :type="importType" @import-success="handleImportSuccess" />
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

/* ============================================================================
   MAIN CONTAINER
   ============================================================================ */
.tariffs-view {
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
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    box-shadow:
        0 8px 20px rgba(16, 185, 129, 0.3),
        0 4px 12px rgba(5, 150, 105, 0.4);
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
    background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%);
    box-shadow:
        0 8px 20px rgba(52, 211, 153, 0.4),
        0 4px 12px rgba(16, 185, 129, 0.5);
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
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

/* ============================================================================
   HEADER ACTIONS
   ============================================================================ */
.header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

/* ============================================================================
   SYNC STATISTICS CARD
   ============================================================================ */
.sync-stats-card {
    animation: fadeIn 0.5s ease-out;
}

.stats-section {
    background: var(--surface-ground);
    border-radius: 12px;
    padding: 1.25rem;
    height: 100%;
    border: 1px solid var(--surface-border);
}

:global(.dark) .stats-section {
    background: rgba(255, 255, 255, 0.02);
}

.stats-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: var(--text-color);
    display: flex;
    align-items: center;
}

.stats-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--surface-border);
}

.stat-item:last-child {
    border-bottom: none;
}

.stat-label {
    font-size: 0.95rem;
    color: var(--text-color-secondary);
}

.stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--primary-color);
}

/* ============================================================================
   ORPHANED RECORDS
   ============================================================================ */
.orphaned-records {
    background: rgba(255, 152, 0, 0.05);
    border: 1px solid rgba(255, 152, 0, 0.2);
    border-radius: 8px;
    padding: 1rem;
}

:global(.dark) .orphaned-records {
    background: rgba(255, 152, 0, 0.1);
}

.orphaned-title {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: var(--text-color);
    display: flex;
    align-items: center;
}

.orphaned-list {
    margin: 0;
    padding-left: 1.5rem;
    list-style-type: disc;
}

.orphaned-item {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin-bottom: 0.5rem;
}

.orphaned-item:last-child {
    margin-bottom: 0;
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 768px) {
    .tariffs-view {
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

    .header-actions {
        width: 100%;
    }

    .header-actions .p-button {
        width: 100%;
    }

    .stats-section {
        padding: 1rem;
    }

    .stat-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }

    .orphaned-list {
        padding-left: 1rem;
    }

    .orphaned-item {
        font-size: 0.8rem;
    }
}
</style>
