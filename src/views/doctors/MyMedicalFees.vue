<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useMedicalFees } from '@/composables/medicalFees/useMedicalFees';
import { useAuthStore } from '@/store/authStore';
import { useToast } from 'primevue/usetoast';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';

const toast = useToast();
const authStore = useAuthStore();

const {
    doctors,
    services,
    isLoading,
    error,
    totals,
    loadDoctorsAndSchedules,
    exportToExcel,
    loadMedicalServices,
    updateService
} = useMedicalFees();

// Obtener datos del médico autenticado
const currentUser = computed(() => authStore.getUser);
const currentDoctor = computed(() => currentUser.value?.doctor);
const hasDoctorProfile = computed(() => !!currentDoctor.value);

// Filtros
const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
const selectedType = ref(null);
const showSummaryTable = ref(true);

const typeOptions = [
    { label: 'Todos', value: null },
    { label: 'Planilla', value: 'PLANILLA' },
    { label: 'Retén', value: 'RETEN' }
];

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    'rawData.admision': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    'rawData.segus': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    serviceType: { value: null, matchMode: FilterMatchMode.EQUALS },
    comision: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    cia: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    tipoate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    serviceTypeReason: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
});

// Computed
const filteredServices = computed(() => {
    let filtered = services.value;
    
    if (selectedType.value) {
        filtered = filtered.filter(s => s.serviceType === selectedType.value);
    }
    
    return filtered;
});

// Totales calculados basándose en servicios filtrados
const filteredTotals = computed(() => {
    const planillaServices = filteredServices.value.filter(s => s.serviceType === 'PLANILLA');
    const retenServices = filteredServices.value.filter(s => s.serviceType === 'RETEN' || s.serviceType === 'RETÉN');
    
    return {
        totalGenerated: filteredServices.value.reduce((sum, s) => sum + s.amount, 0),
        totalPlanilla: planillaServices.reduce((sum, s) => sum + s.amount, 0),
        totalReten: retenServices.reduce((sum, s) => sum + s.amount, 0),
        totalComision: filteredServices.value.reduce((sum, s) => sum + (s.comision || 0), 0),
        serviceCount: filteredServices.value.length,
        planillaCount: planillaServices.length,
        retenCount: retenServices.length
    };
});

// Computed para resumen del médico
const doctorSummary = computed(() => {
    if (!hasDoctorProfile.value || filteredServices.value.length === 0) return [];
    
    const summary = {
        codigo: currentDoctor.value.code,
        nombre: currentDoctor.value.name,
        cantidadPlanilla: 0,
        montoPlanilla: 0,
        cantidadReten: 0,
        montoReten: 0,
        totalComision: 0,
        totalAtenciones: 0,
        totalGenerado: 0
    };
    
    filteredServices.value.forEach(service => {
        const isPlanilla = service.serviceType === 'PLANILLA';
        const isReten = service.serviceType === 'RETEN' || service.serviceType === 'RETÉN';
        
        summary.totalAtenciones++;
        summary.totalGenerado += service.amount;
        summary.totalComision += service.comision || 0;
        
        if (isPlanilla) {
            summary.cantidadPlanilla++;
            summary.montoPlanilla += service.amount;
        } else if (isReten) {
            summary.cantidadReten++;
            summary.montoReten += service.amount;
        }
    });
    
    return [summary];
});

// Methods
async function onCellEditComplete(event) {
    const { data, newValue, field } = event;
    const oldValue = data[field];

    if (newValue === oldValue) return;

    if (field === 'amount' || field === 'comision') {
        if (isNaN(newValue) || newValue < 0) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Valor inválido', life: 3000 });
            return;
        }
    }

    try {
        await updateService(data.id, field, newValue);
        toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 });
    }
}

async function loadDataForMonth() {
    if (!hasDoctorProfile.value) return;
    
    const start = selectedMonth.value.toISOString().split('T')[0];
    const endDate = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + 1, 0);
    const end = endDate.toISOString().split('T')[0];
    
    try {
        await loadDoctorsAndSchedules(start, end);
        
        // Filtrar por el médico autenticado y solo atenciones aprobadas
        const filters = {
            doctor_id: currentDoctor.value.id,
            status: 'aprobado'
        };
        
        await loadMedicalServices(start, end, filters);

        toast.add({
            severity: 'success',
            summary: 'Datos cargados',
            detail: `${services.value.length} servicios cargados`,
            life: 3000
        });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos del mes',
            life: 3000
        });
    }
}

async function onMonthChange() {
    await loadDataForMonth();
}

