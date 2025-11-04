<script setup>
import TasksTable from '@/components/hospitalization/TasksTable.vue';
import { useTasksStore } from '@/store/tasksStore';
import { format } from 'date-fns';
import { onMounted, ref } from 'vue';

const store = useTasksStore();
const startDate = ref();
const endDate = ref();
const searchTerm = ref('');
const selectedStatus = ref(null);
const attentionId = ref('');
const filtersVisible = ref(true);

const statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Realizado', value: 'realizado' },
    { label: 'Supervisado', value: 'supervisado' },
    { label: 'Anulado', value: 'anulado' }
];

const toggleFilters = () => {
    filtersVisible.value = !filtersVisible.value;
};

onMounted(() => {
    const today = new Date();
    endDate.value = today;
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    startDate.value = oneMonthAgo;
    fetchTasks();
});

const fetchTasks = () => {
    const params = {};

    // Fechas (si están presentes)
    if (startDate.value && endDate.value) {
        params.start_date = format(startDate.value, 'yyyy-MM-dd');
        params.end_date = format(endDate.value, 'yyyy-MM-dd');
    }

    // Búsqueda por término
    if (searchTerm.value.trim()) {
        params.q = searchTerm.value.trim();
    }

    // Filtro por estado
    if (selectedStatus.value) {
        params.status = selectedStatus.value;
    }

    // Filtro por ID de atención
    if (attentionId.value.trim()) {
        params.attention_id = attentionId.value.trim();
    }

    console.log('[TasksView] Parámetros de búsqueda:', params);
    console.log('[TasksView] Endpoint que se usará: GET /tasks/search');

    // El endpoint requiere al menos un criterio de búsqueda
    if (Object.keys(params).length > 0) {
        store.fetchTasksByDateRange(params);
    } else {
        console.warn('[TasksView] No hay parámetros de búsqueda, no se hará la solicitud');
    }
};

const clearFilters = () => {
    searchTerm.value = '';
    selectedStatus.value = null;
    attentionId.value = '';
    const today = new Date();
    endDate.value = today;
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    startDate.value = oneMonthAgo;
    fetchTasks();
};
</script>

