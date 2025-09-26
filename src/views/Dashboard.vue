<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { useDashboardStore } from '@/store/dashboardStore';
import { useRealtimeEvents } from '@/composables/useRealtimeEvents';
import Chart from 'primevue/chart';
import Card from 'primevue/card';
import Badge from 'primevue/badge';

const dashboardStore = useDashboardStore();
const { startListening, stopListening, isListening } = useRealtimeEvents();

const hospitalStats = computed(() => dashboardStore.hospitalData);
const userStats = computed(() => dashboardStore.userData);
const patientStats = computed(() => dashboardStore.patientData);
const taskStats = computed(() => dashboardStore.taskData);
const detailsStats = computed(() => dashboardStore.detailsData);
const recentTickets = computed(() => dashboardStore.ticketsData);
const hospitalizationStatus = computed(() => dashboardStore.hospitalizationData);
const isLoading = computed(() => dashboardStore.isLoading);

const doctorChartData = ref(null);
const insuranceChartData = ref(null);
const userPositionChartData = ref(null);
const patientGenderChartData = ref(null);
const taskStatusChartData = ref(null);

// Chart refs for proper cleanup
const doctorChart = ref(null);
const insuranceChart = ref(null);
const userPositionChart = ref(null);
const patientGenderChart = ref(null);
const taskStatusChart = ref(null);

// Chart instances
const chartInstances = ref([]);

const chartOptions = ref({
    plugins: {
        legend: {
            labels: {
                color: '#495057'
            }
        }
    },
    scales: {
        r: {
            grid: {
                color: '#ebedef'
            }
        }
    }
});

const pieChartOptions = ref({
    plugins: {
        legend: {
            labels: {
                color: '#495057'
            }
        }
    }
});

const setChartData = async () => {
    // Clear existing chart data first
    doctorChartData.value = null;
    insuranceChartData.value = null;
    userPositionChartData.value = null;
    patientGenderChartData.value = null;
    taskStatusChartData.value = null;

    await nextTick();

    // Hospital attentions charts
    if (hospitalStats.value?.attentions_by_doctor && Object.keys(hospitalStats.value.attentions_by_doctor).length > 0) {
        const labels = Object.keys(hospitalStats.value.attentions_by_doctor);
        const data = Object.values(hospitalStats.value.attentions_by_doctor);
        doctorChartData.value = {
            labels: labels,
            datasets: [
                {
                    label: 'Atenciones por Médico',
                    backgroundColor: '#42A5F5',
                    data: data
                }
            ]
        };
    }

    if (hospitalStats.value?.attentions_by_insurance && Object.keys(hospitalStats.value.attentions_by_insurance).length > 0) {
        const labels = Object.keys(hospitalStats.value.attentions_by_insurance);
        const data = Object.values(hospitalStats.value.attentions_by_insurance);
        insuranceChartData.value = {
            labels: labels,
            datasets: [
                {
                    label: 'Atenciones por Aseguradora',
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                    data: data
                }
            ]
        };
    }

    // User position chart
    if (userStats.value?.users_by_position && Object.keys(userStats.value.users_by_position).length > 0) {
        const labels = Object.keys(userStats.value.users_by_position);
        const data = Object.values(userStats.value.users_by_position);
        userPositionChartData.value = {
            labels: labels,
            datasets: [
                {
                    label: 'Usuarios por Posición',
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
                    data: data
                }
            ]
        };
    }

    // Patient gender chart
    if (patientStats.value?.patients_by_gender && Object.keys(patientStats.value.patients_by_gender).length > 0) {
        const labels = Object.keys(patientStats.value.patients_by_gender).map(key => key === 'M' ? 'Masculino' : 'Femenino');
        const data = Object.values(patientStats.value.patients_by_gender);
        patientGenderChartData.value = {
            labels: labels,
            datasets: [
                {
                    label: 'Pacientes por Género',
                    backgroundColor: ['#36A2EB', '#FF6384'],
                    data: data
                }
            ]
        };
    }

    // Task status chart
    if (taskStats.value?.tasks_by_status && Object.keys(taskStats.value.tasks_by_status).length > 0) {
        const labels = Object.keys(taskStats.value.tasks_by_status);
        const data = Object.values(taskStats.value.tasks_by_status);
        taskStatusChartData.value = {
            labels: labels,
            datasets: [
                {
                    label: 'Tareas por Estado',
                    backgroundColor: ['#FFA726', '#42A5F5', '#66BB6A'],
                    data: data
                }
            ]
        };
    }
};

