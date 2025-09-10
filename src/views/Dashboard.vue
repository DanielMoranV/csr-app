<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useHospitalAttentionsStore } from '@/store/hospitalAttentionsStore';
import Chart from 'primevue/chart';

const store = useHospitalAttentionsStore();

const stats = computed(() => store.statistics);
const isLoading = computed(() => store.isLoading);

const doctorChartData = ref({});
const insuranceChartData = ref({});
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

const setChartData = () => {
    if (stats.value.attentions_by_doctor) {
        const labels = Object.keys(stats.value.attentions_by_doctor);
        const data = Object.values(stats.value.attentions_by_doctor);
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

    if (stats.value.attentions_by_insurance) {
        const labels = Object.keys(stats.value.attentions_by_insurance);
        const data = Object.values(stats.value.attentions_by_insurance);
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
};

onMounted(() => {
    store.fetchStats();
});

watch(stats, setChartData, { immediate: true, deep: true });
</script>

<template>
    <div v-if="isLoading" class="text-center">
        <p>Cargando estadísticas...</p>
    </div>
    <div v-else class="grid grid-cols-12 gap-4">
        <!-- Stat Cards -->
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Atenciones Totales</h3>
                <p class="text-3xl font-bold text-gray-800">{{ stats.total_attentions || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Atenciones Activas</h3>
                <p class="text-3xl font-bold text-green-600">{{ stats.active_attentions || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Atenciones Hoy</h3>
                <p class="text-3xl font-bold text-blue-600">{{ stats.attentions_today || 0 }}</p>
            </div>
        </div>
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-500">Estancia Promedio</h3>
                <p class="text-3xl font-bold text-purple-600">{{ stats.average_stay_days || 0 }} días</p>
            </div>
        </div>

        <!-- Charts -->
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Atenciones por Médico</h4>
                <Chart type="bar" :data="doctorChartData" :options="chartOptions" />
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6">
            <div class="p-4 bg-white rounded-lg shadow-md">
                <h4 class="text-xl font-semibold mb-4">Distribución por Aseguradora</h4>
                <Chart type="pie" :data="insuranceChartData" :options="chartOptions" />
            </div>
        </div>
    </div>
</template>
