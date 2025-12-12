<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useMedicalFees } from '@/composables/medicalFees/useMedicalFees';
import { useToast } from 'primevue/usetoast';
import { useMedicalSpecialtiesStore } from '@/store/medicalSpecialtiesStore';
import { FilterMatchMode, FilterOperator }  from '@primevue/core/api';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';

const toast = useToast();
const {
    doctors,
    services,
    isLoading,
    error,
    servicesByDoctor,
    servicesByType,
    totals,
    loadDoctorsAndSchedules,
    importFromExcel,
    exportToExcel,
    clearAllData,
    saveToDatabase,
    loadMedicalServices,
    updateService,
    isExcelData
} = useMedicalFees();

async function onCellEditComplete(event) {
    const { data, newValue, field } = event;
    const oldValue = data[field];

    // Si no hubo cambio, ignorar
    if (newValue === oldValue) return;

    // Validación básica
    if (field === 'amount' || field === 'comision') {
         if (isNaN(newValue) || newValue < 0) {
             toast.add({ severity: 'error', summary: 'Error', detail: 'Valor inválido', life: 3000 });
             return; // O revertir cambio
         }
    }

    try {
        await updateService(data.id, field, newValue);
        toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 });
        // Aquí idealmente revertiríamos el cambio en la UI si falla, pero el datatable a veces lo mantiene
    }
}


// Filtros
const selectedSpecialty = ref(null);
// Inicializar con el mes anterior (donde están los datos del Excel)
const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
const selectedDoctor = ref(null);
const selectedType = ref(null);
const specialties = ref([]);
const isSpecialtiesLoading = ref(true);

const typeOptions = [
    { label: 'Todos', value: null },
    { label: 'Planilla', value: 'PLANILLA' },
    { label: 'Retén', value: 'RETEN' }
];

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    'rawData.admision': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    'doctor.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    'rawData.segus': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    serviceType: { value: null, matchMode: FilterMatchMode.EQUALS },
    comision: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    cia: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    tipoate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    serviceTypeReason: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
});

// Computed
const canImport = computed(() => !isLoading.value && !isSpecialtiesLoading.value && doctors.value.length > 0);

const doctorOptions = computed(() => {
    let filteredDoctors = doctors.value;
    
    // Filtrar médicos por especialidad seleccionada (basado en la relación del backend)
    if (selectedSpecialty.value) {
        filteredDoctors = doctors.value.filter(doctor => {
            // Verificar si el médico tiene el array de especialidades
            if (!doctor.specialties || !Array.isArray(doctor.specialties)) {
                return false;
            }
            
            // Verificar si alguna especialidad del médico coincide con la seleccionada
            return doctor.specialties.some(specialty => specialty.id === selectedSpecialty.value);
        });
    }
    
    return [
        { label: 'Todos los médicos', value: null },
        ...filteredDoctors.map(d => ({ label: d.name, value: d.code }))
    ];
});


const specialtyOptions = computed(() => [
    { label: 'Todas las especialidades', value: null },
    ...specialties.value.map(s => ({ label: s.name, value: s.id }))
]);

const filteredServices = computed(() => {
    let filtered = services.value;
    
    // Filtrar por especialidad (indirectamente a través de los médicos)
    if (selectedSpecialty.value) {
        // Obtener códigos de médicos que pertenecen a la especialidad seleccionada
        const doctorCodesInSpecialty = doctors.value
            .filter(doctor => {
                if (!doctor.specialties || !Array.isArray(doctor.specialties)) {
                    return false;
                }
                return doctor.specialties.some(specialty => specialty.id === selectedSpecialty.value);
            })
            .map(doctor => doctor.code);
        
        // Filtrar servicios por médicos de esa especialidad
        filtered = filtered.filter(s => doctorCodesInSpecialty.includes(s.doctorCode));
    }
    
    if (selectedDoctor.value) {
        filtered = filtered.filter(s => s.doctor?.code === selectedDoctor.value);
    }
    
    if (selectedType.value) {
        filtered = filtered.filter(s => s.serviceType === selectedType.value);
    }
    
    return filtered;
});

