<script setup>
import TasksTable from '@/components/hospitalization/TasksTable.vue';
import { useAuthStore } from '@/store/authStore';
import { useTasksStore } from '@/store/tasksStore';
import { format } from 'date-fns';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';

const store = useTasksStore();
const authStore = useAuthStore();
const { tasks } = storeToRefs(store);
const user = computed(() => authStore.getUser);

const startDate = ref();
const endDate = ref();
const searchTerm = ref('');
const selectedStatus = ref(null);
const attentionId = ref('');
const filtersVisible = ref(true);

const statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'En Proceso', value: 'en_proceso' },
    { label: 'Realizado', value: 'realizado' },
    { label: 'Supervisado', value: 'supervisado' },
    { label: 'Anulado', value: 'anulado' }
];

// Computed: Filtrar tareas por área según posición del usuario
const filteredTasksByArea = computed(() => {
    // Safety check: usar valores por defecto si no están disponibles
    const tasksList = tasks?.value ?? [];
    const currentUser = user?.value;

    // Si no hay usuario o no hay tareas, retornar array vacío
    if (!currentUser || tasksList.length === 0) {
        return tasksList;
    }

    const userPosition = currentUser.position;

    // Posiciones con acceso total (sin filtro por área)
    const fullAccessPositions = ['SISTEMAS', 'ADMINISTRACION', 'DIRECTOR MEDICO', 'HOSPITALIZACION', 'ADMISION', 'MEDICOS', 'EMERGENCIA'];

    // Si tiene acceso total, mostrar todas las tareas
    if (fullAccessPositions.includes(userPosition)) {
        return tasksList;
    }

    // Mapeo de posición a área (para filtrado)
    const positionToArea = {
        LABORATORIO: 'LABORATORIO',
        'RAYOS X': 'RAYOS X',
        FARMACIA: 'FARMACIA'
    };

    const requiredArea = positionToArea[userPosition];

    // Si no está en el mapeo, mostrar todas (fallback)
    if (!requiredArea) {
        return tasksList;
    }

    // Filtrar tareas que incluyan el área requerida
    return tasksList.filter((task) => task.areas && task.areas.includes(requiredArea));
});

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

    // El endpoint requiere al menos un criterio de búsqueda
    if (Object.keys(params).length > 0) {
        store.fetchTasksByDateRange(params);
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
                            <Button :icon="filtersVisible ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" text rounded class="toggle-button" v-tooltip.left="filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'" />
                        </div>

                        <transition name="filter-expand">
                            <div v-show="filtersVisible" class="filters-content">
                                <div class="grid">
                                    <!-- Fecha inicio -->
                                    <div class="col-6 md:col-3 lg:col-2 xl:col-2">
                                        <label for="start_date" class="filter-label-compact">
                                            <i class="pi pi-calendar-plus label-icon calendar"></i>
                                            Inicio
                                        </label>
                                        <Calendar v-model="startDate" inputId="start_date" dateFormat="dd/mm/yy" showIcon iconDisplay="input" class="w-full custom-calendar-compact" placeholder="Fecha" />
                                    </div>

                                    <!-- Fecha fin -->
                                    <div class="col-6 md:col-3 lg:col-2 xl:col-2">
                                        <label for="end_date" class="filter-label-compact">
                                            <i class="pi pi-calendar-times label-icon calendar"></i>
                                            Fin
                                        </label>
                                        <Calendar v-model="endDate" inputId="end_date" dateFormat="dd/mm/yy" showIcon iconDisplay="input" class="w-full custom-calendar-compact" placeholder="Fecha" />
                                    </div>

                                    <!-- Estado -->
                                    <div class="col-8 md:col-3 lg:col-2 xl:col-2">
                                        <label for="status" class="filter-label-compact">
                                            <i class="pi pi-flag label-icon filter"></i>
                                            Estado
                                        </label>
                                        <Dropdown v-model="selectedStatus" :options="statusOptions" optionLabel="label" optionValue="value" inputId="status" class="w-full custom-dropdown-compact" placeholder="Todos" />
                                    </div>

                                    <!-- ID Atención -->
                                    <div class="col-4 md:col-3 lg:col-1 xl:col-1">
                                        <label for="attention_id" class="filter-label-compact">
                                            <i class="pi pi-hashtag label-icon attention"></i>
                                            ID
                                        </label>
                                        <InputText v-model="attentionId" inputId="attention_id" class="w-full custom-input-compact" placeholder="123" type="number" />
                                    </div>

                                    <!-- Búsqueda -->
                                    <div class="col-12 md:col-8 lg:col-3 xl:col-3">
                                        <label for="search_term" class="filter-label-compact">
                                            <i class="pi pi-search label-icon search"></i>
                                            Descripción
                                        </label>
                                        <InputText v-model="searchTerm" inputId="search_term" class="w-full custom-input-compact" placeholder="Buscar tarea..." />
                                    </div>

                                    <!-- Botones -->
                                    <div class="col-12 md:col-4 lg:col-2 xl:col-2 flex gap-2 align-items-end">
                                        <Button icon="pi pi-search" class="search-button-compact flex-1" @click="fetchTasks" v-tooltip.top="'Buscar tareas'" />
                                        <Button icon="pi pi-filter-slash" class="clear-button-compact flex-1" @click="clearFilters" v-tooltip.top="'Limpiar filtros'" />
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
                                    {{ statusOptions.find((s) => s.value === selectedStatus)?.label }}
                                </span>
                                <span v-if="attentionId" class="filter-badge">
                                    <i class="pi pi-hashtag"></i>
                                    Atención {{ attentionId }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Table Section -->
                    <TasksTable :tasks="filteredTasksByArea" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Variables personalizadas para compatibilidad con modo oscuro */
.tasks-view {
    --primary-color-alpha: color-mix(in srgb, var(--primary-color) 30%, transparent);
    --surface-hover: color-mix(in srgb, var(--surface-card) 95%, var(--text-color) 5%);

    /* Colores específicos para modo claro/oscuro */
    --gradient-start: var(--surface-50);
    --gradient-end: var(--surface-0);
    --card-shadow: rgba(0, 0, 0, 0.08);
    --card-shadow-hover: rgba(0, 0, 0, 0.12);
}

/* Dark mode adjustments */
:global(.dark) .tasks-view,
:global([data-theme='dark']) .tasks-view {
    --gradient-start: var(--surface-800);
    --gradient-end: var(--surface-900);
    --card-shadow: rgba(0, 0, 0, 0.3);
    --card-shadow-hover: rgba(0, 0, 0, 0.4);
}

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
    background: linear-gradient(145deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
    border-radius: 20px;
    padding: 2rem;
    box-shadow:
        0 10px 40px var(--card-shadow),
        0 0 0 1px var(--surface-border);
    transition: all 0.3s ease;
    border: 1px solid var(--surface-border);
}

/* Header Section */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--surface-border);
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
    background: linear-gradient(135deg, #6366f1 0%, #9333ea 50%, #4338ca 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        0 8px 20px rgba(99, 102, 241, 0.3),
        0 4px 12px rgba(147, 51, 234, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
}

.header-icon-wrapper::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
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
        box-shadow:
            0 8px 20px rgba(99, 102, 241, 0.3),
            0 4px 12px rgba(147, 51, 234, 0.4);
    }
    50% {
        transform: scale(1.05);
        box-shadow:
            0 12px 28px rgba(99, 102, 241, 0.4),
            0 6px 18px rgba(147, 51, 234, 0.5);
    }
}

