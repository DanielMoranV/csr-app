<script setup>
import { medicalSpecialties } from '@/api/medicalSpecialties';
import { useTariffConsultation } from '@/composables/useTariffConsultation';
import MedicalFeesService from '@/services/medicalFees/MedicalFeesService';
import { useDebounceFn } from '@vueuse/core';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dropdown from 'primevue/dropdown';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import { computed, onMounted, ref, watch } from 'vue';

// Composable
const { tariffs, isLoading, fetchTariffs, searchTariffs } = useTariffConsultation();

const searchQuery = ref('');
const selectedSpecialty = ref(null);
const selectedDoctor = ref(null);
const specialties = ref([]);
const allDoctors = ref([]);
const loadingFilters = ref(false);
const scheduleModalVisible = ref(false);

// Búsqueda con debounce
const debouncedSearch = useDebounceFn(async (query) => {
    // Solo buscar si hay 3 o más caracteres, o si está vacío (para mostrar todos)
    if (query.trim() === '' || query.trim().length >= 3) {
        await searchTariffs(query);
    }
}, 300);

watch(searchQuery, (newQuery) => {
    debouncedSearch(newQuery);
});

// Médicos filtrados por especialidad
const filteredDoctors = computed(() => {
    if (!selectedSpecialty.value) {
        return allDoctors.value;
    }

    const filtered = allDoctors.value.filter((doctor) => {
        // Los médicos tienen un array de especialidades
        if (Array.isArray(doctor.specialties)) {
            return doctor.specialties.some((specialty) => specialty.id === selectedSpecialty.value.id);
        }
        return false;
    });

    return filtered;
});

// Tarifarios filtrados
const filteredTariffs = computed(() => {
    let result = tariffs.value;

    // Filtrar por doctor seleccionado
    if (selectedDoctor.value) {
        result = result.filter((tariff) => tariff.is_personalized && tariff.doctor_code === selectedDoctor.value.code);
    }
    // Si no hay doctor pero hay especialidad, mostrar todos los tarifarios de doctores de esa especialidad
    else if (selectedSpecialty.value) {
        const specialtyDoctorCodes = filteredDoctors.value.map((d) => d.code);
        result = result.filter((tariff) => tariff.is_personalized && specialtyDoctorCodes.includes(tariff.doctor_code));
    }

    return result;
});

// Cargar especialidades
const loadSpecialties = async () => {
    try {
        loadingFilters.value = true;
        const response = await medicalSpecialties.getAll();

        // Validar que response.data sea un array
        if (response && Array.isArray(response.data)) {
            specialties.value = response.data;
        } else if (response && response.data && Array.isArray(response.data.data)) {
            specialties.value = response.data.data;
        } else {
            specialties.value = [];
        }
    } catch (error) {
        specialties.value = [];
    } finally {
        loadingFilters.value = false;
    }
};

// Cargar médicos
const loadDoctors = async () => {
    try {
        loadingFilters.value = true;
        const doctors = await MedicalFeesService.getDoctors();

        // Validar que doctors sea un array
        if (Array.isArray(doctors)) {
            allDoctors.value = doctors;
        } else {
            allDoctors.value = [];
        }
    } catch (error) {
        allDoctors.value = [];
    } finally {
        loadingFilters.value = false;
    }
};

// Limpiar filtros
const clearFilters = () => {
    selectedSpecialty.value = null;
    selectedDoctor.value = null;
    searchQuery.value = '';
};

// Watch para limpiar doctor cuando cambia especialidad
watch(selectedSpecialty, () => {
    selectedDoctor.value = null;
});

// Mostrar horarios del doctor
const showDoctorSchedules = () => {
    if (selectedDoctor.value) {
        scheduleModalVisible.value = true;
    }
};

// Inicialización
onMounted(async () => {
    await Promise.all([fetchTariffs(), loadSpecialties(), loadDoctors()]);
});

// Formateo de moneda
const formatCurrency = (value) => {
    if (!value) return '-';
    return `S/ ${parseFloat(value).toFixed(2)}`;
};
</script>

