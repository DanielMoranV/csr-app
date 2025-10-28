<script setup>
import Badge from 'primevue/badge';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { computed } from 'vue';

const props = defineProps({
    bed: {
        type: Object,
        required: true
    }
});

const getStatusSeverity = (status) => {
    switch (status) {
        case 'occupied':
            return 'danger';
        case 'free':
            return 'success';
        default:
            return 'info';
    }
};

// Computed para manejar múltiples atenciones
const attentions = computed(() => {
    if (!props.bed.attention) return [];
    // Si attention es un array, devolverlo; si no, convertirlo en array
    return Array.isArray(props.bed.attention) ? props.bed.attention : [props.bed.attention];
});

// Computed para detectar múltiples atenciones activas
const hasMultipleAttentions = computed(() => {
    return attentions.value.length > 1;
});

// Computed para obtener atenciones sin alta o salida
const activeAttentions = computed(() => {
    return attentions.value.filter((attention) => {
        // Verificar si la atención no tiene fecha de alta o salida marcada
        return !attention.discharge_date && !attention.exit_date;
    });
});

// Función para obtener el estado de las tareas
// const getTaskStatusSeverity = (status) => {
//     switch (status) {
//         case 'realizado':
//         case 'completado':
//             return 'success';
//         case 'pendiente':
//             return 'warning';
//         case 'cancelado':
//             return 'danger';
//         default:
//             return 'info';
//     }
// };

// Función para formatear fecha
const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    try {
        let date;
        // Si la fecha es solo YYYY-MM-DD sin hora, parsear como fecha local
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date)) return dateString;
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
};

// Función para obtener tareas pendientes
const getPendingTasks = (tasks) => {
    return tasks ? tasks.filter((task) => task.status === 'pendiente') : [];
};

// Función para generar el tooltip de las tareas
const getTasksTooltip = (tasks) => {
    if (!tasks || tasks.length === 0) {
        return 'No hay tareas asociadas';
    }
    const pendingTasks = getPendingTasks(tasks);
    if (pendingTasks.length === 0) {
        return 'Todas las tareas completadas';
    }
    return `${pendingTasks.length} de ${tasks.length} tareas pendientes`;
};
</script>

<template>
    <div class="p-3 surface-card shadow-2 border-round mb-3">
        <div class="flex justify-content-between align-items-center mb-3">
            <span class="font-semibold text-lg">Cama: {{ bed.bed_number }}</span>
            <Tag :value="bed.status === 'occupied' ? 'OCUPADA' : 'LIBRE'" :severity="getStatusSeverity(bed.status)" />
        </div>

        <!-- Cama ocupada - Vista resumida -->
        <div v-if="bed.status === 'occupied' && attentions.length">
            <!-- Advertencias rápidas -->
            <div v-if="hasMultipleAttentions || activeAttentions.length > 1" class="mb-3">
                <Message v-if="hasMultipleAttentions" severity="warn" :closable="false" class="mb-1 text-sm"> Múltiples atenciones detectadas </Message>
                <Message v-if="activeAttentions.length > 1" severity="error" :closable="false" class="text-sm"> Múltiples atenciones activas </Message>
            </div>

            <!-- Información resumida del paciente -->
            <div v-for="att in attentions.slice(0, 1)" :key="att.hospital_attention_id" class="bg-surface-50 p-3 border-round">
                <div class="flex align-items-center justify-content-between mb-2">
                    <div class="flex align-items-center gap-2">
                        <i class="pi pi-user text-primary"></i>
                        <span class="font-medium">{{ att.patient?.name || `${att.patient?.first_name} ${att.patient?.last_name}` }}</span>
                    </div>
                    <Badge v-if="getPendingTasks(att.tasks).length" :value="getPendingTasks(att.tasks).length" severity="warning" />
                </div>

                <div class="text-sm text-600">
                    <div class="flex align-items-center gap-1 mb-1">
                        <i class="pi pi-id-card"></i>
                        <span>{{ att.patient?.document_number || '—' }}</span>
                    </div>
                    <div class="flex align-items-center gap-1">
                        <i class="pi pi-calendar"></i>
                        <span>Ingreso: {{ formatDate(att.entry_date) }}</span>
                    </div>

                    <!-- Indicadores rápidos -->
                    <div class="flex align-items-center gap-2 mt-2">
                        <Tag v-if="att.details?.ram" value="RAM" severity="warn" class="text-xs" v-tooltip.top="'Paciente con Reacciones Alérgicas a Medicamentos (RAM)'" />
                        <Tag v-if="att.details?.medical_order" value="Órdenes" severity="info" class="text-xs" v-tooltip.top="'Tiene órdenes médicas registradas'" />
                        <Tag v-if="att.tasks?.length" :value="`${getPendingTasks(att.tasks).length} pend."` :severity="getPendingTasks(att.tasks).length > 0 ? 'warning' : 'success'" class="text-xs" v-tooltip.top="getTasksTooltip(att.tasks)" />
                    </div>
                </div>
            </div>

            <!-- Indicador de múltiples atenciones -->
            <div v-if="attentions.length > 1" class="mt-2 text-center">
                <small class="text-500">+{{ attentions.length - 1 }} atención(es) más</small>
            </div>
        </div>

        <!-- Cama libre -->
        <div v-else-if="bed.status === 'free'" class="text-center py-3">
            <i class="pi pi-check-circle text-green-500 text-2xl mb-2 block"></i>
            <span class="text-600">Disponible para nueva atención</span>
        </div>

        <!-- Inconsistencia: ocupada pero sin atención -->
        <div v-else-if="bed.status === 'occupied' && !attentions.length" class="p-2 bg-yellow-100 border-1 border-yellow-400 border-round text-yellow-800 flex align-items-center">
            <i class="pi pi-exclamation-triangle mr-2"></i>
            <span class="text-sm">Ocupada sin datos de atención</span>
        </div>
    </div>
</template>

<style scoped>
.list-none li {
    margin-bottom: 0.5rem;
}
</style>