/* Dark mode support */
:global(.dark) .header-icon-wrapper,
:global([data-theme='dark']) .header-icon-wrapper {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 50%, #6366f1 100%);
    box-shadow:
        0 8px 20px rgba(129, 140, 248, 0.4),
        0 4px 12px rgba(168, 85, 247, 0.5);
}

:global(.dark) .header-icon-wrapper::before,
:global([data-theme='dark']) .header-icon-wrapper::before {
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
}

.header-icon {
    font-size: 2rem;
    color: white;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.025em;
}

.header-subtitle {
    font-size: 1rem;
    color: var(--text-color-secondary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Filters Card */
.filters-card {
    background: linear-gradient(145deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-radius: 16px;
    padding: 1.25rem 1.75rem;
    margin-bottom: 1.5rem;
    box-shadow:
        0 4px 20px var(--card-shadow),
        0 0 0 1px color-mix(in srgb, var(--primary-color) 20%, var(--surface-border));
    border: 1px solid color-mix(in srgb, var(--primary-color) 10%, var(--surface-border));
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.filters-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #4f46e5, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
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

.filters-card:hover {
    box-shadow:
        0 6px 30px var(--card-shadow-hover),
        0 0 0 1px color-mix(in srgb, var(--primary-color) 30%, var(--surface-border));
    transform: translateY(-2px);
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
    color: var(--text-color);
}

.filters-header-left i {
    color: var(--primary-color);
    font-size: 1.25rem;
}

.toggle-button {
    color: var(--text-color-secondary) !important;
    transition: all 0.3s ease !important;
}

.toggle-button:hover {
    color: var(--primary-color) !important;
    background: var(--primary-50) !important;
}

.filters-content {
    margin-top: 1rem;
}

.filters-content .grid {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -0.5rem;
}

.filters-content .grid > div {
    padding: 0 0.5rem;
    margin-bottom: 1rem;
}

/* Asegurar alineación vertical en desktop */
@media (min-width: 992px) {
    .filters-content .grid {
        align-items: flex-end;
    }
}

/* Compact Filter Labels */
.filter-label-compact {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-bottom: 0.375rem;
    font-weight: 600;
    font-size: 0.688rem;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    white-space: nowrap;
}

.label-icon {
    font-size: 0.813rem;
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.label-icon.calendar {
    color: var(--blue-500);
}

.label-icon.search {
    color: var(--purple-500);
}

.label-icon.filter {
    color: var(--pink-500);
}

.label-icon.attention {
    color: var(--orange-500);
}

/* Compact Custom Inputs */
:deep(.custom-input-compact),
:deep(.custom-calendar-compact .p-inputtext),
:deep(.custom-dropdown-compact) {
    border-radius: 8px;
    border: 2px solid var(--surface-border);
    padding: 0.438rem 0.625rem;
    font-size: 0.813rem;
    transition: all 0.3s ease;
    background: var(--surface-ground);
    height: 38px;
}

:deep(.custom-input-compact:hover),
:deep(.custom-calendar-compact .p-inputtext:hover),
:deep(.custom-dropdown-compact:hover) {
    border-color: color-mix(in srgb, var(--primary-color) 50%, var(--surface-border));
}

:deep(.custom-input-compact:focus),
:deep(.custom-calendar-compact .p-inputtext:focus),
:deep(.custom-dropdown-compact:focus) {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-50);
}

:deep(.custom-calendar-compact .p-datepicker-trigger),
:deep(.custom-dropdown-compact .p-dropdown-trigger) {
    width: 2rem;
}

:deep(.custom-calendar-compact .p-icon),
:deep(.custom-dropdown-compact .p-icon) {
    font-size: 0.875rem;
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
    max-height: 200px;
    margin-top: 1rem;
    transform: translateY(0);
}

/* Compact Action Buttons */
.search-button-compact {
    background: linear-gradient(135deg, #6366f1 0%, #9333ea 100%) !important;
    border: none !important;
    padding: 0.563rem !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    font-size: 1rem !important;
    box-shadow:
        0 3px 12px rgba(99, 102, 241, 0.3),
        0 2px 8px rgba(147, 51, 234, 0.3) !important;
    transition: all 0.3s ease !important;
    justify-content: center !important;
    min-width: 40px;
    color: white !important;
    position: relative;
    overflow: hidden;
}

.search-button-compact::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.search-button-compact:hover::before {
    transform: translateX(100%);
}

.search-button-compact:hover {
    transform: translateY(-2px) !important;
    box-shadow:
        0 5px 18px rgba(99, 102, 241, 0.4),
        0 3px 12px rgba(147, 51, 234, 0.4) !important;
}

.search-button-compact:active {
    transform: translateY(0) !important;
}

/* Dark mode support */
:global(.dark) .search-button-compact,
:global([data-theme='dark']) .search-button-compact {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 100%) !important;
}

:global(.dark) .search-button-compact:hover,
:global([data-theme='dark']) .search-button-compact:hover {
    background: linear-gradient(135deg, #a5b4fc 0%, #c084fc 100%) !important;
}

.clear-button-compact {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
    border: 2px solid #fca5a5 !important;
    color: #ef4444 !important;
    padding: 0.563rem !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    font-size: 1rem !important;
    transition: all 0.3s ease !important;
    justify-content: center !important;
    min-width: 40px;
    position: relative;
    overflow: hidden;
}

.clear-button-compact::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(239, 68, 68, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.clear-button-compact:hover::before {
    opacity: 1;
}

.clear-button-compact:hover {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%) !important;
    border-color: #f87171 !important;
    color: #dc2626 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 3px 12px rgba(239, 68, 68, 0.2) !important;
}

/* Dark mode support */
:global(.dark) .clear-button-compact,
:global([data-theme='dark']) .clear-button-compact {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border: 2px solid #f87171 !important;
    color: #fca5a5 !important;
}

:global(.dark) .clear-button-compact:hover,
:global([data-theme='dark']) .clear-button-compact:hover {
    background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%) !important;
    border-color: #fca5a5 !important;
    color: #fecaca !important;
}

/* Info Banner */
.info-banner {
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    border-radius: 14px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    border: 2px solid rgba(96, 165, 250, 0.5);
    animation: slideIn 0.4s ease-out;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
    position: relative;
    overflow: hidden;
}

.info-banner::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

/* Dark mode support */
:global(.dark) .info-banner,
:global([data-theme='dark']) .info-banner {
    background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
    border: 2px solid rgba(147, 197, 253, 0.3);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
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
    background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    position: relative;
    z-index: 1;
}

.info-icon-wrapper i {
    font-size: 1.25rem;
    color: white;
}

/* Dark mode support */
:global(.dark) .info-icon-wrapper,
:global([data-theme='dark']) .info-icon-wrapper {
    background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
}

.info-content {
    flex: 1;
}

.info-title {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--primary-color);
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
    background: linear-gradient(135deg, white 0%, #dbeafe 100%);
    padding: 0.438rem 0.875rem;
    border-radius: 8px;
    font-size: 0.813rem;
    font-weight: 600;
    color: #1d4ed8;
    border: 1px solid #93c5fd;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
    transition: all 0.2s ease;
}

.filter-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

/* Dark mode support */
:global(.dark) .filter-badge,
:global([data-theme='dark']) .filter-badge {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    color: #93c5fd;
    border: 1px solid #60a5fa;
}

:global(.dark) .filter-badge:hover,
:global([data-theme='dark']) .filter-badge:hover {
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
    box-shadow: 0 4px 10px rgba(96, 165, 250, 0.3);
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

    .search-button-compact,
    .clear-button-compact {
        padding: 0.5rem 1rem !important;
        font-size: 0.875rem !important;
    }

    .filter-expand-enter-to,
    .filter-expand-leave-from {
        max-height: 400px;
    }

    .info-banner {
        flex-direction: column;
    }
}
</style>