function handleExport() {
    const filename = `mis_honorarios_${currentDoctor.value.code}_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(filteredServices.value, filename);
    toast.add({
        severity: 'success',
        summary: 'Exportado',
        detail: 'Archivo descargado exitosamente',
        life: 3000
    });
}

function getTypeColor(type) {
    return type === 'PLANILLA' ? 'success' : 'warning';
}

onMounted(async () => {
    if (!hasDoctorProfile.value) {
        toast.add({
            severity: 'warn',
            summary: 'Perfil incompleto',
            detail: 'No se encontró un perfil de médico asociado a su cuenta',
            life: 5000
        });
        return;
    }
    
    await onMonthChange();
});
</script>

<template>
    <div class="my-medical-fees-view">
        <div class="main-card">
            <!-- Header Section -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-user-edit"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Mis Honorarios Médicos</h1>
                    <p class="header-subtitle" v-if="hasDoctorProfile">
                        <i class="pi pi-id-card mr-2"></i>
                        {{ currentDoctor.name }} - Código: {{ currentDoctor.code }}
                    </p>
                    <p class="header-subtitle" v-else>
                        <i class="pi pi-exclamation-triangle mr-2"></i>
                        Sin perfil de médico asociado
                    </p>
                </div>
            </div>

            <!-- Mensaje de advertencia si no tiene perfil de médico -->
            <Message v-if="!hasDoctorProfile" severity="warn" :closable="false" class="mb-4">
                <p class="m-0">
                    <strong>Perfil incompleto:</strong> Su cuenta de usuario no tiene un perfil de médico asociado. 
                    Por favor, contacte al administrador del sistema para vincular su cuenta con su perfil médico.
                </p>
            </Message>

            <!-- Content Section -->
            <template v-if="hasDoctorProfile">
                <!-- Panel de Control -->
                <Card class="control-panel">
                    <template #title>
                        <i class="pi pi-sliders-h"></i> Panel de Control
                    </template>
                    <template #content>
                        <div class="control-grid">
                            <div class="control-item">
                                <label>Mes</label>
                                <DatePicker 
                                    v-model="selectedMonth" 
                                    view="month" 
                                    dateFormat="MM yy"
                                    @date-select="onMonthChange"
                                    placeholder="Seleccionar mes"
                                    class="w-full"
                                />
                            </div>
                            
                            <div class="control-item">
                                <label>Tipo</label>
                                <Dropdown 
                                    v-model="selectedType" 
                                    :options="typeOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Seleccionar tipo"
                                    class="w-full"
                                />
                            </div>
                            
                            <div class="control-item">
                                <label>&nbsp;</label>
                                <div class="flex gap-2">
                                    <Button 
                                        :icon="showSummaryTable ? 'pi pi-eye-slash' : 'pi pi-chart-bar'" 
                                        v-tooltip.top="showSummaryTable ? 'Ocultar Resumen' : 'Ver Resumen'"
                                        @click="showSummaryTable = !showSummaryTable" 
                                        :severity="showSummaryTable ? 'secondary' : 'help'"
                                        :disabled="services.length === 0"
                                    />
                                    <Button 
                                        icon="pi pi-file-excel" 
                                        v-tooltip.top="'Exportar Excel'"
                                        @click="handleExport" 
                                        class="p-button-success"
                                        :disabled="services.length === 0"
                                    />
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- Resumen General -->
                <div class="summary-cards" v-if="services.length > 0">
                    <Card class="summary-card">
                        <template #content>
                            <div class="summary-content">
                                <i class="pi pi-dollar summary-icon"></i>
                                <div>
                                    <div class="summary-label">Total Generado</div>
                                    <div class="summary-value">S/ {{ filteredTotals.totalGenerated.toFixed(2) }}</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                    
                    <Card class="summary-card">
                        <template #content>
                            <div class="summary-content">
                                <i class="pi pi-check-circle summary-icon success"></i>
                                <div>
                                    <div class="summary-label">Planilla</div>
                                    <div class="summary-value">S/ {{ filteredTotals.totalPlanilla.toFixed(2) }}</div>
                                    <div class="summary-count">{{ filteredTotals.planillaCount }} servicios</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                    
                    <Card class="summary-card">
                        <template #content>
                            <div class="summary-content">
                                <i class="pi pi-exclamation-triangle summary-icon warning"></i>
                                <div>
                                    <div class="summary-label">Retén</div>
                                    <div class="summary-value">S/ {{ filteredTotals.totalReten.toFixed(2) }}</div>
                                    <div class="summary-count">{{ filteredTotals.retenCount }} servicios</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                    
                    <Card class="summary-card">
                        <template #content>
                            <div class="summary-content">
                                <i class="pi pi-money-bill summary-icon commission"></i>
                                <div>
                                    <div class="summary-label">Comisión Total</div>
                                    <div class="summary-value">S/ {{ filteredTotals.totalComision.toFixed(2) }}</div>
                                    <div class="summary-count">{{ filteredTotals.serviceCount }} servicios</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Tabla Resumen (Toggle) -->
                <Card class="summary-table-card" v-if="services.length > 0 && showSummaryTable">
                    <template #title>
                        <div class="flex align-items-center gap-2">
                            <i class="pi pi-chart-bar"></i> 
                            <span>Mi Resumen</span>
                        </div>
                    </template>
                    <template #content>
                        <DataTable 
                            :value="doctorSummary" 
                            dataKey="codigo"
                            class="p-datatable-sm"
                            stripedRows
                            responsiveLayout="scroll"
                            showGridlines
                        >
                            <Column field="codigo" header="Código" style="min-width: 100px">
                                <template #body="slotProps">
                                    <span class="font-mono">{{ slotProps.data.codigo }}</span>
                                </template>
                            </Column>
                            
                            <Column field="nombre" header="Médico" style="min-width: 200px">
                                <template #body="slotProps">
                                    <span class="font-semibold">{{ slotProps.data.nombre }}</span>
                                </template>
                            </Column>
                            
                            <Column field="cantidadPlanilla" header="Cant. Planilla" style="min-width: 120px" class="text-center">
                                <template #body="slotProps">
                                    <Tag :value="slotProps.data.cantidadPlanilla" severity="success" />
                                </template>
                            </Column>
                            
                            <Column field="montoPlanilla" header="Monto Planilla" style="min-width: 150px">
                                <template #body="slotProps">
                                    <span class="font-semibold text-green-600">S/ {{ slotProps.data.montoPlanilla.toFixed(2) }}</span>
                                </template>
                            </Column>
                            
                            <Column field="cantidadReten" header="Cant. Retén" style="min-width: 120px" class="text-center">
                                <template #body="slotProps">
                                    <Tag :value="slotProps.data.cantidadReten" severity="warning" />
                                </template>
                            </Column>
                            
                            <Column field="montoReten" header="Monto Retén" style="min-width: 150px">
                                <template #body="slotProps">
                                    <span class="font-semibold text-orange-600">S/ {{ slotProps.data.montoReten.toFixed(2) }}</span>
                                </template>
                            </Column>
                            
                            <Column field="totalComision" header="Total Comisión" style="min-width: 150px">
                                <template #body="slotProps">
                                    <span class="font-bold text-blue-600">S/ {{ slotProps.data.totalComision.toFixed(2) }}</span>
                                </template>
                            </Column>
                            
                            <Column field="totalAtenciones" header="Total Atenciones" style="min-width: 140px" class="text-center">
                                <template #body="slotProps">
                                    <Tag :value="slotProps.data.totalAtenciones" severity="info" />
                                </template>
                            </Column>
                            
                            <Column field="totalGenerado" header="Total Generado" style="min-width: 150px">
                                <template #body="slotProps">
                                    <span class="font-bold text-primary">S/ {{ slotProps.data.totalGenerado.toFixed(2) }}</span>
                                </template>
                            </Column>
                        </DataTable>
                    </template>
                </Card>

                <!-- Tabla de Servicios -->
                <Card class="services-table-card" v-if="services.length > 0">
                    <template #title>
                        <i class="pi pi-list"></i> Detalle de Mis Servicios
                    </template>
                    <template #content>
                        <DataTable 
                            v-model:filters="filters"
                            :value="filteredServices" 
                            dataKey="id"
                            paginator
                            :rows="10"
                            :rowsPerPageOptions="[10, 20, 50, 100]"
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} servicios"
                            class="p-datatable-sm"
                            :loading="isLoading"
                            stripedRows
                            responsiveLayout="scroll"
                            filterDisplay="menu"
                            :globalFilterFields="['id', 'rawData.admision', 'rawData.segus', 'cia', 'tipoate', 'serviceTypeReason']"
                            editMode="cell"
                            @cell-edit-complete="onCellEditComplete"
                        >
                            <template #header>
                                <div class="flex justify-content-between">
                                    <span class="p-input-icon-left">
                                        <i class="pi pi-search" />
                                        <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                                    </span>
                                </div>
                            </template>

                            <Column field="id" header="ID" sortable style="min-width: 80px"></Column>

                            <Column field="rawData.admision" header="Admisión" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    {{ slotProps.data.rawData?.admision || 'N/A' }}
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar admisión" />
                                </template>
                            </Column>
                            
                            <Column header="Fecha y Hora" sortable field="date" style="min-width: 150px">
                                <template #body="slotProps">
                                    {{ slotProps.data.date }} <br>
                                    <small class="text-gray-500">{{ slotProps.data.time }}</small>
                                </template>
                            </Column>

                            <Column field="rawData.segus" header="Servicio Medico" sortable style="min-width: 200px">
                                <template #body="slotProps">
                                    <div style="display: flex; flex-direction: column; gap: 2px;">
                                        <span 
                                            class="font-semibold" 
                                            style="font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;"
                                            v-tooltip.top="slotProps.data.generalTariff?.name"
                                        >
                                            {{ slotProps.data.generalTariff?.name || 'N/A' }}
                                        </span>
                                        <span style="font-size: 0.75rem; color: #6c757d;">
                                            {{ slotProps.data.rawData?.segus || 'N/A' }}
                                        </span>
                                    </div>
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por código o nombre" />
                                </template>
                            </Column>

                            <Column field="cia" header="Cia" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    {{ slotProps.data.cia }}
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por cia" />
                                </template>
                            </Column>

                            <Column field="tipoate" header="Tipo Ate" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    {{ slotProps.data.tipoate }}
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por tipo ate" />
                                </template>
                            </Column>
                            
                            <Column field="amount" header="Monto" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    S/ {{ slotProps.data.amount.toFixed(2) }}
                                </template>
                                <template #editor="{ data, field }">
                                    <InputNumber v-model="data[field]" mode="currency" currency="PEN" locale="es-PE" :min="0" class="w-full" />
                                </template>
                            </Column>

                            <Column field="comision" header="Comisión" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    <span :class="{'text-green-600 font-bold': slotProps.data.comision > 0}">
                                        S/ {{ slotProps.data.comision.toFixed(2) }}
                                    </span>
                                </template>
                                <template #editor="{ data, field }">
                                    <InputNumber v-model="data[field]" mode="currency" currency="PEN" locale="es-PE" :min="0" class="w-full" />
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputNumber v-model="filterModel.value" mode="currency" currency="PEN" locale="es-PE" />
                                </template>
                            </Column>

                            <Column field="serviceType" header="Tipo" sortable :showFilterMatchModes="false" style="min-width: 120px">
                                <template #body="slotProps">
                                    <Tag 
                                        :value="slotProps.data.serviceType" 
                                        :severity="getTypeColor(slotProps.data.serviceType)"
                                    />
                                </template>
                                <template #editor="{ data, field }">
                                    <Dropdown v-model="data[field]" :options="['PLANILLA', 'RETEN']" class="w-full" />
                                </template>
                                <template #filter="{ filterModel }">
                                    <Dropdown v-model="filterModel.value" :options="['PLANILLA', 'RETÉN']" placeholder="Seleccionar" class="p-column-filter" showClear />
                                </template>
                            </Column>

                            <Column field="serviceTypeReason" header="Observaciones" style="min-width: 250px">
                                <template #body="slotProps">
                                    <small>{{ slotProps.data.serviceTypeReason }}</small>
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar en observaciones" />
                                </template>
                            </Column>
                        </DataTable>
                    </template>
                </Card>

                <!-- Estado vacío -->
                <div class="empty-state" v-else>
                    <i class="pi pi-inbox empty-icon"></i>
                    <h3>No hay servicios cargados</h3>
                    <p class="text-muted">
                        Selecciona un mes para ver tus honorarios médicos.
                    </p>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
/* Reutilizar estilos de MedicalFees.vue */
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

.my-medical-fees-view {
    padding: 1.5rem;
    min-height: 100vh;
}

.main-card {
    background: var(--surface-card);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    animation: fadeIn 0.3s ease-out;
}

/* Header */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--surface-border);
}

.header-icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.header-icon-wrapper i {
    font-size: 2rem;
    color: white;
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

/* Control Panel */
.control-panel {
    margin-bottom: 1.5rem;
}

.control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.control-item label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-color);
}

/* Summary Cards */
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.summary-card {
    animation: fadeIn 0.4s ease-out;
}

.summary-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.summary-icon {
    font-size: 2.5rem;
    color: #667eea;
}

.summary-icon.success {
    color: #48bb78;
}

.summary-icon.warning {
    color: #ed8936;
}

.summary-icon.commission {
    color: #4299e1;
}

.summary-label {
    font-size: 0.875rem;
    color: #718096;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #2d3748;
    margin-top: 0.25rem;
}

.summary-count {
    font-size: 0.75rem;
    color: #a0aec0;
    margin-top: 0.25rem;
}

/* Summary Table Card */
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

/* Services Table */
.services-table-card {
    margin-top: 2rem;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 4rem 2rem;
}

.empty-icon {
    font-size: 4rem;
    color: var(--text-color-secondary);
    margin-bottom: 1rem;
}

.empty-state h3 {
    color: var(--text-color);
    margin-bottom: 0.5rem;
}

.text-muted {
    color: var(--text-color-secondary);
}
</style>