// Totales calculados basándose en servicios filtrados
const filteredTotals = computed(() => {
    const planillaServices = filteredServices.value.filter(s => s.serviceType === 'PLANILLA');
    const retenServices = filteredServices.value.filter(s => s.serviceType === 'RETEN' || s.serviceType === 'RETÉN');
    
    // Obtener médicos únicos de los servicios filtrados
    const uniqueDoctors = new Set(
        filteredServices.value
            .filter(s => s.doctor)
            .map(s => s.doctor.code)
    );
    
    return {
        totalGenerated: filteredServices.value.reduce((sum, s) => sum + s.amount, 0),
        totalPlanilla: planillaServices.reduce((sum, s) => sum + s.amount, 0),
        totalReten: retenServices.reduce((sum, s) => sum + s.amount, 0),
        serviceCount: filteredServices.value.length,
        planillaCount: planillaServices.length,
        retenCount: retenServices.length,
        doctorCount: uniqueDoctors.size
    };
});

// Watch para limpiar el filtro de médico cuando cambia la especialidad
watch(selectedSpecialty, () => {
    // Si hay un médico seleccionado, verificar si pertenece a la nueva especialidad
    if (selectedDoctor.value) {
        const doctorStillValid = doctorOptions.value.some(opt => opt.value === selectedDoctor.value);
        if (!doctorStillValid) {
            selectedDoctor.value = null;
        }
    }
});

// Methods


// Funciones de carga
async function loadServerData() {
    const start = selectedMonth.value.toISOString().split('T')[0];
    const endDate = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + 1, 0);
    const end = endDate.toISOString().split('T')[0];

    // Preparar filtros
    const filters = {};
    if (selectedSpecialty.value) {
        filters.medical_specialty_id = selectedSpecialty.value;
    }
    // Buscar ID del médico seleccionado (ya que selectedDoctor es el código)
    if (selectedDoctor.value) {
        const doctorObj = doctors.value.find(d => d.code === selectedDoctor.value);
        if (doctorObj) {
            filters.doctor_id = doctorObj.id;
        }
    }

    await loadMedicalServices(start, end, filters);
}

async function loadDataForMonth() {
    // Validar que son objetos Date válidos
    const start = selectedMonth.value.toISOString().split('T')[0];
    const endDate = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + 1, 0);
    const end = endDate.toISOString().split('T')[0];
    
    try {
        // Cargar dependencias (médicos, horarios)
        await loadDoctorsAndSchedules(start, end);
        
        // Preparar filtros iniciales
        const filters = {};
        if (selectedSpecialty.value) {
            filters.medical_specialty_id = selectedSpecialty.value;
        }
        if (selectedDoctor.value) {
            const doctorObj = doctors.value.find(d => d.code === selectedDoctor.value);
            if (doctorObj) {
                filters.doctor_id = doctorObj.id;
            }
        }
        
        // Cargar servicios de la BD con filtros
        await loadMedicalServices(start, end, filters);

        toast.add({
            severity: 'success',
            summary: 'Datos cargados',
            detail: `${doctors.value.length} médicos y ${services.value.length} servicios cargados`,
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

async function handleSearch() {
    try {
        await loadServerData();
        toast.add({
            severity: 'success',
            summary: 'Búsqueda completada',
            detail: `${services.value.length} servicios encontrados`,
            life: 3000
        });
    } catch (err) {
        console.error('handleSearch Error:', err);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Falló la búsqueda en servidor: ' + (err.message || 'Error desconocido'),
            life: 3000
        });
    }
}

async function onMonthChange() {
    await loadDataForMonth();
}

async function onFileSelect(event) {
    const file = event.files[0];
    if (!file) return;
    
    try {
        await importFromExcel(file);
        toast.add({
            severity: 'success',
            summary: 'Excel importado',
            detail: `${services.value.length} servicios procesados`,
            life: 3000
        });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Error al importar',
            detail: error.value,
            life: 5000
        });
    }
}

