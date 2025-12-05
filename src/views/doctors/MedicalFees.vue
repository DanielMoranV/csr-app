<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useMedicalFees } from '@/composables/medicalFees/useMedicalFees';
import { useToast } from 'primevue/usetoast';
import { medicalSpecialties } from '@/api/medicalSpecialties';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Dropdown from 'primevue/dropdown';

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
    loadServicesFromCache,
    clearAllData
} = useMedicalFees();

// Filtros
const selectedSpecialty = ref(null);
// Inicializar con el mes anterior (donde están los datos del Excel)
const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
const selectedDoctor = ref(null);
const selectedType = ref(null);
const specialties = ref([]);

const typeOptions = [
    { label: 'Todos', value: null },
    { label: 'Planilla', value: 'PLANILLA' },
    { label: 'Retén', value: 'RETEN' }
];

// Computed
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
    const retenServices = filteredServices.value.filter(s => s.serviceType === 'RETÉN');
    
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
function onMonthChange() {
    if (!selectedMonth.value) return;
    
    // Obtener primer y último día del mes seleccionado
    const year = selectedMonth.value.getFullYear();
    const month = selectedMonth.value.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Cargar datos con las fechas del mes seleccionado
    loadDataForMonth(firstDay, lastDay);
}

async function loadDataForMonth(startDate, endDate) {
    // Validar que son objetos Date válidos
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        console.error('[MedicalFees] No son objetos Date:', { startDate, endDate });
        return;
    }
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('[MedicalFees] Fechas inválidas:', { startDate, endDate });
        return;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    try {
        await loadDoctorsAndSchedules(start, end);
        toast.add({
            severity: 'success',
            summary: 'Datos cargados',
            detail: `${doctors.value.length} médicos cargados`,
            life: 3000
        });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.value,
            life: 5000
        });
    }
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

onMounted(async () => {
    // Cargar especialidades médicas
    try {
        const response = await medicalSpecialties.getAll();
        if (response.data) {
            specialties.value = Array.isArray(response.data) ? response.data : (response.data.data || []);
        }
    } catch (err) {
        console.error('Error al cargar especialidades:', err);
    }
    
    // Intentar cargar datos del cache
    const cachedServices = loadServicesFromCache();
    if (cachedServices && cachedServices.length > 0) {
        toast.add({
            severity: 'info',
            summary: 'Datos cargados',
            detail: `${cachedServices.length} servicios cargados desde cache`,
            life: 3000
        });
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
                        label="Importar Excel" 
                        icon="pi pi-upload" 
                        class="import-button" 
                        @click="$refs.fileInput.click()" 
                    />
                </div>
                <input 
                    ref="fileInput" 
                    type="file" 
                    accept=".xlsx,.xls" 
                    style="display: none" 
                    @change="handleFileUpload" 
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
                                <Button 
                                    label="Exportar Excel" 
                                    icon="pi pi-download"
                                    @click="handleExport"
                                    :disabled="services.length === 0"
                                    class="w-full"
                                />
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
                            :value="filteredServices" 
                            :paginator="true" 
                            :rows="20"
                            :loading="isLoading"
                            stripedRows
                            responsiveLayout="scroll"
                        >
                            <Column field="doctorCode" header="Código" sortable></Column>
                            <Column field="doctor.name" header="Médico" sortable></Column>
                            <Column field="date" header="Fecha" sortable></Column>
                            <Column field="time" header="Hora" sortable></Column>
                            <Column field="serviceName" header="Servicio"></Column>
                            <Column field="patientName" header="Paciente"></Column>
                            <Column field="rawData.segus" header="Segus" sortable>
                                <template #body="slotProps">
                                    {{ slotProps.data.rawData?.segus || 'N/A' }}
                                </template>
                            </Column>
                            <Column field="amount" header="Monto" sortable>
                                <template #body="slotProps">
                                    S/ {{ slotProps.data.amount.toFixed(2) }}
                                </template>
                            </Column>
                            <Column field="serviceType" header="Tipo" sortable>
                                <template #body="slotProps">
                                    <Tag 
                                        :value="slotProps.data.serviceType" 
                                        :severity="getTypeColor(slotProps.data.serviceType)"
                                    />
                                </template>
                            </Column>
                            <Column field="serviceTypeReason" header="Detalle">
                                <template #body="slotProps">
                                    <small>{{ slotProps.data.serviceTypeReason }}</small>
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