<template>
    <div class="tariff-consultation-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-search"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Consulta de Tarifarios</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-info-circle mr-2"></i>
                        Búsqueda de tarifarios generales y personalizados por doctor
                    </p>
                </div>
            </div>

            <!-- Filtros -->
            <div class="filters-section mb-4">
                <div class="filters-grid">
                    <!-- Filtro por Especialidad -->
                    <div class="filter-item">
                        <label class="filter-label">
                            <i class="pi pi-heart mr-2"></i>
                            Especialidad
                        </label>
                        <Dropdown
                            v-model="selectedSpecialty"
                            :options="specialties"
                            optionLabel="name"
                            placeholder="Todas las especialidades"
                            :loading="loadingFilters"
                            :showClear="true"
                            :filter="true"
                            :editable="true"
                            filterPlaceholder="Buscar especialidad..."
                            class="w-full"
                        />
                    </div>

                    <!-- Filtro por Doctor -->
                    <div class="filter-item">
                        <label class="filter-label">
                            <i class="pi pi-user mr-2"></i>
                            Doctor
                        </label>
                        <div class="doctor-filter-wrapper">
                            <Dropdown
                                v-model="selectedDoctor"
                                :options="filteredDoctors"
                                optionLabel="name"
                                placeholder="Todos los doctores"
                                :loading="loadingFilters"
                                :showClear="true"
                                :disabled="!selectedSpecialty && filteredDoctors.length === 0"
                                :filter="true"
                                :editable="true"
                                filterPlaceholder="Buscar doctor..."
                                class="flex-1"
                            >
                                <template #value="slotProps">
                                    <div v-if="slotProps.value" class="flex align-items-center gap-2">
                                        <span>{{ slotProps.value.name }}</span>
                                        <span class="text-xs text-gray-400">({{ slotProps.value.code }})</span>
                                    </div>
                                    <span v-else>{{ slotProps.placeholder }}</span>
                                </template>
                                <template #option="slotProps">
                                    <div class="flex align-items-center gap-2">
                                        <span>{{ slotProps.option.name }}</span>
                                        <span class="text-xs text-gray-400">({{ slotProps.option.code }})</span>
                                    </div>
                                </template>
                            </Dropdown>
                            <Button v-if="selectedDoctor" icon="pi pi-calendar" severity="secondary" outlined @click="showDoctorSchedules" v-tooltip.top="'Ver horarios del mes actual'" class="schedule-btn" />
                        </div>
                    </div>

                    <!-- Búsqueda -->
                    <div class="filter-item filter-search">
                        <label class="filter-label">
                            <i class="pi pi-search mr-2"></i>
                            Búsqueda
                        </label>
                        <IconField iconPosition="left" class="w-full">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="searchQuery" placeholder="Código, nombre o doctor..." class="w-full" />
                        </IconField>
                    </div>
                </div>

                <!-- Botón limpiar filtros -->
                <div v-if="selectedSpecialty || selectedDoctor || searchQuery" class="mt-3">
                    <button @click="clearFilters" class="clear-filters-btn">
                        <i class="pi pi-times mr-2"></i>
                        Limpiar filtros
                    </button>
                </div>
            </div>

            <!-- DataTable -->
            <DataTable :value="filteredTariffs" :loading="isLoading || loadingFilters" :paginator="true" :rows="25" :rowsPerPageOptions="[25, 50, 100]" responsiveLayout="scroll" stripedRows showGridlines sortField="code" :sortOrder="1">
                <template #empty>
                    <div class="text-center p-4">
                        <i class="pi pi-inbox text-4xl text-gray-400 mb-3"></i>
                        <p class="text-gray-500">No se encontraron tarifarios</p>
                        <p class="text-sm text-gray-400">Intenta con otro término de búsqueda</p>
                    </div>
                </template>

                <Column field="code" header="Código" :sortable="true" style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="font-mono font-semibold">{{ data.code }}</span>
                    </template>
                </Column>

                <Column field="name" header="Nombre del Tarifario" :sortable="true" style="min-width: 300px">
                    <template #body="{ data }">
                        <div class="flex align-items-center gap-2">
                            <span>{{ data.name }}</span>
                            <i v-if="data.is_personalized" v-tooltip.top="'Tarifario personalizado por doctor'" class="pi pi-user-edit text-primary" style="font-size: 0.875rem"></i>
                        </div>
                    </template>
                </Column>

                <Column field="total" header="Total" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <strong class="text-primary">{{ formatCurrency(data.total) }}</strong>
                    </template>
                </Column>

                <Column field="doctor_name" header="Doctor" :sortable="true" style="min-width: 250px">
                    <template #body="{ data }">
                        <div v-if="data.is_personalized" class="flex align-items-center gap-2">
                            <i class="pi pi-user text-primary"></i>
                            <span>{{ data.doctor_name }}</span>
                        </div>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </Column>

                <Column field="doctor_code" header="Cód. Doctor" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <span v-if="data.doctor_code" class="font-mono">{{ data.doctor_code }}</span>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Doctor Schedule Modal -->
        <DoctorScheduleModal v-model:visible="scheduleModalVisible" :doctor-id="selectedDoctor?.id" :doctor-name="selectedDoctor?.name" />
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
.tariff-consultation-view {
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

/* ============================================================================
   SEARCH SECTION
   ============================================================================ */
.search-section {
    margin-bottom: 1.5rem;
}

/* ============================================================================
   FILTERS SECTION
   ============================================================================ */
.filters-section {
    margin-bottom: 1.5rem;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.filter-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
    display: flex;
    align-items: center;
}

.filter-label i {
    color: var(--primary-color);
}

.doctor-filter-wrapper {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.doctor-filter-wrapper .flex-1 {
    flex: 1;
}

.schedule-btn {
    flex-shrink: 0;
    height: 2.75rem;
}

.clear-filters-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    color: var(--text-color);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-filters-btn:hover {
    background: var(--surface-hover);
    border-color: var(--primary-color);
    color: var(--primary-color);
}

:global(.dark) .clear-filters-btn {
    background: rgba(255, 255, 255, 0.05);
}

:global(.dark) .clear-filters-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* ============================================================================
   FOOTER STATS
   ============================================================================ */
.footer-stats {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--surface-border);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:global(.dark) .stat-card {
    background: rgba(255, 255, 255, 0.02);
}

.stat-icon {
    font-size: 2rem;
    color: var(--primary-color);
}

.stat-content {
    display: flex;
    flex-direction: column;
}

.stat-label {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin-bottom: 0.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 768px) {
    .tariff-consultation-view {
        padding: 0.5rem;
    }

    .main-card {
        padding: 1rem;
        border-radius: 12px;
    }

    .header-section {
        gap: 1rem;
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

    .stats-grid {
        grid-template-columns: 1fr;
    }
}
</style>