<template>
    <div class="tasks-view">
        <div class="grid">
            <div class="col-12">
                <div class="main-card">
                    <!-- Header Section -->
                    <div class="header-section">
                        <div class="header-icon-wrapper">
                            <i class="pi pi-list-check header-icon"></i>
                        </div>
                        <div class="header-content">
                            <h1 class="header-title">Gestión de Tareas</h1>
                            <p class="header-subtitle">
                                <i class="pi pi-search mr-2"></i>
                                Busca y filtra tareas por múltiples criterios
                            </p>
                        </div>
                    </div>

                <!-- Filters Section -->
                <div class="filters-card">
                    <div class="filters-header" @click="toggleFilters">
                        <div class="filters-header-left">
                            <i class="pi pi-filter-fill"></i>
                            <span>Filtros de Búsqueda</span>
                        </div>
                        <Button
                            :icon="filtersVisible ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                            text
                            rounded
                            class="toggle-button"
                            v-tooltip.left="filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'"
                        />
                    </div>

                    <transition name="filter-expand">
                        <div v-show="filtersVisible" class="filters-content">
                            <div class="grid">
                                <!-- Primera columna -->
                                <div class="col-12 lg:col-6">
                                    <!-- Fechas -->
                                    <div class="grid">
                                        <div class="col-12 md:col-6">
                                            <label for="start_date" class="filter-label">
                                                <div class="label-icon-wrapper calendar">
                                                    <i class="pi pi-calendar-plus"></i>
                                                </div>
                                                <span>Fecha de inicio</span>
                                            </label>
                                            <Calendar v-model="startDate" inputId="start_date" dateFormat="dd/mm/yy" showIcon iconDisplay="input" class="w-full custom-calendar" placeholder="Seleccionar fecha" />
                                        </div>

                                        <div class="col-12 md:col-6">
                                            <label for="end_date" class="filter-label">
                                                <div class="label-icon-wrapper calendar">
                                                    <i class="pi pi-calendar-times"></i>
                                                </div>
                                                <span>Fecha de fin</span>
                                            </label>
                                            <Calendar v-model="endDate" inputId="end_date" dateFormat="dd/mm/yy" showIcon iconDisplay="input" class="w-full custom-calendar" placeholder="Seleccionar fecha" />
                                        </div>

                                        <!-- Búsqueda por término -->
                                        <div class="col-12">
                                            <label for="search_term" class="filter-label">
                                                <div class="label-icon-wrapper search">
                                                    <i class="pi pi-search"></i>
                                                </div>
                                                <span>Buscar en descripción</span>
                                            </label>
                                            <InputText v-model="searchTerm" inputId="search_term" class="w-full custom-input" placeholder="Ej: cambiar vendaje" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Segunda columna -->
                                <div class="col-12 lg:col-6">
                                    <div class="grid">
                                        <!-- Filtro por estado -->
                                        <div class="col-12 md:col-6">
                                            <label for="status" class="filter-label">
                                                <div class="label-icon-wrapper filter">
                                                    <i class="pi pi-flag"></i>
                                                </div>
                                                <span>Estado</span>
                                            </label>
                                            <Dropdown v-model="selectedStatus" :options="statusOptions" optionLabel="label" optionValue="value" inputId="status" class="w-full custom-dropdown" placeholder="Seleccionar estado" />
                                        </div>

                                        <!-- Filtro por ID de atención -->
                                        <div class="col-12 md:col-6">
                                            <label for="attention_id" class="filter-label">
                                                <div class="label-icon-wrapper attention">
                                                    <i class="pi pi-hashtag"></i>
                                                </div>
                                                <span>ID de Atención</span>
                                            </label>
                                            <InputText v-model="attentionId" inputId="attention_id" class="w-full custom-input" placeholder="Ej: 123" type="number" />
                                        </div>

                                        <!-- Botones de acción -->
                                        <div class="col-12 flex gap-3 action-buttons-wrapper">
                                            <Button label="Buscar Tareas" icon="pi pi-search" class="search-button flex-1" @click="fetchTasks" />
                                            <Button label="Limpiar" icon="pi pi-filter-slash" class="clear-button flex-1" @click="clearFilters" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>

                <!-- Info Banner -->
                <div class="info-banner" v-if="startDate || endDate || searchTerm || selectedStatus || attentionId">
                    <div class="info-icon-wrapper">
                        <i class="pi pi-info-circle"></i>
                    </div>
                    <div class="info-content">
                        <div class="info-title">Filtros aplicados</div>
                        <div class="info-filters">
                            <span v-if="startDate && endDate" class="filter-badge">
                                <i class="pi pi-calendar"></i>
                                {{ format(startDate, 'dd/MM/yyyy') }} - {{ format(endDate, 'dd/MM/yyyy') }}
                            </span>
                            <span v-if="searchTerm" class="filter-badge">
                                <i class="pi pi-search"></i>
                                {{ searchTerm }}
                            </span>
                            <span v-if="selectedStatus" class="filter-badge">
                                <i class="pi pi-flag"></i>
                                {{ statusOptions.find(s => s.value === selectedStatus)?.label }}
                            </span>
                            <span v-if="attentionId" class="filter-badge">
                                <i class="pi pi-hashtag"></i>
                                Atención {{ attentionId }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Table Section -->
                <TasksTable />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Main Container */
.tasks-view {
    animation: fadeIn 0.4s ease-out;
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

.main-card {
    background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
}

/* Header Section */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid #e9ecef;
    position: relative;
}

.header-section::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100px;
    height: 2px;
    background: linear-gradient(90deg, var(--primary-color), transparent);
}

.header-icon-wrapper {
    width: 70px;
    height: 70px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--primary-color), #667eea);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 12px 28px rgba(99, 102, 241, 0.4);
    }
}

.header-icon {
    font-size: 2rem;
    color: white;
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.025em;
}

.header-subtitle {
    font-size: 1rem;
    color: #64748b;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Filters Card */
.filters-card {
    background: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%);
    border-radius: 16px;
    padding: 1.25rem 1.75rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
}

.filters-card:hover {
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.1);
}

.filters-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
    padding-bottom: 0.25rem;
    transition: all 0.2s ease;
}

.filters-header:hover .filters-header-left span {
    color: var(--primary-color);
}

.filters-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #334155;
}

.filters-header-left i {
    color: var(--primary-color);
    font-size: 1.25rem;
}

