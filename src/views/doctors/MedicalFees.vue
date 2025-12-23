<script setup>
import { useMedicalFees } from '@/composables/medicalFees/useMedicalFees';
import { useMedicalFeesActions } from '@/composables/medicalFees/useMedicalFeesActions';
import { useMedicalFeesComputed } from '@/composables/medicalFees/useMedicalFeesComputed';
import { useMedicalFeesFilters } from '@/composables/medicalFees/useMedicalFeesFilters';
import { useMedicalSpecialtiesStore } from '@/store/medicalSpecialtiesStore';
import { DEFAULT_SPECIALTY_ID } from '@/utils/medicalFees/constants';
import { onMounted, ref, watch } from 'vue';

// Components
import BulkApprovalDialog from '@/components/doctors/BulkApprovalDialog.vue';
import MedicalFeesControlPanel from '@/components/doctors/medicalFees/MedicalFeesControlPanel.vue';
import MedicalFeesHeader from '@/components/doctors/medicalFees/MedicalFeesHeader.vue';
import MedicalFeesServicesTable from '@/components/doctors/medicalFees/MedicalFeesServicesTable.vue';
import MedicalFeesSummaryCards from '@/components/doctors/medicalFees/MedicalFeesSummaryCards.vue';
import MedicalFeesSummaryTable from '@/components/doctors/medicalFees/MedicalFeesSummaryTable.vue';
import RecalculateCommissionsDialog from '@/components/medicalFees/RecalculateCommissionsDialog.vue';

// Estado de especialidades
const specialties = ref([]);
const isSpecialtiesLoading = ref(true);

// Composables principales
const medicalFeesState = useMedicalFees();
const filtersState = useMedicalFeesFilters();
const computedState = useMedicalFeesComputed(medicalFeesState, filtersState, specialties);
const actions = useMedicalFeesActions(medicalFeesState, filtersState, computedState);

// Watch para limpiar el filtro de médico cuando cambia la especialidad
watch(
    () => filtersState.selectedSpecialty.value,
    () => {
        filtersState.cleanInvalidDoctorFilter(computedState.doctorOptions.value);
    }
);

// Inicialización
onMounted(async () => {
    isSpecialtiesLoading.value = true;
    const specialtiesStore = useMedicalSpecialtiesStore();

    // Cargar especialidades médicas (con caché)
    try {
        if (specialtiesStore.allSpecialties.length > 0) {
            specialties.value = specialtiesStore.allSpecialties;
            console.log('Usando especialidades desde caché');
        } else {
            await specialtiesStore.fetchSpecialties();
            specialties.value = specialtiesStore.allSpecialties;
            console.log('Especialidades cargadas de API');
        }

        // Pre-seleccionar Pediatría por defecto (ID 32)
        const pediatric = specialties.value.find((s) => s.id === DEFAULT_SPECIALTY_ID);
        if (pediatric) {
            filtersState.selectedSpecialty.value = pediatric.id;
        }
    } catch (err) {
        console.error('Error al cargar especialidades:', err);
    } finally {
        isSpecialtiesLoading.value = false;
    }

    // Cargar datos del mes actual
    await actions.initialize();

    // Debug: verificar estado inicial
    console.log('[MedicalFees] Estado inicial - isExcelData:', medicalFeesState.isExcelData.value, 'services.length:', medicalFeesState.services.value.length);
});
</script>

<template>
    <div class="medical-fees-view">
        <div class="main-card">
            <!-- Header Section -->
            <MedicalFeesHeader :can-import="computedState.canImport.value && !isSpecialtiesLoading" :services-count="medicalFeesState.services.value.length" @import-excel="actions.handleFileUpload" @clear-data="actions.handleClearData" />

            <!-- Panel de Control -->
            <MedicalFeesControlPanel
                v-model:selected-specialty="filtersState.selectedSpecialty.value"
                v-model:selected-month="filtersState.selectedMonth.value"
                v-model:selected-doctor="filtersState.selectedDoctor.value"
                v-model:selected-type="filtersState.selectedType.value"
                v-model:show-summary-table="filtersState.showSummaryTable.value"
                :specialty-options="computedState.specialtyOptions.value"
                :doctor-options="computedState.doctorOptions.value"
                :type-options="filtersState.typeOptions"
                :is-loading="medicalFeesState.isLoading.value"
                :can-recalculate="computedState.canRecalculate.value"
                :filtered-services-length="computedState.filteredServices.value.length"
                @search="actions.handleSearch"
                @export="actions.handleExport"
                @bulk-approval="actions.openBulkApprovalDialog"
                @recalculate="actions.openRecalculateDialog"
                @month-change="actions.onMonthChange"
            />

            <!-- Resumen General -->
            <MedicalFeesSummaryCards v-if="medicalFeesState.services.value.length > 0" :totals="computedState.filteredTotals.value" />

            <!-- Tabla Resumen por Médico (Toggle) -->
            <MedicalFeesSummaryTable :visible="filtersState.showSummaryTable.value" :doctor-summary="computedState.doctorSummary.value" />

            <!-- Tabla de Servicios -->
            <MedicalFeesServicesTable
                v-if="medicalFeesState.services.value.length > 0"
                v-model:filters="filtersState.filters.value"
                :services="computedState.filteredServices.value"
                :is-loading="medicalFeesState.isLoading.value"
                @cell-edit-complete="actions.onCellEditComplete"
            />

            <!-- Estado vacío -->
            <div class="empty-state" v-else>
                <i class="pi pi-inbox empty-icon"></i>
                <h3>No hay servicios cargados</h3>
                <p class="text-muted">Selecciona un periodo e importa un archivo Excel para comenzar.</p>
            </div>
        </div>

        <!-- Modal de Aprobación Masiva -->
        <BulkApprovalDialog v-model:visible="filtersState.showBulkApprovalDialog.value" :services="computedState.filteredServices.value" :doctorName="computedState.selectedDoctorName.value" @approve="actions.handleBulkApproval" />

        <!-- Modal de Recálculo de Comisiones -->
        <RecalculateCommissionsDialog
            v-model:visible="filtersState.showRecalculateDialog.value"
            :doctor="computedState.selectedDoctorObject.value"
            :service-count="computedState.recalculableServicesCount.value"
            @recalculate="actions.handleRecalculate"
            @complete="actions.handleRecalculateComplete"
        />
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
   EMPTY STATE
   ============================================================================ */
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

/* ============================================================================
   RESPONSIVE
   ============================================================================ */
@media (max-width: 768px) {
    .medical-fees-view {
        padding: 1rem;
    }

    .main-card {
        padding: 1rem;
    }
}
</style>