function handleExport() {
    const filename = `honorarios_medicos_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(filteredServices.value, filename);
    toast.add({
        severity: 'success',
        summary: 'Exportado',
        detail: 'Archivo descargado exitosamente',
        life: 3000
    });
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        await importFromExcel(file);
        toast.add({
            severity: 'success',
            summary: 'Importado',
            detail: `${services.value.length} servicios procesados`,
            life: 3000
        });
        // Limpiar el input para permitir reimportar el mismo archivo
        event.target.value = '';
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Error al importar',
            detail: err.message || 'Error desconocido',
            life: 5000
        });
        // Limpiar el input
        event.target.value = '';
    }
}

function getTypeColor(type) {
    return type === 'PLANILLA' ? 'success' : 'warning';
}

async function handleSaveToDatabase() {
    try {
        const result = await saveToDatabase();
        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Guardado exitoso',
                detail: result.message || `${result.data?.imported_count || 0} registros guardados`,
                life: 3000
            });
            // Recargar datos de la BD para confirmar
            onMonthChange();
        }
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: err.message || 'Ocurrió un error inesperado',
            life: 5000
        });
    }
}

onMounted(async () => {
    isSpecialtiesLoading.value = true;
    const specialtiesStore = useMedicalSpecialtiesStore();

    // Cargar especialidades médicas (con caché)
    try {
        // Si ya hay datos en el store, usarlos directamente (Caché)
        if (specialtiesStore.allSpecialties.length > 0) {
             specialties.value = specialtiesStore.allSpecialties;
             console.log('Usando especialidades desde caché');
        } else {
             // Si no, cargar de la API
             await specialtiesStore.fetchSpecialties();
             specialties.value = specialtiesStore.allSpecialties;
             console.log('Especialidades cargadas de API');
        }

        // Pre-seleccionar Pediatría por defecto (ID 32)
        const pediatric = specialties.value.find(s => s.id === 32);
        if (pediatric) {
            selectedSpecialty.value = pediatric.id;
        }
    } catch (err) {
        console.error('Error al cargar especialidades:', err);
    } finally {
        isSpecialtiesLoading.value = false;
    }
    
    // Cargar datos del mes actual
    onMonthChange();
});

function handleClearData() {
    clearAllData();
    toast.add({
        severity: 'success',
        summary: 'Datos limpiados',
        detail: 'Todos los datos han sido eliminados',
        life: 3000
    });
}
</script>

<template>
    <div class="medical-fees-view">
        <div class="main-card">
            <!-- Header Section -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-dollar"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Honorarios Médicos</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-chart-line mr-2"></i>
                        Gestión y clasificación de honorarios del personal médico
                    </p>
                </div>
                <div class="header-actions">
                    <Button 
                        label="Limpiar Datos" 
                        icon="pi pi-trash" 
                        severity="danger"
                        outlined
                        class="clear-button" 
                        @click="handleClearData"
                        :disabled="services.length === 0"
                    />
                    <Button 
                        :label="!canImport ? 'Cargando datos...' : 'Importar Excel'"
                        :icon="!canImport ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" 
                        class="import-button" 
                        @click="$refs.fileInput.click()"
                        :loading="!canImport"
                        :disabled="!canImport"
                    />
                    <Button 
                        v-if="services.length > 0"
                        label="Guardar en BD" 
                        icon="pi pi-database" 
                        severity="success"
                        class="save-button ml-2" 
                        @click="handleSaveToDatabase"
                        :loading="isLoading"
                    />
                </div>
                <input 
                    ref="fileInput" 
                    type="file" 
                    accept=".xlsx,.xls" 
                    style="display: none" 
                    @change="handleFileUpload"
                    :disabled="!canImport"
                />
            </div>

            <!-- Content Section -->
                <!-- Panel de Control -->
                <Card class="control-panel">
                    <template #title>
                        <i class="pi pi-sliders-h"></i> Panel de Control
                    </template>
                    <template #content>
                        <div class="control-grid">
                            <div class="control-item">
                                <label>Especialidad</label>
                                <Dropdown 
                                    v-model="selectedSpecialty" 
                                    :options="specialtyOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Seleccionar especialidad"
                                    :filter="true"
                                    class="w-full"
                                />
                            </div>
                            
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
                                <label>Médico</label>
                                <Dropdown 
                                    v-model="selectedDoctor" 
                                    :options="doctorOptions" 
                                    optionLabel="label" 
                                    optionValue="value" 
                                    placeholder="Seleccionar médico"
                                    :filter="true"
                                    class="w-full"
                                    showClear
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
                                        icon="pi pi-search" 
                                        v-tooltip.top="'Buscar en BD'"
                                        @click="handleSearch"
                                        :loading="isLoading"
                                        severity="info"
                                    />
                                    <Button 
                                        icon="pi pi-file-excel" 
                                        v-tooltip.top="'Exportar Excel'"
                                        @click="exportToExcel" 
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
                                <i class="pi pi-users summary-icon"></i>
                                <div>
                                    <div class="summary-label">Médicos</div>
                                    <div class="summary-value">{{ filteredTotals.doctorCount }}</div>
                                    <div class="summary-count">{{ filteredTotals.serviceCount }} servicios</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Tabla de Servicios -->
                <Card class="services-table-card" v-if="services.length > 0">
                    <template #title>
                        <i class="pi pi-list"></i> Detalle de Servicios
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
                            :globalFilterFields="['id', 'rawData.admision', 'doctor.name', 'rawData.segus', 'cia', 'tipoate', 'serviceTypeReason']"
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

                            <!-- ID -->
                            <Column field="id" header="ID" sortable style="min-width: 80px"></Column>

                            <!-- Admisión -->
                            <Column field="rawData.admision" header="Admisión" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    {{ slotProps.data.rawData?.admision || 'N/A' }}
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar admisión" />
                                </template>
                            </Column>
                            
                            <!-- Fecha y Hora combinadas -->
                            <Column header="Fecha y Hora" sortable field="date" style="min-width: 150px">
                                <template #body="slotProps">
                                    {{ slotProps.data.date }} <br>
                                    <small class="text-gray-500">{{ slotProps.data.time }}</small>
                                </template>
                            </Column>

                            <!-- Médico (antes Servicio) -->
                            <Column field="doctor.name" header="Médico" sortable style="min-width: 200px">
                                <template #body="slotProps">
                                    <div class="font-medium">{{ slotProps.data.doctor?.name || 'N/A' }}</div>
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por médico" />
                                </template>
                            </Column>

                            <!-- Servicio Medico (antes Segus) -->
                            <Column field="rawData.segus" header="Servicio Medico" sortable style="min-width: 150px">
                                <template #body="slotProps">
                                    {{ slotProps.data.rawData?.segus || 'N/A' }}
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por código" />
                                </template>
                            </Column>

                            <!-- Cia -->
                            <Column field="cia" header="Cia" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    {{ slotProps.data.cia }}
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por cia" />
                                </template>
                            </Column>

                            <!-- Tipo Ate -->
                            <Column field="tipoate" header="Tipo Ate" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    {{ slotProps.data.tipoate }}
                                </template>
                                <template #filter="{ filterModel }">
                                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Buscar por tipo ate" />
                                </template>
                            </Column>
                            
                            <!-- Monto -->
                            <Column field="amount" header="Monto" sortable style="min-width: 120px">
                                <template #body="slotProps">
                                    S/ {{ slotProps.data.amount.toFixed(2) }}
                                </template>
                                <template #editor="{ data, field }">
                                    <InputNumber v-model="data[field]" mode="currency" currency="PEN" locale="es-PE" :min="0" class="w-full" />
                                </template>
                            </Column>

                            <!-- Comisión (Nueva columna) -->
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

                            <!-- Tipo -->
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

                            <!-- Observaciones (antes Detalle) -->
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
                        Selecciona un periodo e importa un archivo Excel para comenzar.
                    </p>
                </div>
        </div>
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
.medical-fees-view {
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
    background: linear-gradient(90deg, #667eea, #764ba2, #667eea, #764ba2);
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%);
    box-shadow:
        0 8px 20px rgba(102, 126, 234, 0.3),
        0 4px 12px rgba(118, 75, 162, 0.4);
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
    background: linear-gradient(135deg, #764ba2 0%, #667eea 50%, #764ba2 100%);
    box-shadow:
        0 8px 20px rgba(118, 75, 162, 0.4),
        0 4px 12px rgba(102, 126, 234, 0.5);
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
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

.header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.clear-button {
    transition: all 0.3s ease !important;
}

.clear-button:hover:not(:disabled) {
    transform: translateY(-2px) !important;
}

.import-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    border: none !important;
    padding: 0.75rem 1.5rem !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
    transition: all 0.3s ease !important;
}

.import-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4) !important;
}

.card-body {
    padding: 2rem;
}

/* Control Panel */
.control-panel {
    margin-bottom: 2rem;
}

.control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.control-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.control-item label {
    font-weight: 600;
    color: #4a5568;
    font-size: 0.875rem;
}

/* Summary Cards */
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.summary-card {
    border-left: 4px solid #667eea;
    transition: transform 0.2s, box-shadow 0.2s;
}

.summary-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
    color: #cbd5e0;
    margin-bottom: 1rem;
}

.empty-state h3 {
    color: #4a5568;
    margin-bottom: 0.5rem;
}

.text-muted {
    color: #a0aec0;
    font-size: 0.95rem;
}

/* Responsive */
@media (max-width: 768px) {
    .medical-fees-container {
        padding: 1rem;
    }

    .card-header {
        padding: 1.5rem;
    }

    .header-title {
        font-size: 1.5rem;
    }

    .card-body {
        padding: 1rem;
    }

    .control-grid {
        grid-template-columns: 1fr;
    }

    .summary-cards {
        grid-template-columns: 1fr;
    }

    .summary-value {
        font-size: 1.5rem;
    }
}
</style>