onMounted(async () => {
    await dashboardStore.fetchAllStats();
    await setChartData();
    
    // Start listening for real-time events
    startListening();
    console.log('[Dashboard] Started listening for real-time events');
});

onBeforeUnmount(() => {
    // Clean up chart instances
    chartInstances.value.forEach(instance => {
        if (instance && typeof instance.destroy === 'function') {
            instance.destroy();
        }
    });
    chartInstances.value = [];
    
    // Stop listening for real-time events
    stopListening();
    console.log('[Dashboard] Stopped listening for real-time events');
});

watch([hospitalStats, userStats, patientStats, taskStats], async () => {
    await setChartData();
}, { deep: true });
</script>

<template>
    <div v-if="isLoading" class="text-center">
        <p>Cargando estadísticas...</p>
    </div>
    <div v-else class="grid grid-cols-12 gap-4">
        <!-- Hospital Statistics Cards -->
        <div class="col-span-12">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Estadísticas Hospitalarias</h2>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Atenciones Totales</h3>
                <p class="text-3xl font-bold text-gray-800">{{ hospitalStats.total_attentions || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Atenciones Activas</h3>
                <p class="text-3xl font-bold text-green-600">{{ hospitalStats.active_attentions || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Ocupación</h3>
                <p class="text-3xl font-bold text-blue-600">{{ hospitalStats.occupancy_rate || 0 }}%</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Estancia Promedio</h3>
                <p class="text-3xl font-bold text-purple-600">{{ hospitalStats.average_stay_days || 0 }} días</p>
            </div>
        </div>

        <!-- User Statistics Cards -->
        <div class="col-span-12">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 mt-6">Estadísticas de Personal</h2>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Total Usuarios</h3>
                <p class="text-3xl font-bold text-gray-800">{{ userStats.total_users || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Usuarios Activos</h3>
                <p class="text-3xl font-bold text-green-600">{{ userStats.active_users || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Registros (7 días)</h3>
                <p class="text-3xl font-bold text-blue-600">{{ userStats.recent_registrations?.last_7_days || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Registros (30 días)</h3>
                <p class="text-3xl font-bold text-purple-600">{{ userStats.recent_registrations?.last_30_days || 0 }}</p>
            </div>
        </div>

        <!-- Patient Statistics Cards -->
        <div class="col-span-12">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 mt-6">Estadísticas de Pacientes</h2>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Total Pacientes</h3>
                <p class="text-3xl font-bold text-gray-800">{{ patientStats.total_patients || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Atenciones Activas</h3>
                <p class="text-3xl font-bold text-green-600">{{ patientStats.active_attentions || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Ingresos Este Mes</h3>
                <p class="text-3xl font-bold text-blue-600">{{ patientStats.monthly_admissions?.current_month || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Ingresos Mes Anterior</h3>
                <p class="text-3xl font-bold text-purple-600">{{ patientStats.monthly_admissions?.previous_month || 0 }}</p>
            </div>
        </div>

        <!-- Task Statistics Cards -->
        <div class="col-span-12">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 mt-6">Estadísticas de Tareas</h2>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Total Tareas</h3>
                <p class="text-3xl font-bold text-gray-800">{{ taskStats.total_tasks || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Tareas Pendientes</h3>
                <p class="text-3xl font-bold text-yellow-600">{{ taskStats.tasks_by_status?.PENDIENTE || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Tareas Vencidas</h3>
                <p class="text-3xl font-bold text-red-600">{{ taskStats.overdue_tasks || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Completadas Hoy</h3>
                <p class="text-3xl font-bold text-green-600">{{ taskStats.completed_today || 0 }}</p>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="col-span-12">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 mt-6">Gráficos y Análisis</h2>
        </div>
        
        <!-- Hospital Charts -->
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Atenciones por Médico</h4>
                <Chart v-if="doctorChartData" type="bar" :data="doctorChartData" :options="chartOptions" key="doctor-chart" />
                <div v-else class="text-center text-gray-500 py-8">No hay datos disponibles</div>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Distribución por Aseguradora</h4>
                <Chart v-if="insuranceChartData" type="pie" :data="insuranceChartData" :options="pieChartOptions" key="insurance-chart" />
                <div v-else class="text-center text-gray-500 py-8">No hay datos disponibles</div>
            </div>
        </div>
        
        <!-- User and Patient Charts -->
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Personal por Posición</h4>
                <Chart v-if="userPositionChartData" type="doughnut" :data="userPositionChartData" :options="pieChartOptions" key="user-position-chart" />
                <div v-else class="text-center text-gray-500 py-8">No hay datos disponibles</div>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Pacientes por Género</h4>
                <Chart v-if="patientGenderChartData" type="pie" :data="patientGenderChartData" :options="pieChartOptions" key="patient-gender-chart" />
                <div v-else class="text-center text-gray-500 py-8">No hay datos disponibles</div>
            </div>
        </div>
        
        <!-- Task Status Chart -->
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Estado de Tareas</h4>
                <Chart v-if="taskStatusChartData" type="bar" :data="taskStatusChartData" :options="chartOptions" key="task-status-chart" />
                <div v-else class="text-center text-gray-500 py-8">No hay datos disponibles</div>
            </div>
        </div>
        
        <!-- Recent Tickets -->
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Tickets Recientes</h4>
                <div v-if="recentTickets.length > 0" class="space-y-3">
                    <div v-for="ticket in recentTickets" :key="ticket.id" class="p-3 border border-gray-200 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h5 class="font-medium text-gray-900">{{ ticket.title }}</h5>
                                <p class="text-sm text-gray-600 mt-1">{{ ticket.description?.substring(0, 100) }}...</p>
                                <div class="flex items-center mt-2 space-x-4">
                                    <span class="text-xs text-gray-500">{{ ticket.creator?.name }}</span>
                                    <span class="text-xs text-gray-500">{{ new Date(ticket.created_at).toLocaleDateString() }}</span>
                                </div>
                            </div>
                            <div class="flex flex-col items-end">
                                <Badge 
                                    :value="ticket.status" 
                                    :severity="ticket.status === 'ABIERTO' ? 'warning' : ticket.status === 'CERRADO' ? 'success' : 'info'"
                                    class="mb-1"
                                />
                                <Badge 
                                    :value="ticket.priority" 
                                    :severity="ticket.priority === 'ALTA' ? 'danger' : ticket.priority === 'MEDIA' ? 'warning' : 'info'"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else class="text-gray-500 text-center py-4">
                    No hay tickets recientes
                </div>
            </div>
        </div>
        
        <!-- Hospitalization Status -->
        <div class="col-span-12">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Estado de Hospitalización</h4>
                <div v-if="hospitalizationStatus.overview" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-gray-800">{{ hospitalizationStatus.overview.total_beds || 0 }}</p>
                        <p class="text-sm text-gray-600">Camas Totales</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-red-600">{{ hospitalizationStatus.overview.occupied_beds || 0 }}</p>
                        <p class="text-sm text-gray-600">Camas Ocupadas</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-green-600">{{ hospitalizationStatus.overview.available_beds || 0 }}</p>
                        <p class="text-sm text-gray-600">Camas Disponibles</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-blue-600">{{ hospitalizationStatus.overview.occupancy_percentage || 0 }}%</p>
                        <p class="text-sm text-gray-600">Ocupación</p>
                    </div>
                </div>
                
                <!-- Recent Admissions -->
                <div v-if="hospitalizationStatus.recent_admissions && hospitalizationStatus.recent_admissions.length > 0">
                    <h5 class="text-lg font-medium mb-3">Ingresos Recientes</h5>
                    <div class="space-y-2">
                        <div v-for="admission in hospitalizationStatus.recent_admissions" :key="admission.patient_name" class="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                                <span class="font-medium">{{ admission.patient_name }}</span>
                                <span class="text-sm text-gray-600 ml-2">- {{ admission.room }}</span>
                            </div>
                            <div class="text-right">
                                <p class="text-sm text-gray-600">{{ admission.attending_physician }}</p>
                                <p class="text-xs text-gray-500">{{ new Date(admission.admission_date).toLocaleDateString() }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