.toggle-button {
    color: #64748b !important;
    transition: all 0.3s ease !important;
}

.toggle-button:hover {
    color: var(--primary-color) !important;
    background: rgba(99, 102, 241, 0.1) !important;
}

.filters-content {
    margin-top: 1.5rem;
}

/* Filter Labels */
.filter-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.625rem;
    font-weight: 600;
    font-size: 0.875rem;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.label-icon-wrapper {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.label-icon-wrapper i {
    font-size: 0.875rem;
    color: white;
}

.label-icon-wrapper.calendar {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.label-icon-wrapper.search {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.label-icon-wrapper.filter {
    background: linear-gradient(135deg, #ec4899, #db2777);
}

.label-icon-wrapper.attention {
    background: linear-gradient(135deg, #f59e0b, #d97706);
}

/* Custom Inputs */
:deep(.custom-input),
:deep(.custom-calendar .p-inputtext),
:deep(.custom-dropdown) {
    border-radius: 10px;
    border: 2px solid #e2e8f0;
    padding: 0.75rem 1rem;
    font-size: 0.938rem;
    transition: all 0.3s ease;
    background: white;
}

:deep(.custom-input:hover),
:deep(.custom-calendar .p-inputtext:hover),
:deep(.custom-dropdown:hover) {
    border-color: #cbd5e1;
}

:deep(.custom-input:focus),
:deep(.custom-calendar .p-inputtext:focus),
:deep(.custom-dropdown:focus) {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Filter Expand/Collapse Transitions */
.filter-expand-enter-active,
.filter-expand-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.filter-expand-enter-from,
.filter-expand-leave-to {
    opacity: 0;
    max-height: 0;
    margin-top: 0;
    transform: translateY(-10px);
}

.filter-expand-enter-to,
.filter-expand-leave-from {
    opacity: 1;
    max-height: 500px;
    margin-top: 1.5rem;
    transform: translateY(0);
}

/* Action Buttons */
.action-buttons-wrapper {
    margin-top: 0.5rem;
}

.search-button {
    background: linear-gradient(135deg, var(--primary-color), #667eea) !important;
    border: none !important;
    padding: 0.875rem 1.5rem !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    font-size: 0.938rem !important;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3) !important;
    transition: all 0.3s ease !important;
    justify-content: center !important;
}

.search-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 25px rgba(99, 102, 241, 0.4) !important;
}

.search-button:active {
    transform: translateY(0) !important;
}

.clear-button {
    background: white !important;
    border: 2px solid #e2e8f0 !important;
    color: #64748b !important;
    padding: 0.875rem 1.5rem !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    font-size: 0.938rem !important;
    transition: all 0.3s ease !important;
    justify-content: center !important;
}

.clear-button:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08) !important;
}

/* Info Banner */
.info-banner {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border-radius: 14px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    border: 1px solid #93c5fd;
    animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.info-icon-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.info-icon-wrapper i {
    font-size: 1.25rem;
    color: white;
}

.info-content {
    flex: 1;
}

.info-title {
    font-weight: 700;
    font-size: 0.875rem;
    color: #1e40af;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.info-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
}

.filter-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: white;
    padding: 0.438rem 0.875rem;
    border-radius: 8px;
    font-size: 0.813rem;
    font-weight: 600;
    color: #1e40af;
    border: 1px solid #93c5fd;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
}

.filter-badge i {
    font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
    .main-card {
        padding: 1.25rem;
        border-radius: 16px;
    }

    .header-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    .header-icon-wrapper {
        width: 60px;
        height: 60px;
    }

    .header-icon {
        font-size: 1.75rem;
    }

    .header-title {
        font-size: 1.5rem;
    }

    .filters-card {
        padding: 1rem 1.25rem;
    }

    .filters-header-left {
        font-size: 1rem;
    }

    .filters-content {
        margin-top: 1rem;
    }

    .action-buttons-wrapper {
        flex-direction: column;
        width: 100%;
        gap: 0.75rem !important;
    }

    .search-button,
    .clear-button {
        width: 100%;
        justify-content: center;
    }

    .filter-expand-enter-to,
    .filter-expand-leave-from {
        max-height: 800px;
    }

    .info-banner {
        flex-direction: column;
    }
}
</style>
