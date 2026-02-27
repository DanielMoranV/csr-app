<script setup>
import { doctorSchedules } from '@/api/doctorSchedules';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';

const toast = useToast();

const visible = ref(false);
const loading = ref(false);
const doctorsAvailability = ref([]);
const currentDate = ref('');
const currentCategory = ref('');

const CATEGORY_LABELS = {
    emergency: 'Emergencia',
    ambulatory: 'Ambulatorio',
    hospitable: 'Hospitalizado'
};

const groupedBySpecialty = computed(() => {
    const groups = {};
    doctorsAvailability.value.forEach((doctor) => {
        const specs = doctor.specialties && doctor.specialties.length > 0 ? doctor.specialties : ['Sin Especialidad'];
        specs.forEach((spec) => {
            if (!groups[spec]) {
                groups[spec] = [];
            }
            groups[spec].push(doctor);
        });
    });

    // Convert to array and sort alphabetically by specialty name
    return Object.keys(groups)
        .sort()
        .map((spec) => ({
            specialty: spec,
            doctors: groups[spec]
        }));
});

const show = async (date, category) => {
    currentDate.value = date;
    currentCategory.value = category;
    visible.value = true;
    await fetchAvailability();
};

const hide = () => {
    visible.value = false;
};

const fetchAvailability = async () => {
    loading.value = true;
    doctorsAvailability.value = [];
    try {
        const response = await doctorSchedules.getWithReservations({
            date: currentDate.value,
            category: currentCategory.value
        });
        doctorsAvailability.value = response.data || [];
    } catch (error) {
        console.error('Error fetching availability:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los turnos y reservas', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const getCategoryLabel = (cat) => CATEGORY_LABELS[cat] || cat;

defineExpose({ show, hide });
</script>

<template>
    <Dialog v-model:visible="visible" modal header="Cartelera de Turnos y Reservas" :style="{ width: '90vw', maxWidth: '800px' }" :breakpoints="{ '960px': '95vw' }" class="p-fluid">
        <template #header>
            <div class="flex align-items-center gap-3">
                <i class="pi pi-calendar text-xl text-primary"></i>
                <span class="text-xl font-bold">Resumen de Actividad Diaria</span>
                <Tag v-if="currentDate" severity="info" class="text-sm px-2">{{ currentDate }}</Tag>
                <Tag v-if="currentCategory" severity="secondary" class="text-sm px-2">{{ getCategoryLabel(currentCategory) }}</Tag>
            </div>
        </template>

        <div v-if="loading" class="flex flex-column align-items-center justify-content-center p-5 text-500">
            <i class="pi pi-spin pi-spinner text-4xl mb-3 text-primary"></i>
            <p class="m-0">Cargando disponibilidad...</p>
        </div>

        <div v-else-if="doctorsAvailability.length === 0" class="text-center p-5 text-500">
            <i class="pi pi-inbox text-4xl mb-3"></i>
            <p class="m-0">No hay turnos programados para esta fecha y categoría.</p>
        </div>

        <div v-else class="mt-2 text-left">
            <div v-for="group in groupedBySpecialty" :key="group.specialty" class="mb-4">
                <h3 class="text-xl font-bold text-primary border-bottom-1 surface-border pb-2 mb-3 flex align-items-center">
                    <i class="pi pi-sitemap mr-2"></i>{{ group.specialty }}
                    <Badge :value="group.doctors.length" severity="secondary" class="ml-2" />
                </h3>
                <div class="doctors-grid grid">
                    <div v-for="doctor in group.doctors" :key="doctor.doctor_id" class="col-12 md:col-6 lg:col-4">
                        <Card class="h-full border-1 surface-border shadow-none hover:shadow-2 transition-duration-200">
                            <template #title>
                                <div class="text-lg font-bold line-height-2 mb-1 text-800">
                                    {{ doctor.doctor_name }}
                                </div>
                            </template>
                            <template #subtitle>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    <Tag v-for="spec in doctor.specialties" :key="spec" severity="info" class="text-xs" :style="{ background: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' }">
                                        {{ spec }}
                                    </Tag>
                                </div>
                            </template>
                            <template #content>
                                <div class="flex flex-column gap-1 mt-1">
                                    <div v-for="schedule in doctor.schedules" :key="schedule.schedule_id" class="p-2 border-round surface-50 border-1 surface-border flex justify-content-between align-items-center">
                                        <div class="font-bold text-700 text-sm">
                                            <i class="pi pi-clock text-xs mr-1 text-500"></i>
                                            {{ schedule.start_time.substring(0, 5) }} - {{ schedule.end_time.substring(0, 5) }}
                                        </div>
                                        <div class="flex align-items-center gap-2">
                                            <i class="pi pi-users text-xs text-500" v-tooltip.top="'Pacientes registrados'"></i>
                                            <Badge :value="schedule.patients_count" :severity="schedule.patients_count > 0 ? 'success' : 'secondary'" />
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Card>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Cerrar" icon="pi pi-times" @click="hide" class="p-button-text" />
        </template>
    </Dialog>
</template>

<style scoped>
.doctors-grid {
    margin: 0;
}
</style>
